#[macro_use]
extern crate dotenv_codegen;

mod handlers;
mod models;
use handlers::block::{get_block, get_blocks};

use actix_web::{web, App, HttpServer};
use mongodb::sync::Client;

// Collection name
pub const ACCOUNT: &str = "accounts";
pub const BLOCK: &str = "blocks";
pub const EVENT: &str = "event";
pub const EXTRINSIC: &str = "extrinsic";
pub const TRANSFER: &str = "transfer";

// database
pub const MOGOURI: &str = dotenv!("MONGO_URI");
pub const DATABASE: &str = dotenv!("DATABASE");
pub const VALIDATORDATABASE: &str = dotenv!("VALIDATEDATABASE");

// server
const HOST: &str = "127.0.0.1";
const PORT: u16 = 8080;

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    let client = Client::with_uri_str(MOGOURI).expect("failed to connect");

    HttpServer::new(move || {
        App::new()
            .app_data(web::Data::new(client.clone()))
            .service(get_block)
            .service(get_blocks)
    })
    .bind((HOST, PORT))?
    .run()
    .await
}
