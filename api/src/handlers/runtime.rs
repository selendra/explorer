use crate::{models::runtime::*, DATABASE, RUNTIME};

use actix_web::{get, web, HttpResponse};
use mongodb::{
    bson::doc,
    options::FindOptions,
    sync::{Client, Collection},
};

#[get("")]
async fn get_runtimes(client: web::Data<Client>) -> HttpResponse {
    let collection: Collection<Runtime> = client.database(DATABASE).collection(RUNTIME);
    let filter = doc! {};
    let collection_count = collection.count_documents(filter.clone(), None).unwrap();

    let find_options = FindOptions::builder().build();

    let mut runtime_vec: Vec<Runtime> = Vec::new();

    match collection.find(filter, find_options) {
        Ok(mut cursor) => {
            while let Some(doc) = cursor.next() {
                match doc {
                    Ok(db) => {
                        runtime_vec.push(db);
                    }
                    Err(err) => return HttpResponse::InternalServerError().body(err.to_string()),
                }
            }
        }
        Err(err) => return HttpResponse::InternalServerError().body(err.to_string()),
    }

    let runtime_page = RuntimePage {
        total_runtimes: collection_count,
        runtimes: runtime_vec,
    };

    return HttpResponse::Ok().json(runtime_page);
}
