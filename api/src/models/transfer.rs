#![allow(non_snake_case)]
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug)]
pub struct Transfer {
    pub blockNumber: u64,
    pub extrinsicIndex: u16,
    pub hash: String,
    pub source: String,
    pub destination: String,
    pub amount: f64,
    pub feeAmount: f64,
    pub method: String,
    pub success: bool,
    pub errorMessage: String,
    pub timestamp: f64,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct TransferPage {
    pub total_transfer: u64,
    pub at_page: u64,
    pub total_page: u64,
    pub transfers: Vec<Transfer>,
}
