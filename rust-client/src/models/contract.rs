use serde::{Deserialize, Serialize};
use std::collections::HashMap;

use super::gas::TransactionGas;

#[derive(Debug, Serialize, Deserialize)]
pub struct ERC20Transaction {
	pub transaction_type: String,
	pub method_name: String,
	pub hash: String,
	pub block_number: u64,
	pub status: bool,
	pub native_value: u128,
	pub token_value: u128,
	pub transaction_gas: TransactionGas,
	pub token_info: Erc20Info,
	pub decoded_data: HashMap<String, String>,
	pub error_message: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Erc20Info {
	pub name: String,
	pub symbol: String,
	pub decimals: u8,
}
