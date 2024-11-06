use serde::{Deserialize, Serialize};
use std::fmt::Debug;

#[derive(Debug, Serialize, Deserialize)]
pub struct EraStaking {
	pub era: u32,
	pub minimum_stake: u128,
	pub total_validators: u32,
	pub active_validators: u32,
	pub active_mominators: u32,
	pub validators: Vec<ValidatorDetail>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ValidatorDetail {
	pub account: String,
	pub validators_commission: String,
	pub nominator_count: u32,
	pub total_staking: u128,
	pub own_staking: u128,
	pub active_point: u32,
}
