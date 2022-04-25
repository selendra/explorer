use crate::{
    models::account::*, utils::is_address, ACCOUNT, DATABASE, PAGESIZE, REWARD, SIGNEDEXTRINSIC, SLASH, TRANSFER,
};

use actix_web::{get, web, HttpResponse};
use mongodb::{
    bson::doc,
    options::FindOptions,
    sync::{Client, Collection},
};

#[get("/{address}")]
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

#[get("/detail/{address}")]
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

#[get("/all/{page_number}")]
async fn get_accounts(client: web::Data<Client>, page_number: web::Path<u64>) -> HttpResponse {
    let page_number = page_number.into_inner().saturating_sub(1);

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
        at_page: page_number.saturating_add(1),
        total_page,
        accounts: account_vec,
    };

    return HttpResponse::Ok().json(account_page);
}

#[get("/extrinsics/{address}/{page_number}")]
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
        at_page: page_number.saturating_add(1),
        total_page,
        extriniscs: account_vec,
    };

    return HttpResponse::Ok().json(account_page);
}

#[get("/transfer/{address}/{page_number}")]
async fn get_account_transfer(client: web::Data<Client>, param: web::Path<(String, u64)>) -> HttpResponse {
    let address = param.0.clone();
    let page_number = param.1.clone().saturating_sub(1);

    if !(is_address(&address)) {
        return HttpResponse::NotFound().body(format!("Invalid address {} type", address));
    };

    let collection: Collection<AccountTransfer> = client.database(DATABASE).collection(TRANSFER);
    let filter = doc! { "source": &address };
    let collection_count = collection.count_documents(filter.clone(), None).unwrap();

    let page: u64 = PAGESIZE * page_number;
    let mut page_size = PAGESIZE;

    if collection_count < page {
        page_size = page - collection_count;
    }

    let find_options = FindOptions::builder().skip(page).limit(page_size as i64).build();

    let mut transfer_vec: Vec<AccountTransfer> = Vec::new();

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

    let mut total_page = collection_count / PAGESIZE;
    if collection_count % PAGESIZE != 0 {
        total_page = total_page + 1;
    }

    let account_page = AccountTransferPage {
        total_transfer: collection_count,
        at_page: page_number.saturating_add(1),
        total_page,
        transfers: transfer_vec,
    };

    return HttpResponse::Ok().json(account_page);
}

#[get("/staking/{address}/{page_number}")]
async fn get_account_staking(client: web::Data<Client>, param: web::Path<(String, u64)>) -> HttpResponse {
    let address = param.0.clone();
    let page_number = param.1.clone().saturating_sub(1);

    if !(is_address(&address)) {
        return HttpResponse::NotFound().body(format!("Invalid address {} type", address));
    };

    let collection_reward: Collection<AccountStakingQuery> = client.database(DATABASE).collection(REWARD);
    let collection_slash: Collection<AccountStakingQuery> = client.database(DATABASE).collection(SLASH);
    let filter = doc! { "accountId": &address };

    let collection_count = collection_reward.count_documents(filter.clone(), None).unwrap()
        + collection_slash.count_documents(filter.clone(), None).unwrap();

    let page: u64 = PAGESIZE * page_number;
    let mut page_size = PAGESIZE;

    if collection_count < page {
        page_size = page - collection_count;
    }

    let find_options = FindOptions::builder().skip(page).limit(page_size as i64).build();

    let mut account_vec: Vec<AccountStaking> = Vec::new();

    match collection_reward.find(filter.clone(), find_options.clone()) {
        Ok(mut cursor) => {
            while let Some(doc) = cursor.next() {
                match doc {
                    Ok(db) => {
                        let reward = AccountStaking {
                            blockNumber: db.blockNumber,
                            eventIndex: db.eventIndex,
                            action: "reward".to_string(),
                            amount: db.amount,
                            era: db.era,
                            validatorStashAddress: db.validatorStashAddress,
                            timestamp: db.timestamp,
                        };
                        account_vec.push(reward);
                    }
                    Err(err) => return HttpResponse::InternalServerError().body(err.to_string()),
                }
            }
        }
        Err(err) => return HttpResponse::InternalServerError().body(err.to_string()),
    }

    match collection_slash.find(filter.clone(), find_options.clone()) {
        Ok(mut cursor) => {
            while let Some(doc) = cursor.next() {
                match doc {
                    Ok(db) => {
                        let reward = AccountStaking {
                            blockNumber: db.blockNumber,
                            eventIndex: db.eventIndex,
                            action: "slash".to_string(),
                            amount: db.amount,
                            era: db.era,
                            validatorStashAddress: db.validatorStashAddress,
                            timestamp: db.timestamp,
                        };
                        account_vec.push(reward);
                    }
                    Err(_err) => continue,
                }
            }
        }
        Err(err) => return HttpResponse::InternalServerError().body(err.to_string()),
    }

    let mut total_page = collection_count / PAGESIZE;
    if collection_count % PAGESIZE != 0 {
        total_page = total_page + 1;
    }

    let account_page = AccountStakingPage {
        total_lists: collection_count,
        at_page: page_number.saturating_add(1),
        total_page,
        staking_list: account_vec,
    };

    return HttpResponse::Ok().json(account_page);
}
