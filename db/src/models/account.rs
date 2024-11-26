use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
pub struct SubstrateAccount {
	pub substrate_address: String,
	#[serde(serialize_with = "serialize_u128", deserialize_with = "deserialize_u128")]
	pub total: u128,
	#[serde(serialize_with = "serialize_u128", deserialize_with = "deserialize_u128")]
	pub free: u128,
	#[serde(serialize_with = "serialize_u128", deserialize_with = "deserialize_u128")]
	pub reserved: u128,
	#[serde(serialize_with = "serialize_u128", deserialize_with = "deserialize_u128")]
	pub lock: u128,
}

// Custom serialization for u128
fn serialize_u128<S>(value: &u128, serializer: S) -> Result<S::Ok, S::Error>
where
    S: serde::Serializer,
{
    serializer.serialize_str(&value.to_string())
}

// Custom deserialization for u128
fn deserialize_u128<'de, D>(deserializer: D) -> Result<u128, D::Error>
where
    D: serde::Deserializer<'de>,
{
    let s: String = String::deserialize(deserializer)?;
    s.parse::<u128>().map_err(serde::de::Error::custom)
}