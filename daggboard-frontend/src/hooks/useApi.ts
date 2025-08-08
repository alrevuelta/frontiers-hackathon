import { useState, useEffect, useCallback, useMemo } from 'react';
import { apiService, type Rollup, type GroupedTokenStats, type BridgeEventCount, type ClaimEventCount, type FlowData } from '../utils/api';

export interface UseDataResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useRollups(): UseDataResult<Rollup[]> {
  const [data, setData] = useState<Rollup[] | null>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const rollups = await apiService.getRollups();
      setData(rollups);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch rollups:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch rollups';
      setError(errorMessage);
      setData([]); // Ensure data is always an array, even on error
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  const refetch = useCallback(() => {
    fetchData(false);
  }, [fetchData]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch };
}

export function useRollup(rollupId: number): UseDataResult<Rollup> {
  const [data, setData] = useState<Rollup | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const rollup = await apiService.getRollupById(rollupId);
      setData(rollup);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch rollup:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch rollup');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [rollupId]);

  const refetch = useCallback(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch };
}

export function useTokenStats(rollupId: number) {
  const [tokenStats, setTokenStats] = useState<GroupedTokenStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadingMap, setLoadingMap] = useState<Map<string, boolean>>(new Map());

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // First, get the token mappings (grouped by originTokenAddress)
      const mappings = await apiService.getTokenMappings(rollupId);
      
      if (mappings.length === 0) {
        setTokenStats([]);
        setLoadingMap(new Map());
        setLoading(false);
        return;
      }

      // The mappings already come with all required fields initialized
      setTokenStats(mappings);

      // Initialize loading map
      const initialLoadingMap = new Map();
      mappings.forEach(mapping => {
        initialLoadingMap.set(mapping.id, true);
      });
      setLoadingMap(initialLoadingMap);

      setLoading(false);

      // Load balances for each grouped token individually and update as they complete
      mappings.forEach(async (mapping) => {
        try {
          const completedTokenStat = await apiService.loadTokenBalances(mapping);
          
          // Update the specific grouped token in the array
          setTokenStats(prev => prev.map(stat => 
            stat.id === mapping.id ? completedTokenStat : stat
          ));

          // Update loading map
          setLoadingMap(prev => {
            const newMap = new Map(prev);
            newMap.set(mapping.id, false);
            return newMap;
          });

        } catch (err) {
          console.error(`Failed to load token ${mapping.id}:`, err);
          
          // Still update to remove loading state
          setTokenStats(prev => prev.map(stat => 
            stat.id === mapping.id ? {
              ...stat,
              loading: false,
              assets_balance: '0',
              total_liabilities: '0',
              difference: '0',
              is_balanced: true,
              liability_entries: stat.liability_entries.map(entry => ({
                ...entry,
                liability_balance: '0',
                loading: false
              }))
            } : stat
          ));

          setLoadingMap(prev => {
            const newMap = new Map(prev);
            newMap.set(mapping.id, false);
            return newMap;
          });
        }
      });

    } catch (err) {
      console.error('Failed to fetch token mappings:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch token stats');
      setTokenStats([]);
      setLoadingMap(new Map());
      setLoading(false);
    }
  }, [rollupId]);

  const refetch = useCallback(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Calculate summary stats for grouped tokens
  const summary = useMemo(() => {
    const loadedTokens = tokenStats.filter(t => !t.loading);
    const totalAssets = loadedTokens.reduce((sum, token) => sum + parseFloat(token.assets_balance || '0'), 0);
    const totalLiabilities = loadedTokens.reduce((sum, token) => sum + parseFloat(token.total_liabilities || '0'), 0);
    const allLoaded = loadedTokens.length === tokenStats.length && tokenStats.length > 0;
    
    return {
      totalAssets,
      totalLiabilities,
      difference: totalAssets - totalLiabilities,
      allLoaded,
      loadedCount: loadedTokens.length,
      totalCount: tokenStats.length
    };
  }, [tokenStats]);

  return { 
    data: tokenStats, 
    loading, 
    error, 
    refetch, 
    loadingMap, 
    summary
  };
}

export function useSyncDistance(rollupId: number): UseDataResult<number> {
  const [data, setData] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const distance = await apiService.getSyncDistance(rollupId);
      setData(distance);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch sync distance:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch sync distance');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [rollupId]);

  const refetch = useCallback(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch };
}

export function useSyncDistances(rollups: { rollup_id: number; latest_bridge_synced_block: number | null }[]) {
  const [distances, setDistances] = useState<Map<number, number>>(new Map());
  const [loadingStates, setLoadingStates] = useState<Map<number, boolean>>(new Map());
  const [error, setError] = useState<string | null>(null);

  // Convert rollups to string for stable dependency, excluding -1 latest_bridge_synced_block
  const validRollupsStr = rollups
    .filter(r => r.latest_bridge_synced_block !== -1)
    .map(r => r.rollup_id)
    .join(',');

  const fetchData = useCallback(async () => {
    const currentValidRollupIds = validRollupsStr.split(',').filter(id => id).map(Number);
    
    if (currentValidRollupIds.length === 0) {
      setDistances(new Map());
      setLoadingStates(new Map());
      return;
    }

    // Initialize loading states for all valid rollups
    const initialLoadingStates = new Map();
    currentValidRollupIds.forEach(rollupId => {
      initialLoadingStates.set(rollupId, true);
    });
    setLoadingStates(initialLoadingStates);

    // Fetch distances individually and update state as each completes
    currentValidRollupIds.forEach(async (rollupId) => {
      try {
        const distance = await apiService.getSyncDistance(rollupId);
        
        // Update distances map
        setDistances(prev => {
          const newMap = new Map(prev);
          newMap.set(rollupId, distance);
          return newMap;
        });

        // Update loading state for this specific rollup
        setLoadingStates(prev => {
          const newMap = new Map(prev);
          newMap.set(rollupId, false);
          return newMap;
        });

        setError(null);
      } catch (err) {
        console.error(`Failed to fetch sync distance for rollup ${rollupId}:`, err);
        
        // Update loading state for this specific rollup even on error
        setLoadingStates(prev => {
          const newMap = new Map(prev);
          newMap.set(rollupId, false);
          return newMap;
        });

        setError(err instanceof Error ? err.message : 'Failed to fetch some sync distances');
      }
    });
  }, [validRollupsStr]);

  const refetch = useCallback(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Check if any rollup is still loading
  const loading = Array.from(loadingStates.values()).some(isLoading => isLoading);

  return { distances, loadingStates, loading, error, refetch };
}

export function useBridgeEventCounts(): UseDataResult<BridgeEventCount[]> {
  const [data, setData] = useState<BridgeEventCount[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const counts = await apiService.getBridgeEventsCountByRollup();
      setData(counts);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch bridge event counts:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch bridge event counts');
      setData([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const refetch = useCallback(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch };
}

export function useClaimEventCounts(): UseDataResult<ClaimEventCount[]> {
  const [data, setData] = useState<ClaimEventCount[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const counts = await apiService.getClaimEventsCountByRollup();
      setData(counts);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch claim event counts:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch claim event counts');
      setData([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const refetch = useCallback(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch };
}

export function useFlowData(rollupId: number): UseDataResult<FlowData[]> {
  const [data, setData] = useState<FlowData[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const flows = await apiService.getFlowDataForRollup(rollupId);
      setData(flows);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch flow data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch flow data');
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [rollupId]);

  const refetch = useCallback(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch };
}

