use crate::{
    BLOCK, utils::{is_hash, is_numberic}
};
use error_handler::CustomError;
use models::{block::Block, page::PageQuery};

use mongodb::{
    bson::{doc, Document},
    options::FindOptions,
    sync::Client,
};

pub fn get_block(client: Client, db: &str, search: &str) -> Result<Block, CustomError> {
    let db = client.database(db);
    let collection = db.collection::<Block>(BLOCK);

    if is_hash(search) {
        let filter = doc! {"hash": search};
        let result = collection.find_one(filter, None);

        match result {
            Ok(Some(res)) => Ok(res),
            Ok(None) => Err(CustomError::NoDataFound()),
            Err(err) => Err(CustomError::MongodbError(err)),
        }
    } else if is_numberic(search) {
        let filter = doc! {"block.header.number": search.parse::<u32>().unwrap()};
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

pub fn get_blocks(client: Client, db: &str, search: PageQuery) -> Result<Vec<Block>, CustomError> {
    let database = client.database(db);
    let collections = database.collection::<Block>(BLOCK);
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

    let mut block_vec: Vec<Block> = Vec::new();
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

pub fn get_block_index(client: Client, db: &str) -> u64 {
    let database = client.database(db);
    let collections = database.collection::<Document>(BLOCK);

    let filter = doc! {};
    let collection_count = collections.count_documents(filter.clone(), None).unwrap();

    return collection_count;
}
