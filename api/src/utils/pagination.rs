use serde::{Deserialize, Serialize};
use utoipa::ToSchema;
use validator::Validate;

#[derive(Debug, Deserialize, Validate, ToSchema)]
pub struct PaginationParams {
	#[validate(range(min = 1))]
	#[serde(default = "default_page")]
	pub page: u64,

	#[validate(range(min = 1, max = 100))]
	#[serde(default = "default_page_size")]
	pub page_size: u64,

	#[serde(default = "default_sort_field")]
	pub sort_by: String,

	#[serde(default = "default_sort_order")]
	pub sort_order: String,
}

fn default_page() -> u64 {
	1
}
fn default_page_size() -> u64 {
	10
}
fn default_sort_field() -> String {
	"number".to_string()
}
fn default_sort_order() -> String {
	"desc".to_string()
}

#[derive(Serialize, ToSchema)]
pub struct PaginationLinks {
	/// First page
	pub first: String,
	/// Previous page
	pub prev: Option<String>,
	/// Next page
	pub next: Option<String>,
	/// Last page
	pub last: String,
}

#[derive(Serialize, ToSchema)]
pub struct PaginatedResponse<T> {
	 /// List of items in the current page
	pub items: Vec<T>,
	 /// Total number of items
	pub total: u64,
	/// Current page number
	pub page: u64,
	/// Number of items per page
	pub page_size: u64,
	 /// Total number of pages
	pub total_pages: u64,
	/// Links for pagination
	pub links: PaginationLinks,
}

impl PaginationLinks {
	pub fn new(
		base_url: &str,
		page: u64,
		page_size: u64,
		total_pages: u64,
		sort_by: &str,
		sort_order: &str,
	) -> Self {
		let make_url = |p: u64| -> String {
			format!(
				"{}?page={}&page_size={}&sort_by={}&sort_order={}",
				base_url, p, page_size, sort_by, sort_order
			)
		};

		Self {
			first: make_url(1),
			prev: if page > 1 { Some(make_url(page - 1)) } else { None },
			next: if page < total_pages { Some(make_url(page + 1)) } else { None },
			last: make_url(total_pages),
		}
	}
}
