use alloy::{
    primitives::{Address, FixedBytes},
    rpc::types::{FilterSet, Log, Topic},
};
use sha2::{Digest, Sha256};

// Calculates a unique identifier for each log. It uses the tx hash,
// the log index and the rollup id.
pub fn hash_log<T>(log: &Log<T>, rollup_id: u32) -> String {
    let mut hasher = Sha256::new();
    hasher.update(log.transaction_hash.unwrap().to_string());
    hasher.update(log.log_index.unwrap().to_string());
    hasher.update(rollup_id.to_string());
    format!("{:x}", hasher.finalize())
}

pub fn to_topic(address: Address) -> Topic {
    let mut address_bytes = [0u8; 32];
    address_bytes[12..].copy_from_slice(address.as_slice());
    FilterSet::from(FixedBytes::<32>::from_slice(&address_bytes))
}
