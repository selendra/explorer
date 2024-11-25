pub mod archive_state;
pub mod models;
pub mod setup_db;

use anyhow::{anyhow, Result};
use dotenv::dotenv;
use futures::future::join_all;
use rayon::prelude::*;
use std::{env, time::Duration};
use tokio::{sync::broadcast, time};
use tracing::{error, info};

use archive_state::ProcessingStats;
use selendra_rust_client::{models::block::EvmBlock, EvmClient, SubstrateClient};
use setup_db::SurrealDb;

pub struct BlockArciveService {
	pub evm_client: EvmClient,
	pub substrate_client: SubstrateClient,
	pub surreal_db: SurrealDb,
	pub shutdown: broadcast::Receiver<()>,
}

impl BlockArciveService {
	pub fn new(
		evm_client: EvmClient,
		substrate_client: SubstrateClient,
		surreal_db: SurrealDb,
		shutdown: broadcast::Receiver<()>,
	) -> Self {
		Self { evm_client, substrate_client, surreal_db, shutdown }
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
		// let accounts = self.substrate_client.get_all_accounts().await?;
		// let evm_address = self.substrate_client.ss58_to_evm("5EufSSRkYMLJfjZ53ULaggJCn7Y68VNc1jM9w5sEp5gTSK9v").unwrap_or_else(|_| self.evm_client.address_zero());
		let balance = self
			.substrate_client
			.check_balance("5E9gwgLwU7NxtAzLhxAhMswVLVM7ZSLP2UFEXWLvLjKXFdNm")
			.await?;
		println!("address: {:?}", balance);

		// // First, convert all SS58 addresses to EVM addresses in parallel using rayon
		// let account_addresses: Vec<_> = accounts
		//     .par_chunks(chunk_size)
		//     .flat_map(|chunk| {
		//         chunk.iter().map(|account| {
		//             let evm_address = self.substrate_client
		//                 .ss58_to_evm(account)
		//                 .unwrap_or_else(|_| self.evm_client.address_zero());
		//             (account.clone(), evm_address)
		//         }).collect::<Vec<_>>()
		//     })
		//     .collect();

		// // Then, process balance checks in async batches
		// for batch in account_addresses.chunks(chunk_size) {
		//     let futures: Vec<_> = batch.iter().map(|(account, address)| {
		//         let evm_client = self.evm_client.clone();
		//         let address_clone = address.clone();
		//         let account_clone = account.clone();

		//         tokio::spawn(async move {
		//             match evm_client.check_balance(&address_clone, None).await {
		//                 Ok(balance) => {
		//                     info!("Account: {} Address: {} Balance: {}",
		//                         account_clone, address_clone, balance);
		//                     Ok((account_clone, address_clone, balance))
		//                 },
		//                 Err(e) => {
		//                     info!("Error checking balance for {}: {}", address_clone, e);
		//                     Err(e)
		//                 }
		//             }
		//         })
		//     }).collect();

		//     // Wait for the batch to complete
		//     let results = join_all(futures).await;

		//     // Process results
		//     for result in results {
		//         match result {
		//             Ok(Ok((_account, _address, _balance))) => {},
		//             Ok(Err(e)) => {
		//                 println!("Balance check error: {}", e);
		//             },
		//             Err(e) => {
		//                 println!("Task error: {}", e);
		//             }
		//         }
		//     }
		// }

		Ok(())
	}

	async fn process_block(&self, block_number: u64) -> Result<()> {
		let block = self.evm_client.get_block(block_number).await?;
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
	let service = BlockArciveService::new(evm_client, substrate_client, surrealdb, shutdown_rx);

	// service.process_block_range(0, 100, Some(10)).await?;
	service.process_account_chunk(50).await?;

	Ok(())
}
