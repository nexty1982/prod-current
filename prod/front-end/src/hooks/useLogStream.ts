// React hook for real-time log streaming via WebSocket
import { useState, useEffect, useCallback, useRef } from 'react';
import { LogEntry, LogFilters, UseLogStreamReturn, WebSocketLogMessage } from '../types/logging';

interface UseLogStreamOptions {
  maxLogs?: number;
  autoReconnect?: boolean;
  reconnectInterval?: number;
  initialFilters?: LogFilters;
}

export const useLogStream = (options: UseLogStreamOptions = {}): UseLogStreamReturn => {
  const {
    maxLogs = 1000,
    autoReconnect = true,
    reconnectInterval = 5000,
    initialFilters = {}
  } = options;

  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
  const [filters, setFilters] = useState<LogFilters>(initialFilters);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 10;

  // Get WebSocket URL
  const getWebSocketUrl = useCallback(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    return `${protocol}//${host}/ws/logs`;
  }, []);

  // Connect to WebSocket
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return; // Already connected
    }

    setConnectionStatus('connecting');
    setError(null);

    try {
      const wsUrl = getWebSocketUrl();
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log('[LogStream] WebSocket connected');
        setIsConnected(true);
        setConnectionStatus('connected');
        setError(null);
        reconnectAttemptsRef.current = 0;

        // Send initial filters if any
        if (Object.keys(filters).length > 0) {
          wsRef.current?.send(JSON.stringify({
            type: 'filters',
            data: filters
          }));
        }
      };

      wsRef.current.onmessage = (event) => {
        try {
          const message: WebSocketLogMessage = JSON.parse(event.data);
          
          switch (message.type) {
            case 'log':
              if (message.data) {
                setLogs(prevLogs => {
                  const newLogs = [message.data!, ...prevLogs];
                  return newLogs.slice(0, maxLogs);
                });
              }
              break;
              
            case 'historical':
              if (message.data) {
                setLogs(prevLogs => {
                  // Check if log already exists to avoid duplicates
                  const exists = prevLogs.find(log => log.id === message.data!.id);
                  if (!exists) {
                    return [...prevLogs, message.data!].slice(0, maxLogs);
                  }
                  return prevLogs;
                });
              }
              break;
              
            case 'ready':
              console.log('[LogStream] Ready:', message.message);
              break;
              
            case 'error':
              console.error('[LogStream] Server error:', message.message);
              setError(message.message || 'Unknown server error');
              break;
              
            default:
              console.warn('[LogStream] Unknown message type:', message.type);
          }
        } catch (parseError) {
          console.error('[LogStream] Failed to parse message:', parseError);
          setError('Failed to parse server message');
        }
      };

      wsRef.current.onclose = (event) => {
        console.log('[LogStream] WebSocket closed:', event.code, event.reason);
        setIsConnected(false);
        setConnectionStatus('disconnected');

        // Auto-reconnect if enabled and not a manual close
        if (autoReconnect && event.code !== 1000 && reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current++;
          console.log(`[LogStream] Attempting reconnect ${reconnectAttemptsRef.current}/${maxReconnectAttempts} in ${reconnectInterval}ms`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, reconnectInterval);
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('[LogStream] WebSocket error:', error);
        setError('WebSocket connection error');
        setConnectionStatus('error');
      };

    } catch (connectionError) {
      console.error('[LogStream] Failed to create WebSocket:', connectionError);
      setError('Failed to create WebSocket connection');
      setConnectionStatus('error');
    }
  }, [getWebSocketUrl, autoReconnect, reconnectInterval, maxLogs, filters]);

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close(1000, 'Manual disconnect');
      wsRef.current = null;
    }

    setIsConnected(false);
    setConnectionStatus('disconnected');
    reconnectAttemptsRef.current = 0;
  }, []);

  // Update filters
  const updateFilters = useCallback((newFilters: LogFilters) => {
    setFilters(newFilters);
    
    // Send filters to server if connected
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'filters',
        data: newFilters
      }));
    }
  }, []);

  // Clear logs
  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  // Reconnect manually
  const reconnect = useCallback(() => {
    disconnect();
    setTimeout(() => {
      connect();
    }, 1000);
  }, [disconnect, connect]);

  // Connect on mount
  useEffect(() => {
    connect();
    
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  // Handle filter changes
  useEffect(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'filters',
        data: filters
      }));
    }
  }, [filters]);

  // Handle page visibility change
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Page is hidden, reduce activity
      } else {
        // Page is visible, ensure connection is active
        if (!isConnected && autoReconnect) {
          reconnect();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isConnected, autoReconnect, reconnect]);

  return {
    logs,
    isConnected,
    error,
    connectionStatus,
    updateFilters,
    clearLogs,
    reconnect
  };
};