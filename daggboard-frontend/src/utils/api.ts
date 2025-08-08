// API service for backend integration
// Use /api prefix for clean generic rewrite rule
import { parseTokenMetadata } from './formatting';

const ENDPOINTS = {
  ROLLUPS: '/api/table/rollups',
  WRAPPED_TOKENS: '/api/table/new_wrapped_token_events/filter',
  ASSET_BALANCE: '/api/bridge_balance',
  LIABILITY_BALANCE: '/api/wrapped_balance',
  SYNC: '/api/sync',
  QUERY: '/api/query',
} as const;


// Types based on the schema provided
export interface Rollup {
  rollup_id: number;
  network_name: string;
  latest_bridge_synced_block: number | null;
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

export interface AssetBalanceResponse {
  balance_bridge: string;
}

export interface LiabilityBalanceResponse {
  circulating_supply: string;
}


// Grouped token structures
export interface LiabilityEntry {
  id: string; // unique identifier for this liability entry
  rollup_id: number;
  destinationNetwork: number;
  wrappedTokenAddress: string;
  liability_balance: string;
  loading?: boolean;
}

export interface GroupedTokenStats {
  id: string; // composite key: originNetwork-originTokenAddress
  originTokenAddress: string;
  originNetwork: number;
  metadata: string;
  token_name: string;
  token_symbol: string;
  
  // Single asset balance for this origin token
  assets_balance: string;
  
  // Array of liability entries for different destination chains
  liability_entries: LiabilityEntry[];
  
  // Aggregated values
  total_liabilities: string; // sum of all liability_entries
  difference: string; // assets_balance - total_liabilities
  is_balanced: boolean;
  loading?: boolean;
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

export interface SyncDistance {
  distance: number;
}

export interface BridgeEventCount {
  network: string;
  bridges: string;
}

export interface ClaimEventCount {
  network: string;
  claims: string;
}

export interface FlowData {
  source: string;
  target: string;
  value: string;
}

export interface QueryResponse<T = any> {
  data: T[];
}

class ApiService {
  private async request<T>(url: string, options?: RequestInit): Promise<T> {
    try {
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
        mode: 'cors',
        ...options,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('Non-JSON response:', text.substring(0, 200));
        throw new Error('Server returned non-JSON response (likely HTML error page)');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // Get all rollups
  async getRollups(): Promise<Rollup[]> {
    const response = await this.request<Rollup[] | { data: Rollup[] } | Rollup>(ENDPOINTS.ROLLUPS);
    // Ensure we always return an array
    if (Array.isArray(response)) {
      return response;
    } else if (response && typeof response === 'object' && 'data' in response && Array.isArray(response.data)) {
      return response.data;
    } else if (response && typeof response === 'object' && 'rollup_id' in response) {
      // If it's a single rollup object, wrap it in an array
      return [response as Rollup];
    }
    // Return empty array as fallback
    return [];
  }

  // Get specific rollup by ID
  async getRollupById(rollupId: number): Promise<Rollup | null> {
    const rollups = await this.getRollups();
    return rollups.find(r => r.rollup_id === rollupId) || null;
  }

  // Get wrapped tokens for a rollup
  async getWrappedTokensForRollup(rollupId: number): Promise<WrappedTokenEvent[]> {
    const params = new URLSearchParams({
      originNetwork: rollupId.toString()
    });
    const response = await this.request<WrappedTokenEvent[] | { data: WrappedTokenEvent[] }>(`${ENDPOINTS.WRAPPED_TOKENS}?${params}`);
    // Ensure we always return an array
    if (Array.isArray(response)) {
      return response;
    } else if (response && typeof response === 'object' && 'data' in response && Array.isArray(response.data)) {
      return response.data;
    }
    return [];
  }

  // Get asset balances (bridge balance)
  async getAssetBalances(rollupId?: number, tokenAddress?: string): Promise<TokenBalance[]> {
    const params = new URLSearchParams();
    if (rollupId) params.append('rollup_id', rollupId.toString());
    if (tokenAddress) params.append('token_address', tokenAddress);
    
    const url = params.toString() ? `${ENDPOINTS.ASSET_BALANCE}?${params}` : ENDPOINTS.ASSET_BALANCE;
    const response = await this.request<TokenBalance[] | { data: TokenBalance[] }>(url);
    // Ensure we always return an array
    if (Array.isArray(response)) {
      return response;
    } else if (response && typeof response === 'object' && 'data' in response && Array.isArray(response.data)) {
      return response.data;
    }
    return [];
  }

  // Get liability balances (wrapped balance)  
  async getLiabilityBalances(rollupId?: number, tokenAddress?: string): Promise<TokenBalance[]> {
    const params = new URLSearchParams();
    if (rollupId) params.append('rollup_id', rollupId.toString());
    if (tokenAddress) params.append('token_address', tokenAddress);
    
    const url = params.toString() ? `${ENDPOINTS.LIABILITY_BALANCE}?${params}` : ENDPOINTS.LIABILITY_BALANCE;
    const response = await this.request<TokenBalance[] | { data: TokenBalance[] }>(url);
    // Ensure we always return an array
    if (Array.isArray(response)) {
      return response;
    } else if (response && typeof response === 'object' && 'data' in response && Array.isArray(response.data)) {
      return response.data;
    }
    return [];
  }

  // Get individual asset balance for a specific token
  async getIndividualAssetBalance(rollupId: number, tokenAddress: string): Promise<string> {
    const params = new URLSearchParams({
      rollup_id: rollupId.toString(),
      token_address: tokenAddress
    });
    
    const url = `${ENDPOINTS.ASSET_BALANCE}?${params}`;
    const response = await this.request<AssetBalanceResponse>(url);
    return response.balance_bridge;
  }

  // Get individual liability balance for a specific wrapped token
  async getIndividualLiabilityBalance(rollupId: number, wrappedTokenAddress: string): Promise<string> {
    const params = new URLSearchParams({
      rollup_id: rollupId.toString(),
      token_address: wrappedTokenAddress
    });
    
    const url = `${ENDPOINTS.LIABILITY_BALANCE}?${params}`;
    const response = await this.request<LiabilityBalanceResponse>(url);
    return response.circulating_supply;
  }


  // Get bridge events count
  async getBridgeEventsCount(rollupId?: number): Promise<number> {
    // For now, we'll return a placeholder since the exact API structure isn't defined
    // You may need to adjust this based on your actual API response
    try {
      const assets = await this.getAssetBalances(rollupId);
      return assets.length; // Approximate count based on asset entries
    } catch {
      return 0;
    }
  }

  // Get claim events count
  async getClaimEventsCount(rollupId?: number): Promise<number> {
    // For now, we'll return a placeholder since the exact API structure isn't defined  
    // You may need to adjust this based on your actual API response
    try {
      const liabilities = await this.getLiabilityBalances(rollupId);
      return liabilities.length; // Approximate count based on liability entries
    } catch {
      return 0;
    }
  }

  // Sync endpoint
  async triggerSync(rollupId?: number): Promise<{ success: boolean; message?: string }> {
    const url = rollupId ? `${ENDPOINTS.SYNC}/${rollupId}` : ENDPOINTS.SYNC;
    return this.request(url, { method: 'POST' });
  }

  // Get sync distance from head for a rollup
  async getSyncDistance(rollupId: number): Promise<number> {
    const url = `${ENDPOINTS.SYNC}/${rollupId}`;
    const response = await this.request<SyncDistance>(url);
    return response.distance;
  }

  // Execute SQL query
  async executeQuery<T = any>(query: string): Promise<T[]> {
    const params = new URLSearchParams();
    params.append('q', query);
    const url = `${ENDPOINTS.QUERY}?${params}`;
    
    const response = await this.request<QueryResponse<T> | T[]>(url);
    
    // Handle both response formats
    if (Array.isArray(response)) {
      return response;
    } else if (response && typeof response === 'object' && 'data' in response && Array.isArray(response.data)) {
      return response.data;
    }
    return [];
  }

  // Get bridge events count by rollup
  async getBridgeEventsCountByRollup(): Promise<BridgeEventCount[]> {
    const query = `SELECT rollup_id AS network, COUNT(*) AS bridges FROM bridge_events GROUP BY network ORDER BY bridges DESC`;
    return this.executeQuery<BridgeEventCount>(query);
  }

  // Get claim events count by rollup
  async getClaimEventsCountByRollup(): Promise<ClaimEventCount[]> {
    const query = `SELECT rollup_id AS network, COUNT(*) AS claims FROM claim_events GROUP BY rollup_id ORDER BY claims DESC`;
    return this.executeQuery<ClaimEventCount>(query);
  }

  // Get flow data for Sankey diagram for a specific rollup
  async getFlowDataForRollup(rollupId: number): Promise<FlowData[]> {
    const query = `
WITH flows AS (
    /* Outgoing transactions: events written on the chosen rollup */
    SELECT rollup_id        AS source,
           destinationNetwork AS target
    FROM   bridge_events
    WHERE  rollup_id = ${rollupId}

    UNION ALL

    /* Incoming transactions: events whose destination is the chosen rollup */
    SELECT rollup_id        AS source,
           ${rollupId}      AS target
    FROM   bridge_events
    WHERE  destinationNetwork = ${rollupId}
)
SELECT source, target, COUNT(*) AS value
FROM   flows
GROUP  BY source, target
ORDER  BY value DESC`;
    
    return this.executeQuery<FlowData>(query);
  }

  // Get wrapped token events and group them by originTokenAddress
  async getTokenMappings(rollupId: number): Promise<GroupedTokenStats[]> {
    const wrappedTokens = await this.getWrappedTokensForRollup(rollupId);
    
    // Group by originTokenAddress
    const groupedMap = new Map<string, WrappedTokenEvent[]>();
    
    for (const token of wrappedTokens) {
      const key = token.originTokenAddress;
      if (!groupedMap.has(key)) {
        groupedMap.set(key, []);
      }
      groupedMap.get(key)!.push(token);
    }

    // Convert groups to GroupedTokenStats structure
    const groupedStats: GroupedTokenStats[] = [];

    for (const [originTokenAddress, tokens] of groupedMap.entries()) {
      // Use the first token for basic info (originNetwork, metadata should be same for same origin token)
      const representativeToken = tokens[0];
      const parsedMetadata = parseTokenMetadata(representativeToken.metadata);
      
      // Create liability entries for each unique rollup_id + wrappedTokenAddress combination
      const liability_entries: LiabilityEntry[] = [];
      
      for (const token of tokens) {
        liability_entries.push({
          id: token.id,
          rollup_id: token.rollup_id,
          destinationNetwork: rollupId, // destination is the current rollup we're viewing
          wrappedTokenAddress: token.wrappedTokenAddress,
          liability_balance: '0', // Initialize with default value
          loading: true // Initialize as loading
        });
      }

      groupedStats.push({
        id: `${representativeToken.originNetwork}-${originTokenAddress}`,
        originTokenAddress,
        originNetwork: representativeToken.originNetwork,
        metadata: representativeToken.metadata,
        token_name: parsedMetadata.name,
        token_symbol: parsedMetadata.symbol,
        assets_balance: '0', // Initialize with default
        liability_entries: liability_entries,
        total_liabilities: '0', // Initialize with default
        difference: '0', // Initialize with default
        is_balanced: true, // Initialize with default
        loading: true
      });
    }

    return groupedStats;
  }

  // Load balances for a token stat
  async loadTokenBalances(
    tokenMapping: GroupedTokenStats
  ): Promise<GroupedTokenStats> {
    try {
      // Fetch asset balance using originNetwork as rollup_id + originTokenAddress
      const assetBalancePromise = this.getIndividualAssetBalance(
        tokenMapping.originNetwork, 
        tokenMapping.originTokenAddress
      );

      // Fetch liability balance for each liability entry
      const liabilityPromises = tokenMapping.liability_entries.map(async (entry) => {
        try {
          const balance = await this.getIndividualLiabilityBalance(
            entry.rollup_id,
            entry.wrappedTokenAddress
          );
          return {
            ...entry,
            liability_balance: balance || '0',
            loading: false
          };
        } catch (error) {
          console.error(`Failed to load liability for ${entry.wrappedTokenAddress}:`, error);
          return {
            ...entry,
            liability_balance: '0',
            loading: false
          };
        }
      });

      // Wait for all promises
      const [assetsBalance, liabilityEntries] = await Promise.all([
        assetBalancePromise,
        Promise.all(liabilityPromises)
      ]);

      // Calculate total liabilities with better precision handling
      const totalLiabilities = liabilityEntries.reduce((sum, entry) => {
        const value = entry.liability_balance || '0';
        try {
          // Handle scientific notation and very large numbers
          const numValue = parseFloat(value);
          if (isNaN(numValue) || !isFinite(numValue)) {
            console.warn(`Invalid liability balance: ${value}, skipping`);
            return sum;
          }
          return sum + numValue;
        } catch (error) {
          console.warn(`Error parsing liability balance: ${value}, skipping`);
          return sum;
        }
      }, 0);

      const assetsValue = parseFloat(assetsBalance || '0');
      const difference = assetsValue - totalLiabilities;

      return {
        ...tokenMapping,
        assets_balance: assetsBalance || '0',
        liability_entries: liabilityEntries,
        total_liabilities: totalLiabilities.toString(),
        difference: difference.toString(),
        is_balanced: difference >= 0,
        loading: false
      };
    } catch (error) {
      console.error(`Failed to load balances for token ${tokenMapping.originTokenAddress}:`, error);
      
      return {
        ...tokenMapping,
        assets_balance: '0',
        liability_entries: tokenMapping.liability_entries.map(entry => ({
          ...entry,
          liability_balance: '0',
          loading: false
        })),
        total_liabilities: '0',
        difference: '0',
        is_balanced: true,
        loading: false
      };
    }
  }


}

// Singleton instance
export const apiService = new ApiService();