use super::contracts::{erc20::ERC20TransactionFetcher, types::ContractDetector};
use crate::models::{
	block::{EvmBlock, LatestBlock},
	extrinsic::{OtherTx, TransactionDetail},
	gas::BlockGas,
};

use anyhow::{anyhow, Result};
use futures::try_join;
use std::{convert::TryFrom, str::FromStr};

use ethers::{
	providers::{Http, Middleware, Provider},
	types::{BlockId, Transaction, H160, H256},
};

pub struct EvmClient {
	pub provider: Provider<Http>,
	pub contract_detector: ContractDetector,
	pub erc20_fetcher: ERC20TransactionFetcher,
}

impl EvmClient {
	pub fn new(provider_url: &str) -> Result<Self> {
		let provider = Provider::<Http>::try_from(provider_url.to_string())?;
		let erc20_fetcher = ERC20TransactionFetcher::new(provider.clone());
		let contract_detector = ContractDetector::new(provider.clone());
		Ok(Self { provider, contract_detector, erc20_fetcher })
	}

	pub async fn get_lastet_block(&self) -> Result<Option<LatestBlock>> {
		let last_block = self.provider.get_block_number().await?;
		if let Some(block) = self.provider.get_block(last_block).await? {
			let detail = LatestBlock {
				block_number: block.number.unwrap_or_default().as_u64(),
				timestamp: block.timestamp.as_u64(),
				number_of_tx: u16::try_from(block.transactions.len()).unwrap_or(0),
			};
			Ok(Some(detail))
		} else {
			Ok(None)
		}
	}

	pub async fn get_block(&self, block_number: u64) -> Result<Option<EvmBlock>> {
		let block_id = BlockId::from(block_number);
		if let Some(block) = self.provider.get_block(block_id).await? {
			let mut block_transactions = Vec::new();

			for transaction_hash in block.transactions {
				let (tx_detail, receipt) = try_join!(
					self.provider.get_transaction(transaction_hash),
					self.provider.get_transaction_receipt(transaction_hash),
				)
				.map_err(|e| anyhow!("Error fetching transaction data: {:?}", e))?;

				if let Some((tx, res)) = tx_detail.zip(receipt) {
					let is_contract =
						self.is_contract(tx.to.unwrap_or_default(), Some(block_id)).await?;

					let transaction_detail = TransactionDetail {
						transaction_hash: format!("0x{}", hex::encode(tx.hash.as_bytes())),
						status: res.status.map_or(false, |status| status.as_u32() == 1),
						from: format!("0x{}", hex::encode(tx.from.as_bytes())),
						to: format!("0x{}", hex::encode(tx.to.unwrap_or_default().as_bytes())),
						is_contract,
						amount: tx.value.as_u128(),
						gas_price: tx.gas_price.unwrap_or_default().as_u128(),
						gas_use: res.gas_used.unwrap_or_default().as_u64(),
						other: OtherTx {
							transation_type: res.transaction_type.unwrap_or_default().as_u32(),
							nonce: tx.nonce.as_u64(),
							index: res.transaction_index.as_u32(),
						},
					};
					block_transactions.push(transaction_detail);
				}
			}

			Ok(Some(EvmBlock {
				block_numer: block.number.unwrap_or_default().as_u64(),
				block_hash: format!("0x{}", hex::encode(block.hash.unwrap_or_default().as_bytes())),
				transactions: block_transactions,
				timestamp: block.timestamp.as_u64(),
				size: block.size.unwrap_or_default().as_u64(),
				nonce: format!("0x{}", hex::encode(block.nonce.unwrap_or_default().as_bytes())),
				gas: BlockGas {
					gas_used: block.gas_used.as_u64(),
					gas_limit: block.gas_limit.as_u64(),
					base_fee_per_gas: block.base_fee_per_gas.unwrap_or_default().as_u64(),
				},
			}))
		} else {
			Ok(None)
		}
	}

	pub async fn is_contract(&self, address: H160, block_number: Option<BlockId>) -> Result<bool> {
		let code = self.provider.get_code(address, block_number).await?;
		Ok(!code.0.is_empty())
	}

	pub async fn get_transaction_by_hash(&self, tx_hash: &str) -> Result<Option<Transaction>> {
		let hash = H256::from_str(tx_hash)?;
		let transaction = self.provider.get_transaction(hash).await?;
		Ok(transaction)
	}

	pub fn addree_from_string(&self, address: String)-> Result<H160> {
		H160::from_str(&address).map_err(|e| anyhow!("Error: {:?}", e))
	}
}
