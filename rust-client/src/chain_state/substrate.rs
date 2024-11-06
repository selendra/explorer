use anyhow::{anyhow, Result};
use codec::{Decode, Encode};
use futures::{
	stream::{FuturesUnordered, StreamExt},
	try_join,
};

use substrate_api_client::{
	ac_primitives::{Bytes, DefaultRuntimeConfig, RuntimeVersion},
	rpc::JsonrpseeClient,
	Api, GetChainInfo, GetStorage, GetTransactionPayment,
};

use selendra_primitives::{Hash, Signature};
use selendra_runtime::{Address, RuntimeCall, RuntimeEvent, SignedExtra};

use frame_system::Phase;
use sp_core::{blake2_256, crypto::Ss58Codec};
use sp_runtime::{
	generic::{Block, Header, UncheckedExtrinsic},
	traits::BlakeTwo256,
	AccountId32, OpaqueExtrinsic,
};
use sp_staking::PagedExposureMetadata;

use pallet_identity::{legacy::IdentityInfo, Data, Judgement, Registration};
use pallet_staking::{ActiveEraInfo, EraRewardPoints, ValidatorPrefs};

use crate::models::{
	block::{BlockDetail, SubstrateRuntimeVersion},
	event::{BlockEvent, EventDetail, StakingSlash, SubstrateEventRecord, TransferEvent},
	extrinsic::{BlockExtrinsic, ExtrinsicDetail, ProcessExtrinsic},
	identity::SubstrateIdentity,
	staking::{EraStaking, ValidatorDetail},
	Balance, MaxAdditionalFields, MaxJudgements,
};

pub struct SubstrateClient {
	ws_url: String,
	api: Option<Api<DefaultRuntimeConfig, JsonrpseeClient>>,
}

impl SubstrateClient {
	pub fn new(ws_url: &str) -> Self {
		Self { ws_url: ws_url.to_string(), api: None }
	}

	/// Connects to the Substrate node via WebSocket and initializes the API.
	pub async fn connect(&mut self) -> Result<()> {
		let client = JsonrpseeClient::new(&self.ws_url)
			.map_err(|e| anyhow!("Failed to connect to WebSocket at {}: {:?}", self.ws_url, e))?;

		self.api = Some(
			Api::<DefaultRuntimeConfig, _>::new(client)
				.await
				.map_err(|e| anyhow!("Failed to create API client: {:?}", e))?,
		);

		Ok(())
	}

	pub async fn get_account_identity(&self, address: &str) -> Result<Option<SubstrateIdentity>> {
		let api = self.api.as_ref().ok_or_else(|| anyhow!("API client not initialized"))?;
		let account = self.convert_ss58_to_account_id32(address)?;

		if let Some(identity_info) = api.get_storage_map::<AccountId32, Registration<Balance, MaxJudgements, IdentityInfo<MaxAdditionalFields>>>
				("Identity", "IdentityOf", account, None)
				.await.map_err(|e| anyhow!("Failed to get account identity: {:?}", e))? 
		{
			let mut judgement_str: String = String::from("");
			for (_, judgement) in identity_info.judgements {
				judgement_str = match judgement {
					Judgement::Erroneous => "Erroneous".to_string(),
					Judgement::Unknown => "Unknown".to_string(),
					Judgement::FeePaid(_) => "FeePaid".to_string(),
					Judgement::Reasonable => "Reasonable".to_string(),
					Judgement::KnownGood => "KnownGood".to_string(),
					Judgement::OutOfDate => "OutOfDate".to_string(),
					Judgement::LowQuality => "LowQuality".to_string(),

				};
			};

			let info = identity_info.info;
			Ok(Some(SubstrateIdentity {
				display_name: self.data_to_string(info.display),
				legal_name: self.data_to_string(info.legal),
				web: self.data_to_string(info.web),
				riot: self.data_to_string(info.riot),
				email: self.data_to_string(info.email),
				twitter: self.data_to_string(info.twitter),
				image: self.data_to_string(info.image),
				judgement: Some(judgement_str),
			}))
		} else {
			Ok(None)
		}
	}

	/// Retrieves the block details for the given block number.
	pub async fn get_block(&self, block_number: u32) -> Result<Option<BlockDetail>> {
		let api = self.api.as_ref().ok_or_else(|| anyhow!("API client not initialized"))?;

		let block_hash = self.get_block_hash(api, block_number).await?;
		let runtime_version = api.runtime_version();

		let (
			block,
			era_info,
			session_index,
			total_issuance,
			event_count,
			extrinsic_count,
			timestamp,
		) = try_join!(
			api.get_block(block_hash),
			api.get_storage::<ActiveEraInfo>("Staking", "ActiveEra", block_hash),
			api.get_storage::<u32>("Session", "CurrentIndex", block_hash),
			api.get_storage::<Balance>("Balances", "TotalIssuance", block_hash),
			api.get_storage::<u32>("System", "EventCount", block_hash),
			api.get_storage::<u32>("System", "ExtrinsicCount", block_hash),
			api.get_storage::<u64>("Timestamp", "Now", block_hash),
		)
		.map_err(|e| anyhow!("feching data error: {:?}", e))?;

		if let Some(block) = block {
			let block_extrinsics = self.process_extrinsics(api, block.clone(), block_hash).await?;

			let events = api
				.get_storage::<Vec<SubstrateEventRecord>>("System", "Events", block_hash)
				.await
				.map_err(|e| anyhow!("Failed to create API client: {:?}", e))?;

			let block_events = match events {
				Some(event_data) => self.process_event(event_data)?,
				None => Vec::new(),
			};

			let block_data = BlockDetail {
				block_number: block.header.number,
				block_hash: block.header.hash().to_string(),
				parent_hash: block.header.parent_hash.to_string(),
				extrinsics_root: block.header.extrinsics_root.to_string(),
				activ_era: era_info.map_or(0, |era| era.index),
				session_index: session_index.unwrap_or_default(),
				state_root: block.header.state_root.to_string(),
				runtime_version: self.build_runtime_version(runtime_version),
				events: BlockEvent {
					total: event_count.unwrap_or_default(),
					extrinsic: block_events,
				},
				extrinsics: BlockExtrinsic {
					total: extrinsic_count.unwrap_or_default(),
					extrinsic: block_extrinsics,
				},
				total_issuance: total_issuance.unwrap_or_default(),
				timestamp: timestamp.unwrap_or_default(),
			};

			Ok(Some(block_data))
		} else {
			Ok(None)
		}
	}
	pub async fn get_validator(&self, block_number: Option<u32>) -> Result<EraStaking> {
		let api = self.api.as_ref().ok_or_else(|| anyhow!("API client not initialized"))?;

		let mut block_hash: Option<Hash> = None;
		if block_number.is_some() {
			block_hash = self.get_block_hash(api, block_number.map_or(0, |b| b)).await?;
		};

		// Fetch current era
		let current_era = api
			.get_storage::<ActiveEraInfo>("Staking", "ActiveEra", block_hash)
			.await
			.map_err(|e| anyhow!("{:?}", e))?
			.map_or(0, |era| era.index);

		// Fetch other staking-related details concurrently
		let (validators, mini_active_stake, total_validator, active_validators, active_nominators) =
			try_join!(
				api.get_storage_map::<u32, EraRewardPoints<AccountId32>>(
					"Staking",
					"ErasRewardPoints",
					current_era,
					block_hash,
				),
				api.get_storage::<u128>("Staking", "MinimumActiveStake", block_hash),
				api.get_storage::<u32>("Staking", "ValidatorCount", block_hash),
				api.get_storage::<u32>("Staking", "CounterForValidators", block_hash),
				api.get_storage::<u32>("Staking", "CounterForNominators", block_hash),
			)
			.map_err(|e| anyhow!("fetch validator data error: {:?}", e))?;

		// Collect validator details concurrently
		let futures = FuturesUnordered::new();
		if let Some(validators) = validators {
			for (account_id, points) in validators.individual {
				let api = api.clone();
				futures.push(async move {
					let (validators_commission, validators_info) = try_join!(
						api.get_storage_map::<AccountId32, ValidatorPrefs>(
							"Staking",
							"Validators",
							account_id.clone(),
							None,
						),
						api.get_storage_double_map::<u32, AccountId32, PagedExposureMetadata<Balance>>(
							"Staking",
							"ErasStakersOverview",
							current_era,
							account_id.clone(),
							block_hash,
						),
					)
					.map_err(|e| anyhow!("fetch validator data error: {:?}", e))?;

					let info = validators_info.unwrap_or(PagedExposureMetadata {
						total: 0,
						own: 0,
						nominator_count: 0,
						page_count: 0,
					});

					Ok(ValidatorDetail {
						account: account_id.to_ss58check(),
						validators_commission: validators_commission
							.map_or("0%".to_string(), |vc| format!("{:?}", vc.commission)),
						nominator_count: info.nominator_count,
						total_staking: info.total,
						own_staking: info.own,
						active_point: points,
					})
				});
			}
		}

		let era_validators: Vec<ValidatorDetail> = futures
			.filter_map(|result: Result<ValidatorDetail, anyhow::Error>| async move { result.ok() })
			.collect()
			.await;

		// Construct EraStaking
		let era_staking = EraStaking {
			era: current_era,
			minimum_stake: mini_active_stake.unwrap_or(0),
			total_validators: total_validator.unwrap_or(0),
			active_validators: active_validators.unwrap_or(0),
			active_mominators: active_nominators.unwrap_or(0),
			validators: era_validators,
		};

		Ok(era_staking)
	}

	async fn get_block_hash(
		&self,
		api: &Api<DefaultRuntimeConfig, JsonrpseeClient>,
		block_number: u32,
	) -> Result<Option<Hash>> {
		api.get_block_hash(Some(block_number)).await.map_err(|e| {
			anyhow!("Failed to fetch block hash for block number {}: {:?}", block_number, e)
		})
	}

	async fn process_extrinsics(
		&self,
		api: &Api<DefaultRuntimeConfig, JsonrpseeClient>,
		block: Block<Header<u32, BlakeTwo256>, OpaqueExtrinsic>,
		block_hash: Option<Hash>,
	) -> Result<Vec<ExtrinsicDetail>> {
		let mut block_extrinsics = Vec::new();

		for (index, extrinsic) in block.extrinsics.iter().enumerate() {
			let extrinsic_byte = extrinsic.encode();
			let extrinsic_hash = format!("0x{}", hex::encode(blake2_256(&extrinsic_byte)));
			let fee_details = api
				.get_fee_details(&Bytes(extrinsic_byte.clone()), block_hash)
				.await
				.map_err(|e| anyhow!("Fetching fee details failed: {:?}", e))?;
			let total_fee = fee_details.map_or(0, |fee| fee.final_fee());
			let is_signed = total_fee > 0;

			let processed_extrinsic = self.process_extrinsic(extrinsic_byte)?;

			block_extrinsics.push(ExtrinsicDetail {
				is_signed,
				signer: processed_extrinsic.signer,
				index: index as u8,
				hash: extrinsic_hash,
				fee: total_fee,
				runtime_call: format!("{:?}", processed_extrinsic.function),
			});
		}
		Ok(block_extrinsics)
	}

	fn process_extrinsic(&self, extrinsic_byte: Vec<u8>) -> Result<ProcessExtrinsic> {
		let decoded_extrinsic: Result<
			UncheckedExtrinsic<Address, RuntimeCall, Signature, SignedExtra>,
			_,
		> = Decode::decode(&mut &extrinsic_byte[..])
			.map_err(|e| anyhow!("Decoding extrinsic failed: {:?}", e));

		let signer_address = decoded_extrinsic
			.as_ref()
			.ok()
			.and_then(|extrinsic| {
				extrinsic.signature.as_ref().map(|(signer, _, _)| signer.to_ss58check())
			})
			.unwrap_or_default();

		Ok(ProcessExtrinsic { signer: signer_address, function: decoded_extrinsic?.function })
	}

	fn process_event(&self, events: Vec<SubstrateEventRecord>) -> Result<Vec<EventDetail>> {
		Ok(events
			.into_iter()
			.enumerate()
			.map(|(index, event)| {
				let phase = match event.phase {
					Phase::ApplyExtrinsic(index) => index,
					_ => 0,
				};

				EventDetail {
					index: index as u32,
					extrinsic_id: phase,
					event: format!("{:?}", event.event),
					slash_event: self.process_slash_event(event.event.clone()).unwrap_or(None),
					transfer_event: self
						.process_transfer_event(event.event.clone())
						.unwrap_or(None),
				}
			})
			.collect())
	}

	fn process_slash_event(&self, event: RuntimeEvent) -> Result<Option<StakingSlash>> {
		if let RuntimeEvent::Staking(pallet_staking::Event::Slashed { staker, amount }) = event {
			Ok(Some(StakingSlash { staker: staker.to_ss58check(), amount }))
		} else {
			Ok(None)
		}
	}

	fn process_transfer_event(&self, event: RuntimeEvent) -> Result<Option<TransferEvent>> {
		if let RuntimeEvent::Balances(pallet_balances::Event::Transfer { from, to, amount }) = event
		{
			Ok(Some(TransferEvent { from: from.to_ss58check(), to: to.to_ss58check(), amount }))
		} else {
			Ok(None)
		}
	}

	fn build_runtime_version(&self, runtime_version: &RuntimeVersion) -> SubstrateRuntimeVersion {
		SubstrateRuntimeVersion {
			spec_name: runtime_version.spec_name.to_string(),
			impl_name: runtime_version.impl_name.to_string(),
			authoring_version: runtime_version.authoring_version,
			spec_version: runtime_version.spec_version,
			impl_version: runtime_version.impl_version,
			transaction_version: runtime_version.transaction_version,
			state_version: runtime_version.state_version,
		}
	}

	fn convert_ss58_to_account_id32(&self, ss58_address: &str) -> Result<AccountId32> {
		AccountId32::from_ss58check(ss58_address)
			.map_err(|e| anyhow!("Failed to convert SS58 to AccountId32: {:?}", e))
	}

	fn data_to_string(&self, data: Data) -> Option<String> {
		if let Data::Raw(bound_vec) = data {
			String::from_utf8(bound_vec.to_vec()).ok()
		} else {
			None
		}
	}
}
