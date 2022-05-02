use crate::{models::transfer::*, DATABASE, PAGESIZE, TRANSFER};

use actix_web::{get, web, HttpResponse};
use mongodb::{
    bson::doc,
    options::FindOptions,
    sync::{Client, Collection},
};

#[get("/{hash}")]
async fn get_transfer(client: web::Data<Client>, hash: web::Path<String>) -> HttpResponse {
    let hash = hash.into_inner();
    let collection: Collection<Transfer> = client.database(DATABASE).collection(TRANSFER);
    match collection.find_one(doc! { "hash": &hash }, None) {
        Ok(Some(block)) => HttpResponse::Ok().json(block),
        Ok(None) => HttpResponse::NotFound().body(format!("No transfer found with hash {}", hash)),
        Err(err) => HttpResponse::InternalServerError().body(err.to_string()),
    }
}

#[get("/all/{page_number}")]
async fn get_transfers(client: web::Data<Client>, page_number: web::Path<u64>) -> HttpResponse {
    let page_number = page_number.into_inner();

    let collection: Collection<Transfer> = client.database(DATABASE).collection(TRANSFER);
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

    let mut transfer_vec: Vec<Transfer> = Vec::new();

    match collection.find(filter, find_options) {
        Ok(mut cursor) => {
            while let Some(doc) = cursor.next() {
                match doc {
                    Ok(db) => {
                        transfer_vec.push(db);
                    }
                    Err(err) => return HttpResponse::InternalServerError().body(err.to_string()),
                }
            }
        }
        Err(err) => return HttpResponse::InternalServerError().body(err.to_string()),
    }

    let transfer_page = TransferPage {
        total_transfer: collection_count,
        at_page: page_number,
        total_page,
        transfers: transfer_vec,
    };

    return HttpResponse::Ok().json(transfer_page);
}
