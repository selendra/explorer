use crate::{models::block::Block, BLOCK, DATABASE};

use actix_web::{get, web, HttpResponse};
use mongodb::{
    bson::doc,
    options::FindOptions,
    sync::{Client, Collection},
};

/// Gets the user with the supplied block number.
#[get("/block/{block_number}")]
async fn get_block(client: web::Data<Client>, block_number: web::Path<u32>) -> HttpResponse {
    let block_number = block_number.into_inner();
    let collection: Collection<Block> = client.database(DATABASE).collection(BLOCK);
    match collection.find_one(doc! { "blockNumber": block_number }, None) {
        Ok(Some(block)) => HttpResponse::Ok().json(block),
        Ok(None) => HttpResponse::NotFound().body(format!("No block number found with block number {}", block_number)),
        Err(err) => HttpResponse::InternalServerError().body(err.to_string()),
    }
}

#[get("/blocks/{page_number}")]
async fn get_blocks(client: web::Data<Client>, page_number: web::Path<u64>) -> HttpResponse {
    let page_number = page_number.into_inner();

    let collection: Collection<Block> = client.database(DATABASE).collection(BLOCK);
    let filter = doc! {};
    let collection_count = collection.count_documents(filter.clone(), None).unwrap();
    let page_size: u64 = 10;
    let page: u64 = collection_count - (page_size * page_number);

    let find_options = FindOptions::builder().skip(page).limit(page_size as i64).build();

    let mut block_vec: Vec<Block> = Vec::new();

    match collection.find(filter, find_options) {
        Ok(mut cursor) => {
            while let Some(doc) = cursor.next() {
                match doc {
                    Ok(db) => {
                        block_vec.push(db);
                    }
                    Err(err) => return HttpResponse::InternalServerError().body(err.to_string()),
                }
            }
        }
        Err(err) => return HttpResponse::InternalServerError().body(err.to_string()),
    }

    return HttpResponse::Ok().json(block_vec);
}
