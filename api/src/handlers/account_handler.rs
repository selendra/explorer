use crate::state::app_state::AppState;
use selendra_db::db::SortOrder;

use actix_web::{web, HttpResponse, Responder};
use serde::{Deserialize, Serialize};

// Error response model
#[derive(Serialize, Deserialize)]
pub struct ErrorResponse {
	pub message: String,
}

pub async fn get_accounts(data: web::Data<AppState>) -> impl Responder {
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
