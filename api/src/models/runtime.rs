#![allow(non_snake_case)]
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug)]
pub struct Runtime {
    pub blockNumber: u64,
    pub specName: String,
    pub specVersion: u16,
    pub metadata_version: String,
    pub magic_number: String,
    pub metadata: MetadataVersion,
    pub timestamp: f64,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct MetadataVersion {
    #[serde(rename = "V13", skip_serializing_if = "Option::is_none")]
    pub metadataVersionV13: Option<Metadata>,
    #[serde(rename = "V14", skip_serializing_if = "Option::is_none")]
    pub metadataVersionV14: Option<Metadata>,
    #[serde(rename = "V15", skip_serializing_if = "Option::is_none")]
    pub metadataVersionV15: Option<Metadata>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct Metadata {
    pub pallets: Vec<Pallet>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct Pallet {
    pub name: String,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct RuntimePage {
    pub total_runtimes: u64,
    pub runtimes: Vec<Runtime>,
}
