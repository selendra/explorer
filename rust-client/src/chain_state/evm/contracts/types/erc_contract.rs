use ethers::{
	abi::{encode, Token},
	providers::{Http, Middleware, Provider, ProviderError},
	types::{transaction::eip2718::TypedTransaction, Address, TransactionRequest, U256},
	utils::keccak256,
};

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ContractType {
    ERC20,
    Unknown,
}

#[derive(Debug, Clone)]
pub struct TokenMetadata {
    pub name: Option<String>,
    pub symbol: Option<String>,
    pub decimals: Option<u8>,
    pub contract_type: ContractType,
}

pub struct ErcDetector {
	provider: Provider<Http>,
}

impl ErcDetector {
    pub fn new(provider_url: &str) -> Self {
        let provider = Provider::<Http>::try_from(provider_url).expect("Failed to create provider");
        Self { provider }
    }

    /// Detect and return contract metadata
    pub async fn detect(&self, address: Address) -> Result<Option<TokenMetadata>, ProviderError> {
        // Check for deployed contract code
        if !self.has_contract_code(address).await? {
            println!("No contract code found at: {:?}", address);
            return Ok(None);
        }

        // Check for ERC20 compliance
        if let Some(metadata) = self.detect_erc20(address).await? {
            return Ok(Some(metadata));
        }

        // If no known type detected, return Unknown
        Ok(Some(TokenMetadata {
            name: None,
            symbol: None,
            decimals: None,
            contract_type: ContractType::Unknown,
        }))
    }

    /// Detect ERC20 contract and fetch metadata
    async fn detect_erc20(&self, address: Address) -> Result<Option<TokenMetadata>, ProviderError> {
        let methods = ["name()", "symbol()", "decimals()", "totalSupply()"];
        if !self.validate_methods(address, &methods).await {
            return Ok(None); // Not an ERC20
        }

        if !self.validate_transfer(address).await.unwrap_or(false)
            || !self.validate_balance_of(address).await.unwrap_or(false)
            || !self.validate_allowance(address).await.unwrap_or(false)
        {
            return Ok(None); // Not an ERC20
        }

        // Fetch ERC20 metadata
        let name = self.fetch_optional_string(address, "name()").await;
        let symbol = self.fetch_optional_string(address, "symbol()").await;
        let decimals = self.fetch_optional_u8(address, "decimals()").await;

        Ok(Some(TokenMetadata {
            name,
            symbol,
            decimals,
            contract_type: ContractType::ERC20,
        }))
    }

    /// Validate ERC20-specific methods
    async fn validate_transfer(&self, address: Address) -> Result<bool, ProviderError> {
        self.validate_function_call(address, "transfer(address,uint256)", vec![
            Token::Address(Address::zero()),
            Token::Uint(U256::zero()),
        ])
        .await
    }

    async fn validate_balance_of(&self, address: Address) -> Result<bool, ProviderError> {
        self.validate_function_call(address, "balanceOf(address)", vec![Token::Address(Address::zero())]).await
    }

    async fn validate_allowance(&self, address: Address) -> Result<bool, ProviderError> {
        self.validate_function_call(address, "allowance(address,address)", vec![
            Token::Address(Address::zero()),
            Token::Address(Address::zero()),
        ])
        .await
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
            if !self.validate_method(address, method).await {
                println!("Method `{}` validation failed.", method);
                return false;
            }
        }
        true
    }

    /// Validate a single method
    async fn validate_method(&self, address: Address, method: &str) -> bool {
        let tx = self.create_call(address, method, vec![], None);
        match self.provider.call(&tx, None).await {
            Ok(data) => !data.is_empty(), // Ensure non-empty response
            Err(_) => false,
        }
    }

    /// Check if the contract has deployed code
    async fn has_contract_code(&self, address: Address) -> Result<bool, ProviderError> {
        let code = self.provider.get_code(address, None).await?;
        Ok(!code.is_empty())
    }

    /// Fetch optional string
    async fn fetch_optional_string(&self, address: Address, method: &str) -> Option<String> {
        self.fetch_string(address, method).await.ok()
    }

    /// Fetch optional u8
    async fn fetch_optional_u8(&self, address: Address, method: &str) -> Option<u8> {
        self.fetch_u8(address, method).await.ok()
    }

    /// Fetch string from contract
    async fn fetch_string(&self, address: Address, method: &str) -> Result<String, ProviderError> {
        let data = self.provider.call(&self.create_call(address, method, vec![], None), None).await?;
        if data.len() >= 64 {
            let offset = U256::from_big_endian(&data[0..32]).as_usize();
            let length = U256::from_big_endian(&data[32..64]).as_usize();
            if offset + 32 + length <= data.len() {
                return Ok(String::from_utf8_lossy(&data[offset + 32..offset + 32 + length]).into_owned());
            }
        }
        Err(ProviderError::CustomError("Invalid string data".to_string()))
    }

    /// Fetch u8 from contract
    async fn fetch_u8(&self, address: Address, method: &str) -> Result<u8, ProviderError> {
        let data = self.provider.call(&self.create_call(address, method, vec![], None), None).await?;
        if data.len() == 32 {
            Ok(U256::from_big_endian(&data).as_u32() as u8)
        } else {
            Err(ProviderError::CustomError("Invalid u8 data".to_string()))
        }
    }

    /// Create a call transaction
    fn create_call(&self, to: Address, func_sig: &str, params: Vec<Token>, gas: Option<u64>) -> TypedTransaction {
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
	async fn test_detect_erc20_metadata() {
		let detector = ErcDetector::new("https://mainnet.infura.io/v3/24a3e0a1e6474ff183c2e832a7e1a6a0");
		let token_address: Address = "0xdAC17F958D2ee523a2206206994597C13D831ec7".parse().unwrap(); // USDT

		match detector.detect(token_address).await {
			Ok(Some(metadata)) => {
				println!("Token metadata: {:?}", metadata);
				assert_eq!(metadata.contract_type, ContractType::ERC20);
				assert!(metadata.name.is_some());
				assert!(metadata.symbol.is_some());
			},
			Ok(None) => panic!("Address is not a valid ERC20 contract"),
			Err(e) => panic!("Error: {:?}", e),
		}
	}
	#[tokio::test]
	async fn test_detect_non_erc20_metadata() {
		let detector = ErcDetector::new("https://mainnet.infura.io/v3/24a3e0a1e6474ff183c2e832a7e1a6a0");
		let non_erc20_address: Address =
			"0x0000000000000000000000000000000000000000".parse().unwrap();

		match detector.detect(non_erc20_address).await {
			Ok(Some(_)) => panic!("Address should not be detected as an ERC20 contract"),
			Ok(None) => println!("Address is not a valid ERC20 contract as expected."),
			Err(e) => panic!("Error: {:?}", e),
		}
	}
}
