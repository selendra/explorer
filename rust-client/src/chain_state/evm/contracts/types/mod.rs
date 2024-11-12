use ethers::types::{transaction::eip2718::TypedTransaction, Address, Bytes};

pub mod proxy;
pub mod governance;

// Helper function to build call
fn build_call(to: Address, data: &Bytes) -> TypedTransaction {
    ethers::core::types::TransactionRequest {
        to: Some(ethers::types::NameOrAddress::Address(to)),
        data: Some(data.clone()),
        ..Default::default()
    }.into()
}