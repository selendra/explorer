use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct SubstrateAccount {
	pub total: u128,
	pub free: u128,
	pub reserved: u128,
}
