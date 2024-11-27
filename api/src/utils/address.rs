use serde::Deserialize;
use utoipa::ToSchema;

#[derive(Debug, Deserialize, ToSchema)]
pub struct AddressQuery {
	/// Account Address
	pub address: String,
}
