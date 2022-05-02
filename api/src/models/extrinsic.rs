#![allow(non_snake_case)]
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug)]
pub struct Extrinsic {
    pub blockNumber: u64,
    pub extrinsicIndex: u16,
    pub signer: String,
    pub hash: String,
    pub method: String,
    pub section: String,
    pub args: String,
    pub argsDef: String,
    pub doc: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub feeDetails: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub feeInfo: Option<String>,
    pub errorMessage: String,
    pub isSigned: bool,
    pub success: bool,
    pub timestamp: f64,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct ExtrinsicPage {
    pub total_extrinsics: u64,
    pub at_page: u64,
    pub total_page: u64,
    pub extrinsics: Vec<Extrinsic>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct ExtrinsicPerBlock {
    pub total_extrinsics: u64,
    pub extrinsics: Vec<Extrinsic>,
}
