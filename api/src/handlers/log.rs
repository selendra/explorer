use crate::{models::log::*, DATABASE, LOG, PAGESIZE};

use actix_web::{get, web, HttpResponse};
use mongodb::{
    bson::doc,
    options::FindOptions,
    sync::{Client, Collection},
};

#[get("/all/{page_number}")]
async fn get_logs(client: web::Data<Client>, page_number: web::Path<u64>) -> HttpResponse {
    let page_number = page_number.into_inner();

    let collection: Collection<Log> = client.database(DATABASE).collection(LOG);
    let filter = doc! {};
    let collection_count = collection.count_documents(filter.clone(), None).unwrap();

    let page_size: u64 = PAGESIZE;
    let mut page = page_size * page_number;

    if collection_count > page {
        page = collection_count - page;
    } else {
        page = 0;
    }

    let find_options = FindOptions::builder().skip(page).limit(page_size as i64).build();

    let mut log_vec: Vec<Log> = Vec::new();

    match collection.find(filter, find_options) {
        Ok(mut cursor) => {
            while let Some(doc) = cursor.next() {
                match doc {
                    Ok(db) => {
                        log_vec.push(db);
                    }
                    Err(err) => return HttpResponse::InternalServerError().body(err.to_string()),
                }
            }
        }
        Err(err) => return HttpResponse::InternalServerError().body(err.to_string()),
    }

    let mut total_page = collection_count / PAGESIZE;
    if collection_count % PAGESIZE != 0 {
        total_page = total_page + 1;
    }

    let log_page = LogPage {
        total_logs: collection_count,
        at_page: page_number,
        total_page,
        logs: log_vec,
    };

    return HttpResponse::Ok().json(log_page);
}

#[get("/{engine_type}/{page_number}")]
async fn get_logs_engine_type(client: web::Data<Client>, param: web::Path<(String, u64)>) -> HttpResponse {
    let engine_type = param.0.clone();
    let page_number = param.1.clone();

    let collection: Collection<Log> = client.database(DATABASE).collection(LOG);
    let filter = doc! { "type": engine_type };
    let collection_count = collection.count_documents(filter.clone(), None).unwrap();

    let page_size: u64 = PAGESIZE;
    let mut page = page_size * page_number;

    if collection_count > page {
        page = collection_count - page;
    } else {
        page = 0;
    }

    let find_options = FindOptions::builder().skip(page).limit(page_size as i64).build();

    let mut log_vec: Vec<Log> = Vec::new();

    match collection.find(filter, find_options) {
        Ok(mut cursor) => {
            while let Some(doc) = cursor.next() {
                match doc {
                    Ok(db) => {
                        log_vec.push(db);
                    }
                    Err(err) => return HttpResponse::InternalServerError().body(err.to_string()),
                }
            }
        }
        Err(err) => return HttpResponse::InternalServerError().body(err.to_string()),
    }

    let mut total_page = collection_count / PAGESIZE;
    if collection_count % PAGESIZE != 0 {
        total_page = total_page + 1;
    }

    let account_page = LogPage {
        total_logs: collection_count,
        at_page: page_number,
        total_page,
        logs: log_vec,
    };

    return HttpResponse::Ok().json(account_page);
}
