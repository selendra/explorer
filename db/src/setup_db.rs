use serde::{Deserialize, Serialize};

use crate::{db::GenericDB, models::account::SubstrateAccount};

use selendra_config::CONFIG;

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

	pub async fn setup_account_db(&self) -> GenericDB<SubstrateAccount> {
		let name_space = &CONFIG.surreal_db.namespace;
		let database = &CONFIG.surreal_db.database;
		let table = &CONFIG.surreal_db.account_table;

		let db = GenericDB::new(
			&self.surreal_db_url,
			&self.surreal_db_user,
			&self.surreal_db_pass,
			&name_space,
			&database,
			&table,
		)
		.await
		.expect("Failed to create DB");

		// Define the schema with float type for balance fields
		let schema = format!(
			r#"
            DEFINE TABLE {} SCHEMAFULL;
            DEFINE FIELD substrate_address ON {} TYPE string;
            DEFINE FIELD total ON {} TYPE float;
            DEFINE FIELD free ON {} TYPE float;
            DEFINE FIELD reserved ON {} TYPE float;
            DEFINE FIELD lock ON {} TYPE float;
            "#,
			table, table, table, table, table, table
		);

		// Execute the schema definition
		db.db.query(schema).await.expect("Failed to define schema");

		db
	}
}
