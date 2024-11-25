use ethers::{
	abi::{encode, Token},
	providers::{Http, Middleware, Provider, ProviderError},
	types::{transaction::eip2718::TypedTransaction, Address, TransactionRequest, U256},
	utils::keccak256,
};

use crate::models::contract::ContractType;

#[derive(Debug, Clone)]
pub struct ContractDetector {
	pub provider: Provider<Http>,
}

impl ContractDetector {
	pub fn new(provider: Provider<Http>) -> Self {
		Self { provider }
	}

	/// Detect and return contract metadata
	pub async fn detect(&self, address: Address) -> Result<Option<ContractType>, ProviderError> {
		// Check for deployed contract code
		if !self.has_contract_code(address).await? {
			println!("No contract code found at: {:?}", address);
			return Ok(None);
		}

		if let Some(erc20) = self.detect_erc20(address).await? {
			return Ok(Some(erc20));
		}

		if let Some(erc721) = self.detect_erc721(address).await? {
			return Ok(Some(erc721));
		}

		Ok(Some(ContractType::Unknown))
	}

	/// Detect ERC20 contract and fetch metadata
	async fn detect_erc20(&self, address: Address) -> Result<Option<ContractType>, ProviderError> {
		let methods = ["name()", "symbol()", "decimals()", "totalSupply()"];

		if !self.validate_methods(address, &methods).await {
			return Ok(None); // Not an ERC20
		}

		let transafer = self
			.validate_function_call(
				address,
				"transfer(address,uint256)",
				vec![Token::Address(Address::zero()), Token::Uint(U256::zero())],
			)
			.await
			.unwrap_or(false);

		let balance_of = self
			.validate_function_call(
				address,
				"balanceOf(address)",
				vec![Token::Address(Address::zero())],
			)
			.await
			.unwrap_or(false);

		let allowance = self
			.validate_function_call(
				address,
				"allowance(address,address)",
				vec![Token::Address(Address::zero()), Token::Address(Address::zero())],
			)
			.await
			.unwrap_or(false);

		if !transafer || !balance_of || !allowance {
			return Ok(None); // Not an ERC20
		}

		Ok(Some(ContractType::ERC20))
	}

	async fn detect_erc721(&self, address: Address) -> Result<Option<ContractType>, ProviderError> {
		// Required ERC721 methods
		let methods =
			["name()", "symbol()", "balanceOf(address)", "ownerOf(uint256)", "tokenURI(uint256)"];

		if !self.validate_methods(address, &methods).await {
			return Ok(None); // Not an ERC20
		}

		Ok(Some(ContractType::ERC721))
	}

	/// Generic function call validation
	async fn validate_function_call(
		&self,
		address: Address,
		func_sig: &str,
		params: Vec<Token>,
	) -> Result<bool, ProviderError> {
		let tx = self.create_call(address, func_sig, params, Some(50_000));
		match self.provider.call(&tx, None).await {
			Ok(_) => Ok(true), // Function exists and callable
			Err(e) if e.to_string().contains("revert") => Ok(true), // Function exists but reverts
			Err(_) => Ok(false), // Function does not exist
		}
	}

	/// Validate multiple methods
	async fn validate_methods(&self, address: Address, methods: &[&str]) -> bool {
		for &method in methods {
			let tx = self.create_call(address, method, vec![], None);
			match self.provider.call(&tx, None).await {
				Ok(data) => !data.is_empty(), // Ensure non-empty response
				Err(_) => false,
			};
		}
		true
	}

	/// Check if the contract has deployed code
	async fn has_contract_code(&self, address: Address) -> Result<bool, ProviderError> {
		let code = self.provider.get_code(address, None).await?;
		Ok(!code.is_empty())
	}

	// /// Check if contract supports specific interface
	// async fn check_interface_support(&self, address: Address, interface_id: &str) -> Result<bool, ProviderError> {
	//     let interface_bytes = hex::decode(interface_id).unwrap_or_default();

	//     self.validate_function_call(
	//         address,
	//         "supportsInterface(bytes4)",
	//         vec![Token::FixedBytes(interface_bytes)],
	//     ).await
	// }

	/// Create a call transaction
	fn create_call(
		&self,
		to: Address,
		func_sig: &str,
		params: Vec<Token>,
		gas: Option<u64>,
	) -> TypedTransaction {
		let selector = &keccak256(func_sig.as_bytes())[0..4];
		let mut data = selector.to_vec();
		if !params.is_empty() {
			data.extend_from_slice(&encode(&params));
		}
		TransactionRequest {
			to: Some(to.into()),
			data: Some(data.into()),
			gas: gas.map(Into::into),
			..Default::default()
		}
		.into()
	}
}

// Tests
#[cfg(test)]
mod tests {
	use super::*;

	#[tokio::test]
	async fn test_detect_erc20() {
		let provider = Provider::<Http>::try_from(
			"https://mainnet.infura.io/v3/24a3e0a1e6474ff183c2e832a7e1a6a0",
		)
		.expect("Failed to create provider");
		let detector = ContractDetector::new(provider);
		let token_address: Address = "0xdAC17F958D2ee523a2206206994597C13D831ec7".parse().unwrap(); // USDT

		match detector.detect(token_address).await {
			Ok(Some(metadata)) => {
				println!("Token contract: {:?}", metadata);
				assert_eq!(metadata, ContractType::ERC20);
			},
			Ok(None) => panic!("Address is not a valid ERC20 contract"),
			Err(e) => panic!("Error: {:?}", e),
		}
	}
	#[tokio::test]
	async fn test_detect_non_erc20() {
		let provider = Provider::<Http>::try_from(
			"https://mainnet.infura.io/v3/24a3e0a1e6474ff183c2e832a7e1a6a0",
		)
		.expect("Failed to create provider");
		let detector = ContractDetector::new(provider);
		let non_erc20_address: Address =
			"0x0000000000000000000000000000000000000000".parse().unwrap();

		match detector.detect(non_erc20_address).await {
			Ok(Some(_)) => panic!("Address should not be detected as an ERC20 contract"),
			Ok(None) => println!("Address is not a valid ERC20 contract as expected."),
			Err(e) => panic!("Error: {:?}", e),
		}
	}

	#[tokio::test]
	async fn test_detect_erc721() {
		let provider = Provider::<Http>::try_from(
			"https://mainnet.infura.io/v3/24a3e0a1e6474ff183c2e832a7e1a6a0",
		)
		.expect("Failed to create provider");

		let detector = ContractDetector::new(provider);
		let token_address: Address = "0xb47e3cd837dDF8e4c57F05d70Ab865de6e193BBB".parse().unwrap(); // CryptoPunks

		match detector.detect(token_address).await {
			Ok(Some(metadata)) => {
				println!("NFT contract: {:?}", metadata);
				assert_eq!(metadata, ContractType::ERC721);
			},
			Ok(None) => panic!("Address is not a valid ERC721 contract"),
			Err(e) => panic!("Error: {:?}", e),
		}
	}
}
