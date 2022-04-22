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
    let mut page = page_size * page_number;

    if collection_count > page {
        page = collection_count - page;
    } else {
        page = 0;
    }

    let find_options = FindOptions::builder().skip(page).limit(page_size as i64).build();

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

    let mut total_page = collection_count / PAGESIZE;
    if collection_count % PAGESIZE != 0 {
        total_page = total_page + 1;
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
    let mut page = page_size * page_number;

    if collection_count > page {
        page = collection_count - page;
    } else {
        page = 0;
    }

    let find_options = FindOptions::builder().skip(page).limit(page_size as i64).build();

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

    let mut total_page = collection_count / PAGESIZE;
    if collection_count % PAGESIZE != 0 {
        total_page = total_page + 1;
    }

    let event_page = EventPage {
        total_event: collection_count,
        at_page: page_number,
        total_page,
        events: event_vec,
    };

    return HttpResponse::Ok().json(event_page);
}
