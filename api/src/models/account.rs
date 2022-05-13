#![allow(non_snake_case)]
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug)]
pub struct Account {
    pub accountId: String,
	pub identityDetail: IdentityDetail,
    pub totalBalance: f32,
    pub availableBalance: f32,
    pub freeBalance: f32,
    pub lockedBalance: f32,
    pub reservedBalance: f32,
	pub vestingDetails: VestingDetail,
    pub timestamp: f64,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct IdentityDetail {
	pub identityDisplay: String,
	pub identityDisplayParent: String,
	pub identityDisplaylegal: String,
	pub identityDisplayEmail: String,
	pub identityDisplayTwitter: String,
	pub identityDisplayWeb: String,
	pub identityDisplayRiot: String,
	pub identityDisplayOther: String,
	pub identityJudgements: String,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct VestingDetail {
	pub vestBalance: f32,
	pub vestedClaimable: f32,
	pub vestingTotal: f32,
	pub vestingList: String,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct AccountExtrinsic {
    pub blockNumber: u64,
    pub extrinsicIndex: u16,
    pub success: bool,
    pub section: String,
    pub method: String,
    pub hash: String,
    pub timestamp: f64,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct AccountTransfer {
    pub blockNumber: u64,
    pub extrinsicIndex: u16,
    pub destination: String,
    pub amount: f32,
    pub feeAmount: f32,
    pub success: bool,
    pub hash: String,
    pub timestamp: f64,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct AccountStakingQuery {
    pub blockNumber: u64,
    pub eventIndex: u16,
    pub amount: f32,
    pub era: u16,
    pub validatorStashAddress: String,
    pub timestamp: f64,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct AccountPage {
    pub total_account: u64,
    pub at_page: u64,
    pub total_page: u64,
    pub accounts: Vec<Account>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct AccountExtrinsicPage {
    pub total_extrinsics: u64,
    pub at_page: u64,
    pub total_page: u64,
    pub extrinsics: Vec<AccountExtrinsic>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct AccountTransferPage {
    pub total_transfer: u64,
    pub at_page: u64,
    pub total_page: u64,
    pub transfers: Vec<AccountTransfer>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct AccountStaking {
    pub blockNumber: u64,
    pub eventIndex: u16,
    pub action: String,
    pub amount: f32,
    pub era: u16,
    pub validatorStashAddress: String,
    pub timestamp: f64,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct AccountStakingPage {
    pub total_lists: u64,
    pub at_page: u64,
    pub total_page: u64,
    pub staking_list: Vec<AccountStaking>,
}


// fn non_identity<'de, D>(d: D) -> Result<f32, D::Error>
// where
//     D: Deserializer<'de>,
// {
//     Deserialize::deserialize(d).map(|x: Option<_>| x.unwrap_or(0 as f32))
// }
