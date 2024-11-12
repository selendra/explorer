use ethers::{
    abi::{encode, Token}, providers::{Http, Middleware, Provider}, types::{Address, Bytes, NameOrAddress, H256}, utils::keccak256
};
use std::{collections::HashSet, str::FromStr};
use anyhow::Result;

// Storage slots for proxy pattern detection
const IMPLEMENTATION_SLOT: &str = "360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc";
const ADMIN_SLOT: &str = "b53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103";
const BEACON_SLOT: &str = "a3f0ad74e5423aebfd80d3ef4346578335a9a72aeaee59ff6cb3582b35133d50";

#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub enum ProxyPattern {
    TransparentProxy,
    UUPS,
    BeaconProxy,
    EIP1967Proxy,
    EIP1167MinimalProxy,
    Unknown,
}

pub struct ProxyDetector {
    provider: Provider<Http>,
}

impl ProxyDetector {
    pub fn new(rpc_url: &str) -> Result<Self> {
        let provider = Provider::<Http>::try_from(rpc_url)?;
        Ok(Self { provider })
    }

    // Helper function to get EIP-1967 slots
    fn get_eip1967_slots(&self) -> (H256, H256, H256) {
        (
            H256::from_slice(&keccak256(b"eip1967.proxy.implementation")),
            H256::from_slice(&keccak256(b"eip1967.proxy.admin")),
            H256::from_slice(&keccak256(b"eip1967.proxy.beacon"))
        )
    }

    // Helper function to get OpenZeppelin storage slots
    fn get_storage_slots(&self) -> Result<(H256, H256, H256)> {
        Ok((
            H256::from_str(IMPLEMENTATION_SLOT)?,
            H256::from_str(ADMIN_SLOT)?,
            H256::from_str(BEACON_SLOT)?
        ))
    }

    pub async fn detect_proxy_patterns(&self, address: Address) -> Result<HashSet<ProxyPattern>> {
        let mut patterns = HashSet::new();

        // Get contract code
        let code = self.provider.get_code(address, None).await?;
        
        // Check EIP-1167 Minimal Proxy first
        if self.is_minimal_proxy(&code)? {
            patterns.insert(ProxyPattern::EIP1167MinimalProxy);
            return Ok(patterns);
        }

        // Check storage slots
        let (impl_slot, _admin_slot, beacon_slot) = self.get_eip1967_slots();
        let (oz_impl_slot, _oz_admin_slot, oz_beacon_slot) = self.get_storage_slots()?;

        // Check implementation slots
        let impl_storage = self.provider.get_storage_at(address, impl_slot, None).await?;
        let oz_impl_storage = self.provider.get_storage_at(address, oz_impl_slot, None).await?;

        if impl_storage != H256::zero() || oz_impl_storage != H256::zero() {
            patterns.insert(ProxyPattern::EIP1967Proxy);

            // Check for UUPS
            if self.is_uups_proxy(address).await? {
                patterns.insert(ProxyPattern::UUPS);
            }
            
            // Check for Transparent
            if self.is_transparent_proxy(address).await? {
                patterns.insert(ProxyPattern::TransparentProxy);
            }
        }

        // Check beacon slots
        let beacon_storage = self.provider.get_storage_at(address, beacon_slot, None).await?;
        let oz_beacon_storage = self.provider.get_storage_at(address, oz_beacon_slot, None).await?;

        if beacon_storage != H256::zero() || oz_beacon_storage != H256::zero() {
            patterns.insert(ProxyPattern::BeaconProxy);
        }

        if patterns.is_empty() {
            patterns.insert(ProxyPattern::Unknown);
        }

        Ok(patterns)
    }

    // Build call utility function
    async fn build_call(&self, address: Address, data: Vec<u8>) -> Result<Option<Bytes>> {
        let tx = ethers::core::types::TransactionRequest {
            to: Some(NameOrAddress::Address(address)),
            data: Some(Bytes::from(data)),
            ..Default::default()
        }.into();

        match self.provider.call(&tx, None).await {
            Ok(result) => Ok(Some(result)),
            Err(_) => Ok(None),
        }
    }

    // Helper function to check function existence
    async fn check_function(&self, address: Address, func_sig: &str, params: Vec<Token>) -> Result<bool> {
        let selector = &keccak256(func_sig.as_bytes())[0..4];
        let mut data = selector.to_vec();
        
        if !params.is_empty() {
            let encoded_params = encode(&params);
            data.extend_from_slice(&encoded_params);
        }

        Ok(self.build_call(address, data).await?.is_some())
    }

    async fn is_uups_proxy(&self, address: Address) -> Result<bool> {
        let functions = [
            ("upgradeTo(address)", vec![Token::Address(Address::zero())]),
            ("upgradeToAndCall(address,bytes)", vec![
                Token::Address(Address::zero()),
                Token::Bytes(vec![]),
            ]),
        ];

        for (func_sig, params) in functions.iter() {
            if self.check_function(address, func_sig, params.clone()).await? {
                return Ok(true);
            }
        }

        Ok(false)
    }

    async fn is_transparent_proxy(&self, address: Address) -> Result<bool> {
        let functions = [
            ("admin()", vec![]),
            ("implementation()", vec![]),
            ("changeAdmin(address)", vec![Token::Address(Address::zero())]),
            ("upgradeTo(address)", vec![Token::Address(Address::zero())]),
        ];

        let mut success_count = 0;
        for (func_sig, params) in functions.iter() {
            if self.check_function(address, func_sig, params.clone()).await? {
                success_count += 1;
            }
        }

        Ok(success_count >= 2)
    }

    fn is_minimal_proxy(&self, code: &Bytes) -> Result<bool> {
        let minimal_proxy_prefix = hex::decode("363d3d373d3d3d363d73")?;
        let minimal_proxy_suffix = hex::decode("5af43d82803e903d91602b57fd5bf3")?;

        if code.len() >= 45 {
            let prefix_matches = code.starts_with(&minimal_proxy_prefix);
            let suffix_matches = code[32..].starts_with(&minimal_proxy_suffix);
            return Ok(prefix_matches && suffix_matches);
        }

        Ok(false)
    }

    pub async fn get_implementation_address(&self, address: Address) -> Result<Option<Address>> {
        // Check EIP-1967 slot
        let impl_slot = self.get_eip1967_slots().0;
        let impl_storage = self.provider.get_storage_at(address, impl_slot, None).await?;
        
        if impl_storage != H256::zero() {
            return Ok(Some(Address::from_slice(&impl_storage.as_bytes()[12..])));
        }

        // Check OpenZeppelin slot
        let oz_impl_slot = self.get_storage_slots()?.0;
        let oz_storage = self.provider.get_storage_at(address, oz_impl_slot, None).await?;
        
        if oz_storage != H256::zero() {
            return Ok(Some(Address::from_slice(&oz_storage.as_bytes()[12..])));
        }

        // Try calling implementation() function
        let selector = &keccak256(b"implementation()")[0..4];
        if let Some(result) = self.build_call(address, selector.to_vec()).await? {
            if result.len() >= 32 {
                return Ok(Some(Address::from_slice(&result[12..32])));
            }
        }

        Ok(None)
    }

    pub async fn get_admin_address(&self, address: Address) -> Result<Option<Address>> {
        // Check EIP-1967 admin slot
        let admin_slot = self.get_eip1967_slots().1;
        let admin_storage = self.provider.get_storage_at(address, admin_slot, None).await?;
        
        if admin_storage != H256::zero() {
            return Ok(Some(Address::from_slice(&admin_storage.as_bytes()[12..])));
        }

        // Try calling admin() function
        let selector = &keccak256(b"admin()")[0..4];
        if let Some(result) = self.build_call(address, selector.to_vec()).await? {
            if result.len() >= 32 {
                return Ok(Some(Address::from_slice(&result[12..32])));
            }
        }

        Ok(None)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_proxy_detection() -> Result<()> {
        let detector = ProxyDetector::new("https://mainnet.infura.io/v3/24a3e0a1e6474ff183c2e832a7e1a6a0")?;

        // Test addresses
        let test_cases = [
            // USDC Proxy
            "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
            // USDT Proxy
            "0xdAC17F958D2ee523a2206206994597C13D831ec7",
        ];

        for address_str in test_cases.iter() {
            let address = Address::from_str(address_str)?;
            println!("\nAnalyzing address: {}", address_str);

            let patterns = detector.detect_proxy_patterns(address).await?;
            println!("Detected patterns: {:?}", patterns);

            if let Ok(Some(impl_addr)) = detector.get_implementation_address(address).await {
                println!("Implementation: {:?}", impl_addr);
            }

            if let Ok(Some(admin_addr)) = detector.get_admin_address(address).await {
                println!("Admin: {:?}", admin_addr);
            }

            assert!(!patterns.contains(&ProxyPattern::Unknown));
        }

        Ok(())
    }
}