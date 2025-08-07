use axum::{
    extract::{Extension, Path, Query},
    routing::get,
    Json, Router,
};
use daggboard::indexer::Indexer;
use duckdb::Connection;
use serde_json::Value as JsonValue;
use serde_json::{json, Value};
use std::{collections::HashMap, sync::Arc};
use tokio::sync::Mutex;

// TODO: Improve error handling, no unwraps

pub fn create_router(db: Arc<Mutex<Connection>>, indexers: Vec<Indexer>) -> Router {
    Router::new()
        .route("/tables", get(list_tables))
        .route("/table/{table_name}", get(get_all_rows))
        .route("/table/{table_name}/filter", get(filter_rows))
        .route("/wrapped_balance", get(get_circulating_supply))
        .route("/bridge_balance", get(get_balance_bridge))
        .route("/sync/{rollup_id}", get(sync_rollup))
        .layer(Extension(db))
        .layer(Extension(indexers))
}

async fn sync_rollup(
    Extension(db): Extension<Arc<Mutex<Connection>>>, // retained to keep layer order but unused
    Extension(indexers): Extension<Vec<Indexer>>,
    Path(rollup_id): Path<u32>,
) -> Json<Value> {
    if let Some(indexer) = indexers.iter().find(|i| i.rollup_id == rollup_id) {
        match indexer.distance_head().await {
            Ok(distance) => Json(json!({ "distance": distance })),
            Err(e) => Json(json!({ "error": format!("{}", e) })),
        }
    } else {
        Json(json!({ "error": "Rollup not found" }))
    }
}

async fn list_tables(Extension(db): Extension<Arc<Mutex<Connection>>>) -> Json<Value> {
    let db = db.lock().await;
    let mut stmt = match db.prepare("PRAGMA show_tables") {
        Ok(s) => s,
        Err(e) => return Json(json!({ "error": format!("{}", e) })),
    };
    let mut tables = Vec::new();
    let mut rows = match stmt.query([]) {
        Ok(r) => r,
        Err(e) => return Json(json!({ "error": format!("{}", e) })),
    };
    while let Ok(Some(row)) = rows.next() {
        if let Ok(t) = row.get::<usize, String>(0) {
            tables.push(t);
        }
    }
    Json(json!({ "tables": tables }))
}

async fn get_all_rows(
    Extension(db): Extension<Arc<Mutex<Connection>>>,
    Path(table_name): Path<String>,
    Query(params): Query<HashMap<String, String>>,
) -> Json<Value> {
    let db = db.lock().await;

    let columns = match fetch_columns(&db, &table_name) {
        Ok(cols) => cols,
        Err(e) => return Json(json!({ "error": format!("{}", e) })),
    };

    let struct_pack_expr = format!("STRUCT_PACK({})", columns.join(", "));

    let limit_clause = params
        .get("limit")
        .and_then(|l| l.parse::<usize>().ok())
        .map(|l| format!("LIMIT {}", l))
        .unwrap_or_default();

    let query = format!(
        "SELECT to_json({}) AS row_json FROM {} {}",
        struct_pack_expr, table_name, limit_clause
    );

    let mut stmt = match db.prepare(&query) {
        Ok(s) => s,
        Err(_) => return Json(json!({ "error": "Invalid query" })),
    };

    let mut rows = match stmt.query([]) {
        Ok(r) => r,
        Err(_) => return Json(json!({ "error": "Query execution failed" })),
    };

    let mut result = Vec::new();
    while let Ok(Some(row)) = rows.next() {
        let row_json: String = row.get("row_json").unwrap_or_default();
        if let Ok(json_value) = serde_json::from_str::<JsonValue>(&row_json) {
            result.push(json_value);
        }
    }

    Json(json!({ "data": result }))
}

async fn filter_rows(
    Extension(db): Extension<Arc<Mutex<Connection>>>,
    Path(table_name): Path<String>,
    Query(params): Query<HashMap<String, String>>,
) -> Json<Value> {
    let db = db.lock().await;

    let columns = match fetch_columns(&db, &table_name) {
        Ok(cols) => cols,
        Err(e) => return Json(json!({ "error": format!("{}", e) })),
    };

    let struct_pack_expr = format!("STRUCT_PACK({})", columns.join(", "));

    let mut conditions = params
        .iter()
        .filter(|(k, _)| *k != "limit")
        .map(|(k, v)| format!("{} = '{}'", k, v.replace("'", "''")))
        .collect::<Vec<_>>();

    let where_clause = if conditions.is_empty() {
        String::new()
    } else {
        format!("WHERE {}", conditions.join(" AND "))
    };

    let limit_clause = params
        .get("limit")
        .and_then(|l| l.parse::<usize>().ok())
        .map(|l| format!("LIMIT {}", l))
        .unwrap_or_default();

    let query = format!(
        "SELECT to_json({}) AS row_json FROM {} {} {}",
        struct_pack_expr, table_name, where_clause, limit_clause
    );

    let mut stmt = match db.prepare(&query) {
        Ok(s) => s,
        Err(_) => return Json(json!({ "error": "Table not found or invalid query" })),
    };

    let mut rows = match stmt.query([]) {
        Ok(r) => r,
        Err(_) => return Json(json!({ "error": "Invalid query" })),
    };

    let mut result = Vec::new();
    while let Ok(Some(row)) = rows.next() {
        let row_json: String = row.get("row_json").unwrap_or_default();
        if let Ok(json_value) = serde_json::from_str::<JsonValue>(&row_json) {
            result.push(json_value);
        }
    }

    Json(json!({ "data": result }))
}

async fn get_circulating_supply(
    Extension(db): Extension<Arc<Mutex<Connection>>>,
    Query(params): Query<HashMap<String, String>>,
) -> Json<Value> {
    let db = db.lock().await;

    let rollup_id = match params.get("rollup_id") {
        Some(id) => id,
        None => return Json(json!({ "error": "Missing rollup_id parameter" })),
    };

    let token_address = match params.get("token_address") {
        Some(address) => address,
        None => return Json(json!({ "error": "Missing token_address parameter" })),
    };

    let query = format!(
        "SELECT SUM(CASE \
            WHEN from_address = '0x0000000000000000000000000000000000000000' THEN CAST(value AS HUGEINT) \
            WHEN to_address = '0x0000000000000000000000000000000000000000' THEN -CAST(value AS HUGEINT) \
            ELSE 0 END) AS balance \
        FROM wrapped_transfer_events \
        WHERE LOWER(token_address) = LOWER('{}') AND rollup_id = {}",
        token_address, rollup_id
    );

    let balance = aggregate_bigint(&db, &query).unwrap_or_else(|_| "0".to_string());
    Json(json!({ "circulating_supply": balance }))
}

async fn get_balance_bridge(
    Extension(db): Extension<Arc<Mutex<Connection>>>,
    Query(params): Query<HashMap<String, String>>,
) -> Json<Value> {
    let db = db.lock().await;

    let rollup_id = match params.get("rollup_id") {
        Some(id) => id,
        None => return Json(json!({ "error": "Missing rollup_id parameter" })),
    };

    let token_address = match params.get("token_address") {
        Some(address) => address,
        None => return Json(json!({ "error": "Missing token_address parameter" })),
    };

    // TODO: Bridge address is hardcoded
    let query = format!(
        "SELECT SUM(CASE \
            WHEN LOWER(from_address) = LOWER('0x2a3dd3eb832af982ec71669e178424b10dca2ede') THEN -CAST(value AS HUGEINT) \
            WHEN LOWER(to_address) = LOWER('0x2a3dd3eb832af982ec71669e178424b10dca2ede') THEN CAST(value AS HUGEINT) \
            ELSE 0 END) AS balance \
        FROM bridge_transfer_events \
        WHERE LOWER(token_address) = LOWER('{}') AND rollup_id = {}",
        token_address, rollup_id
    );

    let balance = aggregate_bigint(&db, &query).unwrap_or_else(|_| "0".to_string());
    Json(json!({ "balance_bridge": balance }))
}

// Helper to fetch column names
fn fetch_columns(db: &Connection, table_name: &str) -> Result<Vec<String>, duckdb::Error> {
    let mut stmt = db.prepare(&format!("PRAGMA table_info('{}')", table_name))?;
    let column_rows = stmt.query_map([], |row| row.get::<usize, String>(1))?;
    let mut columns = Vec::new();
    for col_result in column_rows {
        columns.push(col_result?);
    }
    Ok(columns)
}

// Helper to run aggregation queries returning Option<i128>
fn aggregate_bigint(db: &Connection, query: &str) -> Result<String, duckdb::Error> {
    let mut stmt = db.prepare(query)?;
    let mut rows = stmt.query([])?;
    if let Some(row) = rows.next()? {
        let val: Option<i128> = row.get(0)?;
        Ok(val
            .map(|v| v.to_string())
            .unwrap_or_else(|| "0".to_string()))
    } else {
        Ok("0".to_string())
    }
}
