use crate::{ACCOUNT, utils::is_address};

use error_handler::CustomError;
use models::{account::Account, page::PageQuery};

use mongodb::{
    bson::{doc, Document},
    options::FindOptions,
    sync::Client,
};

pub fn get_account(client: Client, db: &str, search: &str) -> Result<Account, CustomError> {
    let db = client.database(db);
    let collection = db.collection::<Account>(ACCOUNT);

    if is_address(search) {
        let filter = doc! {"accountId": search};
        let result = collection.find_one(filter, None);

        match result {
            Ok(Some(res)) => Ok(res),
            Ok(None) => Err(CustomError::NoDataFound()),
            Err(err) => Err(CustomError::MongodbError(err)),
        }
    } else {
        return Err(CustomError::InvalidData());
    }
}

pub fn get_accounts(client: Client, db: &str, search: PageQuery) -> Result<Vec<Account>, CustomError> {
    let database = client.database(db);
    let collections = database.collection::<Account>(ACCOUNT);
    let filter = doc! {};

    let collection_count = collections.count_documents(filter.clone(), None).unwrap();
    let page_size: u64 = search.page_size;
    let page: u64 = collection_count - page_size * search.page_number;

    let find_options = FindOptions::builder()
        .sort(doc! { "header.number": -1 })
        .skip(page)
        .limit(page_size as i64)
        .build();

    let result = collections.find(filter, find_options);

    let mut block_vec: Vec<Account> = Vec::new();
    match result {
        Ok(mut cursor) => {
            while let Some(doc) = cursor.next() {
                match doc {
                    Ok(db) => {
                        block_vec.push(db);
                    }
                    Err(e) => return Err(CustomError::MongodbError(e)),
                }
            }
        }
        Err(e) => return Err(CustomError::MongodbError(e)),
    }
    Ok(block_vec)
}

pub fn get_account_index(client: Client, db: &str) -> u64 {
    let database = client.database(db);
    let collections = database.collection::<Document>(ACCOUNT);

    let filter = doc! {};
    let collection_count = collections.count_documents(filter.clone(), None).unwrap();

    return collection_count;
}
