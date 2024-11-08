use anyhow::{anyhow, Ok, Result};
use serde::{Deserialize, Serialize};
use std::convert::TryFrom;

use ethers::{
	providers::{Http, Middleware, Provider},
	types::BlockId,
};

#[derive(Debug, Deserialize, Serialize)]
pub struct BlockGas {
	pub gas_used: u64,
	pub gas_limit: u64,
	pub base_fee_per_gas: u64,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct EvmBlock {
	pub block_numer: u64,
	pub block_hash: String,
	pub transactions: Vec<TransactionDetail>,
	pub timestamp: u64,
	pub size: u64,
	pub nonce: String,
	pub gas: BlockGas,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct OtherTx {
	pub transation_type: u32, // transaction_type
	pub nonce: u64,
	pub index: u32, // transaction_index
}

#[derive(Debug, Deserialize, Serialize)]
pub struct TransactionDetail {
	pub transaction_hash: String, // hash
	pub status: bool,             // self.provider.get_transaction_receipt(hash).status
	pub from: String,
	pub to: String,
	pub contract_address: Option<String>,
	pub amount: u128, // value
	pub gas_price: u128,
	pub gas_use: u64, // self.provider.get_transaction_receipt(hash).gas_used
	pub other: OtherTx,
}

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

		let block_deatai = provider.get_block(block_id).await?;

		if let Some(block) = block_deatai {
			let mut block_transactions: Vec<TransactionDetail> = Vec::new();
			for transation in block.transactions {
				let tx_detail = provider.get_transaction(transation).await?;
				let receipt = provider.get_transaction_receipt(transation).await?;

				if let Some((tx, res)) = tx_detail.zip(receipt) {
					let transation_detail = TransactionDetail {
						transaction_hash: tx.hash.to_string(),
						status: res.status.map_or(false, |x| x.as_u32() == 1),
						from: tx.from.to_string(),
						to: tx.to.map_or("".to_string(), |to| to.to_string()),
						contract_address: res.contract_address.map_or(None, |addr| Some(addr.to_string())),
						amount: tx.value.as_u128(),
						gas_price: tx.gas_price.map_or(0, |gas| gas.as_u128()),
						gas_use: res.gas_used.map_or(0, |gas| gas.as_u64()),
						other: OtherTx { 
							transation_type: res.transaction_type.map_or(0, |f| f.as_u32()), 
							nonce: tx.nonce.as_u64(), 
							index: res.transaction_index.as_u32()
						},
					};
					block_transactions.push(transation_detail);
				}
			}

			let evm_block = EvmBlock {
				block_numer: block.number.map_or(0, |number| number.as_u64()),
				block_hash: block.hash.map_or("0x".to_string(), |hash| hash.to_string()),
				transactions: block_transactions,
				timestamp: block.timestamp.as_u64(),
				size: block.size.map_or(0, |size| size.as_u64()),
				nonce: block
					.nonce
					.map_or("0x0000000000000000".to_string(), |nonce| nonce.to_string()),
				gas: BlockGas {
					gas_used: block.gas_used.as_u64(),
					gas_limit: block.gas_limit.as_u64(),
					base_fee_per_gas: block.base_fee_per_gas.map_or(0, |fee| fee.as_u64()),
				},
			};

			println!("{:#?}", evm_block);
		}

		Ok(())
	}
}
