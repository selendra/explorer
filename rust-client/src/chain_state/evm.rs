use anyhow::{anyhow, Ok, Result};
use std::convert::TryFrom;

use ethers::{
	providers::{Http, Middleware, Provider},
	types::BlockId,
};

// pub struct BlockGas {
//     pub gas_used: u32, // gas_used
//     pub gas_limit: u32 ,// gas_limit
//     pub base_fee_per_gas: u32, // base_fee_per_gas
// }

// pub struct EvmBlock {
// 	pub block_numer: u64, // number
// 	pub block_hash: String, //  hash
//     pub transactions: Vec<Transaction>, // transactions
//     pub timestamp: u64, // timestamp
//     pub size: u32, // size
//     pub nonce: u32,// nonce
//     pub gas: BlockGas,
// }

// pub struct OtherTransation {
//     pub transation_type: Option<u16>, // transaction_type
//     pub nonce: u32,
//     pub index: Option<u16> // transaction_index
// }


// pub struct TransactionDetail {
//     pub transaction_hash: String, // hash 
//     pub status: bool, // self.provider.get_transaction_receipt(hash).status
//     pub from: String,
//     pub to: String,
//     pub contract_address: Option<String>,
//     pub amount: u128, // value
//     pub gas_price: u128,
//     pub gas_use: u128, // self.provider.get_transaction_receipt(hash).gas_used
//     pub other: OtherTransation
// }

pub struct EvmClient {
	url: String,
	provider: Option<Provider<Http>>,
}

impl EvmClient {
	pub fn new(provider_url: &str) -> Self {
		Self { url: provider_url.to_string(), provider: None }
	}

	pub fn connect(&mut self) -> Result<()> {
		let provider = Provider::<Http>::try_from(self.url.clone())?;

		self.provider = Some(provider);

		Ok(())
	}

	pub async fn get_block(&self, block_number: u64) -> Result<()> {
		let provider = self.provider.as_ref().ok_or_else(|| anyhow!("client not initialized"))?;

		let block_id = BlockId::from(block_number);

		let block = provider.get_block(block_id).await?;

		for transation in block.unwrap().transactions {
			// let tx_datail = provider.get_transaction(transation).await?;
			let reciep = provider.get_transaction_receipt(transation).await?;
			
			println!("{:?}", reciep);
			
		}

		
		
		Ok(())
	}
}
