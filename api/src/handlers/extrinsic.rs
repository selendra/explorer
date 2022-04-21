use crate::{models::extrinsic::*, DATABASE, EXTRINSIC, PAGESIZE, SIGNEDEXTRINSIC};

use actix_web::{get, web, HttpResponse};
use mongodb::{
    bson::doc,
    options::FindOptions,
    sync::{Client, Collection},
};

#[get("/{hash}")]
async fn get_extrinsic(client: web::Data<Client>, hash: web::Path<String>) -> HttpResponse {
    let hash = hash.into_inner();
    let collection: Collection<Extrinsic> = client.database(DATABASE).collection(EXTRINSIC);
    match collection.find_one(doc! { "hash": &hash }, None) {
        Ok(Some(block)) => HttpResponse::Ok().json(block),
        Ok(None) => HttpResponse::NotFound().body(format!("No extrinsic found with hash {}", hash)),
        Err(err) => HttpResponse::InternalServerError().body(err.to_string()),
    }
}

#[get("/all/{page_number}")]
async fn get_extrinsics(client: web::Data<Client>, page_number: web::Path<u64>) -> HttpResponse {
    let page_number = page_number.into_inner();

    let collection: Collection<Extrinsic> = client.database(DATABASE).collection(EXTRINSIC);
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

    let mut extrinsic_vec: Vec<Extrinsic> = Vec::new();

    match collection.find(filter, find_options) {
        Ok(mut cursor) => {
            while let Some(doc) = cursor.next() {
                match doc {
                    Ok(db) => {
                        extrinsic_vec.push(db);
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

    let account_page = ExtrinsicPage {
        total_extrinsics: collection_count,
        at_page: page_number,
        total_page,
        extrinsics: extrinsic_vec,
    };

    return HttpResponse::Ok().json(account_page);
}

#[get("/{module}/{page_number}")]
async fn get_mudule_extrinsics(client: web::Data<Client>, param: web::Path<(String, u64)>) -> HttpResponse {
    let module = param.0.clone();
    let page_number = param.1.clone();

    let collection: Collection<Extrinsic> = client.database(DATABASE).collection(EXTRINSIC);
    let filter = doc! { "section": module };
    let collection_count = collection.count_documents(filter.clone(), None).unwrap();

    let page_size: u64 = PAGESIZE;
    let mut page = page_size * page_number;

    if collection_count > page {
        page = collection_count - page;
    } else {
        page = 0;
    }

    let find_options = FindOptions::builder().skip(page).limit(page_size as i64).build();

    let mut extrinsic_vec: Vec<Extrinsic> = Vec::new();

    match collection.find(filter, find_options) {
        Ok(mut cursor) => {
            while let Some(doc) = cursor.next() {
                match doc {
                    Ok(db) => {
                        extrinsic_vec.push(db);
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

    let account_page = ExtrinsicPage {
        total_extrinsics: collection_count,
        at_page: page_number,
        total_page,
        extrinsics: extrinsic_vec,
    };

    return HttpResponse::Ok().json(account_page);
}

#[get("/signed/{page_number}")]
async fn get_signed_extrinsics(client: web::Data<Client>, page_number: web::Path<u64>) -> HttpResponse {
    let page_number = page_number.into_inner();

    let collection: Collection<Extrinsic> = client.database(DATABASE).collection(SIGNEDEXTRINSIC);
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

    let mut extrinsic_vec: Vec<Extrinsic> = Vec::new();

    match collection.find(filter, find_options) {
        Ok(mut cursor) => {
            while let Some(doc) = cursor.next() {
                match doc {
                    Ok(db) => {
                        extrinsic_vec.push(db);
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

    let account_page = ExtrinsicPage {
        total_extrinsics: collection_count,
        at_page: page_number,
        total_page,
        extrinsics: extrinsic_vec,
    };

    return HttpResponse::Ok().json(account_page);
}
