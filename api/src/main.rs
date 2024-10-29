use dotenv::dotenv;
use std::env;
use actix_web::{get, middleware, web, App, HttpServer, Responder};

#[get("/hello/{name}")]
async fn greet(name: web::Path<String>) -> impl Responder {
    format!("Hello {name}!")
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    dotenv().ok();

    let port = env::var("PORT").as_deref().unwrap_or("8080").parse::<u16>().expect("Should be number: 8080");

    env_logger::init_from_env(env_logger::Env::new().default_filter_or("info"));
    log::info!("starting HTTP server at http://localhost:{port}");
    
    HttpServer::new(|| {
        App::new()
            .wrap(middleware::Logger::default())
            .service(greet)
    })
    .bind(("127.0.0.1", port))?
    .run()
    .await
}
