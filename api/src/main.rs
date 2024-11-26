use selendra_db::setup_db::SurrealDb;

use actix_web::{web, App, HttpServer};

use handlers::account_handler::{get_account_by_address, get_accounts};
use state::app_state::AppState;

use selendra_config::CONFIG;

mod handlers;
mod state;
mod utils;

#[actix_web::main]
async fn main() -> std::io::Result<()> {
	let surreal_db = SurrealDb {
		surreal_db_url: CONFIG.surreal_db.url.clone(),
		surreal_db_user: CONFIG.surreal_db.user.clone(),
		surreal_db_pass: CONFIG.surreal_db.pass.clone(),
	};

	// Shared application state
	let app_state = web::Data::new(AppState::new(surreal_db));

	HttpServer::new(move || {
		App::new()
			.app_data(app_state.clone())
			.route("/account", web::get().to(get_account_by_address))
			.route("/accounts", web::get().to(get_accounts))
	})
	.bind((CONFIG.rest_api.url.clone(), CONFIG.rest_api.port))?
	.run()
	.await
}
