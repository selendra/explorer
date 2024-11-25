use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
pub struct AccountModel {
	pub substrate_address: String,
	pub total: u128,
	pub free: u128,
	pub reserved: u128,
}
