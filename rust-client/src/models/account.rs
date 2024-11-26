use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct SubstrateAccount {
	pub free: u128,
	pub reserved: u128,
	pub lock: u128,
}
