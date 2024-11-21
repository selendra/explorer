pub mod archive_state;

use anyhow::{anyhow, Result};
use archive_state::ProcessingStats;
use dotenv::dotenv;
use selendra_rust_client::{models::block::EvmBlock, EvmClient};
use serde::{Deserialize, Serialize};
use std::{env, sync::Arc, time::Duration};
use tokio::{sync::broadcast, time};
use tracing::{error, info};

use surrealdb::{
	engine::remote::ws::{Client, Ws},
	opt::auth::Root,
	Surreal,
};

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct StoreBlock {
	pub block_number: u64,
	pub block_hash: String,
	pub timestamp: u64,
}

pub struct BlockMonitorService {
	evm_client: EvmClient,
	shutdown: broadcast::Receiver<()>,
	// db: Arc<Surreal<Client>>,
}

impl BlockMonitorService {
	pub async fn new(
		evm_client: EvmClient,
		shutdown: broadcast::Receiver<()>,
		db_url: &str,
		db_user: &str,
		db_pass: &str,
	) -> Result<Self> {
		// Initialize SurrealDB connection
		let db = Surreal::new::<Ws>(db_url).await?;

		println!("{:#?}", db);

		// // Sign in as root
		// db.signin(Root { username: db_user, password: db_pass }).await?;

		// // Select namespace and database
		// db.use_ns("blockchain").use_db("mainnet").await?;

		Ok(Self { evm_client, shutdown })
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

	async fn process_block(&self, block_number: u64) -> Result<()> {
		let block = self.evm_client.get_block(block_number).await?;
		if let Some(block_data) = block {
			self.store_block_data(block_data).await?;
		}
		Ok(())
	}

	async fn store_block_data(&self, block: EvmBlock) -> Result<()> {
		// let store_data = StoreBlock {
		// 	block_number: block.block_number,
		// 	block_hash: block.block_hash,
		// 	timestamp: block.timestamp,
		// };

		// let record_id = format!("block:{}", store_data.block_number);

		// Implement your storage logic here
		info!(
			block_number = block.block_number,
			tx_count = block.transactions.len(),
			"Storing block data"
		);

		// // Clone store_data for logging if needed
		// let block_number = store_data.block_number;
		// let block_hash = store_data.block_hash.clone();

		// // Use Option<StoreBlock> directly without Created type
		// let stored: Option<StoreBlock> =
		// 	self.db.create(("blocks", record_id)).content(store_data).await?;

		// match stored {
		// 	Some(_) => {
		// 		info!(block_number, block_hash, "Successfully stored block data");
		// 		Ok(())
		// 	},
		// 	None => {
		// 		error!(block_number, "Failed to store block data");
		// 		Err(anyhow!("Failed to store block in SurrealDB"))
		// 	},
		// }

		Ok(())
	}
}

#[tokio::main]
async fn main() -> Result<()> {
	dotenv().ok();
	tracing_subscriber::fmt::init();

	// Get EVM client URL from environment variables
	let evm_url = env::var("EVM_RPC_URL").expect("EVM_RPC_URL must be set");
	let db_url = env::var("SURREALDB_URL").expect("SURREALDB_URL must be set");
	let db_user = env::var("SURREALDB_USER").expect("SURREALDB_USER must be set");
	let db_pass = env::var("SURREALDB_PASS").expect("SURREALDB_PASS must be set");

	// Initialize the EVM client
	let evm_client = EvmClient::new(&evm_url)?;

	info!("Connected to EVM client at {}", evm_url);

	let (_shutdown_tx, shutdown_rx) = broadcast::channel(1);

	// Initialize service with SurrealDB
	let mut service =
		BlockMonitorService::new(evm_client, shutdown_rx, &db_url, &db_user, &db_pass).await?;

	service.process_block_range(0, 100, Some(10)).await?;

	Ok(())
}
