pub mod archive_state;
pub mod command;
pub mod service;

use std::sync::Arc;

use anyhow::Result;
use clap::Parser;
use selendra_config::CONFIG;
use selendra_db::setup_db::SurrealDb;
use service::{EvmArciveService, SubstrateArciveService};
use tracing::info;
use command::{run_evm_services, run_substrate_services, ArchType, Args};

use selendra_rust_client::{EvmClient, SubstrateClient};

#[tokio::main]
async fn main() -> Result<()> {
	tracing_subscriber::fmt::init();

	// Parse command line arguments
	let args = Args::parse();

	let surrealdb = SurrealDb {
		surreal_db_url: CONFIG.surreal_db.url.clone(),
		surreal_db_user: CONFIG.surreal_db.user.clone(),
		surreal_db_pass: CONFIG.surreal_db.pass.clone(),
	};

	// Initialize your clients based on architecture
    let (evm_client, substrate_client) = match &args.arch {
        ArchType::Substrate(_) => {
            info!("Initializing Substrate architecture");
            (None, Some(SubstrateClient::new(&CONFIG.substrate_url).await?))
        }
        ArchType::Evm(_) => {
            info!("Initializing EVM architecture");
            (Some(EvmClient::new(&CONFIG.evm_url)?), None)
        }
    };

	 // Run services based on architecture
	 match args.arch {
        ArchType::Substrate(substrate_args) => {
			// Wrap service in Arc for thread-safe sharing
			let service = Arc::new(SubstrateArciveService::new(
				substrate_client.unwrap(),
				surrealdb,
			));
            run_substrate_services(substrate_args, service).await?;
        }
        ArchType::Evm(evm_args) => {
			let service = Arc::new(EvmArciveService::new(
				evm_client.unwrap(),
				surrealdb,
			));
            run_evm_services(evm_args, service).await?;
        }
    }

	Ok(())
}
