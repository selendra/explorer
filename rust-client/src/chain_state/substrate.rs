use crate::models::{
	account::SubstrateAccount,
	block::{BlockDetail, SubstrateRuntimeVersion},
	event::{BlockEvent, EventDetail, StakingSlash, SubstrateEventRecord, TransferEvent},
	extrinsic::{BlockExtrinsic, ExtrinsicDetail, ProcessExtrinsic},
	identity::SubstrateIdentity,
	staking::{EraStaking, ValidatorDetail},
	Balance, MaxAdditionalFields, MaxJudgements,
};

use anyhow::{anyhow, Ok, Result};
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
use sp_core::{blake2_256, crypto::Ss58Codec, storage::StorageKey};
use sp_runtime::{
	generic::{Block, Header, UncheckedExtrinsic},
	traits::BlakeTwo256,
	AccountId32, OpaqueExtrinsic,
};
use sp_staking::PagedExposureMetadata;

use pallet_balances::AccountData;
use pallet_identity::{legacy::IdentityInfo, Data, Judgement, Registration};
use pallet_staking::{ActiveEraInfo, EraRewardPoints, ValidatorPrefs};

pub struct SubstrateClient {
	pub api: Api<DefaultRuntimeConfig, JsonrpseeClient>,
}

impl SubstrateClient {
	pub async fn new(ws_url: &str) -> Result<Self> {
		let client = JsonrpseeClient::new(ws_url)
			.map_err(|e| anyhow!("Failed to connect to WebSocket at {}: {:?}", ws_url, e))?;
		let api = Api::<DefaultRuntimeConfig, _>::new(client)
			.await
			.map_err(|e| anyhow!("Failed to create API client: {:?}", e))?;

		Ok(Self { api })
	}

	pub async fn get_block(&self, block_number: u32) -> Result<Option<BlockDetail>> {
		let block_hash = self.get_block_hash(block_number).await?;
		let runtime_version = self.api.runtime_version();

		let (
			block,
			era_info,
			session_index,
			total_issuance,
			event_count,
			extrinsic_count,
			timestamp,
		) = try_join!(
			self.api.get_block(block_hash),
			self.api.get_storage::<ActiveEraInfo>("Staking", "ActiveEra", block_hash),
			self.api.get_storage::<u32>("Session", "CurrentIndex", block_hash),
			self.api.get_storage::<Balance>("Balances", "TotalIssuance", block_hash),
			self.api.get_storage::<u32>("System", "EventCount", block_hash),
			self.api.get_storage::<u32>("System", "ExtrinsicCount", block_hash),
			self.api.get_storage::<u64>("Timestamp", "Now", block_hash),
		)
		.map_err(|e| anyhow!("Error fetching block data: {:?}", e))?;

		if let Some(block) = block {
			let block_extrinsics = self.process_extrinsics(&block, block_hash).await?;
			let events = self
				.api
				.get_storage::<Vec<SubstrateEventRecord>>("System", "Events", block_hash)
				.await
				.map_err(|e| anyhow!("Error fetching events: {:?}", e))?
				.unwrap_or_default();

			let block_events = self.process_event(events)?;
			let block_data = BlockDetail {
				block_number: block.header.number,
				block_hash: format!("0x{}", hex::encode(block.header.hash())),
				parent_hash: format!("0x{}", hex::encode(block.header.parent_hash)),
				extrinsics_root: format!("0x{}", hex::encode(block.header.extrinsics_root)),
				activ_era: era_info.map_or(0, |era| era.index),
				session_index: session_index.unwrap_or_default(),
				state_root: format!("0x{}", hex::encode(block.header.state_root)),
				runtime_version: self.build_runtime_version(&runtime_version),
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
		let block_hash = if let Some(block_number) = block_number {
			self.get_block_hash(block_number).await?
		} else {
			None
		};

		let current_era = self
			.api
			.get_storage::<ActiveEraInfo>("Staking", "ActiveEra", block_hash)
			.await
			.map_err(|e| anyhow!("Error fetching active era: {:?}", e))?
			.map_or(0, |era| era.index);

		let (validators, mini_active_stake, total_validator, active_validators, active_nominators) =
			try_join!(
				self.api.get_storage_map::<u32, EraRewardPoints<AccountId32>>(
					"Staking",
					"ErasRewardPoints",
					current_era,
					block_hash,
				),
				self.api.get_storage::<u128>("Staking", "MinimumActiveStake", block_hash),
				self.api.get_storage::<u32>("Staking", "ValidatorCount", block_hash),
				self.api.get_storage::<u32>("Staking", "CounterForValidators", block_hash),
				self.api.get_storage::<u32>("Staking", "CounterForNominators", block_hash),
			)
			.map_err(|e| anyhow!("Error fetching validator data: {:?}", e))?;

		let era_validators = if let Some(validators) = validators {
			let futures: FuturesUnordered<_> = validators.individual.into_iter().map(|(account_id, points)| {
                let api = self.api.clone();
                async move {
                    let (validator_commission, validator_info) = try_join!(
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
                    .map_err(|e| anyhow!("Error fetching validator data: {:?}", e))?;

                    let info = validator_info.unwrap_or(PagedExposureMetadata { total: 0, own: 0, nominator_count: 0, page_count: 0 });
                    Ok(ValidatorDetail {
                        account: account_id.to_ss58check(),
                        validators_commission: validator_commission.map_or("0%".to_string(), |vc| format!("{:?}", vc.commission)),
                        nominator_count: info.nominator_count,
                        total_staking: info.total,
                        own_staking: info.own,
                        active_point: points,
                    })
                }
            }).collect();

			futures
				.filter_map(|result: Result<ValidatorDetail>| async { result.ok() })
				.collect()
				.await
		} else {
			Vec::new()
		};

		Ok(EraStaking {
			era: current_era,
			minimum_stake: mini_active_stake.unwrap_or(0),
			total_validators: total_validator.unwrap_or(0),
			active_validators: active_validators.unwrap_or(0),
			active_mominators: active_nominators.unwrap_or(0),
			validators: era_validators,
		})
	}

	pub async fn get_account_identity(&self, address: &str) -> Result<Option<SubstrateIdentity>> {
		let account_id = self.convert_ss58_to_account_id32(address)?;
		let identity_info = self.api
            .get_storage_map::<AccountId32, Registration<Balance, MaxJudgements, IdentityInfo<MaxAdditionalFields>>>("Identity", "IdentityOf", account_id, None)
            .await
            .map_err(|e| anyhow!("Failed to get account identity: {:?}", e))?;

		if let Some(info) = identity_info {
			let judgement = info
				.judgements
				.into_iter()
				.map(|(_, j)| match j {
					Judgement::Erroneous => "Erroneous",
					Judgement::Unknown => "Unknown",
					Judgement::FeePaid(_) => "FeePaid",
					Judgement::Reasonable => "Reasonable",
					Judgement::KnownGood => "KnownGood",
					Judgement::OutOfDate => "OutOfDate",
					Judgement::LowQuality => "LowQuality",
				})
				.next()
				.unwrap_or("Unknown")
				.to_string();

			Ok(Some(SubstrateIdentity {
				display_name: self.data_to_string(info.info.display),
				legal_name: self.data_to_string(info.info.legal),
				web: self.data_to_string(info.info.web),
				riot: self.data_to_string(info.info.riot),
				email: self.data_to_string(info.info.email),
				twitter: self.data_to_string(info.info.twitter),
				image: self.data_to_string(info.info.image),
				judgement: Some(judgement),
			}))
		} else {
			Ok(None)
		}
	}

	pub async fn get_accounts(
		&self,
		query_size: u32,
		start_at: Option<StorageKey>,
	) -> Result<Vec<String>> {
		let prefix_key = self
			.api
			.get_storage_map_key_prefix("System", "Account")
			.await
			.map_err(|e| anyhow!("Error fetching storage prefix: {:?}", e))?;

		let account_keys = self
			.api
			.get_storage_keys_paged(Some(prefix_key), query_size, start_at, None)
			.await
			.map_err(|e| anyhow!("Error fetching storage keys: {:?}", e))?;

		account_keys
			.into_iter()
			.map(|key| {
				let account_id = AccountId32::decode(&mut &key.0[48..])
					.map_err(|_| anyhow!("Failed to decode account ID"))?;
				Ok(account_id.to_ss58check())
			})
			.collect()
	}

	pub async fn get_all_accounts(&self) -> Result<Vec<String>> {
		let mut accounts = Vec::new();
		let mut start_key: Option<StorageKey> = None;
		let page_size = 1000;

		loop {
			let page_accounts = self.get_accounts(page_size, start_key.clone()).await?;
			if page_accounts.is_empty() {
				break;
			}
			accounts.extend(page_accounts);

			start_key = self
				.api
				.get_storage_keys_paged(None, page_size, start_key.clone(), None)
				.await
				.map_err(|_| anyhow!("Error fetching storage keys"))?
				.last()
				.cloned();
		}

		Ok(accounts)
	}

	pub async fn check_balance(
		&self,
		account_ss58: &str,
		block_number: Option<u32>,
	) -> Result<Option<SubstrateAccount>> {
		let block_hash = if let Some(number) = block_number {
			self.get_block_hash(number).await.map_err(|_| anyhow!("Error block hash"))?
		} else {
			None
		};

		let account_id: AccountId32 = AccountId32::from_ss58check(account_ss58)?;

		let account_data = self
			.api
			.get_storage_map::<AccountId32, AccountData<u128>>(
				"System",
				"Account",
				account_id.clone(),
				block_hash,
			)
			.await
			.map_err(|e| anyhow!("Failed to get account identity: {:?}", e))?;

		if let Some(account_data) = account_data {
			Ok(Some(SubstrateAccount {
				total: account_data.free + account_data.reserved,
				free: account_data.free,
				reserved: account_data.reserved,
			}))
		} else {
			Ok(None)
		}
	}

	/// Convert SS58 address to EVM address (H160)
	pub fn ss58_to_evm(&self, ss58_address: &str) -> Result<String> {
		let account = AccountId32::from_ss58check(ss58_address)?;

		let bytes: &[u8; 32] = <AccountId32 as AsRef<[u8; 32]>>::as_ref(&account);

		// Take first 20 bytes for EVM address
		Ok(format!("0x{}", hex::encode(&bytes[..20])))
	}

	async fn get_block_hash(&self, block_number: u32) -> Result<Option<Hash>> {
		self.api
			.get_block_hash(Some(block_number))
			.await
			.map_err(|e| anyhow!("Error fetching block hash: {:?}", e))
	}

	async fn process_extrinsics(
		&self,
		block: &Block<Header<u32, BlakeTwo256>, OpaqueExtrinsic>,
		block_hash: Option<Hash>,
	) -> Result<Vec<ExtrinsicDetail>> {
		let mut extrinsics = Vec::new();

		for (index, extrinsic) in block.extrinsics.iter().enumerate() {
			let extrinsic_byte = extrinsic.encode();
			let extrinsic_hash = format!("0x{}", hex::encode(blake2_256(&extrinsic_byte)));
			let fee_details = self
				.api
				.get_fee_details(&Bytes(extrinsic_byte.clone()), block_hash)
				.await
				.map_err(|e| anyhow!("Error fetching fee details: {:?}", e))?;
			let total_fee = fee_details.map_or(0, |fee| fee.final_fee());
			let is_signed = total_fee > 0;

			let processed_extrinsic = self.process_extrinsic(extrinsic_byte)?;
			extrinsics.push(ExtrinsicDetail {
				is_signed,
				signer: processed_extrinsic.signer,
				index: index as u8,
				hash: extrinsic_hash,
				fee: total_fee,
				runtime_call: format!("{:?}", processed_extrinsic.function),
			});
		}
		Ok(extrinsics)
	}

	fn process_extrinsic(&self, extrinsic_byte: Vec<u8>) -> Result<ProcessExtrinsic> {
		let decoded_extrinsic: UncheckedExtrinsic<Address, RuntimeCall, Signature, SignedExtra> =
			Decode::decode(&mut &extrinsic_byte[..])
				.map_err(|e| anyhow!("Error decoding extrinsic: {:?}", e))?;
		let signer_address = decoded_extrinsic
			.signature
			.as_ref()
			.map(|(signer, _, _)| signer.to_ss58check())
			.unwrap_or_default();

		Ok(ProcessExtrinsic { signer: signer_address, function: decoded_extrinsic.function })
	}

	fn process_event(&self, events: Vec<SubstrateEventRecord>) -> Result<Vec<EventDetail>> {
		events
			.into_iter()
			.enumerate()
			.map(|(index, event)| {
				let phase = match event.phase {
					Phase::ApplyExtrinsic(index) => index,
					_ => 0,
				};
				Ok(EventDetail {
					index: index as u32,
					extrinsic_id: phase,
					event: format!("{:?}", event.event),
					slash_event: self.process_slash_event(event.event.clone())?,
					transfer_event: self.process_transfer_event(event.event)?,
				})
			})
			.collect()
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
			.map_err(|e| anyhow!("Error converting SS58 to AccountId32: {:?}", e))
	}

	fn data_to_string(&self, data: Data) -> Option<String> {
		if let Data::Raw(bound_vec) = data {
			String::from_utf8(bound_vec.to_vec()).ok()
		} else {
			None
		}
	}
}
