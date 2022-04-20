#![allow(non_snake_case)]
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug)]
pub struct Block {
    pub blockNumber: u64,
    pub finalized: bool,
    pub blockAuthor: String,
    pub blockAuthorName: String,
    pub blockHash: String,
    pub parentHash: String,
    pub extrinsicsRoot: String,
    pub stateRoot: String,
    pub activeEra: u64,
    pub currentIndex: u64,
    pub runtimeVersion: u16,
    pub totalEvents: u16,
    pub totalExtrinsics: u16,
    pub totalIssuance: f64,
    pub timestamp: f64,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct BlockPage {
    pub total_block: u64,
    pub at_page: u64,
    pub total_page: u64,
    pub blocks: Vec<Block>,
}
