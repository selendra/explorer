#![allow(non_snake_case)]
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug)]
pub struct Event {
    pub blockNumber: u64,
    pub eventIndex: u16,
    pub section: String,
    pub method: String,
    pub phase: String,
    pub types: String,
    pub data: String,
    pub doc: String,
    pub timestamp: f64,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct EventPage {
    pub total_event: u64,
    pub at_page: u64,
    pub total_page: u64,
    pub events: Vec<Event>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct EventPerBlock {
    pub total_event: u64,
    pub events: Vec<Event>,
}
