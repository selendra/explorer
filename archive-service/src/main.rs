pub mod archive_state;
pub mod models;
pub mod setup_db;

use anyhow::{anyhow, Error, Result};
use dotenv::dotenv;
use futures::StreamExt;
use models::account::AccountModel;
use rayon::prelude::*;
use std::{env, sync::Arc, time::Duration};
use tokio::{sync::broadcast, time};
use tracing::{error, info};
use uuid::Uuid;

use archive_state::ProcessingStats;
use selendra_rust_client::{models::block::EvmBlock, EvmClient, SubstrateClient};
use setup_db::SurrealDb;

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

	pub async fn process_account_chunk(&self, chunk_size: usize) -> Result<()> {
		let db = self.surreal_db.setup_account_db(None, None, Some("account")).await;

		let substrate_client = self
			.substrate_client
			.as_ref()
			.ok_or_else(|| anyhow::anyhow!("Substrate client not initialized"))?;

		let accounts = substrate_client.get_all_accounts().await?;

		// Process in asynchronous chunks
		futures::stream::iter(accounts.chunks(chunk_size))
			.for_each_concurrent(None, |batch| {
				let db = db.clone();
				let substrate_client = Arc::clone(&substrate_client);

				async move {
					for account in batch {
						let account_str = account.to_string();

						match substrate_client.check_balance(&account_str, None).await {
							Ok(Some(balance)) => {
								let acount = AccountModel {
									substrate_address: account_str.clone(),
									total: balance.total,
									free: balance.free,
									reserved: balance.reserved,
								};
								let id = format!("account_{}", account_str);
								if let Err(e) = db.insert_item(&id, acount).await {
									info!("Failed to insert account {}: {}", account_str, e);
								}
							}
							Ok(None) => {
								info!("Account {} has no balance", account_str);
							}
							Err(e) => {
								info!("Error checking balance for {}: {}", account_str, e);
							}
						}
					}
				}
			})
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
	service.process_account_chunk(100).await?;

	Ok(())
}
