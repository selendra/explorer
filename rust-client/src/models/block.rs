use serde::{Deserialize, Serialize};
use std::fmt::Debug;

use super::{
	event::BlockEvent,
	extrinsic::{BlockExtrinsic, TransactionDetail},
	gas::BlockGas,
	Balance,
};

#[derive(Debug, Serialize, Deserialize)]
pub struct SubstrateRuntimeVersion {
	pub spec_name: String,
	pub impl_name: String,
	pub authoring_version: u32,
	pub spec_version: u32,
	pub impl_version: u32,
	pub transaction_version: u32,
	pub state_version: u8,
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
	pub runtime_version: SubstrateRuntimeVersion,
	pub total_issuance: Balance,
	pub events: BlockEvent,
	pub extrinsics: BlockExtrinsic,
	pub timestamp: u64,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct EvmBlock {
	pub block_numer: u64,
	pub block_hash: String,
	pub transactions: Vec<TransactionDetail>,
	pub timestamp: u64,
	pub size: u64,
	pub nonce: String,
	pub gas: BlockGas,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct LatestBlock {
	pub block_number: u64,
	pub timestamp: u64,
	pub number_of_tx: u16,
}
