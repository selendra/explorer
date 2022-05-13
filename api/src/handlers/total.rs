use crate::{
    models::{account::Account, extrinsic::Extrinsic, total::*, transfer::Transfer},
    ACCOUNT, DATABASE, SIGNEDEXTRINSIC, TRANSFER, VALIDATOR, VALIDATORDATABASE, LOCKBALANCE
};

use actix_web::{get, web, HttpResponse};
use mongodb::{
    bson::doc,
    sync::{Client, Collection},
};

#[get("")]
async fn get_totals(client: web::Data<Client>) -> HttpResponse {
    let filter = doc! {};
    let account_col: Collection<Account> = client.database(DATABASE).collection(ACCOUNT);
    let extrinsic_col: Collection<Extrinsic> = client.database(DATABASE).collection(SIGNEDEXTRINSIC);
    let transfer_col: Collection<Transfer> = client.database(DATABASE).collection(TRANSFER);

    let account_count = account_col.count_documents(filter.clone(), None).unwrap();
    let extrinsic_count = extrinsic_col.count_documents(filter.clone(), None).unwrap();
    let transfer_count = transfer_col.count_documents(filter.clone(), None).unwrap();

    let total = TotalData {
        Accounts: account_count,
        SignedExtrinsic: extrinsic_count,
        Transfers: transfer_count,
    };

    return HttpResponse::Ok().json(total);
}

#[get("/staking")]
async fn get_stake_value(client: web::Data<Client>) -> HttpResponse {
    let collection: Collection<ValidatorStaking> = client.database(VALIDATORDATABASE).collection(VALIDATOR);

    let filter = doc! {};
    let mut stakevalue: f64 = 0.0;

    match collection.find(filter, None) {
        Ok(mut cursor) => {
            while let Some(doc) = cursor.next() {
                match doc {
                    Ok(db) => {
                        stakevalue = stakevalue + db.totalStake;
                    }
                    Err(err) => return HttpResponse::InternalServerError().body(err.to_string()),
                }
            }
        }
        Err(err) => return HttpResponse::InternalServerError().body(err.to_string()),
    }

    let total = ValidatorStaking { totalStake: stakevalue };

    return HttpResponse::Ok().json(total);
}

#[get("/norminate")]
async fn get_norminate_value(client: web::Data<Client>) -> HttpResponse {
    let collection: Collection<NorminatorStaking> = client.database(VALIDATORDATABASE).collection(VALIDATOR);

    let filter = doc! {};
    let mut stakevalue: f64 = 0.0;

    match collection.find(filter, None) {
        Ok(mut cursor) => {
            while let Some(doc) = cursor.next() {
                match doc {
                    Ok(db) => {
                        stakevalue = stakevalue + db.otherStake;
                    }
                    Err(err) => return HttpResponse::InternalServerError().body(err.to_string()),
                }
            }
        }
        Err(err) => return HttpResponse::InternalServerError().body(err.to_string()),
    }

    let total = NorminatorStaking { otherStake: stakevalue };

    return HttpResponse::Ok().json(total);
}


#[get("/lock_balances")]
async fn get_lock_value(client: web::Data<Client>) -> HttpResponse {
    let collection: Collection<LockBalance> = client.database(DATABASE).collection(LOCKBALANCE);

    let filter = doc! {};
    let mut lock_balance: f64 = 0.0;

    match collection.find(filter, None) {
        Ok(mut cursor) => {
            while let Some(doc) = cursor.next() {
                match doc {
                    Ok(db) => {
                        lock_balance = db.totalLockBalances;
                    }
                    Err(err) => return HttpResponse::InternalServerError().body(err.to_string()),
                }
            }
        }
        Err(err) => return HttpResponse::InternalServerError().body(err.to_string()),
    }

    let total = LockBalance { totalLockBalances: lock_balance };

    return HttpResponse::Ok().json(total);
}
