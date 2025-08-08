import { useState, useEffect, useCallback } from 'react';
import { apiService, type Rollup, type TokenStats, type WrappedTokenEvent } from '../utils/api';

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

export function useTokenStats(rollupId: number): UseDataResult<TokenStats[]> {
  const [data, setData] = useState<TokenStats[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const stats = await apiService.getTokenStats(rollupId);
      setData(stats);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch token stats:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch token stats');
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

export function useWrappedTokens(rollupId: number): UseDataResult<WrappedTokenEvent[]> {
  const [data, setData] = useState<WrappedTokenEvent[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const tokens = await apiService.getWrappedTokensForRollup(rollupId);
      setData(tokens);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch wrapped tokens:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch wrapped tokens');
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

export function useEventCounts(rollupId?: number) {
  const [bridgeCount, setBridgeCount] = useState<number>(0);
  const [claimCount, setClaimCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const [bridgeCountResult, claimCountResult] = await Promise.all([
        apiService.getBridgeEventsCount(rollupId),
        apiService.getClaimEventsCount(rollupId),
      ]);
      
      setBridgeCount(bridgeCountResult);
      setClaimCount(claimCountResult);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch event counts:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch event counts';
      setError(errorMessage);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [rollupId]);

  const refetch = useCallback(() => {
    fetchData(false);
  }, [fetchData]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { bridgeCount, claimCount, loading, error, refetch };
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