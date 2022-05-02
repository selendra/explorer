#![allow(non_snake_case)]
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug)]
pub struct TotalData {
    pub Transfers: u64,
    pub SignedExtrinsic: u64,
    pub Accounts: u64,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct ValidatorStaking {
    pub totalStake: f64,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct StakValue {
    pub totalStake: f64,
}
