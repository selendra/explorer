use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
pub struct SubstrateAccount {
	pub substrate_address: String,
	pub total: f64,
	pub free: f64,
	pub reserved: f64,
	pub lock: f64,
}
