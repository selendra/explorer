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

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct TransactionDetail {
	pub transaction_hash: String, // hash
	pub status: bool,             // self.provider.get_transaction_receipt(hash).status
	pub from: String,
	pub to: String,
	pub is_contract: bool,
	pub amount: u128, // value
	pub gas_price: u128,
	pub gas_use: u64, // self.provider.get_transaction_receipt(hash).gas_used
	pub other: OtherTx,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct OtherTx {
	pub transation_type: u32, // transaction_type
	pub nonce: u64,
	pub index: u32, // transaction_index
}
