import * as duckdb from '@duckdb/duckdb-wasm';
import duckdb_wasm from '@duckdb/duckdb-wasm/dist/duckdb-mvp.wasm?url';
import duckdb_wasm_eh from '@duckdb/duckdb-wasm/dist/duckdb-eh.wasm?url';

let db: duckdb.AsyncDuckDB | null = null;
let connection: duckdb.AsyncDuckDBConnection | null = null;

export interface Rollup {
  rollup_id: number;
  network_name: string;
  latest_bridge_synced_block: bigint | null;
}

export interface BridgeEvent {
  id: string;
  rollup_id: number;
  transaction_hash: string;
  block_hash: string;
  block_number: number;
  transaction_index: number;
  log_index: number;
  leafType: number;
  originNetwork: number;
  originAddress: string;
  destinationNetwork: number;
  destinationAddress: string;
  amount: string;
  metadata: string;
  depositCount: number;
}

export interface ClaimEvent {
  id: string;
  rollup_id: number;
  transaction_hash: string;
  block_hash: string;
  block_number: number;
  transaction_index: number;
  log_index: number;
  version: number;
  globalIndex: string;
  originNetwork: number;
  originAddress: string;
  destinationAddress: string;
  amount: string;
}

export interface WrappedTokenEvent {
  id: string;
  rollup_id: number;
  transaction_hash: string;
  block_hash: string;
  block_number: number;
  transaction_index: number;
  log_index: number;
  originNetwork: number;
  originTokenAddress: string;
  wrappedTokenAddress: string;
  metadata: string;
}

export interface TokenBalance {
  token_address: string;
  token_name?: string;
  token_symbol?: string;
  balance: string;
}

export interface TokenStats {
  token_address: string;
  token_name?: string;
  token_symbol?: string;
  assets_balance: string;
  liabilities_balance: string;
  difference: string;
  is_balanced: boolean;
}

export class DatabaseService {
  private static instance: DatabaseService | null = null;

  public static async getInstance(): Promise<DatabaseService> {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
      await DatabaseService.instance.initialize();
    }
    return DatabaseService.instance;
  }

  private async initialize(): Promise<void> {
    try {
      // Initialize DuckDB
      const MANUAL_BUNDLES: duckdb.DuckDBBundles = {
        mvp: {
          mainModule: duckdb_wasm,
          mainWorker: new URL('@duckdb/duckdb-wasm/dist/duckdb-browser-mvp.worker.js', import.meta.url).href,
        },
        eh: {
          mainModule: duckdb_wasm_eh,
          mainWorker: new URL('@duckdb/duckdb-wasm/dist/duckdb-browser-eh.worker.js', import.meta.url).href,
        },
      };

      const bundle = await duckdb.selectBundle(MANUAL_BUNDLES);
      const worker = new Worker(bundle.mainWorker!);
      const logger = new duckdb.ConsoleLogger();
      
      db = new duckdb.AsyncDuckDB(logger, worker);
      await db.instantiate(bundle.mainModule, bundle.pthreadWorker);
      
      connection = await db.connect();

      // Load the database file from public folder
      const dbFile = await fetch('/data.duckdb');
      const dbBuffer = await dbFile.arrayBuffer();
      await db.registerFileBuffer('data.duckdb', new Uint8Array(dbBuffer));
      
      // Open the database by attaching it properly
      await connection.query("ATTACH 'data.duckdb' AS dagg;");
      
      // Test connection by trying to query rollups table
      const testQuery = await connection.query("SELECT COUNT(*) as count FROM dagg.rollups;");
      console.log('Database connection test successful, rollups count:', testQuery.toArray());
      
      console.log('Database initialized successfully');
    } catch (error) {
      console.error('Failed to initialize database:', error);
      throw error;
    }
  }

  public async query<T = any>(sql: string): Promise<T[]> {
    if (!connection) {
      throw new Error('Database not initialized');
    }

    try {
      const result = await connection.query(sql);
      return result.toArray().map(row => row.toJSON()) as T[];
    } catch (error) {
      console.error('Query failed:', sql, error);
      throw error;
    }
  }

  public async getRollups(): Promise<Rollup[]> {
    const sql = 'SELECT rollup_id, network_name, latest_bridge_synced_block FROM dagg.rollups ORDER BY rollup_id';
    return this.query<Rollup>(sql);
  }

  public async getRollupById(rollupId: number): Promise<Rollup | null> {
    const sql = `SELECT rollup_id, network_name, latest_bridge_synced_block FROM dagg.rollups WHERE rollup_id = ${rollupId}`;
    const results = await this.query<Rollup>(sql);
    return results[0] || null;
  }

  public async getWrappedTokensForRollup(rollupId: number): Promise<WrappedTokenEvent[]> {
    const sql = `
      SELECT DISTINCT 
        id, rollup_id, transaction_hash, block_hash, block_number, 
        transaction_index, log_index, originNetwork, originTokenAddress, 
        wrappedTokenAddress, metadata
      FROM dagg.new_wrapped_token_events 
      WHERE originNetwork = ${rollupId} OR rollup_id = ${rollupId}
      ORDER BY block_number DESC
    `;
    return this.query<WrappedTokenEvent>(sql);
  }

  public async getAssetBalances(rollupId: number): Promise<TokenBalance[]> {
    const sql = `
      SELECT 
        originAddress as token_address,
        SUM(CAST(amount AS DOUBLE)) as balance
      FROM dagg.bridge_events
      WHERE destinationNetwork = ${rollupId} AND originAddress IS NOT NULL
      GROUP BY originAddress
      HAVING balance > 0
      ORDER BY balance DESC
    `;
    return this.query<TokenBalance>(sql);
  }

  public async getLiabilityBalances(rollupId: number): Promise<TokenBalance[]> {
    const sql = `
      SELECT 
        destinationAddress as token_address,
        SUM(CAST(amount AS DOUBLE)) as balance
      FROM dagg.claim_events
      WHERE rollup_id = ${rollupId} AND destinationAddress IS NOT NULL
      GROUP BY destinationAddress
      HAVING balance > 0
      ORDER BY balance DESC
    `;
    return this.query<TokenBalance>(sql);
  }

  public async getTokenStats(rollupId: number): Promise<TokenStats[]> {
    const sql = `
      WITH assets AS (
        SELECT 
          originAddress as token_address,
          SUM(CAST(amount AS DOUBLE)) as assets_balance
        FROM dagg.bridge_events
        WHERE destinationNetwork = ${rollupId} AND originAddress IS NOT NULL
        GROUP BY originAddress
      ),
      liabilities AS (
        SELECT 
          nwte.originTokenAddress as token_address,
          SUM(CAST(ce.amount AS DOUBLE)) as liabilities_balance
        FROM dagg.claim_events ce
        JOIN dagg.new_wrapped_token_events nwte ON ce.destinationAddress = nwte.wrappedTokenAddress
        WHERE ce.rollup_id = ${rollupId} AND nwte.originTokenAddress IS NOT NULL
        GROUP BY nwte.originTokenAddress
      )
      SELECT 
        COALESCE(a.token_address, l.token_address) as token_address,
        COALESCE(a.assets_balance, 0) as assets_balance,
        COALESCE(l.liabilities_balance, 0) as liabilities_balance,
        (COALESCE(a.assets_balance, 0) - COALESCE(l.liabilities_balance, 0)) as difference,
        CASE 
          WHEN (COALESCE(a.assets_balance, 0) - COALESCE(l.liabilities_balance, 0)) >= 0 THEN true
          ELSE false
        END as is_balanced
      FROM assets a
      FULL OUTER JOIN liabilities l ON a.token_address = l.token_address
      ORDER BY assets_balance DESC NULLS LAST
    `;
    return this.query<TokenStats>(sql);
  }

  public async getBridgeEventsCount(rollupId?: number): Promise<number> {
    let sql = 'SELECT COUNT(*) as count FROM dagg.bridge_events';
    if (rollupId !== undefined) {
      sql += ` WHERE rollup_id = ${rollupId}`;
    }
    const result = await this.query<{count: number}>(sql);
    return result[0]?.count || 0;
  }

  public async getClaimEventsCount(rollupId?: number): Promise<number> {
    let sql = 'SELECT COUNT(*) as count FROM dagg.claim_events';
    if (rollupId !== undefined) {
      sql += ` WHERE rollup_id = ${rollupId}`;
    }
    const result = await this.query<{count: number}>(sql);
    return result[0]?.count || 0;
  }

  public async getRecentBridgeEvents(rollupId: number, limit: number = 10): Promise<BridgeEvent[]> {
    const sql = `
      SELECT * FROM dagg.bridge_events 
      WHERE rollup_id = ${rollupId} 
      ORDER BY block_number DESC, log_index DESC 
      LIMIT ${limit}
    `;
    return this.query<BridgeEvent>(sql);
  }

  public async getRecentClaimEvents(rollupId: number, limit: number = 10): Promise<ClaimEvent[]> {
    const sql = `
      SELECT * FROM dagg.claim_events 
      WHERE rollup_id = ${rollupId} 
      ORDER BY block_number DESC, log_index DESC 
      LIMIT ${limit}
    `;
    return this.query<ClaimEvent>(sql);
  }

  public async close(): Promise<void> {
    if (connection) {
      await connection.close();
      connection = null;
    }
    if (db) {
      await db.terminate();
      db = null;
    }
  }
}

// Singleton instance
export const dbService = DatabaseService.getInstance();