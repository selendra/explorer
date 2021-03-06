use crate::{models::staking::*, utils::is_address, VALIDATOR, VALIDATORDATABASE, VALIDATORFEATURE, VALIDATORSTATUS};

use actix_web::{get, web, HttpResponse};
use mongodb::{
    bson,
    bson::doc,
    sync::{Client, Collection},
};

#[get("/validators")]
async fn get_validators(client: web::Data<Client>) -> HttpResponse {
    let collection: Collection<Validator> = client.database(VALIDATORDATABASE).collection(VALIDATOR);
    let collection_count = collection.count_documents(doc! {}, None).unwrap();

    let pipeline = vec![doc! {
       "$sort": {
          "rank": 1
       }
    }];

    let mut transfer_vec: Vec<Validator> = Vec::new();

    match collection.aggregate(pipeline, None) {
        Ok(mut cursor) => {
            while let Some(doc) = cursor.next() {
                match doc {
                    Ok(db) => match bson::from_document(db) {
                        Ok(validate) => transfer_vec.push(validate),
                        Err(err) => return HttpResponse::InternalServerError().body(err.to_string()),
                    },
                    Err(err) => return HttpResponse::InternalServerError().body(err.to_string()),
                }
            }
        }
        Err(err) => return HttpResponse::InternalServerError().body(err.to_string()),
    }

    let transfer_page = ValidatorPage {
        total_valalidaors: collection_count,
        validators: transfer_vec,
    };

    return HttpResponse::Ok().json(transfer_page);
}

#[get("validators/{address}")]
async fn get_validators_detail(client: web::Data<Client>, address: web::Path<String>) -> HttpResponse {
    let address = address.into_inner();
    if !(is_address(&address)) {
        return HttpResponse::NotFound().body(format!("Invalid address {} type", address));
    }

    let collection: Collection<Validator> = client.database(VALIDATORDATABASE).collection(VALIDATOR);
    match collection.find_one(doc! { "stashAddress": &address }, None) {
        Ok(Some(account)) => HttpResponse::Ok().json(account),
        Ok(None) => HttpResponse::NotFound().body(format!("No account found with this address {}", address)),
        Err(err) => HttpResponse::InternalServerError().body(err.to_string()),
    }
}

#[get("/status")]
async fn get_status(client: web::Data<Client>) -> HttpResponse {
    let collection: Collection<ValidatorStatus> = client.database(VALIDATORDATABASE).collection(VALIDATORSTATUS);

    match collection.find_one(doc! {}, None) {
        Ok(Some(status)) => HttpResponse::Ok().json(status),
        Ok(None) => HttpResponse::NotFound().body(format!("No status have found")),
        Err(err) => HttpResponse::InternalServerError().body(err.to_string()),
    }
}

#[get("/feature_of_week")]
async fn get_feature(client: web::Data<Client>) -> HttpResponse {
    let collection: Collection<ValaidatorFeature> = client.database(VALIDATORDATABASE).collection(VALIDATORFEATURE);

    match collection.find_one(doc! {}, None) {
        Ok(Some(status)) => HttpResponse::Ok().json(status),
        Ok(None) => HttpResponse::NotFound().body(format!("No status have found")),
        Err(err) => HttpResponse::InternalServerError().body(err.to_string()),
    }
}
