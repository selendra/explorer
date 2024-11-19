use anyhow::{anyhow, Result};
use dotenv::dotenv;
use selendra_rust_client::{models::block::EvmBlock, EvmClient};
use std::{
	env,
	time::{Duration, Instant},
};
use tokio::{sync::broadcast, time};
use tracing::{error, info};

#[derive(Debug)]
pub struct ProcessingStats {
	processed_blocks: u64,
	failed_blocks: u64,
	start_time: Instant,
	start_block: u64,
}

impl ProcessingStats {
	pub fn new(start_block: u64) -> Self {
		Self { processed_blocks: 0, failed_blocks: 0, start_time: Instant::now(), start_block }
	}

	pub fn log_progress(&self, current_block: u64, end_block: u64) {
		let elapsed = self.start_time.elapsed();
		let blocks_per_second = if elapsed.as_secs() > 0 {
			self.processed_blocks as f64 / elapsed.as_secs_f64()
		} else {
			0.0
		};
		let progress = ((current_block - self.start_block) as f64
			/ (end_block - self.start_block) as f64
			* 100.0)
			.round();

		info!(
			progress_percentage = progress as u32,
			processed_blocks = self.processed_blocks,
			failed_blocks = self.failed_blocks,
			blocks_per_second = blocks_per_second,
			elapsed_secs = elapsed.as_secs(),
			"Processing progress"
		);
	}
}

pub struct BlockMonitorService {
	evm_client: EvmClient,
	shutdown: broadcast::Receiver<()>,
}

impl BlockMonitorService {
	pub fn new(evm_client: EvmClient, shutdown: broadcast::Receiver<()>) -> Self {
		Self { evm_client, shutdown }
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
			self.store_block_data(block_data)?;
		}
		Ok(())
	}

	fn store_block_data(&self, block: EvmBlock) -> Result<()> {
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
	let evm_url =
		env::var("EVM_RPC_URL").expect("EVM_RPC_URL must be set in the .env file or environment");

	// Initialize the EVM client
	let evm_client = EvmClient::new(&evm_url)?;

	info!("Connected to EVM client at {}", evm_url);

	let (_shutdown_tx, shutdown_rx) = broadcast::channel(1);

	let mut service = BlockMonitorService::new(evm_client, shutdown_rx);
	service.process_block_range(0, 100, Some(10)).await?;

	Ok(())
}
