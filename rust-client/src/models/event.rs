use codec::{Decode, Encode};
use serde::{Deserialize, Serialize};
use std::fmt::Debug;

use frame_system::Phase;
use selendra_runtime::RuntimeEvent;
use sp_core::H256;

// #[allow(dead_code)]
#[derive(Debug, Decode, Encode)]
pub struct SubstrateEventRecord {
	pub phase: Phase,
	pub event: RuntimeEvent,
	pub topics: Vec<H256>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct EventDetail {
	pub index: u32,
	pub extrinsic_id: u32,
	pub event: String,
	pub slash_event: Option<StakingSlash>,
	pub transfer_event: Option<TransferEvent>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct BlockEvent {
	pub total: u32,
	pub extrinsic: Vec<EventDetail>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct StakingSlash {
	pub staker: String,
	pub amount: u128,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct TransferEvent {
	pub from: String,
	pub to: String,
	pub amount: u128,
}
