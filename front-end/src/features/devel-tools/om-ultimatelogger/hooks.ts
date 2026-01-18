import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { LogEntry, LogStats, LogFilter, WebSocketLogMessage } from './types';
import { mockLogStats, mockRealTimeLogs } from './mockData';

// Hook for fetching logs from the API with fallback to mock data
export const useLogs = (filter: LogFilter = {}, autoRefresh: boolean = false) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams();
      Object.entries(filter).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, String(value));
        }
      });

      const response = await axios.get(`/api/logs/database?${params.toString()}`);
      setLogs(response.data.logs || []);
      setTotalCount(response.data.totalCount || 0);
    } catch (err: any) {
      console.warn('API call failed, using mock data:', err.message);
      setError(err.message || 'Failed to fetch logs');
      
      // Fallback to mock data based on filter
      let mockData = [...mockRealTimeLogs];
      
      if (filter.level) {
        mockData = mockData.filter(log => log.level === filter.level);
      }
      
      if (filter.source) {
        mockData = mockData.filter(log => 
          log.source.toLowerCase().includes(filter.source!.toLowerCase())
        );
      }
      
      if (filter.search) {
        mockData = mockData.filter(log => 
          log.message.toLowerCase().includes(filter.search!.toLowerCase())
        );
      }
      
      if (filter.limit) {
        mockData = mockData.slice(0, filter.limit);
      }
      
      setLogs(mockData);
      setTotalCount(mockData.length);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(fetchLogs, 5000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, fetchLogs]);

  return {
    logs,
    loading,
    error,
    totalCount,
    refetch: fetchLogs
  };
};

// Hook for log statistics with fallback to mock data
export const useLogStats = (refreshInterval: number = 30000) => {
  const [stats, setStats] = useState<LogStats | null>(mockLogStats);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await axios.get('/api/logs/database/stats');
      setStats(response.data);
    } catch (err: any) {
      console.warn('Stats API call failed, using mock data:', err.message);
      setError(err.message || 'Failed to fetch log statistics');
      // Keep using mock data on error
      setStats(mockLogStats);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, refreshInterval);
    return () => clearInterval(interval);
  }, [fetchStats, refreshInterval]);

  return {
    stats,
    loading,
    error,
    refetch: fetchStats
  };
};

// Hook for real-time log streaming via WebSocket with enhanced fallback
export const useLogStream = (enabled: boolean = true) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ws = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const simulationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    if (!enabled) return;

    try {
      // For development, try to connect to the development server
      const isDev = window.location.host.includes('orthodmetrics.com');
      const wsHost = isDev ? 'localhost:3002' : window.location.host;
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${wsHost}/ws/admin/logs`;
      
      ws.current = new WebSocket(wsUrl);

      ws.current.onopen = () => {
        setConnected(true);
        setError(null);
        console.log('🔌 WebSocket connected to log stream');
        
        // Clear any simulation when real connection is established
        if (simulationIntervalRef.current) {
          clearInterval(simulationIntervalRef.current);
        }
      };

      ws.current.onmessage = (event) => {
        try {
          const message: WebSocketLogMessage = JSON.parse(event.data);
          
          if (message.type === 'LOG_ENTRY') {
            const logEntry = message.data as LogEntry;
            setLogs(prev => [logEntry, ...prev.slice(0, 299)]); // Keep last 300 logs
          } else if (message.type === 'CONNECTION_STATUS') {
            const statusData = message.data as { connected: boolean };
            setConnected(statusData.connected);
          }
        } catch (err) {
          console.error('Failed to parse WebSocket message:', err);
        }
      };

      ws.current.onerror = (error) => {
        console.warn('WebSocket error, falling back to simulation:', error);
        setError('WebSocket connection failed');
        setConnected(false);
        
        // Start simulation when WebSocket fails
        startSimulation();
      };

      ws.current.onclose = () => {
        setConnected(false);
        console.log('🔌 WebSocket disconnected');
        
        // Attempt to reconnect after 5 seconds
        if (enabled) {
          reconnectTimeoutRef.current = setTimeout(connect, 5000);
        }
        
        // Start simulation while disconnected
        startSimulation();
      };

    } catch (err) {
      console.warn('Failed to establish WebSocket connection, using simulation:', err);
      setError('Connection failed, using simulation');
      setConnected(false);
      startSimulation();
    }
  }, [enabled]);

  const startSimulation = useCallback(() => {
    // Don't start simulation if already connected or not enabled
    if (connected || !enabled || simulationIntervalRef.current) return;
    
    console.log('📡 Starting log simulation...');
    // This will be handled by the individual components with their mock data
    setError('Using simulated data');
  }, [connected, enabled]);

  const disconnect = useCallback(() => {
    if (ws.current) {
      ws.current.close();
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (simulationIntervalRef.current) {
      clearInterval(simulationIntervalRef.current);
    }
    setConnected(false);
    setLogs([]);
  }, []);

  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  useEffect(() => {
    if (enabled) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [enabled, connect, disconnect]);

  return {
    logs,
    connected,
    error,
    connect,
    disconnect,
    clearLogs
  };
};

// Hook for system health monitoring
export const useSystemHealth = () => {
  const [isHealthy, setIsHealthy] = useState(true);
  const [lastCheck, setLastCheck] = useState<Date>(new Date());

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const response = await axios.get('/api/health');
        setIsHealthy(response.status === 200);
      } catch {
        setIsHealthy(false);
      }
      setLastCheck(new Date());
    };

    checkHealth();
    const interval = setInterval(checkHealth, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, []);

  return {
    isHealthy,
    lastCheck
  };
};

// Hook for managing log filters
export const useLogFilters = (initialFilter: LogFilter = {}) => {
  const [filter, setFilter] = useState<LogFilter>(initialFilter);

  const updateFilter = useCallback((newFilter: Partial<LogFilter>) => {
    setFilter(prev => ({ ...prev, ...newFilter }));
  }, []);

  const clearFilter = useCallback(() => {
    setFilter(initialFilter);
  }, [initialFilter]);

  const resetFilter = useCallback(() => {
    setFilter({});
  }, []);

  return {
    filter,
    updateFilter,
    clearFilter,
    resetFilter
  };
};

// Additional hooks for compatibility
export const usePagination = () => {
  // Placeholder for pagination hook
  return {
    page: 1,
    limit: 50,
    total: 0,
    setPage: () => {},
    setLimit: () => {}
  };
};

export const useLogFilter = () => {
  return useLogFilters();
};

