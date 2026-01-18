import { LogLevel, LogEntry } from './types';

// Utility functions for OMAI Ultimate Logger

export const formatTimestamp = (timestamp: string): string => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });
};

export const formatDate = (timestamp: string): string => {
  const date = new Date(timestamp);
  return date.toLocaleDateString('en-US', {
    month: 'numeric',
    day: 'numeric',
    year: 'numeric'
  });
};

export const getLogLevelColor = (level: LogLevel): string => {
  const colors = {
    INFO: 'text-blue-400',
    WARN: 'text-yellow-400',
    ERROR: 'text-red-400',
    DEBUG: 'text-gray-400',
    SUCCESS: 'text-green-400'
  };
  return colors[level] || 'text-gray-400';
};

export const getLogLevelBadgeColor = (level: LogLevel): string => {
  const colors = {
    INFO: 'bg-blue-600/20 text-blue-300 border-blue-500/30',
    WARN: 'bg-yellow-600/20 text-yellow-300 border-yellow-500/30',
    ERROR: 'bg-red-600/20 text-red-300 border-red-500/30',
    DEBUG: 'bg-gray-600/20 text-gray-300 border-gray-500/30',
    SUCCESS: 'bg-green-600/20 text-green-300 border-green-500/30'
  };
  return colors[level] || 'bg-gray-600/20 text-gray-300 border-gray-500/30';
};

export const getLogLevelIcon = (level: LogLevel): string => {
  const icons = {
    INFO: '🔵',
    WARN: '⚠️',
    ERROR: '❌',
    DEBUG: '🔍',
    SUCCESS: '✅'
  };
  return icons[level] || 'ℹ️';
};

export const truncateMessage = (message: string, maxLength: number = 100): string => {
  if (message.length <= maxLength) return message;
  return message.substring(0, maxLength) + '...';
};

export const formatLogSource = (source: string): string => {
  // Convert source like "TestSuite" to "[TestSuite]"
  return `[${source}]`;
};

export const groupLogsByTimeWindow = (logs: LogEntry[], windowMinutes: number = 60): Record<string, LogEntry[]> => {
  const groups: Record<string, LogEntry[]> = {};
  
  logs.forEach(log => {
    const date = new Date(log.timestamp);
    const windowStart = new Date(date);
    windowStart.setMinutes(Math.floor(date.getMinutes() / windowMinutes) * windowMinutes, 0, 0);
    const key = windowStart.toISOString();
    
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(log);
  });
  
  return groups;
};

export const filterLogs = (logs: LogEntry[], filter: {
  level?: LogLevel;
  source?: string;
  service?: string;
  search?: string;
}): LogEntry[] => {
  return logs.filter(log => {
    if (filter.level && log.level !== filter.level) return false;
    if (filter.source && !log.source.toLowerCase().includes(filter.source.toLowerCase())) return false;
    if (filter.service && log.service && !log.service.toLowerCase().includes(filter.service.toLowerCase())) return false;
    if (filter.search && !log.message.toLowerCase().includes(filter.search.toLowerCase())) return false;
    return true;
  });
};

export const formatMetadata = (meta: Record<string, any> | undefined): string => {
  if (!meta) return '';
  try {
    return JSON.stringify(meta, null, 2);
  } catch {
    return String(meta);
  }
};

export const getRelativeTime = (timestamp: string): string => {
  const now = new Date();
  const logTime = new Date(timestamp);
  const diffMs = now.getTime() - logTime.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
};

