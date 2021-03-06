use crate::{models::event::*, DATABASE, EVENT, PAGESIZE};

use actix_web::{get, web, HttpResponse};
use mongodb::{
    bson::doc,
    options::FindOptions,
    sync::{Client, Collection},
};

#[get("/{module}/{page_number}")]
async fn get_events_module(client: web::Data<Client>, param: web::Path<(String, u64)>) -> HttpResponse {
    let module = param.0.clone();
    let page_number = param.1.clone();

    let collection: Collection<Event> = client.database(DATABASE).collection(EVENT);
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

    let mut event_vec: Vec<Event> = Vec::new();

    match collection.find(filter, find_options) {
        Ok(mut cursor) => {
            while let Some(doc) = cursor.next() {
                match doc {
                    Ok(db) => {
                        event_vec.push(db);
                    }
                    Err(err) => return HttpResponse::InternalServerError().body(err.to_string()),
                }
            }
        }
        Err(err) => return HttpResponse::InternalServerError().body(err.to_string()),
    }

    let account_page = EventPage {
        total_event: collection_count,
        at_page: page_number,
        total_page,
        events: event_vec,
    };

    return HttpResponse::Ok().json(account_page);
}

#[get("/all/{page_number}")]
async fn get_events(client: web::Data<Client>, page_number: web::Path<u64>) -> HttpResponse {
    let page_number = page_number.into_inner();

    let collection: Collection<Event> = client.database(DATABASE).collection(EVENT);
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

    let mut event_vec: Vec<Event> = Vec::new();

    match collection.find(filter, find_options) {
        Ok(mut cursor) => {
            while let Some(doc) = cursor.next() {
                match doc {
                    Ok(db) => {
                        event_vec.push(db);
                    }
                    Err(err) => return HttpResponse::InternalServerError().body(err.to_string()),
                }
            }
        }
        Err(err) => return HttpResponse::InternalServerError().body(err.to_string()),
    }

    let event_page = EventPage {
        total_event: collection_count,
        at_page: page_number,
        total_page,
        events: event_vec,
    };

    return HttpResponse::Ok().json(event_page);
}

#[get("/block/{block_number}")]
async fn get_block_event(client: web::Data<Client>, block_number: web::Path<u32>) -> HttpResponse {
    let block_number = block_number.into_inner();

    let collection: Collection<Event> = client.database(DATABASE).collection(EVENT);
    let filter = doc! { "blockNumber": block_number };
    let collection_count = collection.count_documents(filter.clone(), None).unwrap();

    let mut event_vec: Vec<Event> = Vec::new();

    match collection.find(filter, None) {
        Ok(mut cursor) => {
            while let Some(doc) = cursor.next() {
                match doc {
                    Ok(db) => {
                        event_vec.push(db);
                    }
                    Err(err) => return HttpResponse::InternalServerError().body(err.to_string()),
                }
            }
        }
        Err(err) => return HttpResponse::InternalServerError().body(err.to_string()),
    }

    let event_page = EventPerBlock {
        total_event: collection_count,
        events: event_vec,
    };

    return HttpResponse::Ok().json(event_page);
}
