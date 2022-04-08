use mongodb::error::Error as MongodbError;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum CustomError {
    #[error("There this no data in collection")]
    NoDataFound(),
    #[error("Mongodb error")]
    MongodbError(#[from] MongodbError),
    #[error("There is error in Selendra subxt")]
    SelendraSubxt(),
    #[error("Insert invalid data")]
    InvalidData(),
    #[error("unknown error")]
    Unknown,
}
