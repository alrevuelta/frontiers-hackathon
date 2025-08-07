use crate::contracts::PolygonZkEVMBridgeV2::{BridgeEvent, ClaimEvent, NewWrappedToken};
use crate::contracts::ERC20::Transfer;
use crate::utils::hash_log;
use alloy::primitives::Address;
use alloy::rpc::types::Log;
use duckdb::{Connection, Result};
use std::sync::Arc;
use tokio::sync::Mutex;

#[derive(Debug, Clone)]
pub struct Database {
    db: Arc<Mutex<Connection>>,
}

impl Database {
    pub async fn new(use_in_memory: bool) -> Result<Self> {
        // Determine the database path based on the flag
        let db_path = if use_in_memory {
            ":memory:"
        } else {
            "data.duckdb"
        };

        let db = Arc::new(Mutex::new(Connection::open(db_path)?));
        {
            let conn = db.lock().await;

            // Maps to BridgeEvent
            conn.execute(
                "CREATE TABLE IF NOT EXISTS bridge_events (
                id TEXT PRIMARY KEY,
                rollup_id INTEGER,
                transaction_hash TEXT,
                block_hash TEXT,
                block_number INTEGER,
                transaction_index INTEGER,
                log_index INTEGER,
                leafType INTEGER,
                originNetwork INTEGER,
                originAddress TEXT,
                destinationNetwork INTEGER,
                destinationAddress TEXT,
                amount TEXT,
                metadata TEXT,
                depositCount INTEGER
            );",
                [],
            )?;

            // Maps to ClaimEvent
            conn.execute(
                "CREATE TABLE IF NOT EXISTS claim_events (
                id TEXT PRIMARY KEY,
                rollup_id INTEGER,
                transaction_hash TEXT,
                block_hash TEXT,
                block_number INTEGER,
                transaction_index INTEGER,
                log_index INTEGER,
                version INTEGER,
                globalIndex TEXT,
                originNetwork INTEGER,
                originAddress TEXT,
                destinationAddress TEXT,
                amount TEXT
            );",
                [],
            )?;

            // Maps to NewWrappedToken event
            conn.execute(
                "CREATE TABLE IF NOT EXISTS new_wrapped_token_events (
                id TEXT PRIMARY KEY,
                rollup_id INTEGER,
                transaction_hash TEXT,
                block_hash TEXT,
                block_number INTEGER,
                transaction_index INTEGER,
                log_index INTEGER,
                originNetwork INTEGER,
                originTokenAddress TEXT,
                wrappedTokenAddress TEXT,
                metadata TEXT
            );",
                [],
            )?;

            // Store each rollup information.
            // By now its only to know how synced the rollup is.
            // Note that 0 is the l1.
            conn.execute(
                "CREATE TABLE IF NOT EXISTS rollups (
                rollup_id INTEGER PRIMARY KEY,
                network_name TEXT,
                latest_bridge_synced_block BIGINT
            );",
                [],
            )?;

            conn.execute(
                "CREATE TABLE IF NOT EXISTS wrapped_transfer_events (
                id TEXT PRIMARY KEY,
                rollup_id INTEGER,
                transaction_hash TEXT,
                block_hash TEXT,
                block_number INTEGER,
                transaction_index INTEGER,
                log_index INTEGER,
                from_address TEXT,
                to_address TEXT,
                token_address TEXT,
                value TEXT
            );",
                [],
            )?;

            conn.execute(
                "CREATE TABLE IF NOT EXISTS bridge_transfer_events (
                id TEXT PRIMARY KEY,
                rollup_id INTEGER,
                transaction_hash TEXT,
                block_hash TEXT,
                block_number INTEGER,
                transaction_index INTEGER,
                log_index INTEGER,
                from_address TEXT,
                to_address TEXT,
                token_address TEXT,
                value TEXT
            );",
                [],
            )?;
        }

        Ok(Database { db })
    }

    pub async fn insert_bridge_event(
        &self,
        log: &Log<BridgeEvent>,
        rollup_id: u32,
    ) -> Result<(), Box<dyn std::error::Error>> {
        let conn = self.db.lock().await;

        conn.execute(
            "INSERT OR IGNORE INTO bridge_events (
            id,
            rollup_id,
            transaction_hash,
            block_hash,
            block_number,
            transaction_index,
            log_index,
            leafType,
            originNetwork,
            originAddress,
            destinationNetwork,
            destinationAddress,
            amount,
            metadata,
            depositCount
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);",
            &[
                &hash_log(log, rollup_id),
                &rollup_id.to_string(),
                &log.transaction_hash.unwrap().to_string(),
                &log.block_hash.unwrap().to_string(),
                &log.block_number.unwrap().to_string(),
                &log.transaction_index.unwrap().to_string(),
                &log.log_index.unwrap().to_string(),
                &log.inner.leafType.to_string(),
                &log.inner.originNetwork.to_string(),
                &log.inner.originAddress.to_string(),
                &log.inner.destinationNetwork.to_string(),
                &log.inner.destinationAddress.to_string(),
                &log.inner.amount.to_string(),
                &log.inner.metadata.to_string(),
                &log.inner.depositCount.to_string(),
            ],
        )?;
        Ok(())
    }

    pub async fn insert_claim_event(
        &self,
        log: &Log<ClaimEvent>,
        rollup_id: u32,
        version: u32,
    ) -> Result<(), Box<dyn std::error::Error>> {
        let conn = self.db.lock().await;
        conn.execute(
            "INSERT OR IGNORE INTO claim_events (
            id,
            rollup_id,
            transaction_hash,
            block_hash,
            block_number,
            transaction_index,
            log_index,
            version,
            globalIndex,
            originNetwork,
            originAddress,
            destinationAddress,
            amount
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);",
            &[
                &hash_log(log, rollup_id),
                &rollup_id.to_string(),
                &log.transaction_hash.unwrap().to_string(),
                &log.block_hash.unwrap().to_string(),
                &log.block_number.unwrap().to_string(),
                &log.transaction_index.unwrap().to_string(),
                &log.log_index.unwrap().to_string(),
                &version.to_string(),
                &log.inner.globalIndex.to_string(),
                &log.inner.originNetwork.to_string(),
                &log.inner.originAddress.to_string(),
                &log.inner.destinationAddress.to_string(),
                &log.inner.amount.to_string(),
            ],
        )?;
        Ok(())
    }

    pub async fn insert_new_wrapped_token_event(
        &self,
        log: &Log<NewWrappedToken>,
        rollup_id: u32,
    ) -> Result<(), Box<dyn std::error::Error>> {
        let conn = self.db.lock().await;
        conn.execute(
            "INSERT OR IGNORE INTO new_wrapped_token_events (
            id,
            rollup_id,
            transaction_hash,
            block_hash,
            block_number,
            transaction_index,
            log_index,
            originNetwork,
            originTokenAddress,
            wrappedTokenAddress,
            metadata
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);",
            &[
                &hash_log(log, rollup_id),
                &rollup_id.to_string(),
                &log.transaction_hash.unwrap().to_string(),
                &log.block_hash.unwrap().to_string(),
                &log.block_number.unwrap().to_string(),
                &log.transaction_index.unwrap().to_string(),
                &log.log_index.unwrap().to_string(),
                &log.inner.originNetwork.to_string(),
                &log.inner.originTokenAddress.to_string(),
                &log.inner.wrappedTokenAddress.to_string(),
                &log.inner.metadata.to_string(),
            ],
        )?;
        Ok(())
    }

    pub async fn insert_wrapped_transfer_event(
        &self,
        log: &Log<Transfer>,
        rollup_id: u32,
    ) -> Result<(), Box<dyn std::error::Error>> {
        let conn = self.db.lock().await;

        conn.execute(
            "INSERT OR IGNORE INTO wrapped_transfer_events (
            id,
            rollup_id,
            transaction_hash,
            block_hash,
            block_number,
            transaction_index,
            log_index,
            from_address,
            to_address,
            token_address,
            value
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);",
            &[
                &hash_log(log, rollup_id),
                &rollup_id.to_string(),
                &log.transaction_hash.unwrap().to_string(),
                &log.block_hash.unwrap().to_string(),
                &log.block_number.unwrap().to_string(),
                &log.transaction_index.unwrap().to_string(),
                &log.log_index.unwrap().to_string(),
                &log.inner.from.to_string(),
                &log.inner.to.to_string(),
                &log.address().to_string(),
                &log.inner.value.to_string(),
            ],
        )?;
        Ok(())
    }

    pub async fn insert_bridge_transfer_event(
        &self,
        log: &Log<Transfer>,
        rollup_id: u32,
    ) -> Result<(), Box<dyn std::error::Error>> {
        let conn = self.db.lock().await;

        conn.execute(
            "INSERT OR IGNORE INTO bridge_transfer_events (
            id,
            rollup_id,
            transaction_hash,
            block_hash,
            block_number,
            transaction_index,
            log_index,
            from_address,
            to_address,
            token_address,
            value
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);",
            &[
                &hash_log(log, rollup_id),
                &rollup_id.to_string(),
                &log.transaction_hash.unwrap().to_string(),
                &log.block_hash.unwrap().to_string(),
                &log.block_number.unwrap().to_string(),
                &log.transaction_index.unwrap().to_string(),
                &log.log_index.unwrap().to_string(),
                &log.inner.from.to_string(),
                &log.inner.to.to_string(),
                &log.address().to_string(),
                &log.inner.value.to_string(),
            ],
        )?;
        Ok(())
    }

    pub async fn insert_rollup(
        &self,
        rollup_id: u32,
        network_name: &str,
    ) -> Result<(), Box<dyn std::error::Error>> {
        let conn = self.db.lock().await;

        let mut stmt = conn.prepare(
            "SELECT latest_bridge_synced_block FROM rollups WHERE rollup_id = ? LIMIT 1",
        )?;
        let mut rows = stmt.query(&[&rollup_id.to_string()])?;

        // TODO: Most likely not the best way to do this.
        if let Some(row) = rows.next()? {
            // Try to get an Option<i64>
            let block_i64_opt: Option<i64> = row.get(0)?;
            let block: u64 = match block_i64_opt {
                Some(v) => v as u64,
                None => {
                    eprintln!("Got NULL for block number (rollup {})", rollup_id);
                    0
                }
            };
            println!("rollup: {:?} block: {:?} already known", rollup_id, block);
            // …use `block`…
        } else {
            conn.execute(
                "INSERT INTO rollups (
                rollup_id,
                network_name,
                latest_bridge_synced_block)
            VALUES (?, ?, ?);",
                &[&rollup_id.to_string(), network_name, &(-1).to_string()],
            )?;
        }

        Ok(())
    }

    pub async fn last_indexed_block(
        &self,
        rollup_id: u32,
    ) -> Result<u64, Box<dyn std::error::Error>> {
        let conn = self.db.lock().await;
        let mut stmt = conn.prepare(
            "SELECT latest_bridge_synced_block
             FROM rollups
             WHERE rollup_id = ?",
        )?;
        // bind rollup_id as a u32 (no need to stringify)
        let mut rows = stmt.query(&[&rollup_id])?;

        if let Some(row) = rows.next()? {
            // Fetch as Option<i64> so that NULL → None
            let block_opt: Option<i64> = row.get(0)?;
            let block: u64 = match block_opt {
                Some(v) => {
                    // If it was non‐NULL, cast to u64.
                    // (Assuming “v” is never negative in your data.)
                    if v < 0 {
                        eprintln!(
                            "latest_bridge_synced_block is negative for rollup {}",
                            rollup_id
                        );
                        0
                        // ALL THIS IS CIMPETE SHIT, REDO IT.
                    } else {
                        v as u64
                    }
                }
                None => {
                    // It was actually NULL/empty → return 0 (or whatever fallback you want)
                    eprintln!(
                        "latest_bridge_synced_block is NULL for rollup {}",
                        rollup_id
                    );
                    0
                }
            };

            Ok(block)
        } else {
            // No row matched. Return 0 (or handle as error).
            Ok(0)
        }
    }

    pub async fn synced_till_block(
        &self,
        rollup_id: u32,
        block: u64,
    ) -> Result<(), Box<dyn std::error::Error>> {
        println!("Rollup: {:?} Synced till block: {:?}", rollup_id, block);
        let conn = self.db.lock().await;
        conn.execute(
            "UPDATE rollups SET latest_bridge_synced_block = ? WHERE rollup_id = ?",
            &[&block.to_string(), &rollup_id.to_string()],
        )?;
        Ok(())
    }

    pub async fn fetch_wrapped_tokens(
        &self,
        rollup_id: u32,
    ) -> Result<Vec<Address>, Box<dyn std::error::Error>> {
        let conn = self.db.lock().await;

        // Prepare the query to fetch wrapped token addresses
        let mut stmt = conn.prepare(
            "SELECT wrappedTokenAddress FROM new_wrapped_token_events WHERE rollup_id = ?",
        )?;

        // Execute the query and collect results
        let wrapped_token_strings: Vec<String> = stmt
            .query_map(&[&rollup_id.to_string()], |row| row.get(0))?
            .collect::<Result<_, _>>()?;

        // Parse each string into an Address
        let wrapped_tokens: Vec<Address> = wrapped_token_strings
            .into_iter()
            .map(|s| s.parse::<Address>())
            .collect::<Result<Vec<_>, _>>()?;

        Ok(wrapped_tokens)
    }

    pub fn db(&self) -> &Arc<Mutex<Connection>> {
        &self.db
    }
}
