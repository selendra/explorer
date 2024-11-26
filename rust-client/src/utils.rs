use sp_core::crypto::Ss58Codec;

pub fn validate_ss58_address(address: &str) -> bool {
	match sp_core::crypto::AccountId32::from_ss58check(address) {
		Ok(_) => true,
		Err(_) => false,
	}
}
