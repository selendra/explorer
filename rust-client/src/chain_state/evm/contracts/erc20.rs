use anyhow::{anyhow, Ok, Result};
use sp_core::H256;
use std::{collections::HashMap, sync::Arc};

use ethers::{
	contract::Contract,
	providers::{Http, Middleware, Provider},
	types::{Address, TransactionReceipt, U256},
};

use crate::models::{
	contract::{ERC20Transaction, Erc20Info},
	gas::TransactionGas,
};

use super::abi::ERC20_ABI;

#[derive(Debug, Clone)]
pub struct ERC20TransactionFetcher {
	pub provider: Provider<Http>,
	pub function_signatures: HashMap<[u8; 4], String>,
}

impl ERC20TransactionFetcher {
	pub fn new(provider: Provider<Http>) -> Self {
		let function_signatures = HashMap::from([
			([0xa9, 0x05, 0x9c, 0xbb], "transfer(address,uint256)".to_string()),
			([0x09, 0x5e, 0xa7, 0xb3], "approve(address,uint256)".to_string()),
			([0x23, 0xb8, 0x72, 0xdd], "transferFrom(address,address,uint256)".to_string()),
			([0x70, 0xa0, 0x82, 0x31], "balanceOf(address)".to_string()),
			([0xdd, 0x62, 0xed, 0x3e], "allowance(address,address)".to_string()),
			([0x18, 0x16, 0x0d, 0xdd], "totalSupply()".to_string()),
			([0x40, 0xc1, 0x0f, 0x19], "mint(address,uint256)".to_string()),
			([0x42, 0x96, 0x66, 0x96], "burn(uint256)".to_string()),
			([0x79, 0xcc, 0x67, 0x90], "burnFrom(address,uint256)".to_string()),
			([0x39, 0x50, 0x93, 0x51], "increaseAllowance(address,uint256)".to_string()),
			([0xa4, 0x57, 0xc2, 0xd7], "decreaseAllowance(address,uint256)".to_string()),
			(
				[0xd5, 0x05, 0xac, 0xcf],
				"permit(address,address,uint256,uint256,uint8,bytes32,bytes32)".to_string(),
			),
			(
				[0x0c, 0x53, 0xc5, 0x1c],
				"executeMetaTransaction(address,bytes,bytes32,bytes32,uint8)".to_string(),
			),
			([0x8f, 0x32, 0xd5, 0x9b], "pause()".to_string()),
			([0x3f, 0x4b, 0xa8, 0x3a], "unpause()".to_string()),
			([0x24, 0x86, 0x17, 0x82], "hasRole(bytes32,address)".to_string()),
			([0x2f, 0x2f, 0xf1, 0x5d], "grantRole(bytes32,address)".to_string()),
		]);

		Self { provider, function_signatures }
	}

	pub async fn get_erc20_transaction(&self, tx_hash: H256) -> Result<Option<ERC20Transaction>> {
		let (transaction, receipt) = self
			.provider
			.get_transaction(tx_hash)
			.await?
			.zip(self.provider.get_transaction_receipt(tx_hash).await?)
			.ok_or_else(|| anyhow!("Transaction or receipt not found"))?;

		let method_sig = transaction
			.input
			.get(0..4)
			.map(|sig| [sig[0], sig[1], sig[2], sig[3]])
			.unwrap_or_default();

		let decoded_data = self.decode_input_data(&transaction.input, &method_sig)?;
		let transaction_gas = self.calculate_transaction_gas(&transaction, &receipt)?;

		Ok(Some(ERC20Transaction {
			transaction_type: self.get_transaction_type(&method_sig),
			method_name: self
				.function_signatures
				.get(&method_sig)
				.cloned()
				.unwrap_or("unknown".to_string()),
			hash: format!("{:?}", transaction.hash),
			block_number: receipt.block_number.unwrap_or_default().as_u64(),
			status: receipt.status.map_or(false, |status| status.as_u32() == 1),
			token_info: self.get_token_info(transaction.to.unwrap_or_default()).await?,
			native_value: transaction.value.as_u128(),
			token_value: decoded_data.get("value").and_then(|v| v.parse().ok()).unwrap_or_default(),
			transaction_gas,
			decoded_data,
			error_message: self.get_error_message(&receipt),
		}))
	}

	fn decode_input_data(
		&self,
		input: &[u8],
		method_sig: &[u8; 4],
	) -> Result<HashMap<String, String>> {
		let mut decoded = HashMap::new();
		if input.len() < 4 {
			return Ok(decoded);
		}

		match method_sig {
			[0xa9, 0x05, 0x9c, 0xbb] => {
				// transfer(address,uint256)
				self.decode_transfer_or_approve(&input[4..], &mut decoded)?;
			},
			[0x09, 0x5e, 0xa7, 0xb3] => {
				// approve(address,uint256)
				self.decode_transfer_or_approve(&input[4..], &mut decoded)?;
			},
			_ => {},
		}

		Ok(decoded)
	}

	fn decode_transfer_or_approve(
		&self,
		data: &[u8],
		decoded: &mut HashMap<String, String>,
	) -> Result<()> {
		if data.len() >= 64 {
			let to = format!("0x{}", hex::encode(&data[12..32]));
			let value = U256::from_big_endian(&data[32..64]).to_string();
			decoded.insert("to".to_string(), to);
			decoded.insert("value".to_string(), value);
		}
		Ok(())
	}

	async fn get_token_info(&self, token_address: Address) -> Result<Erc20Info> {
		let abi: ethers::abi::Abi = serde_json::from_str(ERC20_ABI)?;
		let contract = Contract::new(token_address, abi, Arc::new(self.provider.clone()));

		let name = contract
			.method::<_, String>("name", ())?
			.call()
			.await
			.unwrap_or("Unknown".to_string());
		let symbol = contract
			.method::<_, String>("symbol", ())?
			.call()
			.await
			.unwrap_or("UNK".to_string());
		let decimals = contract.method::<_, u8>("decimals", ())?.call().await.unwrap_or(18);

		Ok(Erc20Info { name, symbol, decimals })
	}

	fn get_transaction_type(&self, method_sig: &[u8; 4]) -> String {
		match self.function_signatures.get(method_sig) {
			Some(name) if name.starts_with("transfer") => "Transfer".to_string(),
			Some(name) if name.starts_with("approve") => "Approve".to_string(),
			Some(name) if name.starts_with("mint") => "Mint".to_string(),
			Some(name) if name.starts_with("burn") => "Burn".to_string(),
			Some(name) if name.contains("MetaTransaction") => "MetaTransaction".to_string(),
			Some(name) if name.contains("permit") => "Permit".to_string(),
			_ => "Unknown".to_string(),
		}
	}

	fn calculate_transaction_gas(
		&self,
		transaction: &ethers::types::Transaction,
		receipt: &TransactionReceipt,
	) -> Result<TransactionGas> {
		let gas_used = receipt.gas_used.unwrap_or_default();
		let gas_price = transaction.gas_price.unwrap_or_default();
		let total_gas_cost = (gas_used * gas_price).as_u64();

		Ok(TransactionGas {
			gas_price: gas_price.as_u128(),
			gas_used: gas_used.as_u64(),
			total_gas_cost,
		})
	}

	fn get_error_message(&self, receipt: &TransactionReceipt) -> Option<String> {
		if receipt.status.unwrap_or_default().as_u64() == 0 {
			receipt
				.logs
				.first()
				.and_then(|log| {
					if log.data.len() >= 68 {
						Some(String::from_utf8_lossy(&log.data[36..68]).to_string())
					} else {
						None
					}
				})
				.or(Some("Transaction Failed".to_string()))
		} else {
			None
		}
	}
}
