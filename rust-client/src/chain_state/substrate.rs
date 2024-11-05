use std::fmt::Debug;

use anyhow::{anyhow, Context, Result};
use serde::{Deserialize, Serialize};
use codec::{Decode, Encode};

use pallet_staking::ActiveEraInfo;
use substrate_api_client::{
	ac_primitives::{Config, DefaultRuntimeConfig,Bytes }, rpc::JsonrpseeClient, Api, GetChainInfo, GetStorage, GetTransactionPayment,
};

use frame_system::Phase;
use sp_core::{blake2_256, H256};
use sp_runtime::generic::UncheckedExtrinsic;
use selendra_runtime::{RuntimeEvent, Address, RuntimeCall, SignedExtra};
use selendra_primitives::Signature;

type Balance = <DefaultRuntimeConfig as Config>::Balance;

#[allow(dead_code)]
#[derive(Debug, Decode, Encode)]
pub struct EventRecord {
    pub phase: Phase,
    pub event: RuntimeEvent,
    pub topics: Vec<H256>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct EventDetail {
	pub block_number: u32,
	pub event_index: u16,
	pub phase: u16,
	pub section: String,
	pub method: String,
	pub types: String,
	pub doc: String,
    pub data: String,
}


#[derive(Debug, Serialize, Deserialize)]
pub struct RuntimeVersion {
	pub spec_name: String,
	pub impl_name: String,
	pub authoring_version: u32,
	pub spec_version: u32,
	pub impl_version: u32,
	pub transaction_version: u32,
	pub state_version: u8,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct BlockExtrinsic {
	pub total: u32,
	pub extrinsic:Vec<ExtrinsicDetail>
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ExtrinsicDetail {
	pub index: u8,
	pub is_signed: bool,
	pub hash: String,
	pub fee: u128,
	pub byte: Vec<u8>
}

#[derive(Debug, Serialize, Deserialize)]
pub struct BlockDetail {
	pub block_number: u32,
	pub block_hash: String,
	pub parent_hash: String,
	pub extrinsics_root: String,
	pub activ_era: u32,
	pub session_index: u32,
	pub state_root: String,
	pub runtime_version: RuntimeVersion,
	pub total_issuance: Balance,
	pub total_event: u32,
	pub extrinsics: BlockExtrinsic,
	pub timestamp: u64,
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
			let mut block_extrinsic: Vec<ExtrinsicDetail> = Vec::new();

			for (index, extrinsic) in block.extrinsics.iter().enumerate() {
				let extrinsic_byte = extrinsic.encode();
				let extrinsic_hash = format!("0x{}", hex::encode(blake2_256(&extrinsic_byte)));
				let fee_details = api
					.get_fee_details(&Bytes(extrinsic_byte.clone()), block_hash).await.map_err(|e| anyhow!("feching fee error {:?}", e))?;

				let total_fee = fee_details.map(|fee| fee.final_fee()).unwrap_or_else(|| 0);
				let is_signed = total_fee > 0;

				let detail = ExtrinsicDetail {
					is_signed,
					index: index as u8,
					hash: extrinsic_hash,
					fee: total_fee,
					byte: extrinsic_byte,
				};

				block_extrinsic.push(detail);

			}

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
				extrinsics: BlockExtrinsic {
					total: extrinsic_count.map_or(0, |total| total),
					extrinsic: block_extrinsic,
				},
				timestamp: timestamp.map_or(0, |time| time),
			};

			return Ok(Some(block_data))
		} else {
			return Ok(None)
		}
	}

	pub async fn process_extrinsic(&self, extrinsic_byte: Vec<u8>) -> Result<()> {
		let _decoded_extrinsic: Result<UncheckedExtrinsic<Address, RuntimeCall, Signature, SignedExtra>, _> =
				Decode::decode(&mut &extrinsic_byte[..]);
		
		Ok(())
		
	}

	pub async fn get_event(&self, block_numer: u32)-> Result<()> {
		let api = self.api.as_ref().context("API client not initialized")?;

		let block_hash = api
			.get_block_hash(Some(block_numer))
			.await
			.map_err(|e| anyhow!("Fetching blockHash Error{:?}", e))?;

		let events = api.get_storage::<Vec::<EventRecord>>("System", "Events", block_hash).await.unwrap().unwrap();

		let indexed_block_events: Vec<(usize, EventRecord)> = events
			.into_iter()
			.enumerate()
			.collect();

		for (_index, event) in indexed_block_events {
			let _phase = match event.phase {
				Phase::ApplyExtrinsic(index) => index,
				_ => 0
			};

			println!("{:?}", event.event)
		}
		Ok(())
	}

}


// pub fn process_event(event: RuntimeEvent) {
//     match event {
//         RuntimeEvent::Balances(balance_event) => {
//             match balance_event {
//                 pallet_balances::Event::Transfer { from, to, amount } => {
//                     println!("Transfer event: from: {:?}, to: {:?}, amount: {:?}", from, to, amount);
//                 },
//                 _ => println!("Other Balances event"),
//             }
//         },
//         RuntimeEvent::Staking(staking_event) => {
//             match staking_event {
//                 pallet_staking::Event::Rewarded { stash, amount, dest } => {
//                     println!("Reward event: stash: {:?}, amount: {:?}, dest {:?}", stash, amount, dest);
//                 },
//                 _ => println!("Other Staking event"),
//             }
//         },
//         _ => {
//             let event_string = format!("{:?}", event).to_string(); // Convert to String
//             println!("Other RuntimeEvent: {}", event_string);
//         },
//     }
// }