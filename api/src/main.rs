use selendra_db::{models::account::SubstrateAccount, setup_db::SurrealDb};

use actix_web::{web, App, HttpServer};

use handlers::account_handler::{get_account_by_address, get_accounts, ErrorResponse};
use state::app_state::AppState;

use selendra_config::CONFIG;
use utils::{
	address::AddressQuery,
	pagination::{PaginatedResponse, PaginationParams},
};
use utoipa::OpenApi;
use utoipa_swagger_ui::SwaggerUi;

mod handlers;
mod state;
mod utils;

#[derive(OpenApi)]
#[openapi(
    paths(
        handlers::account_handler::get_account_by_address,
        handlers::account_handler::get_accounts,
    ),
    components(
        schemas(
            SubstrateAccount,
            ErrorResponse,
			PaginatedResponse<SubstrateAccount>,
			AddressQuery,
            PaginationParams,
        )
    ),
    tags(
        (name = "accounts", description = "Substrate Account Management API")
    )
)]
struct ApiDoc;

#[actix_web::main]
async fn main() -> std::io::Result<()> {
	tracing_subscriber::fmt::init();

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
			.service(
				SwaggerUi::new("/swagger-ui/{_:.*}")
					.url("/api-docs/openapi.json", ApiDoc::openapi()),
			)
			.route("/account", web::get().to(get_account_by_address))
			.route("/accounts", web::get().to(get_accounts))
	})
	.bind((CONFIG.rest_api.url.clone(), CONFIG.rest_api.port))?
	.run()
	.await
}
