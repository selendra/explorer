use anyhow::Result;
use futures::StreamExt;
use std::collections::HashSet;
use tokio::time::{sleep, Duration};
use tracing::info;

use selendra_config::CONFIG;
use selendra_db::{models::account::SubstrateAccount, setup_db::SurrealDb};
use selendra_rust_client::SubstrateClient;

const MAX_RETRIES: u32 = 3;
const INITIAL_BACKOFF_MS: u64 = 1000; // 1 second
const MAX_CONCURRENT_REQUESTS: usize = 5; // Limit concurrent request

pub struct SubstrateArciveService {
	pub substrate_client: SubstrateClient,
	pub surreal_db: SurrealDb,
}

impl SubstrateArciveService {
	pub fn new(substrate_client: SubstrateClient, surreal_db: SurrealDb) -> Self {
		Self { substrate_client, surreal_db }
	}

	pub async fn process_block(&self) -> Result<()> {
		println!("testing process block");
		Ok(())
	}

	pub async fn process_account(&self) -> Result<()> {
		let db = self.surreal_db.setup_account_db().await;

		let mut accounts = self.substrate_client.get_all_accounts().await?;
		accounts = self.remove_duplicates(accounts);

		futures::stream::iter(accounts)
			.map(|account| {
				let db = db.clone();

				async move {
					match self.check_balance_with_retry(&account, MAX_RETRIES).await {
						Ok(Some(balance)) => {
							let id = format!("account_{}", account);
							if let Err(e) = db.insert_item(&id, balance).await {
								info!("Failed to insert account {}: {:?}", account, e);
							}
						},
						Ok(None) => {
							info!("Account {} has no balance", account);
						},
						Err(e) => {
							// Here we can convert the error to anyhow::Error if needed
							info!("Error checking balance for {}: {:?}", account, e);
						},
					}
				}
			})
			.buffer_unordered(MAX_CONCURRENT_REQUESTS)
			.collect::<Vec<_>>()
			.await;

		Ok(())
	}

	async fn check_balance_with_retry(
		&self,
		account: &str,
		retry_count: u32,
	) -> Result<Option<SubstrateAccount>> {
		// Keep the original error type
		let mut current_retry = 0;

		loop {
			match self.substrate_client.check_balance(account, None).await {
				Ok(Some(balance)) => {
					let free =
						self.convert_balance_to_float(balance.free, CONFIG.chain_decimal.into());
					let reserved = self
						.convert_balance_to_float(balance.reserved, CONFIG.chain_decimal.into());
					let lock =
						self.convert_balance_to_float(balance.lock, CONFIG.chain_decimal.into());
					let total = free + reserved;
					return Ok(Some(SubstrateAccount {
						substrate_address: account.to_string(),
						total,
						free,
						reserved,
						lock,
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

	fn remove_duplicates(&self, mut data: Vec<String>) -> Vec<String> {
		// Convert Vec to HashSet to remove duplicates
		let set: HashSet<_> = data.drain(..).collect();

		// Convert HashSet back to Vec
		let deduped: Vec<String> = set.into_iter().collect();

		deduped
	}

	fn convert_balance_to_float(&self, balance: u128, decimals: u32) -> f64 {
		let divisor = 10u128.pow(decimals) as f64;
		(balance as f64) / divisor
	}
}
