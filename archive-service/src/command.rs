use std::{sync::Arc, thread};
use tokio::runtime::Runtime;

use anyhow::Result;
use clap::Parser;
use tracing::info;

use crate::service::{EvmArciveService, SubstrateArciveService};

#[derive(Parser, Debug)]
#[command(author, version, about, long_about = None)]
pub struct Args {
	#[command(subcommand)]
	pub arch: ArchType,
}

#[derive(clap::Subcommand, Debug)]
pub enum ArchType {
	Substrate(SubstrateArgs),
	Evm(EvmArgs),
}

#[derive(Parser, Debug)]
#[command(author, version, about, long_about = None)]
pub struct SubstrateArgs {
	#[arg(long)]
	account: bool,

	#[arg(long)]
	block: bool,
}

#[derive(Parser, Debug)]
#[command(author, version, about, long_about = None)]
pub struct EvmArgs {
	#[arg(long)]
	account: bool,

	#[arg(long)]
	block: bool,
}

pub async fn run_substrate_services(
	args: SubstrateArgs,
	service: Arc<SubstrateArciveService>,
) -> Result<()> {
	let mut handles = Vec::new();

	if args.account {
		info!("Starting substrate account service");
		let service_clone = Arc::clone(&service);
		let handle = thread::spawn(move || {
			let rt = Runtime::new().unwrap();
			rt.block_on(async {
				if let Err(e) = service_clone.process_account().await {
					eprintln!("Account service error: {}", e);
				}
			});
		});
		handles.push(handle);
	}

	if args.block {
		info!("Starting substrate block service");
		let service_clone = Arc::clone(&service);
		let handle = thread::spawn(move || {
			let rt = Runtime::new().unwrap();
			rt.block_on(async {
				if let Err(e) = service_clone.process_block().await {
					eprintln!("Block service error: {}", e);
				}
			});
		});
		handles.push(handle);
	}

	if handles.is_empty() {
		println!("No substrate services specified. Use --help to see available options.");
		return Ok(());
	}

	// Wait for all threads to complete
	for handle in handles {
		if let Err(e) = handle.join() {
			eprintln!("Thread panic: {:?}", e);
		}
	}

	Ok(())
}

pub async fn run_evm_services(
	args: EvmArgs,
	service: Arc<EvmArciveService>,
) -> Result<()> {
	let mut handles = Vec::new();

	if args.account {
		info!("Starting substrate account service");
		let service_clone = Arc::clone(&service);
		let handle = thread::spawn(move || {
			let rt = Runtime::new().unwrap();
			rt.block_on(async {
				if let Err(e) = service_clone.process_account().await {
					eprintln!("Account service error: {}", e);
				}
			});
		});
		handles.push(handle);
	}

	if args.block {
		info!("Starting EVM block service");
		let service_clone = Arc::clone(&service);
		let handle = thread::spawn(move || {
			let rt = Runtime::new().unwrap();
			rt.block_on(async {
				// Use regular lock() for std::sync::Mutex
				if let Err(e) = { service_clone.process_block_range(0, 100, None).await } {
					eprintln!("Block service error: {}", e);
				}
			});
		});
		handles.push(handle);
	}

	if handles.is_empty() {
		println!("No substrate services specified. Use --help to see available options.");
		return Ok(());
	}

	// Wait for all threads to complete
	for handle in handles {
		if let Err(e) = handle.join() {
			eprintln!("Thread panic: {:?}", e);
		}
	}

	Ok(())
}
