#[macro_use]
extern crate dotenv_codegen;

mod handlers;
mod models;
mod utils;
use handlers::{account::*, block::*, event::*, extrinsic::*, log::*, runtime::*, transfer::*};

use actix_cors::Cors;
use actix_web::{middleware::Logger, web, App, HttpServer};
use mongodb::sync::Client;

// Collection name
pub const ACCOUNT: &str = "accounts";
pub const BLOCK: &str = "blocks";
pub const EVENT: &str = "events";
pub const EXTRINSIC: &str = "extrinsics";
pub const LOG: &str = "logs";
pub const REWARD: &str = "staking_reward";
pub const RUNTIME: &str = "runtimes";
pub const SLASH: &str = "staking_slash";
pub const SIGNEDEXTRINSIC: &str = "signed_extrinsic";
pub const TRANSFER: &str = "transfer";

// database
pub const MOGOURI: &str = dotenv!("MONGO_URI");
pub const DATABASE: &str = dotenv!("DATABASE");
pub const VALIDATORDATABASE: &str = dotenv!("VALIDATEDATABASE");

// server
const HOST: &str = "127.0.0.1";
const PORT: u16 = 8080;

// Page Size
const PAGESIZE: u64 = 10;

// Sentry
pub const SENTRY: &str = dotenv!("SENTRY");

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    let client = Client::with_uri_str(MOGOURI).expect("failed to connect");
    let _guard = sentry::init((
        SENTRY,
        sentry::ClientOptions {
            release: sentry::release_name!(),
            ..Default::default()
        },
    ));
    std::env::set_var("RUST_LOG", "actix_web=info");

    // access logs are printed with the INFO level so ensure it is enabled by default
    env_logger::init_from_env(env_logger::Env::new().default_filter_or("info"));

    HttpServer::new(move || {
        let account_controller = actix_web::web::scope("/account")
            .service(get_account)
            .service(get_account_detail)
            .service(get_accounts)
            .service(get_account_extrinisic)
            .service(get_account_transfer)
            .service(get_account_staking);
        let block_controller = actix_web::web::scope("/block").service(get_block).service(get_blocks);
        let event_controller = actix_web::web::scope("/event")
            .service(get_events)
            .service(get_events_module);
        let extrinsic_controller = actix_web::web::scope("/extrinsic")
            .service(get_extrinsic)
            .service(get_extrinsics)
            .service(get_signed_extrinsics)
            .service(get_mudule_extrinsics);
        let log_controller = actix_web::web::scope("/log")
            .service(get_logs)
            .service(get_logs_engine_type);
        let runtime_controller = actix_web::web::scope("/runtimes")
            .service(get_runtimes)
            .service(get_last_runtime);
        let transfer_controller = actix_web::web::scope("/transfer")
            .service(get_transfer)
            .service(get_transfers);

        App::new()
            .wrap(Logger::new("%a %{User-Agent}i"))
            .wrap(
                Cors::default()
                    .allow_any_origin()
                    .allowed_methods(vec!["GET"])
                    .max_age(3600),
            )
            .wrap(sentry_actix::Sentry::new())
            .app_data(web::Data::new(client.clone()))
            .service(account_controller)
            .service(block_controller)
            .service(event_controller)
            .service(log_controller)
            .service(extrinsic_controller)
            .service(runtime_controller)
            .service(transfer_controller)
    })
    .bind((HOST, PORT))?
    .run()
    .await
}
