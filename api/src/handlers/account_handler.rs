use crate::{
	state::app_state::AppState,
	utils::{
		address::AddressQuery,
		pagination::{PaginatedResponse, PaginationLinks, PaginationParams},
	},
};
use selendra_db::{db::SortOrder, models::account::SubstrateAccount};
use selendra_rust_client::utils::validate_ss58_address;

use actix_web::{web, HttpRequest, HttpResponse, Responder};
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;
use validator::Validate;

#[derive(Serialize, Deserialize, ToSchema)]
pub struct ErrorResponse {
	/// Error message
	pub message: String,
}

/// Get account by substrate address
#[utoipa::path(
    get,
    path = "/account",
    params(
        ("address" = String, Query, description = "Substrate address to query", example = "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY")
    ),
    responses(
        (status = 200, description = "Account found successfully", body = SubstrateAccount),
        (status = 400, description = "Invalid address format", body = ErrorResponse),
        (status = 404, description = "Account not found", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse),
    ),
    tag = "accounts"
)]
pub async fn get_account_by_address(
	data: web::Data<AppState>,
	query: web::Query<AddressQuery>,
) -> impl Responder {
	let address = query.address.clone();

	// Validate address format
	if !validate_ss58_address(&address) {
		return HttpResponse::BadRequest()
			.json(ErrorResponse { message: "Invalid substrate address format".to_string() });
	}

	let db = data.surreal_db.setup_account_db().await;

	// Query the account
	match db.get_item_by_field("substrate_address", address.clone()).await {
		Ok(Some(account)) => HttpResponse::Ok().json(account),
		Ok(None) => HttpResponse::NotFound()
			.json(ErrorResponse { message: format!("Account not found for address: {}", address) }),
		Err(err) => {
			log::error!("Database query error: {:?}", err);
			HttpResponse::InternalServerError()
				.json(ErrorResponse { message: "Error retrieving account data".to_string() })
		},
	}
}

/// Get paginated list of accounts
#[utoipa::path(
    get,
    path = "/accounts",
    params(
        ("page" = usize, Query, description = "Page number", example = 1),
        ("page_size" = usize, Query, description = "Number of items per page", example = 10),
        ("sort_by" = String, Query, description = "Field to sort by", example = "total"),
        ("sort_order" = String, Query, description = "Sort order (asc/desc)", example = "desc")
    ),
    responses(
        (status = 200, description = "Accounts retrieved successfully", body = PaginatedResponse<SubstrateAccount>),
        (status = 400, description = "Invalid pagination parameters", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse),
    ),
    tag = "accounts"
)]
pub async fn get_accounts(
	data: web::Data<AppState>,
	query: web::Query<PaginationParams>,
	req: HttpRequest,
) -> impl Responder {
	// Validate parameters
	if let Err(err) = query.validate() {
		return HttpResponse::BadRequest()
			.json(ErrorResponse { message: format!("Invalid pagination parameters: {}", err) });
	}

	let db = data.surreal_db.setup_account_db().await;
	let sort_order = match query.sort_order.to_lowercase().as_str() {
		"asc" => SortOrder::Asc,
		_ => SortOrder::Desc,
	};

	match db
		.get_paginated_by_sort(query.page, query.page_size, &query.sort_by, sort_order)
		.await
	{
		Ok(response) => {
			// Get base URL for pagination links
			let base_url = format!(
				"{}://{}{}",
				req.connection_info().scheme(),
				req.connection_info().host(),
				req.path()
			);

			let links = PaginationLinks::new(
				&base_url,
				response.page,
				response.page_size,
				response.total_pages,
				&query.sort_by,
				&query.sort_order,
			);

			HttpResponse::Ok().json(PaginatedResponse {
				items: response.items,
				total: response.total,
				page: response.page,
				page_size: response.page_size,
				total_pages: response.total_pages,
				links,
			})
		},
		Err(err) => {
			log::error!("Database error: {:?}", err);
			println!("Database error: {:?}", err);
			HttpResponse::InternalServerError()
				.json(ErrorResponse { message: "Error retrieving accounts".to_string() })
		},
	}
}
