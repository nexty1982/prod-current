// TypeScript types for OMAI Ultimate Logger
export type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG' | 'SUCCESS';

export interface LogEntry {
  id: number;
  timestamp: string;
  level: LogLevel;
  source: string;
  service?: string;
  message: string;
  meta?: Record<string, any>;
  user_email?: string;
  session_id?: string;
  request_id?: string;
  ip_address?: string;
  user_agent?: string;
}

export interface LogStats {
  totalLogs: number;
  recentErrors: number;
  errorTrends: Array<{
    hour: string;
    count: number;
  }>;
  levelDistribution: Record<LogLevel, number>;
  topServices: Array<{
    service: string;
    count: number;
  }>;
}

export interface LogFilter {
  level?: LogLevel;
  source?: string;
  service?: string;
  user_email?: string;
  start_date?: string;
  end_date?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface OMAIUltimateLoggerProps {
  autoScroll?: boolean;
  defaultFilter?: LogFilter;
  refreshInterval?: number;
}

export interface WebSocketLogMessage {
  type: 'LOG_ENTRY' | 'LOG_STATS' | 'CONNECTION_STATUS';
  data: LogEntry | LogStats | { connected: boolean };
}
