use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize, Serialize)]
pub struct BlockGas {
	pub gas_used: u64,
	pub gas_limit: u64,
	pub base_fee_per_gas: u64,
}
