use crate::contracts::PolygonZkEVMBridge::ClaimEvent as ClaimEventV1;
use crate::contracts::PolygonZkEVMBridgeV2::{
    BridgeEvent, ClaimEvent, EmergencyStateActivated, EmergencyStateDeactivated, Initialized,
    NewWrappedToken,
};
use crate::contracts::ERC20::Transfer;
use crate::database::Database;
use crate::utils::to_topic;
use alloy::primitives::address;
use alloy::primitives::{Address, Log as Log2};
use alloy::providers::fillers::{
    BlobGasFiller, ChainIdFiller, FillProvider, GasFiller, JoinFill, NonceFiller,
};
use alloy::providers::{Provider, RootProvider};
use alloy::rpc::types::Filter;
use alloy::rpc::types::Log;
use alloy::transports::http::reqwest::Url;
use alloy::{
    providers::ProviderBuilder, rpc::client::RpcClient, transports::layers::RetryBackoffLayer,
};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::time::Duration;

use tokio::time::sleep;

use crate::contracts::TransparentUpgradeableProxy::{AdminChanged, Upgraded};

// TODO: The clone is most likely not needed.
#[derive(Clone)]
pub struct Indexer {
    // TODO: This is nonsense.
    pub provider: FillProvider<
        JoinFill<
            alloy::providers::Identity,
            JoinFill<GasFiller, JoinFill<BlobGasFiller, JoinFill<NonceFiller, ChainIdFiller>>>,
        >,
        RootProvider,
    >,
    pub bridge_address: Address,
    pub rollup_id: u32,
    pub database: Database,
    pub wrapped_tokens: Vec<Address>,
    pub running: Arc<AtomicBool>,
}

impl Indexer {
    pub async fn new(
        bridge_address: Address,
        rpc_url: Url,
        rollup_id: u32,
        database: Database,
    ) -> Result<Self, Box<dyn std::error::Error>> {
        // TODO: Choose the right values
        let max_retry = 10;
        let backoff = 1000;
        let cups = 100;

        // TODO: Set retry logic for other cases. This retry is only for rate limit errors.
        let provider = ProviderBuilder::new().on_client(
            RpcClient::builder()
                .layer(RetryBackoffLayer::new(max_retry, backoff, cups))
                .http(rpc_url),
        );

        let wrapped_tokens = database.fetch_wrapped_tokens(rollup_id).await?;

        println!(
            "Wrapped tokens: {:?} in rollup {:?}",
            wrapped_tokens.len(),
            rollup_id
        );

        Ok(Indexer {
            provider: provider,
            bridge_address,
            rollup_id,
            database,
            running: Arc::new(AtomicBool::new(true)),
            wrapped_tokens: vec![],
        })
    }

    pub fn get_block_increment(&self) -> u64 {
        // Every rpc has its own limits. Defaulting to 10k is generally safe but
        // some impose lower limits.
        match &self.rollup_id {
            3 => 1000,   // OK X
            15 => 1_000, // Pentagon Games
            _ => 10_000, // Default value
        }
    }

    pub async fn distance_head(&self) -> Result<u64, Box<dyn std::error::Error>> {
        let last_indexed_block = self.database.last_indexed_block(self.rollup_id).await?;
        let latest_block = self.provider.get_block_number().await?;

        let distance = latest_block - last_indexed_block;
        Ok(distance)
    }

    pub async fn index(&mut self) -> Result<(), Box<dyn std::error::Error>> {
        let mut last_processed_block = self.database.last_indexed_block(self.rollup_id).await?;
        let mut latest_block = self.provider.get_block_number().await?;
        let block_increment = self.get_block_increment();

        // TODO: Review the logic is correct

        // This can help if the rpc allows multiple requests in paralel. Don't set it too high
        println!("debug: {:?}", last_processed_block);
        println!(
            "[Rollup: {:?}] Indexing from block: {:?}",
            self.rollup_id,
            last_processed_block + 1
        );

        loop {
            // Check for shutdown signal. This ensures we dont shutdown in the middle of an index.
            // TODO: I suspect this is not working as expected.
            if !self.running.load(Ordering::Relaxed) {
                println!(
                    "[Rollup: {:?}] Shutdown signal received. Exiting...",
                    self.rollup_id
                );
                break;
            }

            if last_processed_block >= latest_block {
                println!(
                    "[Rollup: {:?}] Reached the latest block {:?} . Sleeping for 60 seconds...",
                    self.rollup_id, latest_block
                );
                sleep(Duration::from_secs(5)).await;
                latest_block = self.provider.get_block_number().await?;
                continue;
            }

            let start_block = last_processed_block + 1;
            let end_block = std::cmp::min(start_block + block_increment, latest_block);
            let filter = Filter::new()
                .from_block(start_block)
                .to_block(end_block)
                .address(self.bridge_address);

            let rollup_id = self.rollup_id;

            let logs = self.provider.get_logs(&filter).await?;
            for log in logs {
                // Handle log decoding and database insertion
                if let Ok(dec) = log.log_decode::<BridgeEvent>() {
                    self.database.insert_bridge_event(&dec, rollup_id).await?;
                } else if let Ok(dec) = log.log_decode::<ClaimEventV1>() {
                    // TODO: Dirty. Find a way to convert the event.
                    // Convert and insert ClaimEventV1
                    let lol: Log<ClaimEvent> = Log {
                        inner: Log2 {
                            address: dec.inner.address,
                            data: ClaimEvent {
                                globalIndex: alloy::primitives::Uint::<256, 4>::from(
                                    dec.inner.index,
                                ),
                                destinationAddress: dec.inner.destinationAddress,
                                amount: dec.inner.amount,
                                originAddress: dec.inner.originAddress,
                                originNetwork: dec.inner.originNetwork,
                            },
                        },
                        block_hash: dec.block_hash,
                        block_number: dec.block_number,
                        block_timestamp: dec.block_timestamp,
                        transaction_hash: dec.transaction_hash,
                        transaction_index: dec.transaction_index,
                        log_index: dec.log_index,
                        removed: dec.removed,
                    };
                    self.database.insert_claim_event(&lol, rollup_id, 1).await?;
                } else if let Ok(dec) = log.log_decode::<ClaimEvent>() {
                    self.database.insert_claim_event(&dec, rollup_id, 2).await?;
                } else if let Ok(dec) = log.log_decode::<NewWrappedToken>() {
                    self.database
                        .insert_new_wrapped_token_event(&dec, rollup_id)
                        .await?;
                    self.wrapped_tokens.push(dec.inner.wrappedTokenAddress);
                } else if let Ok(dec) = log.log_decode::<EmergencyStateActivated>() {
                } else if let Ok(dec) = log.log_decode::<EmergencyStateDeactivated>() {
                } else if let Ok(dec) = log.log_decode::<Upgraded>() {
                } else if let Ok(dec) = log.log_decode::<Initialized>() {
                } else if let Ok(dec) = log.log_decode::<AdminChanged>() {
                } else {
                    panic!("Log could not be decoded: {:?}", log.transaction_hash);
                }
            }

            // Only index wrapped tokens if there are any
            if self.wrapped_tokens.len() > 0 {
                // mint
                let mint_events = self
                    .provider
                    .get_logs(
                        &Filter::new()
                            .from_block(start_block)
                            .to_block(end_block)
                            .address(self.wrapped_tokens.clone())
                            .event("Transfer(address,address,uint256)")
                            .topic1(to_topic(address!(
                                "0x0000000000000000000000000000000000000000"
                            ))),
                    )
                    .await?;

                // burn
                let burn_events = self
                    .provider
                    .get_logs(
                        &Filter::new()
                            .from_block(start_block)
                            .to_block(end_block)
                            .address(self.wrapped_tokens.clone())
                            .event("Transfer(address,address,uint256)")
                            .topic2(to_topic(address!(
                                "0x0000000000000000000000000000000000000000"
                            ))),
                    )
                    .await?;

                for log in mint_events {
                    let dec = log.log_decode::<Transfer>()?;
                    self.database
                        .insert_wrapped_transfer_event(&dec, self.rollup_id)
                        .await?;
                }

                for log in burn_events {
                    let dec = log.log_decode::<Transfer>()?;
                    self.database
                        .insert_wrapped_transfer_event(&dec, self.rollup_id)
                        .await?;
                }
            }

            let bridge_out_events = self
                .provider
                .get_logs(
                    &Filter::new()
                        .from_block(start_block)
                        .to_block(end_block)
                        .event("Transfer(address,address,uint256)")
                        .topic1(to_topic(self.bridge_address)),
                )
                .await?;

            let bridge_in_events = self
                .provider
                .get_logs(
                    &Filter::new()
                        .from_block(start_block)
                        .to_block(end_block)
                        .event("Transfer(address,address,uint256)")
                        .topic2(to_topic(self.bridge_address)),
                )
                .await?;

            for log in bridge_out_events {
                let dec = log.log_decode::<Transfer>()?;
                self.database
                    .insert_bridge_transfer_event(&dec, self.rollup_id)
                    .await?;
            }

            println!(
                "indexing from {:?} to {:?} bridge_address: {:?}",
                start_block, end_block, self.bridge_address
            );
            for log in bridge_in_events {
                // TODO: Bug ?? https://github.com/alloy-rs/alloy/issues/2243
                match log.log_decode::<Transfer>() {
                    Ok(dec) => {
                        self.database
                            .insert_bridge_transfer_event(&dec, self.rollup_id)
                            .await?;
                    }
                    Err(e) => {
                        println!("Error decoding log: {:?}", e);
                    }
                }
            }

            latest_block = self.provider.get_block_number().await?;
            last_processed_block = end_block;

            let percentage_indexed = (end_block as f64 / latest_block as f64) * 100.0;
            println!(
                "[Rollup: {:?}] Indexed {:.2}% of the blocks. {:?}/{:?}",
                self.rollup_id, percentage_indexed, end_block, latest_block
            );
            self.database
                .synced_till_block(self.rollup_id, end_block)
                .await?;
        }

        Ok(())
    }

    // TODO: Im sure there are fancier ways of doing this.
    // TODO: Unsure if this works as expected.
    pub fn shutdown(&self) {
        println!("Shutting down indexer {:?}", self.rollup_id);
        self.running.store(false, Ordering::Relaxed);
    }
}
