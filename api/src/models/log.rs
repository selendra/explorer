#![allow(non_snake_case)]
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug)]
pub struct Log {
    pub blockNumber: u64,
    pub index: u16,
    pub engine: String,
    #[serde(rename = "type")]
    pub logtype: String,
    pub logData: String,
    pub timestamp: f64,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct LogPage {
    pub total_logs: u64,
    pub at_page: u64,
    pub total_page: u64,
    pub logs: Vec<Log>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct LogPerBlock {
    pub total_logs: u64,
    pub logs: Vec<Log>,
}
