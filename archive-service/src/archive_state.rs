use std::time::Instant;
use tracing::info;

#[derive(Debug)]
pub struct ProcessingStats {
	pub processed_blocks: u64,
	pub failed_blocks: u64,
	pub start_time: Instant,
	pub start_block: u64,
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
