use std::time::{Duration, Instant};

use anyhow::{Result, anyhow};
use selendra_rust_client::{models::block::EvmBlock, EvmClient};
use tokio::{sync::broadcast, time::sleep};
use tracing::{info, error};

#[derive(Debug)]
pub struct ProcessingStats {
    pub processed_blocks: u64,
    pub failed_blocks: u64,
    pub start_time: Instant,
    pub last_processed_block: u64,
}

impl ProcessingStats {
    pub fn new(start_at: u64) -> Self {
        Self {
            processed_blocks: 0,
            failed_blocks: 0,
            start_time: Instant::now(),
            last_processed_block: start_at,
        }
    }

    pub fn log_progress(&self, current: u64, end: u64) {
        let elapsed = self.start_time.elapsed();
        let blocks_per_second = self.processed_blocks as f64 / elapsed.as_secs_f64();
        let progress = ((current - self.last_processed_block) as f64 
            / (end - self.last_processed_block) as f64 * 100.0) as u32;

        info!(
            progress_percentage = progress,
            blocks_processed = self.processed_blocks,
            blocks_failed = self.failed_blocks,
            blocks_per_second = blocks_per_second,
            elapsed_secs = elapsed.as_secs(),
            "Processing progress"
        );
    }
}

pub struct BlockMonitorService {
    pub evm_client: EvmClient,
    pub shutdown: broadcast::Receiver<()>,
}

impl BlockMonitorService {
    pub fn new(evm_client: EvmClient, shutdown: broadcast::Receiver<()>) -> Self {
        Self {
            evm_client,
            shutdown,
        }
    }

    pub async fn process_block_range(&mut self, start_at: u64, ending_at: u64, rate_millis: Option<u64>) -> Result<()> {
        if ending_at < start_at {
            return Err(anyhow!("ending_at must be greater than start_at"));
        }

        let mut stats = ProcessingStats::new(start_at);
        let mut current_block = start_at;
        let batch_size = 100;
        let rate_limit = Duration::from_millis(rate_millis.unwrap_or(10));

        while current_block <= ending_at {
            // Check for shutdown signal
            if self.shutdown.try_recv().is_ok() {
                info!(
                    last_processed = current_block,
                    "Received shutdown signal, stopping block processing"
                );
                break;
            }
            match self.process_single_block(current_block).await {
                Ok(_) => {
                    stats.processed_blocks += 1;
                }
                Err(e) => {
                    stats.failed_blocks += 1;
                   error!(
                        block_number = current_block,
                        error = ?e,
                        "Failed to process block"
                    );

                    // Optional: implement retry logic here
                    if stats.failed_blocks > 10 {
                        return Err(anyhow!("Too many failures, stopping processing"))
                    }
                }
            }

            // Log progress periodically
            if current_block % batch_size == 0 {
                stats.log_progress(current_block, ending_at);
            }

            current_block += 1;
            sleep(rate_limit).await;
        }

        Ok(())
    }

    async fn process_single_block(&self, block_number: u64) -> Result<()> {
        let block = self.evm_client.get_block(block_number).await?;
        if let Some(block_data) = block {
            self.store_block_data(block_data)?;
        }
        Ok(())
    }

    fn store_block_data(&self, block: EvmBlock) -> Result<()> {
        // Example storage logic
        // Add your storage logic here (e.g., database insertion)
        info!(
            block_number = block.block_numer,
            tx_count = block.transactions.len(),
            "Storing block data"
        );
        Ok(())
    }
}

#[tokio::main]
async fn main() -> Result<()> {
    let evm_client = EvmClient::new("https://rpc.selendra.org").unwrap();
    // Initialize logging
    tracing_subscriber::fmt::init();

 // Create shutdown channel
    let (_shutdown_tx, shutdown_rx) = broadcast::channel(1);

    // Create service
    let mut service = BlockMonitorService::new(evm_client, shutdown_rx);

    service.process_block_range(0, 100, Some(10)).await?;

    Ok(())

}


