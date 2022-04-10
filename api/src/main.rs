
use dotenv;
use std::{path::Path, env};
use mongodb::sync::Client;

use operation::{
	// block::get_blocks,
	account::{
		get_accounts,
		// get_account_index,
	}
};
use models::page::PageQuery;

fn main() {
    let path = Path::new("../.env");
    dotenv::from_path(path).unwrap();
    let mogouri = env::var("MONGO_URI").expect("EMAIL_BACKEND not found");
    let database = env::var("DATABASE").expect("EMAIL_BACKEND not found");

    let client = Client::with_uri_str(mogouri).expect("failed to connect");

    let search: PageQuery = PageQuery {
            page_size: 2,
            page_number: 1,
        };
    // let block = get_blocks(client, &database, search);

	// let search = "seaTomr1isWkjhy7iJPmuicMDHZQggTZLiM2hUPGCMTTwicn2";
	let account = get_accounts(client, &database, search);
	// let index = get_account_index(client, &database);

    println!("{:?}", account.unwrap()[0]);
}
