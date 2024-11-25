use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
pub struct AccountModel {
	pub substrate_address: String,
	pub evm_address: String,
	pub balance: u128,
}
