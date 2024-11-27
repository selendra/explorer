use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq, ToSchema)]
pub struct SubstrateAccount {
	/// substrate_address
	pub substrate_address: String,
	/// total balance
	pub total: f64,
	/// free balance
	pub free: f64,
	/// reserved balance
	pub reserved: f64,
	/// lock balance
	pub lock: f64,
}
