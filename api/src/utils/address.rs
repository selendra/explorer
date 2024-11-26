use serde::Deserialize;

#[derive(Debug, Deserialize)]
pub struct AddressQuery {
	pub address: String,
}
