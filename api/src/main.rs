#[macro_use]
extern crate dotenv_codegen;

mod handlers;
mod models;
mod utils;
use handlers::{account::*, block::*};

use actix_web::{web, App, HttpServer};
use mongodb::sync::Client;

// Collection name
pub const ACCOUNT: &str = "accounts";
pub const BLOCK: &str = "blocks";
pub const EVENT: &str = "event";
pub const EXTRINSIC: &str = "extrinsic";
pub const TRANSFER: &str = "transfer";
pub const SIGNEDEXTRINSIC: &str = "signed_extrinsic";

// database
pub const MOGOURI: &str = dotenv!("MONGO_URI");
pub const DATABASE: &str = dotenv!("DATABASE");
pub const VALIDATORDATABASE: &str = dotenv!("VALIDATEDATABASE");

// server
const HOST: &str = "127.0.0.1";
const PORT: u16 = 8080;

// Page Size
const PAGESIZE: u64 = 10;

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    let client = Client::with_uri_str(MOGOURI).expect("failed to connect");

    HttpServer::new(move || {
        App::new()
            .app_data(web::Data::new(client.clone()))
            .service(get_block)
            .service(get_blocks)
            .service(get_account)
            .service(get_account_detail)
            .service(get_accounts)
            .service(get_account_extrinisic)
    })
    .bind((HOST, PORT))?
    .run()
    .await
}
