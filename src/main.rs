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

use axum::{
    extract::{Query, State},
    http::StatusCode,
    routing::get,
    Json, Router,
};
use hex;
use serde::Deserialize;
use std::collections::HashMap;

mod api;

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

#[derive(Clone)]
struct AppState {
    database: Database,
}

#[derive(Deserialize)]
struct QueryParams {
    q: String,
}

async fn query_handler(
    State(state): State<AppState>,
    Query(params): Query<QueryParams>,
) -> std::result::Result<Json<Vec<HashMap<String, String>>>, (StatusCode, String)> {
    println!("----debuggg");
    let query = params.q;
    let lowered = query.to_lowercase();
    // Disallow mutating queries
    let prohibited = [
        "insert", "update", "delete", "create", "drop", "alter", "truncate", "replace",
    ];
    if prohibited.iter().any(|kw| lowered.contains(kw)) {
        return Err((
            StatusCode::BAD_REQUEST,
            "Mutating queries are not allowed".to_string(),
        ));
    }

    // Acquire DB connection
    let conn = state.database.db().lock().await;
    let mut stmt = match conn.prepare(&query) {
        Ok(s) => s,
        Err(e) => {
            return Err((
                StatusCode::BAD_REQUEST,
                format!("Failed to prepare query: {}", e),
            ))
        }
    };

    let mut rows = match stmt.query([]) {
        Ok(r) => r,
        Err(e) => {
            return Err((
                StatusCode::BAD_REQUEST,
                format!("Failed to execute query: {}", e),
            ))
        }
    };

    let mut column_names: Option<Vec<String>> = None;
    let mut results: Vec<HashMap<String, String>> = Vec::new();
    while let Some(row) = rows
        .next()
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
    {
        if column_names.is_none() {
            // Lazily initialize column names after the first step
            column_names = Some({
                let stmt_ref = row.as_ref();
                (0..stmt_ref.column_count())
                    .map(|i| stmt_ref.column_name(i).unwrap().clone())
                    .collect()
            });
        }
        let names = column_names.as_ref().unwrap();
        let mut map = HashMap::new();
        for (i, col) in names.iter().enumerate() {
            // Try to coerce the value into a string regardless of its underlying SQL type
            let value: String = if let Ok(v) = row.get::<usize, String>(i) {
                v
            } else if let Ok(v) = row.get::<usize, i64>(i) {
                v.to_string()
            } else if let Ok(v) = row.get::<usize, f64>(i) {
                v.to_string()
            } else if let Ok(v) = row.get::<usize, Vec<u8>>(i) {
                // blob
                hex::encode(v)
            } else if let Ok(v) = row.get::<usize, Option<String>>(i) {
                v.unwrap_or_default()
            } else {
                "<unhandled>".to_string()
            };
            map.insert(col.clone(), value);
        }
        results.push(map);
    }

    Ok(Json(results))
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let cli = Cli::parse();

    // Initialize the database connection
    let database = Database::new(false).await?;

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
    for rollup_id in 0..=rollup_count {
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

    // ---- HTTP server (initialized after indexers are ready)
    let listener = tokio::net::TcpListener::bind("0.0.0.0:3000").await.unwrap();

    let app_state = AppState {
        database: database.clone(),
    };
    let query_router = Router::new()
        .route("/query", get(query_handler))
        .with_state(app_state);

    let api_router = api::create_router(database.db().clone(), indexers.clone());
    let app = query_router.merge(api_router);

    let server = axum::serve(listener, app);
    tokio::spawn(async move {
        if let Err(e) = server.await {
            eprintln!("HTTP server error: {}", e);
        }
    });

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
