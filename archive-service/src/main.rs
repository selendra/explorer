pub mod archive_state;

use anyhow::{anyhow, Result};
use dotenv::dotenv;
use futures::StreamExt;
use selendra_db::{models::account::SubstrateAccount, setup_db::SurrealDb};
use std::{collections::HashSet, env, sync::Arc};
use tokio::{
	sync::broadcast,
	time,
	time::{sleep, Duration},
};
use tracing::{error, info};

use archive_state::ProcessingStats;
use selendra_rust_client::{models::block::EvmBlock, EvmClient, SubstrateClient};

const MAX_RETRIES: u32 = 3;
const INITIAL_BACKOFF_MS: u64 = 1000; // 1 second
const MAX_CONCURRENT_REQUESTS: usize = 5; // Limit concurrent request

pub struct BlockArciveService {
	pub evm_client: Option<EvmClient>,
	pub substrate_client: Option<Arc<SubstrateClient>>,
	pub surreal_db: SurrealDb,
	pub shutdown: broadcast::Receiver<()>,
}

impl BlockArciveService {
	pub fn new(
		evm_client: Option<EvmClient>,
		substrate_client: Option<SubstrateClient>,
		surreal_db: SurrealDb,
		shutdown: broadcast::Receiver<()>,
	) -> Self {
		// Map Option<SubstrateClient> to Option<Arc<SubstrateClient>>
		let arc_substrate_client = substrate_client.map(Arc::new);

		Self { evm_client, substrate_client: arc_substrate_client, surreal_db, shutdown }
	}

	pub async fn process_block_range(
		&mut self,
		start_block: u64,
		end_block: u64,
		rate_millis: Option<u64>,
	) -> Result<()> {
		if end_block < start_block {
			return Err(anyhow!("end_block must be greater than or equal to start_block"));
		}

		let mut stats = ProcessingStats::new(start_block);
		let mut current_block = start_block;
		let rate_limit = time::interval(Duration::from_millis(rate_millis.unwrap_or(10)));
		let max_retries = 3;

		let mut rate_limiter = rate_limit;

		while current_block <= end_block {
			// Check for shutdown signal
			if self.shutdown.try_recv().is_ok() {
				info!(
					last_processed = current_block,
					"Shutdown signal received, stopping block processing"
				);
				break;
			}

			let mut attempt = 0;
			let result = loop {
				match self.process_block(current_block).await {
					Ok(_) => break Ok(()),
					Err(e) if attempt < max_retries => {
						attempt += 1;
						error!(
							block_number = current_block,
							attempt,
							error = ?e,
							"Error processing block, retrying"
						);
						time::sleep(Duration::from_millis(100 * 2_u64.pow(attempt))).await;
					},
					Err(e) => break Err(e),
				}
			};

			match result {
				Ok(_) => stats.processed_blocks += 1,
				Err(e) => {
					stats.failed_blocks += 1;
					error!(
						block_number = current_block,
						error = ?e,
						"Failed to process block after retries"
					);
					if stats.failed_blocks > 10 {
						return Err(anyhow!("Too many failures, stopping processing"));
					}
				},
			}

			// Log progress periodically
			if current_block % 100 == 0 {
				stats.log_progress(current_block, end_block);
			}

			current_block += 1;
			rate_limiter.tick().await;
		}

		Ok(())
	}

	async fn check_balance_with_retry(
		&self,
		client: Arc<SubstrateClient>,
		account: &str,
		retry_count: u32,
	) -> Result<Option<SubstrateAccount>> {
		// Keep the original error type
		let mut current_retry = 0;

		loop {
			match client.check_balance(account, None).await {
				Ok(Some(balance)) => {
					return Ok(Some(SubstrateAccount {
						substrate_address: account.to_string(),
						total: balance.free + balance.reserved,
						free: balance.free,
						reserved: balance.reserved,
						lock: balance.lock,
					}));
				},
				Ok(None) => return Ok(None),
				Err(e) => {
					if current_retry >= retry_count {
						return Err(e); // Return the original error
					}

					// Check if error is MaxSlotsExceeded
					let error_debug = format!("{:?}", e);
					if error_debug.contains("MaxSlotsExceeded") {
						let backoff = INITIAL_BACKOFF_MS * (2_u64.pow(current_retry));
						info!(
							"MaxSlotsExceeded error for account {}, retry {} in {}ms",
							account,
							current_retry + 1,
							backoff
						);
						sleep(Duration::from_millis(backoff)).await;
						current_retry += 1;
						continue;
					}

					return Err(e); // Return the original error
				},
			}
		}
	}

	pub async fn process_account(&self) -> Result<()> {
		let db = self.surreal_db.setup_account_db().await;
	
		let substrate_client = self
			.substrate_client
			.as_ref()
			.ok_or_else(|| anyhow::anyhow!("Substrate client not initialized"))?;
	
		let mut accounts = substrate_client.get_all_accounts().await?;
		accounts = self.remove_duplicates(accounts);

		futures::stream::iter(accounts)
        .map(|account| {
			let db = db.clone();
			let substrate_client = Arc::clone(&substrate_client);
            
            async move {
                match self.check_balance_with_retry(substrate_client, &account, MAX_RETRIES).await {
                    Ok(Some(balance)) => {
                        let id = format!("account_{}", account);
                        if let Err(e) = db.insert_item(&id, balance).await {
                            info!("Failed to insert account {}: {:?}", account, e);
                        }
                    }
                    Ok(None) => {
                        info!("Account {} has no balance", account);
                    }
                    Err(e) => {
                        // Here we can convert the error to anyhow::Error if needed
                        info!("Error checking balance for {}: {:?}", account, e);
                    }
                }
            }
        })
        .buffer_unordered(MAX_CONCURRENT_REQUESTS)
        .collect::<Vec<_>>()
        .await;

    Ok(())
	}

	async fn process_block(&self, block_number: u64) -> Result<()> {
		let evm_client = self
			.evm_client
			.as_ref()
			.ok_or_else(|| anyhow::anyhow!("EVM client not initialized"))?;

		let block = evm_client.get_block(block_number).await?;
		if let Some(block_data) = block {
			self.store_block_data(block_data).await?;
		}
		Ok(())
	}

	async fn store_block_data(&self, block: EvmBlock) -> Result<()> {
		// Implement your storage logic here
		info!(
			block_number = block.block_number,
			tx_count = block.transactions.len(),
			"Storing block data"
		);

		Ok(())
	}

	fn remove_duplicates(&self, mut data: Vec<String>) -> Vec<String> {
		// Convert Vec to HashSet to remove duplicates
		let set: HashSet<_> = data.drain(..).collect();
		
		// Convert HashSet back to Vec
		let deduped: Vec<String> = set.into_iter().collect();
		
		deduped
	}
}

#[tokio::main]
async fn main() -> Result<()> {
	dotenv().ok();
	tracing_subscriber::fmt::init();

	// Get EVM client URL from environment variables
	let evm_url = env::var("RPC_URL").expect("RPC_URL must be set");
	let substrate_url = env::var("WS_URL").expect("WS_URL must be set");
	let surreal_db_url = env::var("SURREALDB_URL").expect("SURREALDB_URL must be set");
	let surreal_db_user = env::var("SURREALDB_USER").expect("SURREALDB_USER must be set");
	let surreal_db_pass = env::var("SURREALDB_PASS").expect("SURREALDB_PASS must be set");

	// Initialize the EVM client
	let evm_client = EvmClient::new(&evm_url)?;
	let substrate_client = SubstrateClient::new(&substrate_url).await?;
	let surrealdb = SurrealDb { surreal_db_url, surreal_db_user, surreal_db_pass };

	info!("Connected to EVM client at {}", evm_url);

	let (_shutdown_tx, shutdown_rx) = broadcast::channel(1);

	// Initialize service with SurrealDB
	let service =
		BlockArciveService::new(Some(evm_client), Some(substrate_client), surrealdb, shutdown_rx);

	// Basic processing with progress
	service.process_account().await?;

	Ok(())
}
