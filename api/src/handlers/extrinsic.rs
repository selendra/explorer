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
    let page = page_size * page_number.saturating_sub(1);

    let mut total_page = collection_count / PAGESIZE;
    if collection_count % PAGESIZE != 0 {
        total_page = total_page + 1;
    }

    let find_options = FindOptions::builder()
        .sort(doc! { "blockNumber": -1 })
        .skip(page)
        .limit(page_size as i64)
        .build();

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

    let extrinsic_page = ExtrinsicPage {
        total_extrinsics: collection_count,
        at_page: page_number,
        total_page,
        extrinsics: extrinsic_vec,
    };

    return HttpResponse::Ok().json(extrinsic_page);
}

#[get("/{module}/{page_number}")]
async fn get_mudule_extrinsics(client: web::Data<Client>, param: web::Path<(String, u64)>) -> HttpResponse {
    let module = param.0.clone();
    let page_number = param.1.clone();

    let collection: Collection<Extrinsic> = client.database(DATABASE).collection(EXTRINSIC);
    let filter = doc! { "section": module };
    let collection_count = collection.count_documents(filter.clone(), None).unwrap();

    let page_size: u64 = PAGESIZE;
    let page = page_size * page_number.saturating_sub(1);

    let mut total_page = collection_count / PAGESIZE;
    if collection_count % PAGESIZE != 0 {
        total_page = total_page + 1;
    }

    let find_options = FindOptions::builder()
        .sort(doc! { "blockNumber": -1 })
        .skip(page)
        .limit(page_size as i64)
        .build();

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

    let extrinsic_page = ExtrinsicPage {
        total_extrinsics: collection_count,
        at_page: page_number,
        total_page,
        extrinsics: extrinsic_vec,
    };

    return HttpResponse::Ok().json(extrinsic_page);
}

#[get("/block/{block_number}")]
async fn get_block_extrinsics(client: web::Data<Client>, block_number: web::Path<u32>) -> HttpResponse {
    let block_number = block_number.into_inner();

    let collection: Collection<Extrinsic> = client.database(DATABASE).collection(EXTRINSIC);
    let filter = doc! { "blockNumber": block_number };
    let collection_count = collection.count_documents(filter.clone(), None).unwrap();

    let mut extrinsic_vec: Vec<Extrinsic> = Vec::new();

    match collection.find(filter, None) {
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

    let extrinsic_page = ExtrinsicPerBlock {
        total_extrinsics: collection_count,
        extrinsics: extrinsic_vec,
    };

    return HttpResponse::Ok().json(extrinsic_page);
}

#[get("/signed/{page_number}")]
async fn get_signed_extrinsics(client: web::Data<Client>, page_number: web::Path<u64>) -> HttpResponse {
    let page_number = page_number.into_inner();

    let collection: Collection<Extrinsic> = client.database(DATABASE).collection(SIGNEDEXTRINSIC);
    let filter = doc! {};
    let collection_count = collection.count_documents(filter.clone(), None).unwrap();

    let page_size: u64 = PAGESIZE;
    let page = page_size * page_number.saturating_sub(1);

    let mut total_page = collection_count / PAGESIZE;
    if collection_count % PAGESIZE != 0 {
        total_page = total_page + 1;
    }

    let find_options = FindOptions::builder()
        .sort(doc! { "blockNumber": -1 })
        .skip(page)
        .limit(page_size as i64)
        .build();

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

    let extrinsic_page = ExtrinsicPage {
        total_extrinsics: collection_count,
        at_page: page_number,
        total_page,
        extrinsics: extrinsic_vec,
    };

    return HttpResponse::Ok().json(extrinsic_page);
}
