use serde::{Deserialize, Serialize};

use crate::{db::GenericDB, models::account::AccountModel};

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

	pub async fn setup_account_db(
		&self,
		name_space: Option<&str>,
		database: Option<&str>,
		table: Option<&str>,
	) -> GenericDB<AccountModel> {
		let name_space = name_space.unwrap_or("blockchain");
		let database = database.unwrap_or("selendra_explorer");
		let table = table.unwrap_or("account");

		GenericDB::new(
			&self.surreal_db_url,
			&self.surreal_db_user,
			&self.surreal_db_pass,
			name_space,
			database,
			table,
		)
		.await
		.expect("Failed to create DB")
	}
}
