#![allow(non_snake_case)]
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug)]
pub struct Transfer {
    pub blockNumber: u64,
    pub index: u16,
    pub logData: String,
    pub engine: String,
    #[serde(rename = "type")]
    pub logtype: String,
    pub timestamp: f64,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct TransferPage {
    pub total_logs: u64,
    pub at_page: u64,
    pub total_page: u64,
    pub logs: Vec<Transfer>,
}
