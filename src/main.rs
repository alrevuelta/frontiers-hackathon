use alloy::primitives::address;
use alloy::{
    providers::ProviderBuilder, rpc::client::RpcClient, transports::layers::RetryBackoffLayer,
};
use daggboard::contracts::{PolygonRollupBaseEtrog, PolygonRollupManager};
use daggboard::database::Database;
use daggboard::indexer::Indexer;
use eyre::Result;

use alloy::primitives::Address;
use alloy::transports::http::reqwest::Url;
use clap::Parser;

#[derive(Parser)]
#[command(name = "daggboard")]
#[command(about = "daggboard", long_about = None)]
struct Cli {
    /// RPC URL for the Ethereum L1 network. Example:
    /// https://mainnet.infura.io/v3/xxx
    #[arg(long)]
    rpc_url: String,

    /// Contract address of the polygon aggregation layer rollup manager.
    /// Example: 0x5132A183E9F3CB7C848b0AAC5Ae0c4f0491B7aB2
    #[arg(default_value = "0x5132A183E9F3CB7C848b0AAC5Ae0c4f0491B7aB2")]
    rollup_manager_address: String,
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let cli = Cli::parse();

    // Initialize the database connection
    let database = Database::new(false).await?;

    // Start the Axum server
    let listener = tokio::net::TcpListener::bind("0.0.0.0:3000").await.unwrap();

    println!("Starting agglayer-indexer");

    // Use the rpc_url from the command line arguments
    let rpc_url: Url = cli.rpc_url.parse()?;
    let rollup_manager_address: Address = cli.rollup_manager_address.parse()?;

    println!("Using rpc url: {:?}", rpc_url.as_str());
    println!("Using rollup manager address: {:?}", rollup_manager_address);

    let max_retry = 100;
    let backoff = 2000;
    let cups = 100;

    // TODO: This just retries on rate limit errors.
    let provider = ProviderBuilder::new().on_client(
        RpcClient::builder()
            .layer(RetryBackoffLayer::new(max_retry, backoff, cups))
            .http(rpc_url.clone()),
    );

    let rollup_manager = PolygonRollupManager::new(rollup_manager_address, provider.clone());

    let rollup_count = rollup_manager.rollupCount().call().await?;

    // TODO remove for tests.
    //let rollup_count = 2;

    println!("rollup count: {:?}", rollup_count);

    let mut bridge_address;
    let mut trusted_seq;
    let mut name;

    let mut indexers = Vec::new();
    for rollup_id in 0..rollup_count {
        // We consider rollup 0 as layer 1
        //if rollup_id != 3 && rollup_id != 1 {
        //    continue; // only index okex
        //}
        if rollup_id == 0 {
            name = "l1".to_string();
            trusted_seq = rpc_url.clone();
            // TODO: Should not be hardcoded
            bridge_address = address!("0x2a3dd3eb832af982ec71669e178424b10dca2ede");
        } else {
            let rollup = rollup_manager
                .rollupIDToRollupData(rollup_id)
                .call()
                .await?;

            let base_etrog = PolygonRollupBaseEtrog::new(rollup.rollupContract, provider.clone());
            let trusted_seq_str = base_etrog.trustedSequencerURL().call().await?;
            name = base_etrog.networkName().call().await?;
            let bridge_address_str = base_etrog.bridgeAddress().call().await?.to_string();
            bridge_address = bridge_address_str.parse::<Address>()?;
            trusted_seq = trusted_seq_str.parse::<Url>()?;
            println!("trusted_seq: {:?}", trusted_seq);
            if rollup_id == 3 {
                //trusted_seq = Url::parse("https://xlayerrpc.okx.com/unlimited/abc")?;
            }
        }

        database.insert_rollup(rollup_id, &name).await?;
        println!(
            "name: {:?} rollup_id: {:?} trusted_seq: {:?}",
            name, rollup_id, trusted_seq
        );

        let mut indexer = Indexer::new(
            bridge_address,
            trusted_seq.clone(),
            rollup_id,
            database.clone(),
        )
        .await?;

        // TODO: Most likely wrong use of clone
        indexers.push(indexer.clone());

        tokio::spawn(async move {
            if let Err(e) = indexer.index().await {
                eprintln!(
                    "indexer of rollup {:?} encountered an error: {:?}",
                    rollup_id, e
                );
                if let Some(source) = e.source() {
                    eprintln!("Caused by: {:?}", source);
                }
                panic!("indexer of rollup {:?} error: {:?}", rollup_id, e);
            }
        });
    }

    tokio::signal::ctrl_c()
        .await
        .expect("failed to listen for event");
    println!("Received Ctrl+C, shutting down...");

    // TODO: ugly but important
    println!("Shutting down indexers");
    for indexer in indexers {
        indexer.shutdown();
    }

    Ok(())
}
