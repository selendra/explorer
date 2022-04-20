use crate::{
    models::block::{Block, BlockPage},
    BLOCK, DATABASE, PAGESIZE,
};

use actix_web::{get, web, HttpResponse};
use mongodb::{
    bson::doc,
    options::FindOptions,
    sync::{Client, Collection},
};

#[get("/{block_number}")]
async fn get_block(client: web::Data<Client>, block_number: web::Path<u32>) -> HttpResponse {
    let block_number = block_number.into_inner();
    let collection: Collection<Block> = client.database(DATABASE).collection(BLOCK);
    match collection.find_one(doc! { "blockNumber": block_number }, None) {
        Ok(Some(block)) => HttpResponse::Ok().json(block),
        Ok(None) => HttpResponse::NotFound().body(format!("No block number found with block number {}", block_number)),
        Err(err) => HttpResponse::InternalServerError().body(err.to_string()),
    }
}

#[get("/all/{page_number}")]
async fn get_blocks(client: web::Data<Client>, page_number: web::Path<u64>) -> HttpResponse {
    let page_number = page_number.into_inner();

    let collection: Collection<Block> = client.database(DATABASE).collection(BLOCK);
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

    let mut total_page = collection_count / PAGESIZE;
    if collection_count % PAGESIZE != 0 {
        total_page = total_page + 1;
    }

    let account_page = BlockPage {
        total_block: collection_count,
        blocks: block_vec,
        at_page: page_number,
        total_page,
    };

    return HttpResponse::Ok().json(account_page);
}
