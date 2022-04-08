#![allow(non_snake_case)]
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug)]
pub struct PageQuery {
    pub page_size: u64,
    pub page_number: u64,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct PageDetail {
    pub page_size: u64,
    pub page_count: u64,
}
