use crate::{
    models::account::{Account, AccountDetail, AccountExtrinsic, AccountExtrinsicPage, AccountPage},
    utils::is_address,
    ACCOUNT, DATABASE, PAGESIZE, SIGNEDEXTRINSIC,
};

use actix_web::{get, web, HttpResponse};
use mongodb::{
    bson::doc,
    options::FindOptions,
    sync::{Client, Collection},
};

#[get("/account/{address}")]
async fn get_account(client: web::Data<Client>, address: web::Path<String>) -> HttpResponse {
    let address = address.into_inner();
    if !(is_address(&address)) {
        return HttpResponse::NotFound().body(format!("Invalid address {} type", address));
    }

    let collection: Collection<Account> = client.database(DATABASE).collection(ACCOUNT);
    match collection.find_one(doc! { "accountId": &address }, None) {
        Ok(Some(account)) => HttpResponse::Ok().json(account),
        Ok(None) => HttpResponse::NotFound().body(format!("No account found with this address {}", address)),
        Err(err) => HttpResponse::InternalServerError().body(err.to_string()),
    }
}

#[get("/account/detail/{address}")]
async fn get_account_detail(client: web::Data<Client>, address: web::Path<String>) -> HttpResponse {
    let address = address.into_inner();
    if !(is_address(&address)) {
        return HttpResponse::NotFound().body(format!("Invalid address {} type", address));
    }

    let collection: Collection<AccountDetail> = client.database(DATABASE).collection(ACCOUNT);
    match collection.find_one(doc! { "accountId": &address }, None) {
        Ok(Some(account)) => HttpResponse::Ok().json(account),
        Ok(None) => HttpResponse::NotFound().body(format!("No account found with this address {}", address)),
        Err(err) => HttpResponse::InternalServerError().body(err.to_string()),
    }
}

#[get("/accounts/{page_number}")]
async fn get_accounts(client: web::Data<Client>, page_number: web::Path<u64>) -> HttpResponse {
    let page_number = page_number.into_inner();

    let collection: Collection<Account> = client.database(DATABASE).collection(ACCOUNT);
    let filter = doc! {};
    let collection_count = collection.count_documents(filter.clone(), None).unwrap();

    let page: u64 = PAGESIZE * page_number;
    let mut page_size = PAGESIZE;

    if collection_count < page {
        page_size = page - collection_count;
    };

    let find_options = FindOptions::builder().skip(page).limit(page_size as i64).build();

    let mut account_vec: Vec<Account> = Vec::new();

    match collection.find(filter, find_options) {
        Ok(mut cursor) => {
            while let Some(doc) = cursor.next() {
                match doc {
                    Ok(db) => {
                        account_vec.push(db);
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

    let account_page = AccountPage {
        total_account: collection_count,
        at_page: page_number,
        total_page,
        accounts: account_vec,
    };

    return HttpResponse::Ok().json(account_page);
}

#[get("/account/extrinsics/{address}/{page_number}")]
async fn get_account_extrinisic(client: web::Data<Client>, param: web::Path<(String, u64)>) -> HttpResponse {
    let address = param.0.clone();
    let page_number = param.1.clone().saturating_sub(1);

    if !(is_address(&address)) {
        return HttpResponse::NotFound().body(format!("Invalid address {} type", address));
    };

    let collection: Collection<AccountExtrinsic> = client.database(DATABASE).collection(SIGNEDEXTRINSIC);
    let filter = doc! { "signer": &address };
    let collection_count = collection.count_documents(filter.clone(), None).unwrap();

    let page: u64 = PAGESIZE * page_number;
    let mut page_size = PAGESIZE;

    if collection_count < page {
        page_size = page - collection_count;
    }

    let find_options = FindOptions::builder().skip(page).limit(page_size as i64).build();

    let mut account_vec: Vec<AccountExtrinsic> = Vec::new();

    match collection.find(filter, find_options) {
        Ok(mut cursor) => {
            while let Some(doc) = cursor.next() {
                match doc {
                    Ok(db) => {
                        account_vec.push(db);
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

    let account_page = AccountExtrinsicPage {
        total_extriniscs: collection_count,
        at_page: page_number,
        total_page,
        extriniscs: account_vec,
    };

    return HttpResponse::Ok().json(account_page);
}

#[get("/account/transfer/{address}/{page_number}")]
async fn get_account_transfer(client: web::Data<Client>, param: web::Path<(String, u64)>) -> HttpResponse {
    let address = param.0.clone();
    let page_number = param.1.clone().saturating_sub(1);

    if !(is_address(&address)) {
        return HttpResponse::NotFound().body(format!("Invalid address {} type", address));
    };

    let collection: Collection<AccountExtrinsic> = client.database(DATABASE).collection(SIGNEDEXTRINSIC);
    let filter = doc! { "signer": &address };
    let collection_count = collection.count_documents(filter.clone(), None).unwrap();

    let page: u64 = PAGESIZE * page_number;
    let mut page_size = PAGESIZE;

    if collection_count < page {
        page_size = page - collection_count;
    }

    let find_options = FindOptions::builder().skip(page).limit(page_size as i64).build();

    let mut account_vec: Vec<AccountExtrinsic> = Vec::new();

    match collection.find(filter, find_options) {
        Ok(mut cursor) => {
            while let Some(doc) = cursor.next() {
                match doc {
                    Ok(db) => {
                        account_vec.push(db);
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

    let account_page = AccountExtrinsicPage {
        total_extriniscs: collection_count,
        at_page: page_number,
        total_page,
        extriniscs: account_vec,
    };

    return HttpResponse::Ok().json(account_page);
}
