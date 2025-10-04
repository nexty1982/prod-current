// TypeScript interfaces for the centralized logging system

export type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG' | 'SUCCESS';

export interface LogEntry {
  id: number;
  timestamp: string; // ISO 8601 format
  level: LogLevel;
  source: string;
  message: string;
  meta?: Record<string, any>;
  user_email?: string;
  service?: string;
  session_id?: string;
  request_id?: string;
  ip_address?: string;
  user_agent?: string;
}

export interface LogFilters {
  level?: LogLevel;
  source?: string;
  service?: string;
  user_email?: string;
  start_date?: string; // ISO 8601 format
  end_date?: string; // ISO 8601 format
  search?: string;
  limit?: number;
  offset?: number;
}

export interface LogPagination {
  total: number;
  limit: number;
  offset: number;
  hasMore?: boolean;
}

export interface LogResponse {
  logs: LogEntry[];
  pagination: LogPagination;
  filters: LogFilters;
}

export interface LogStats {
  summary: {
    totalLogs: number;
    recentErrors: number;
    timeRange: string;
  };
  levelDistribution: Array<{
    level: LogLevel;
    count: number;
  }>;
  topServices: Array<{
    service: string;
    count: number;
  }>;
  errorTrends: Array<{
    hour: string;
    error_count: number;
  }>;
}

export interface LogCleanupRequest {
  days_to_keep?: number;
  cutoff_date?: string; // ISO 8601 format
}

export interface LogCleanupResponse {
  success: boolean;
  message: string;
  deletedCount: number;
  cutoffDate: string;
  daysKept: number;
}

// WebSocket message types
export interface WebSocketLogMessage {
  type: 'log' | 'historical' | 'ready' | 'error';
  data?: LogEntry;
  message?: string;
  clientId?: string;
  timestamp: string;
}

// Component-specific interfaces
export interface LogConsoleProps {
  filters?: LogFilters;
  height?: number;
  autoScroll?: boolean;
  showFilters?: boolean;
  realTime?: boolean;
}

export interface CriticalEventsPanelProps {
  maxEvents?: number;
  timeWindow?: number; // hours
  autoRefresh?: boolean;
  refreshInterval?: number; // seconds
}

export interface SystemMessageBoardProps {
  maxMessages?: number;
  sources?: string[];
  excludeLevels?: LogLevel[];
  compact?: boolean;
}

export interface HistoricalLogTimelineProps {
  timeRange?: '1h' | '6h' | '12h' | '24h' | '7d' | '30d';
  groupBy?: 'hour' | 'day';
  showTrends?: boolean;
  interactive?: boolean;
}

// Hook return types
export interface UseLogStreamReturn {
  logs: LogEntry[];
  isConnected: boolean;
  error: string | null;
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
  updateFilters: (filters: LogFilters) => void;
  clearLogs: () => void;
  reconnect: () => void;
}

export interface UseLogStatsReturn {
  stats: LogStats | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  lastUpdated: Date | null;
}

export interface UseLogFilterReturn {
  filters: LogFilters;
  updateFilter: (key: keyof LogFilters, value: any) => void;
  clearFilters: () => void;
  applyFilters: (newFilters: Partial<LogFilters>) => void;
  buildApiQuery: () => URLSearchParams;
}

// Utility types
export interface StandardLogFormat {
  id: number;
  timestamp: Date;
  level: LogLevel;
  source: string;
  message: string;
  meta: Record<string, any>;
  user?: {
    email: string;
    id?: string | number;
  };
  context?: {
    service?: string;
    sessionId?: string;
    requestId?: string;
    ipAddress?: string;
    userAgent?: string;
  };
}

// Error types
export interface LogApiError {
  error: string;
  message: string;
  statusCode?: number;
}

// Constants
export const LOG_LEVELS: LogLevel[] = ['DEBUG', 'INFO', 'WARN', 'ERROR', 'SUCCESS'];

export const LOG_LEVEL_COLORS: Record<LogLevel, string> = {
  DEBUG: 'text-gray-500',
  INFO: 'text-blue-600',
  WARN: 'text-yellow-600',
  ERROR: 'text-red-600',
  SUCCESS: 'text-green-600'
};

export const LOG_LEVEL_BG_COLORS: Record<LogLevel, string> = {
  DEBUG: 'bg-gray-100',
  INFO: 'bg-blue-100',
  WARN: 'bg-yellow-100',
  ERROR: 'bg-red-100',
  SUCCESS: 'bg-green-100'
};

export const LOG_LEVEL_ICONS: Record<LogLevel, string> = {
  DEBUG: '🐛',
  INFO: 'ℹ️',
  WARN: '⚠️',
  ERROR: '❌',
  SUCCESS: '✅'
};

// API endpoints
export const LOG_API_ENDPOINTS = {
  DATABASE_LOGS: '/api/logs/database',
  LOG_STATS: '/api/logs/database/stats',
  LOG_CLEANUP: '/api/logs/database/cleanup',
  WEBSOCKET: '/ws/logs'
} as const;