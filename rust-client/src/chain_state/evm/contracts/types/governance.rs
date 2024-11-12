use ethers::{
    abi::{encode, Token}, providers::{Http, Middleware, Provider}, types::{Address, Bytes}, utils::keccak256
};
use std::collections::HashSet;
use anyhow::Result;

use super::build_call;

#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub enum GovernancePattern {
    OZGovernor,
    CompoundGovernorAlpha,
    CompoundGovernorBravo,
    Unknown,
}

pub struct GovernanceDetector {
    provider: Provider<Http>,
}

impl GovernanceDetector {
    pub fn new(rpc_url: &str) -> Result<Self> {
        let provider = Provider::<Http>::try_from(rpc_url)?;
        Ok(Self { provider })
    }

    pub async fn detect_governance_pattern(&self, address: Address) -> Result<HashSet<GovernancePattern>> {
        let mut patterns = HashSet::new();

        if self.is_compound_governor_alpha(address).await? {
            patterns.insert(GovernancePattern::CompoundGovernorAlpha);
        }

        if self.is_compound_governor_bravo(address).await? {
            patterns.insert(GovernancePattern::CompoundGovernorBravo);
        }

        if self.is_oz_governor(address).await? {
            patterns.insert(GovernancePattern::OZGovernor);
        }

        if patterns.is_empty() {
            patterns.insert(GovernancePattern::Unknown);
        }

        Ok(patterns)
    }

    async fn call_with_params(&self, address: Address, func_sig: &str, params: Vec<Token>) -> Result<bool> {
        let selector = &keccak256(func_sig.as_bytes())[0..4];
        let mut data = selector.to_vec();
        
        if !params.is_empty() {
            let encoded_params = encode(&params);
            data.extend_from_slice(&encoded_params);
        }
        
        let tx = build_call(address, &Bytes::from(data));

        match self.provider.call(&tx, None).await {
            Ok(_) => Ok(true),
            Err(_) => Ok(false),
        }
    }

    async fn is_compound_governor_alpha(&self, address: Address) -> Result<bool> {
        let mut success_count = 0;
        
        // Simple view functions without parameters
        let view_functions = [
            "guardian()",
            "quorumVotes()",
            "votingPeriod()",
            "proposalCount()",
        ];

        for func_sig in &view_functions {
            if self.call_with_params(address, func_sig, vec![]).await? {
                success_count += 1;
            }
        }

        // Functions with parameters
        let param_checks = [
            // state(uint256)
            ("state(uint256)", vec![Token::Uint(1u64.into())]),
            // castVote(uint256,bool)
            ("castVote(uint256,bool)", vec![Token::Uint(1u64.into()), Token::Bool(true)]),
        ];

        for (func_sig, params) in &param_checks {
            if self.call_with_params(address, func_sig, params.clone()).await? {
                success_count += 1;
            }
        }

        Ok(success_count >= 5)
    }

    async fn is_compound_governor_bravo(&self, address: Address) -> Result<bool> {
        let mut success_count = 0;

        // View functions
        let view_functions = [
            "implementation()",
            "votingPeriod()",
            "proposalCount()",
            "admin()",
        ];

        for func_sig in &view_functions {
            if self.call_with_params(address, func_sig, vec![]).await? {
                success_count += 1;
            }
        }

        println!("first {:?}",success_count);

        // Functions with parameters
        let param_checks = [
            // state(uint256)
            ("state(uint256)", vec![Token::Uint(1u64.into())]),
            // castVote(uint256,uint8)
            ("castVote(uint256,uint8)", vec![Token::Uint(1u64.into()), Token::Uint(1u64.into())]),
        ];

        for (func_sig, params) in &param_checks {
            if self.call_with_params(address, func_sig, params.clone()).await? {
                success_count += 1;
            }
        }

        println!("finish {:?}",success_count);

        Ok(success_count >= 4)
    }

    async fn is_oz_governor(&self, address: Address) -> Result<bool> {
        let mut success_count = 0;

        // View functions
        let view_functions = [
            "name()",
            "version()",
            "COUNTING_MODE()",
            "votingDelay()",
            "votingPeriod()",
        ];

        for func_sig in &view_functions {
            if self.call_with_params(address, func_sig, vec![]).await? {
                success_count += 1;
            }
        }

        // Functions with parameters
        let param_checks = [
            // state(uint256)
            ("state(uint256)", vec![Token::Uint(1u64.into())]),
            // hasVoted(uint256,address)
            ("hasVoted(uint256,address)", vec![
                Token::Uint(1u64.into()),
                Token::Address(Address::zero()),
            ]),
        ];

        for (func_sig, params) in &param_checks {
            if self.call_with_params(address, func_sig, params.clone()).await? {
                success_count += 1;
            }
        }

        Ok(success_count >= 4)
    }

    pub async fn get_proposal_count(&self, address: Address) -> Result<Option<u64>> {
        let selector = &keccak256(b"proposalCount()")[0..4];
        let tx = build_call(address, &Bytes::from(selector.to_vec()));

        match self.provider.call(&tx, None).await {
            Ok(result) => {
                if result.len() >= 32 {
                    let count = u64::from_be_bytes(result[24..32].try_into().unwrap());
                    Ok(Some(count))
                } else {
                    Ok(None)
                }
            },
            Err(_) => Ok(None),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::str::FromStr;

    #[tokio::test]
    async fn test_governance_detection() -> Result<()> {
        let detector = GovernanceDetector::new("https://mainnet.infura.io/v3/24a3e0a1e6474ff183c2e832a7e1a6a0")?;
        
        // Verified Compound Governor Alpha (Compound Protocol)
        let compound_alpha = Address::from_str("0xc0dA01a04C3f3E0be433606045bB7017A7323E38")?;
        let patterns = detector.detect_governance_pattern(compound_alpha).await?;
        assert!(patterns.contains(&GovernancePattern::CompoundGovernorAlpha));

        Ok(())
    }

    #[tokio::test]
    async fn test_governances_detection() -> Result<()> {
        let detector = GovernanceDetector::new("https://mainnet.infura.io/v3/24a3e0a1e6474ff183c2e832a7e1a6a0")?;

        // Test known governance contracts
        let test_addresses = [
            // Compound Governor Bravo
            "0xc0Da02939E1441F497fd74F78cE7Decb17B66529",
            // Uniswap Governor Bravo
            "0x408ED6354d4973f66138C91495F2f2FCbd8724C3",
            // ENS Governor
            "0x323A76393544d5ecca80cd6ef2A560C6a395b7E3",
        ];

        for addr_str in test_addresses {
            let address = Address::from_str(addr_str)?;
            let patterns = detector.detect_governance_pattern(address).await?;
            println!("Address {} patterns: {:?}", addr_str, patterns);
            
            // Get proposal count if available
            if let Ok(Some(count)) = detector.get_proposal_count(address).await {
                println!("Proposal count: {}", count);
            }
            
            assert!(!patterns.contains(&GovernancePattern::Unknown));
        }

        Ok(())
    }
}