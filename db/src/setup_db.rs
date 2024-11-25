use std::env;

use crate::{db::GenericDB, models::account::AccountModel};

use dotenv::dotenv;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct SurrealDb {
	pub surreal_db_url: String,
	pub surreal_db_user: String,
	pub surreal_db_pass: String,
}

impl SurrealDb {
	pub fn new(url: &str, username: &str, password: &str) -> Self {
		Self {
			surreal_db_url: url.to_string(),
			surreal_db_user: username.to_string(),
			surreal_db_pass: password.to_string(),
		}
	}

	pub async fn setup_account_db(&self) -> GenericDB<AccountModel> {
		dotenv().ok();

		let name_space =
			env::var("SURREALDB_NAMESPACE").ok().unwrap_or_else(|| "blockchain".to_string());
		let database = env::var("SURREALDB_DATABASE")
			.ok()
			.unwrap_or_else(|| "selendra_explorer".to_string());
		let table = env::var("SURREALDB_ACCOUNT_TABLE")
			.ok()
			.unwrap_or_else(|| "account".to_string());

		GenericDB::new(
			&self.surreal_db_url,
			&self.surreal_db_user,
			&self.surreal_db_pass,
			&name_space,
			&database,
			&table,
		)
		.await
		.expect("Failed to create DB")
	}
}
