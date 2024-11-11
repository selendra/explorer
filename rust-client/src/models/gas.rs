use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct BlockGas {
	pub gas_used: u64,
	pub gas_limit: u64,
	pub base_fee_per_gas: u64,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct TransactionGas {
	pub gas_price: u128,
	pub gas_used: u64,
	pub total_gas_cost: u64,
}
