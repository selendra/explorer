// config.rs
use dotenv::dotenv;
use once_cell::sync::Lazy;
use std::env;

// Static configuration values
pub static CONFIG: Lazy<Config> = Lazy::new(|| {
	dotenv().ok();
	Config::load_from_env()
});

#[derive(Debug, Clone)]
pub struct Config {
	pub evm_url: String,
	pub substrate_url: String,
	pub chain_decimal: u16,
	pub surreal_db: SurrealDbConfig,
	pub rest_api: AxtixWebConfig,
}

#[derive(Debug, Clone)]
pub struct SurrealDbConfig {
	pub url: String,
	pub user: String,
	pub pass: String,
	pub namespace: String,
	pub database: String,
	pub account_table: String,
}

#[derive(Debug, Clone)]
pub struct AxtixWebConfig {
	pub url: String,
	pub port: u16,
}

impl Config {
	fn load_from_env() -> Self {
		Self {
			evm_url: env::var("RPC_URL").expect("RPC_URL must be set"),
			substrate_url: env::var("WS_URL").expect("WS_URL must be set"),
			chain_decimal: env::var("CHAIN_DECIMAL")
				.as_deref()
				.unwrap_or("18")
				.parse::<u16>()
				.expect("Should be number: 18"),
			surreal_db: SurrealDbConfig::load_from_env(),
			rest_api: AxtixWebConfig::load_from_env(),
		}
	}
}

impl SurrealDbConfig {
	fn load_from_env() -> Self {
		Self {
			url: env::var("SURREALDB_URL").expect("SURREALDB_URL must be set"),
			user: env::var("SURREALDB_USER").expect("SURREALDB_USER must be set"),
			pass: env::var("SURREALDB_PASS").expect("SURREALDB_PASS must be set"),
			namespace: env::var("SURREALDB_NAMESPACE").unwrap_or_else(|_| "blockchain".to_string()),
			database: env::var("SURREALDB_DATABASE")
				.unwrap_or_else(|_| "selendra_explorer".to_string()),
			account_table: env::var("SURREALDB_ACCOUNT_TABLE")
				.unwrap_or_else(|_| "account".to_string()),
		}
	}
}

impl AxtixWebConfig {
	fn load_from_env() -> Self {
		Self {
			url: env::var("REST_API_URL").unwrap_or_else(|_| "127.0.0.1".to_string()),
			port: env::var("REST_API_PORT")
				.as_deref()
				.unwrap_or("8080")
				.parse::<u16>()
				.expect("Should be number: 8080"),
		}
	}
}
