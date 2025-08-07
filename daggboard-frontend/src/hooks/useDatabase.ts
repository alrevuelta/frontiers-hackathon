import { useState, useEffect, useCallback } from 'react';
import { DatabaseService, type Rollup, type TokenStats, type BridgeEvent, type ClaimEvent, type WrappedTokenEvent } from '../utils/database';

export interface UseDataResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useDatabase() {
  const [dbService, setDbService] = useState<DatabaseService | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initDatabase = async () => {
      try {
        setLoading(true);
        const service = await DatabaseService.getInstance();
        setDbService(service);
        setError(null);
      } catch (err) {
        console.error('Failed to initialize database:', err);
        setError(err instanceof Error ? err.message : 'Failed to initialize database');
      } finally {
        setLoading(false);
      }
    };

    initDatabase();
  }, []);

  return { dbService, loading, error };
}

export function useRollups(): UseDataResult<Rollup[]> {
  const [data, setData] = useState<Rollup[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { dbService, loading: dbLoading } = useDatabase();

  const fetchData = useCallback(async (silent = false) => {
    if (!dbService) return;
    
    try {
      if (!silent) setLoading(true);
      const rollups = await dbService.getRollups();
      setData(rollups);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch rollups:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch rollups';
      
      // Only show error if database is fully loaded and this isn't a "not initialized" error
      if (!dbLoading && !errorMessage.includes('Database not initialized')) {
        setError(errorMessage);
      } else {
        // Keep loading state for initialization errors
        setError(null);
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, [dbService, dbLoading]);

  const refetch = useCallback(() => {
    fetchData(false);
  }, [fetchData]);

  useEffect(() => {
    if (dbService && !dbLoading) {
      fetchData();
    }
  }, [fetchData, dbService, dbLoading]);

  // Auto-retry every 2 seconds if database isn't ready yet
  useEffect(() => {
    if (dbLoading || (!data && !error)) {
      const interval = setInterval(() => {
        if (dbService && !error) {
          fetchData(true); // Silent retry
        }
      }, 2000);
      
      return () => clearInterval(interval);
    }
  }, [dbLoading, data, error, dbService, fetchData]);

  return { data, loading: loading || dbLoading, error, refetch };
}

export function useRollup(rollupId: number): UseDataResult<Rollup> {
  const [data, setData] = useState<Rollup | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { dbService } = useDatabase();

  const fetchData = useCallback(async () => {
    if (!dbService) return;
    
    try {
      setLoading(true);
      const rollup = await dbService.getRollupById(rollupId);
      setData(rollup);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch rollup:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch rollup');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [dbService, rollupId]);

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
  const { dbService } = useDatabase();

  const fetchData = useCallback(async () => {
    if (!dbService) return;
    
    try {
      setLoading(true);
      const stats = await dbService.getTokenStats(rollupId);
      setData(stats);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch token stats:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch token stats');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [dbService, rollupId]);

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
  const { dbService } = useDatabase();

  const fetchData = useCallback(async () => {
    if (!dbService) return;
    
    try {
      setLoading(true);
      const tokens = await dbService.getWrappedTokensForRollup(rollupId);
      setData(tokens);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch wrapped tokens:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch wrapped tokens');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [dbService, rollupId]);

  const refetch = useCallback(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch };
}

export function useRecentBridgeEvents(rollupId: number, limit: number = 10): UseDataResult<BridgeEvent[]> {
  const [data, setData] = useState<BridgeEvent[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { dbService } = useDatabase();

  const fetchData = useCallback(async () => {
    if (!dbService) return;
    
    try {
      setLoading(true);
      const events = await dbService.getRecentBridgeEvents(rollupId, limit);
      setData(events);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch bridge events:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch bridge events');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [dbService, rollupId, limit]);

  const refetch = useCallback(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch };
}

export function useRecentClaimEvents(rollupId: number, limit: number = 10): UseDataResult<ClaimEvent[]> {
  const [data, setData] = useState<ClaimEvent[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { dbService } = useDatabase();

  const fetchData = useCallback(async () => {
    if (!dbService) return;
    
    try {
      setLoading(true);
      const events = await dbService.getRecentClaimEvents(rollupId, limit);
      setData(events);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch claim events:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch claim events');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [dbService, rollupId, limit]);

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
  const { dbService, loading: dbLoading } = useDatabase();

  const fetchData = useCallback(async (silent = false) => {
    if (!dbService) return;
    
    try {
      if (!silent) setLoading(true);
      const [bridgeCountResult, claimCountResult] = await Promise.all([
        dbService.getBridgeEventsCount(rollupId),
        dbService.getClaimEventsCount(rollupId),
      ]);
      
      setBridgeCount(bridgeCountResult);
      setClaimCount(claimCountResult);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch event counts:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch event counts';
      
      if (!dbLoading && !errorMessage.includes('Database not initialized')) {
        setError(errorMessage);
      } else {
        setError(null);
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, [dbService, rollupId, dbLoading]);

  const refetch = useCallback(() => {
    fetchData(false);
  }, [fetchData]);

  useEffect(() => {
    if (dbService && !dbLoading) {
      fetchData();
    }
  }, [fetchData, dbService, dbLoading]);

  // Auto-retry for initialization
  useEffect(() => {
    if (dbLoading || (bridgeCount === 0 && claimCount === 0 && !error)) {
      const interval = setInterval(() => {
        if (dbService && !error) {
          fetchData(true);
        }
      }, 2000);
      
      return () => clearInterval(interval);
    }
  }, [dbLoading, bridgeCount, claimCount, error, dbService, fetchData]);

  return { bridgeCount, claimCount, loading: loading || dbLoading, error, refetch };
}