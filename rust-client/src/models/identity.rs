use serde::{Deserialize, Serialize};
use std::fmt::Debug;

#[derive(Debug, Serialize, Deserialize)]
pub struct SubstrateIdentity {
	pub display_name: Option<String>,
	pub legal_name: Option<String>,
	pub web: Option<String>,
	pub riot: Option<String>,
	pub email: Option<String>,
	pub twitter: Option<String>,
	pub image: Option<String>,
	pub judgement: Option<String>,
}
