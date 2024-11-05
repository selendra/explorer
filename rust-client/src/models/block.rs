use serde::{Deserialize, Serialize};
use std::fmt::Debug;

use super::{event::BlockEvent, extrinsic::BlockExtrinsic, Balance};

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
	pub events: BlockEvent,
	pub extrinsics: BlockExtrinsic,
	pub timestamp: u64,
}
