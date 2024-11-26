use std::env;

use crate::{db::GenericDB, models::account::SubstrateAccount};

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

	pub async fn setup_account_db(&self) -> GenericDB<SubstrateAccount> {
		dotenv().ok();

		let name_space =
			env::var("SURREALDB_NAMESPACE").ok().unwrap_or_else(|| "blockchain".to_string());
		let database = env::var("SURREALDB_DATABASE")
			.ok()
			.unwrap_or_else(|| "selendra_explorer".to_string());
		let table = env::var("SURREALDB_ACCOUNT_TABLE")
			.ok()
			.unwrap_or_else(|| "account".to_string());

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

		// Define the schema with string type for u128 fields
        let schema = format!(
            r#"
            DEFINE TABLE {} SCHEMAFULL;
            DEFINE FIELD substrate_address ON {} TYPE string;
            DEFINE FIELD total ON {} TYPE string ASSERT $value != NONE;
            DEFINE FIELD free ON {} TYPE string ASSERT $value != NONE;
            DEFINE FIELD reserved ON {} TYPE string ASSERT $value != NONE;
            DEFINE FIELD lock ON {} TYPE string ASSERT $value != NONE;
            "#,
            table, table, table, table, table, table
        );

        // Execute the schema definition
        db.db.query(schema).await.expect("Failed to define schema");

		db
	}
}
