// React hook for fetching log statistics
import { useState, useEffect, useCallback } from 'react';
import { LogStats, UseLogStatsReturn, LOG_API_ENDPOINTS } from '../types/logging';

interface UseLogStatsOptions {
  autoRefresh?: boolean;
  refreshInterval?: number; // in milliseconds
  onError?: (error: string) => void;
}

export const useLogStats = (options: UseLogStatsOptions = {}): UseLogStatsReturn => {
  const {
    autoRefresh = false,
    refreshInterval = 30000, // 30 seconds
    onError
  } = options;

  const [stats, setStats] = useState<LogStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Fetch stats from API
  const fetchStats = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(LOG_API_ENDPOINTS.LOG_STATS, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const statsData: LogStats = await response.json();
      setStats(statsData);
      setLastUpdated(new Date());
      setError(null);
    } catch (fetchError) {
      const errorMessage = fetchError instanceof Error ? fetchError.message : 'Failed to fetch log statistics';
      setError(errorMessage);
      onError?.(errorMessage);
      console.error('[useLogStats] Fetch error:', fetchError);
    } finally {
      setLoading(false);
    }
  }, [onError]);

  // Manual refresh function
  const refresh = useCallback(async (): Promise<void> => {
    await fetchStats();
  }, [fetchStats]);

  // Initial fetch on mount
  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Auto-refresh setup
  useEffect(() => {
    if (!autoRefresh || refreshInterval <= 0) {
      return;
    }

    const intervalId = setInterval(() => {
      // Only auto-refresh if not already loading and no error
      if (!loading && !error) {
        fetchStats();
      }
    }, refreshInterval);

    return () => {
      clearInterval(intervalId);
    };
  }, [autoRefresh, refreshInterval, loading, error, fetchStats]);

  // Handle page visibility changes for auto-refresh
  useEffect(() => {
    if (!autoRefresh) {
      return;
    }

    const handleVisibilityChange = () => {
      if (!document.hidden && !loading) {
        // Page became visible, refresh if data is stale
        const staleThreshold = refreshInterval * 2; // Consider stale if older than 2x refresh interval
        const now = Date.now();
        const lastUpdateTime = lastUpdated?.getTime() || 0;
        
        if (now - lastUpdateTime > staleThreshold) {
          fetchStats();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [autoRefresh, refreshInterval, loading, lastUpdated, fetchStats]);

  return {
    stats,
    loading,
    error,
    refresh,
    lastUpdated
  };
};