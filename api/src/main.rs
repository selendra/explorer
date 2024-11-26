use dotenv::dotenv;
use selendra_db::setup_db::SurrealDb;
use std::env;

use actix_web::{web, App, HttpServer};

use handlers::account_handler::{get_accounts, get_last_accounts};
use state::app_state::AppState;

mod handlers;
mod state;
mod utils;

#[actix_web::main]
async fn main() -> std::io::Result<()> {
	dotenv().ok();

	let port = env::var("REST_API_PORT")
		.as_deref()
		.unwrap_or("8080")
		.parse::<u16>()
		.expect("Should be number: 8080");
	let surreal_db_url = env::var("SURREALDB_URL").expect("SURREALDB_URL must be set");
	let surreal_db_user = env::var("SURREALDB_USER").expect("SURREALDB_USER must be set");
	let surreal_db_pass = env::var("SURREALDB_PASS").expect("SURREALDB_PASS must be set");

	// Connect to SurrealDB
	let surreal_db = SurrealDb { surreal_db_url, surreal_db_user, surreal_db_pass };

	// Shared application state
	let app_state = web::Data::new(AppState::new(surreal_db));

	HttpServer::new(move || {
		App::new()
			.app_data(app_state.clone())
			.route("/latest_accounts", web::get().to(get_last_accounts))
			.route("/accounts", web::get().to(get_accounts))
	})
	.bind(("127.0.0.1", port))?
	.run()
	.await
}
