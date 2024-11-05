use anyhow::{anyhow, Context, Result};
use codec::{Decode, Encode};

use pallet_staking::ActiveEraInfo;
use substrate_api_client::{
	ac_primitives::{Bytes, DefaultRuntimeConfig},
	rpc::JsonrpseeClient,
	Api, GetChainInfo, GetStorage, GetTransactionPayment,
};

use frame_system::Phase;
use selendra_primitives::Signature;
use selendra_runtime::{Address, RuntimeCall, SignedExtra};
use sp_core::{blake2_256, crypto::Ss58Codec};
use sp_runtime::generic::UncheckedExtrinsic;

use crate::models::{
	block::{BlockDetail, RuntimeVersion},
	event::{EventDetail, SubstrateEventRecord, BlockEvent},
	extrinsic::{BlockExtrinsic, ExtrinsicDetail, ProcessExtrinsic},
	Balance,
};

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
					.get_fee_details(&Bytes(extrinsic_byte.clone()), block_hash)
					.await
					.map_err(|e| anyhow!("feching fee error {:?}", e))?;

				let total_fee = fee_details.map(|fee| fee.final_fee()).unwrap_or_else(|| 0);
				let is_signed = total_fee > 0;

				let process_extrinsic = self.process_extrinsic(extrinsic_byte.clone())?;

				block_extrinsic.push(ExtrinsicDetail {
					is_signed,
					signer: process_extrinsic.signer,
					index: index as u8,
					hash: extrinsic_hash,
					fee: total_fee,
					runtime_call: format!("{:?}", process_extrinsic.function).to_string(),
				});
			}

			let events = api.get_storage::<Vec::<SubstrateEventRecord>>("System", "Events", block_hash).await.unwrap().unwrap();
			let block_event = self.process_event(events)?;

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
				events: BlockEvent {
					total: event_count.map_or(0, |total| total),
					extrinsic: block_event
				},
				extrinsics: BlockExtrinsic {
					total: extrinsic_count.map_or(0, |total| total),
					extrinsic: block_extrinsic,
				},
				total_issuance: total_issuance.map_or(0, |total| total),
				timestamp: timestamp.map_or(0, |time| time),
			};

			return Ok(Some(block_data))
		} else {
			return Ok(None)
		}
	}

	fn process_extrinsic(&self, extrinsic_byte: Vec<u8>) -> Result<ProcessExtrinsic> {
		let decoded_extrinsic: Result<
			UncheckedExtrinsic<Address, RuntimeCall, Signature, SignedExtra>,
			_,
		> = Decode::decode(&mut &extrinsic_byte[..])
			.map_err(|e| anyhow!("decode extrinis error: {:?}", e));

		let signer_address = if let Ok(ref extrinsic) = decoded_extrinsic {
			extrinsic
				.signature
				.as_ref()
				.map(|(signer, _, _)| signer.to_ss58check())
				.unwrap_or_default()
		} else {
			String::new()
		};

		Ok(ProcessExtrinsic { signer: signer_address, function: decoded_extrinsic?.function })
	}

	fn process_event(&self, events: Vec<SubstrateEventRecord>) -> Result<Vec<EventDetail>> {
		let indexed_block_events: Vec<(usize, SubstrateEventRecord)> =
			events.into_iter().enumerate().collect();

		let mut block_events: Vec<EventDetail> = Vec::new();
		for (index, event) in indexed_block_events {
			let phase = match event.phase {
				Phase::ApplyExtrinsic(index) => index,
				_ => 0,
			};

			block_events.push(EventDetail {
				index: index as u32,
				extrinsic_id: phase,
				event: format!("{:?}", event.event),
			});
		}
		Ok(block_events)
	}
}
