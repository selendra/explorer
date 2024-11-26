use serde::{Deserialize, Serialize};
use validator::Validate;

#[derive(Debug, Deserialize, Validate)]
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

#[derive(Serialize)]
pub struct PaginationLinks {
	pub first: String,
	pub prev: Option<String>,
	pub next: Option<String>,
	pub last: String,
}

#[derive(Serialize)]
pub struct PaginatedResponse<T> {
	pub items: Vec<T>,
	pub total: u64,
	pub page: u64,
	pub page_size: u64,
	pub total_pages: u64,
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
