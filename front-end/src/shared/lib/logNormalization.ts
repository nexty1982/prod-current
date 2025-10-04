// Utility functions for normalizing log entries and ensuring consistent schema
import { LogEntry, LogLevel, StandardLogFormat } from '@/types/logging';

/**
 * Normalizes raw log data into StandardLogFormat
 * Handles malformed or partial log entries gracefully
 */
export function normalizeLogEntry(raw: any): StandardLogFormat {
  // Ensure we have a valid object
  if (!raw || typeof raw !== 'object') {
    return createDefaultLogEntry('Invalid log data received');
  }

  // Extract and validate required fields
  const id = normalizeId(raw.id);
  const timestamp = normalizeTimestamp(raw.timestamp);
  const level = normalizeLogLevel(raw.level);
  const source = normalizeString(raw.source, 'Unknown');
  const message = normalizeString(raw.message, 'No message');

  // Extract and normalize metadata
  const meta = normalizeMeta(raw.meta);

  // Extract user information
  const user = normalizeUser(raw);

  // Extract context information
  const context = normalizeContext(raw);

  return {
    id,
    timestamp,
    level,
    source,
    message,
    meta,
    user,
    context
  };
}

/**
 * Normalizes log ID to ensure it's a valid number
 */
function normalizeId(id: any): number {
  if (typeof id === 'number' && !isNaN(id)) {
    return id;
  }
  
  if (typeof id === 'string') {
    const parsed = parseInt(id, 10);
    if (!isNaN(parsed)) {
      return parsed;
    }
  }

  // Generate a pseudo-random ID if none provided
  return Math.floor(Math.random() * 1000000) + Date.now();
}

/**
 * Normalizes timestamp to ensure it's a valid Date object
 */
function normalizeTimestamp(timestamp: any): Date {
  if (timestamp instanceof Date && !isNaN(timestamp.getTime())) {
    return timestamp;
  }

  if (typeof timestamp === 'string') {
    const parsed = new Date(timestamp);
    if (!isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  if (typeof timestamp === 'number') {
    const parsed = new Date(timestamp);
    if (!isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  // Default to current time if timestamp is invalid
  return new Date();
}

/**
 * Normalizes log level to ensure it's a valid LogLevel
 */
function normalizeLogLevel(level: any): LogLevel {
  if (typeof level === 'string') {
    const upperLevel = level.toUpperCase();
    const validLevels: LogLevel[] = ['DEBUG', 'INFO', 'WARN', 'ERROR', 'SUCCESS'];
    
    if (validLevels.includes(upperLevel as LogLevel)) {
      return upperLevel as LogLevel;
    }

    // Handle common variations
    const levelMappings: { [key: string]: LogLevel } = {
      'WARNING': 'WARN',
      'ERR': 'ERROR',
      'INFORMATION': 'INFO',
      'VERBOSE': 'DEBUG',
      'TRACE': 'DEBUG',
      'FATAL': 'ERROR',
      'CRITICAL': 'ERROR'
    };

    if (levelMappings[upperLevel]) {
      return levelMappings[upperLevel];
    }
  }

  // Default to INFO if level is invalid
  return 'INFO';
}

/**
 * Normalizes string fields with fallback values
 */
function normalizeString(value: any, fallback: string = ''): string {
  if (typeof value === 'string') {
    return value.trim();
  }

  if (value != null) {
    return String(value).trim();
  }

  return fallback;
}

/**
 * Normalizes metadata object
 */
function normalizeMeta(meta: any): Record<string, any> {
  if (!meta || typeof meta !== 'object') {
    return {};
  }

  // If meta is a string (JSON), try to parse it
  if (typeof meta === 'string') {
    try {
      const parsed = JSON.parse(meta);
      return typeof parsed === 'object' ? parsed : { raw: meta };
    } catch {
      return { raw: meta };
    }
  }

  // Clean up the metadata object
  const cleanMeta: Record<string, any> = {};
  
  Object.entries(meta).forEach(([key, value]) => {
    // Skip null/undefined values
    if (value != null) {
      cleanMeta[key] = value;
    }
  });

  return cleanMeta;
}

/**
 * Normalizes user information
 */
function normalizeUser(raw: any): { email: string; id?: string | number } | undefined {
  const email = normalizeString(raw.user_email);
  const userId = raw.user_id || raw.userId;

  if (!email) {
    return undefined;
  }

  const user: { email: string; id?: string | number } = { email };

  if (userId != null) {
    user.id = userId;
  }

  return user;
}

/**
 * Normalizes context information
 */
function normalizeContext(raw: any): {
  service?: string;
  sessionId?: string;
  requestId?: string;
  ipAddress?: string;
  userAgent?: string;
} {
  const context: any = {};

  if (raw.service) {
    context.service = normalizeString(raw.service);
  }

  if (raw.session_id || raw.sessionId) {
    context.sessionId = normalizeString(raw.session_id || raw.sessionId);
  }

  if (raw.request_id || raw.requestId) {
    context.requestId = normalizeString(raw.request_id || raw.requestId);
  }

  if (raw.ip_address || raw.ipAddress) {
    context.ipAddress = normalizeString(raw.ip_address || raw.ipAddress);
  }

  if (raw.user_agent || raw.userAgent) {
    context.userAgent = normalizeString(raw.user_agent || raw.userAgent);
  }

  return context;
}

/**
 * Creates a default log entry for error cases
 */
function createDefaultLogEntry(message: string): StandardLogFormat {
  return {
    id: Math.floor(Math.random() * 1000000) + Date.now(),
    timestamp: new Date(),
    level: 'ERROR',
    source: 'LogNormalization',
    message,
    meta: { error: 'Failed to normalize log entry' },
    user: undefined,
    context: {}
  };
}

/**
 * Converts StandardLogFormat back to LogEntry for API compatibility
 */
export function standardToLogEntry(standard: StandardLogFormat): LogEntry {
  return {
    id: standard.id,
    timestamp: standard.timestamp.toISOString(),
    level: standard.level,
    source: standard.source,
    message: standard.message,
    meta: standard.meta,
    user_email: standard.user?.email,
    service: standard.context?.service,
    session_id: standard.context?.sessionId,
    request_id: standard.context?.requestId,
    ip_address: standard.context?.ipAddress,
    user_agent: standard.context?.userAgent
  };
}

/**
 * Validates if a log entry has all required fields
 */
export function validateLogEntry(entry: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!entry) {
    errors.push('Log entry is null or undefined');
    return { valid: false, errors };
  }

  if (typeof entry !== 'object') {
    errors.push('Log entry must be an object');
    return { valid: false, errors };
  }

  // Check required fields
  if (!entry.id && entry.id !== 0) {
    errors.push('Missing required field: id');
  }

  if (!entry.timestamp) {
    errors.push('Missing required field: timestamp');
  } else {
    const timestamp = new Date(entry.timestamp);
    if (isNaN(timestamp.getTime())) {
      errors.push('Invalid timestamp format');
    }
  }

  if (!entry.level) {
    errors.push('Missing required field: level');
  } else {
    const validLevels = ['DEBUG', 'INFO', 'WARN', 'ERROR', 'SUCCESS'];
    if (!validLevels.includes(String(entry.level).toUpperCase())) {
      errors.push('Invalid log level');
    }
  }

  if (!entry.source) {
    errors.push('Missing required field: source');
  }

  if (!entry.message) {
    errors.push('Missing required field: message');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Batch normalizes multiple log entries
 */
export function normalizeLogEntries(rawLogs: any[]): StandardLogFormat[] {
  if (!Array.isArray(rawLogs)) {
    console.warn('[LogNormalization] Expected array but received:', typeof rawLogs);
    return [];
  }

  return rawLogs.map((raw, index) => {
    try {
      return normalizeLogEntry(raw);
    } catch (error) {
      console.error(`[LogNormalization] Failed to normalize log at index ${index}:`, error);
      return createDefaultLogEntry(`Failed to normalize log entry at index ${index}`);
    }
  });
}