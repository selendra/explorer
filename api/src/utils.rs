use regex::Regex;

pub fn ensure_prefix(hash: &str) -> std::string::String {
    if !hash.starts_with("0x") {
        let newhash = format!("0x{}", hash);
        return newhash;
    } else {
        return hash.to_string();
    }
}

pub fn is_hash(data: &str) -> bool {
    let hash_regex = Regex::new(r"^(0x)?[\da-fA-F]{64}$").unwrap();
    let normalized = ensure_prefix(data);

    if hash_regex.is_match(&normalized) {
        true
    } else {
        false
    }
}

pub fn is_address(data: &str) -> bool {
    let hash_regex = Regex::new(r"^(se)?[\a-z]{49}$").unwrap();

    if hash_regex.is_match(&data) {
        true
    } else {
        false
    }
}
