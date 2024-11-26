use crate::{
	state::app_state::AppState,
	utils::pagination::{PaginatedResponse, PaginationLinks, PaginationParams},
};
use selendra_db::db::SortOrder;

use actix_web::{web, HttpRequest, HttpResponse, Responder};
use serde::{Deserialize, Serialize};
use validator::Validate;

// Error response model
#[derive(Serialize, Deserialize)]
pub struct ErrorResponse {
	pub message: String,
}

pub async fn get_last_accounts(data: web::Data<AppState>) -> impl Responder {
	let db = data.surreal_db.setup_account_db().await;
	let account = db.get_last_items(10, "id", SortOrder::Desc).await;

	match account {
		Ok(response) => HttpResponse::Ok().json(response),
		Err(err) => {
			log::error!("Database error: {:?}", err);
			HttpResponse::InternalServerError()
				.json(ErrorResponse { message: "Error retrieving accounts".to_string() })
		},
	}
}

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
