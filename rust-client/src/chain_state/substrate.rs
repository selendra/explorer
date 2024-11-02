use anyhow::{anyhow, Context, Result};
use serde::{Deserialize, Serialize};

use pallet_staking::ActiveEraInfo;
use substrate_api_client::{
	ac_primitives::{Config, DefaultRuntimeConfig},
	rpc::JsonrpseeClient,
	Api, GetChainInfo, GetStorage,
};

type Balance = <DefaultRuntimeConfig as Config>::Balance;

#[derive(Debug, Serialize, Deserialize)]
pub struct RuntimeVersion {
	spec_name: String,
	impl_name: String,
	authoring_version: u32,
	spec_version: u32,
	impl_version: u32,
	transaction_version: u32,
	state_version: u8,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct BlockDetail {
	block_number: u32,
	block_hash: String,
	parent_hash: String,
	extrinsics_root: String,
	activ_era: u32,
	session_index: u32,
	state_root: String,
	runtime_version: RuntimeVersion,
	total_issuance: Balance,
	total_event: u32,
	total_extrinsic: u32,
	timestamp: u64,
}

pub struct SubstrateClient {
	ws_url: String,
	api: Option<Api<DefaultRuntimeConfig, JsonrpseeClient>>,
}

impl SubstrateClient {
	pub fn new(ws_url: &str) -> Self {
		Self { ws_url: ws_url.to_string(), api: None }
	}

	pub async fn connect(&mut self) -> Result<()> {
		let client = JsonrpseeClient::new(&self.ws_url)
			.map_err(|e| anyhow!("Failed to connect to WebSocket: {:?}", e))?;

		self.api = Some(
			Api::<DefaultRuntimeConfig, _>::new(client)
				.await
				.map_err(|e| anyhow!("Failed to create API: {:?}", e))?,
		);

		Ok(())
	}

	pub async fn get_block(&self, block_numer: u32) -> Result<Option<BlockDetail>> {
		let api = self.api.as_ref().context("API client not initialized")?;

		let runtime_version = api.runtime_version();

		let block_hash = api
			.get_block_hash(Some(block_numer))
			.await
			.map_err(|e| anyhow!("Fetching blockHash Error{:?}", e))?;

		let (block, era_info, session_index, total_issuance) = futures::future::try_join4(
			api.get_block(block_hash),
			api.get_storage::<ActiveEraInfo>("Staking", "ActiveEra", block_hash),
			api.get_storage::<u32>("Session", "CurrentIndex", block_hash),
			api.get_storage::<Balance>("Balances", "TotalIssuance", block_hash),
		)
		.await
		.map_err(|e| anyhow::anyhow!("feching Block data error: {:?}", e))?;

		let (event_count, extrinsic_count, timestamp) = futures::future::try_join3(
			api.get_storage::<u32>("System", "EventCount", block_hash),
			api.get_storage::<u32>("System", "ExtrinsicCount", block_hash),
			api.get_storage::<u64>("Timestamp", "Now", block_hash),
		)
		.await
		.map_err(|e| anyhow!("feching data error: {:?}", e))?;

		if let Some(block) = block {
			let block_data = BlockDetail {
				block_number: block.header.number,
				block_hash: block.header.hash().to_string(),
				parent_hash: block.header.parent_hash.to_string(),
				extrinsics_root: block.header.extrinsics_root.to_string(),
				activ_era: era_info.map_or(0, |era| era.index),
				session_index: session_index.map_or(0, |index| index),
				state_root: block.header.state_root.to_string(),
				runtime_version: RuntimeVersion {
					spec_name: runtime_version.spec_name.to_string(),
					impl_name: runtime_version.impl_name.to_string(),
					authoring_version: runtime_version.authoring_version,
					spec_version: runtime_version.spec_version,
					impl_version: runtime_version.impl_version,
					transaction_version: runtime_version.transaction_version,
					state_version: runtime_version.state_version,
				},
				total_issuance: total_issuance.map_or(0, |total| total),
				total_event: event_count.map_or(0, |total| total),
				total_extrinsic: extrinsic_count.map_or(0, |total| total),
				timestamp: timestamp.map_or(0, |time| time),
			};

			return Ok(Some(block_data))
		} else {
			return Ok(None)
		}
	}
}

// use frame_system::Phase;
// use codec::{Decode, Encode};
// use sp_core::H256;
// use selendra_runtime::RuntimeEvent;

// #[derive(Debug, Decode)]
// struct EventRecord {
//     phase: Phase,
//     event: RuntimeEvent,
//     topics: Vec<H256>,
// }

// let event = api.get_storage::<Vec::<EventRecord>>("System", "Events", block_hash).await.unwrap().unwrap()
// for event in events {
//    println!("{:?}", event);
// }
