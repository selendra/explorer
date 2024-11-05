use selendra_runtime::RuntimeCall;
use serde::{Deserialize, Serialize};
use std::fmt::Debug;

#[derive(Debug, Serialize, Deserialize)]
pub struct BlockExtrinsic {
	pub total: u32,
	pub extrinsic: Vec<ExtrinsicDetail>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ExtrinsicDetail {
	pub index: u8,
	pub signer: String,
	pub is_signed: bool,
	pub hash: String,
	pub fee: u128,
	pub runtime_call: String,
}

pub struct ProcessExtrinsic {
	pub signer: String,
	pub function: RuntimeCall,
}
