// API service for backend integration
// Use relative URLs that will be proxied by Vite to avoid CORS issues
const ENDPOINTS = {
  ROLLUPS: '/table/rollups',
  WRAPPED_TOKENS: '/table/new_wrapped_token_events/filter',
  ASSET_BALANCE: '/bridge_balance',
  LIABILITY_BALANCE: '/wrapped_balance',
  SYNC: '/sync',
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

export interface TokenStats {
  token_address: string;
  token_name?: string;
  token_symbol?: string;
  assets_balance: string;
  liabilities_balance: string;
  difference: string;
  is_balanced: boolean;
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

class ApiService {
  private async request<T>(url: string, options?: RequestInit): Promise<T> {
    try {
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
        ...options,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
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

  // Get combined token stats (assets vs liabilities)
  async getTokenStats(rollupId: number): Promise<TokenStats[]> {
    const [assets, liabilities] = await Promise.all([
      this.getAssetBalances(rollupId),
      this.getLiabilityBalances(rollupId)
    ]);

    // Combine assets and liabilities data
    const tokenMap = new Map<string, TokenStats>();

    // Process assets
    assets.forEach(asset => {
      tokenMap.set(asset.token_address, {
        token_address: asset.token_address,
        token_name: asset.token_name,
        token_symbol: asset.token_symbol,
        assets_balance: asset.balance,
        liabilities_balance: '0',
        difference: asset.balance,
        is_balanced: true
      });
    });

    // Process liabilities
    liabilities.forEach(liability => {
      const existing = tokenMap.get(liability.token_address);
      if (existing) {
        const assetsValue = parseFloat(existing.assets_balance);
        const liabilitiesValue = parseFloat(liability.balance);
        const difference = assetsValue - liabilitiesValue;
        
        tokenMap.set(liability.token_address, {
          ...existing,
          liabilities_balance: liability.balance,
          difference: difference.toString(),
          is_balanced: difference >= 0
        });
      } else {
        const liabilitiesValue = parseFloat(liability.balance);
        tokenMap.set(liability.token_address, {
          token_address: liability.token_address,
          token_name: liability.token_name,
          token_symbol: liability.token_symbol,
          assets_balance: '0',
          liabilities_balance: liability.balance,
          difference: (-liabilitiesValue).toString(),
          is_balanced: false
        });
      }
    });

    return Array.from(tokenMap.values()).sort((a, b) => 
      parseFloat(b.assets_balance) - parseFloat(a.assets_balance)
    );
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
}

// Singleton instance
export const apiService = new ApiService();