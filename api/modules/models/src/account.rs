#![allow(non_snake_case)]
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug)]
pub struct Account {
    pub accountId: String,
	pub identityDisplay: String,
	pub identityDetail: String,
	pub totalBalance: f64,
    pub availableBalance: f64,
	pub freeBalance: f64,
	pub lockedBalance:f64,
	pub reservedBalance: f64,
	pub balancesBetail: String,
}
