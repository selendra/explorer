use crate::models::{
	block::EvmBlock,
	extrinsic::{OtherTx, TransactionDetail},
	gas::BlockGas,
};

use anyhow::{anyhow, Result};
use futures::try_join;
use std::{collections::HashMap, convert::TryFrom, str::FromStr};

use ethers::{
	providers::{Http, Middleware, Provider},
	types::{
		transaction::eip2718::TypedTransaction, Address, BlockId, NameOrAddress, Transaction,
		TransactionRequest, H160, H256,
	},
};

pub struct EvmClient {
	provider: Provider<Http>,
}

impl EvmClient {
	pub fn new(provider_url: &str) -> Result<Self> {
		let provider = Provider::<Http>::try_from(provider_url.to_string())?;
		Ok(Self { provider })
	}

	pub async fn get_block(&self, block_number: u64) -> Result<()> {
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
					let is_contract = self
						.is_contract(tx.to.unwrap_or_else(|| Address::zero()), Some(block_id))
						.await?;

					let transaction_detail = TransactionDetail {
						transaction_hash: tx.hash.to_string(),
						status: res.status.map_or(false, |status| status.as_u32() == 1),
						from: tx.from.to_string(),
						to: tx.to.map_or_else(String::new, |to| to.to_string()),
						is_contract,
						amount: tx.value.as_u128(),
						gas_price: tx.gas_price.map_or(0, |gas| gas.as_u128()),
						gas_use: res.gas_used.map_or(0, |gas| gas.as_u64()),
						other: OtherTx {
							transation_type: res.transaction_type.map_or(0, |t| t.as_u32()),
							nonce: tx.nonce.as_u64(),
							index: res.transaction_index.as_u32(),
						},
					};
					block_transactions.push(transaction_detail);
				}
			}

			let evm_block = EvmBlock {
				block_numer: block.number.map_or(0, |num| num.as_u64()),
				block_hash: block.hash.map_or_else(|| "0x".to_string(), |hash| hash.to_string()),
				transactions: block_transactions,
				timestamp: block.timestamp.as_u64(),
				size: block.size.map_or(0, |size| size.as_u64()),
				nonce: block
					.nonce
					.map_or_else(|| "0x0000000000000000".to_string(), |nonce| nonce.to_string()),
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

	pub async fn is_contract(&self, address: H160, block_number: Option<BlockId>) -> Result<bool> {
		let code = self.provider.get_code(address, block_number).await?;
		Ok(!code.0.is_empty())
	}

	pub async fn get_contract_types(&self, contract_address: &str) -> Result<Vec<String>> {
		let address = Address::from_str(contract_address)?;
		let mut implemented_standards = Vec::new();

		// Define selectors for various ERC standards
		let selectors: HashMap<&str, Vec<[u8; 4]>> = [
			(
				"ERC20",
				vec![
					[0x18, 0x16, 0x0d, 0xdd],
					[0x70, 0xa0, 0x82, 0x31],
					[0xa9, 0x05, 0x9c, 0xbb],
					[0x09, 0x5e, 0xa7, 0xb3],
					[0x23, 0xb8, 0x72, 0xdd],
				],
			),
			(
				"ERC721",
				vec![
					[0x63, 0x52, 0x7b, 0xc3],
					[0x95, 0x04, 0x7b, 0xd3],
					[0x42, 0x84, 0x2e, 0x0e],
					[0xb8, 0x8d, 0x4f, 0xde],
					[0x09, 0x5e, 0xa7, 0xb3],
					[0xa2, 0x2c, 0xb4, 0x65],
					[0xe9, 0x4b, 0x5b, 0x32],
				],
			),
			(
				"ERC1155",
				vec![
					[0x00, 0xfd, 0xd5, 0x8e], // balanceOf(address,uint256)
					[0xd9, 0xb6, 0x7a, 0x26], // safeTransferFrom(address,address,uint256,uint256,bytes)
					[0x2e, 0x4e, 0xd4, 0xe7], // safeBatchTransferFrom(address,address,uint256[],uint256[],bytes)
					[0xa2, 0x2c, 0xb4, 0x65], // setApprovalForAll(address,bool)
					[0xe9, 0x4b, 0x5b, 0x32], // isApprovedForAll(address,address)
					[0x4e, 0x12, 0x0f, 0x47], // balanceOfBatch(address[],uint256[])
				],
			),
			(
				"ERC777",
				vec![
					[0x18, 0x2f, 0xe0, 0xd0], // name()
					[0x95, 0xea, 0x7b, 0x3d], // authorizeOperator(address)
					[0x42, 0x79, 0x32, 0xa5], // revokeOperator(address)
					[0xe4, 0x3d, 0xd5, 0x7e], // defaultOperators()
					[0x94, 0x95, 0xc9, 0x29], // operatorSend(address,address,uint256,bytes,bytes)
					[0x62, 0x8b, 0xc5, 0x5e], // operatorBurn(address,uint256,bytes,bytes)
					[0xa9, 0x05, 0x9c, 0xbb], // transfer(address,uint256) (also in ERC-20)
					[0x70, 0xa0, 0x82, 0x31], // balanceOf(address) (also in ERC-20)
					[0x5c, 0x97, 0xbd, 0x9d], // granularity()
				],
			),
			(
				"ERC4626",
				vec![
					[0x4e, 0x71, 0xd9, 0x27], // deposit(uint256,address)
					[0xb6, 0x2d, 0x1d, 0xd6], // withdraw(uint256,address,address)
					[0xd0, 0xe3, 0x0d, 0x00], // redeem(uint256,address,address)
					[0x47, 0xe7, 0xef, 0x24], // mint(uint256,address)
					[0x06, 0xfd, 0xde, 0x03], // previewDeposit(uint256)
					[0xf6, 0xe9, 0xdc, 0x5c], // previewMint(uint256)
					[0x16, 0x7e, 0xab, 0x3a], // previewWithdraw(uint256)
					[0x4b, 0x82, 0x26, 0xc4], // previewRedeem(uint256)
					[0x18, 0x16, 0x0d, 0xdd], // totalSupply() (also in ERC-20)
					[0x00, 0x00, 0x00, 0x00], // asset() (depends on implementation)
				],
			),
			(
				"ERC721A",
				vec![
					[0x80, 0xac, 0x58, 0xcd], // ownerOf(uint256)
					[0x23, 0xb8, 0x72, 0xdd], // transferFrom(address,address,uint256)
					[0xb8, 0x8d, 0x4f, 0xde], // safeTransferFrom(address,address,uint256,bytes)
					[0x70, 0xa0, 0x82, 0x31], // balanceOf(address)
					[0x5b, 0x5e, 0x13, 0x36], // explicitOwnershipOf(uint256)
				],
			),
			(
				"ERC4337_v0.6",
				vec![
					[0x5b, 0x5e, 0x13, 0x36], // validateUserOp in v0.6
					[0xaf, 0xfe, 0xd0, 0xe0], // getNonce
					[0x97, 0x7d, 0xcc, 0xe4], // execFromEntryPoint
				],
			),
			(
				"ERC4337_v0.7",
				vec![
					[0x7a, 0x0d, 0x5b, 0x1d], // validateUserOp in v0.7
					[0xaf, 0xfe, 0xd0, 0xe0], // getNonce
					[0x97, 0x7d, 0xcc, 0xe4], // execFromEntryPoint
				],
			),
		]
		.iter()
		.cloned()
		.collect();

		for (erc, selectors_list) in selectors {
			let mut all_functions_exist = true;
			for selector in selectors_list {
				if !self.check_contract_interface(address, selector).await? {
					all_functions_exist = false;
					break;
				}
			}
			if all_functions_exist {
				implemented_standards.push(erc.to_string());
			}
		}

		Ok(implemented_standards)
	}

	pub async fn get_transaction_by_hash(&self, tx_hash: &str) -> Result<Option<Transaction>> {
		let hash = H256::from_str(tx_hash)?;
		let transaction = self.provider.get_transaction(hash).await?;
		Ok(transaction)
	}

	async fn check_contract_interface(
		&self,
		contract_address: Address,
		selector: [u8; 4],
	) -> Result<bool> {
		let data = selector.to_vec();
		let call: TypedTransaction = TransactionRequest {
			to: Some(NameOrAddress::Address(contract_address)),
			data: Some(data.into()),
			..Default::default()
		}
		.into();

		Ok(self.provider.call(&call, None).await.is_ok())
	}
}
