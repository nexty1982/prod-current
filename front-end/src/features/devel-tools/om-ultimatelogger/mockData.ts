// Mock data for OMAI Logger to ensure sophisticated interface displays properly
import { LogEntry, LogStats } from './types';

export const mockRealTimeLogs: LogEntry[] = [
  {
    id: 1,
    timestamp: new Date(Date.now() - 30000).toISOString(),
    level: 'INFO',
    source: 'frontend',
    service: 'auth',
    message: 'Payment processing initiated for order #ORD-5678',
    user_email: 'john.doe@example.com',
    session_id: 'sess_abc123def456',
    ip_address: '192.168.1.100'
  },
  {
    id: 2,
    timestamp: new Date(Date.now() - 60000).toISOString(),
    level: 'INFO',
    source: 'frontend',
    service: 'notifications',
    message: 'Background job queued: email_notification',
    session_id: 'sess_xyz789uvw012'
  },
  {
    id: 3,
    timestamp: new Date(Date.now() - 90000).toISOString(),
    level: 'ERROR',
    source: 'frontend',
    service: 'security',
    message: 'Critical security vulnerability detected',
    ip_address: '45.123.45.67',
    meta: { severity: 'critical', threat_level: 'high' }
  },
  {
    id: 4,
    timestamp: new Date(Date.now() - 120000).toISOString(),
    level: 'INFO',
    source: 'backend',
    service: 'auth',
    message: 'Session expired for user: john.doe@example.com',
    user_email: 'john.doe@example.com'
  },
  {
    id: 5,
    timestamp: new Date(Date.now() - 150000).toISOString(),
    level: 'DEBUG',
    source: 'backend',
    service: 'database',
    message: 'Database connection pool initialized with 20 connections'
  },
  {
    id: 6,
    timestamp: new Date(Date.now() - 180000).toISOString(),
    level: 'INFO',
    source: 'dev',
    service: 'payments',
    message: 'Payment processing initiated for order #ORD-5678'
  },
  {
    id: 7,
    timestamp: new Date(Date.now() - 210000).toISOString(),
    level: 'INFO',
    source: 'backend',
    service: 'database',
    message: 'Database connection pool initialized with 20 connections'
  }
];

export const mockCriticalEvents: LogEntry[] = [
  {
    id: 101,
    timestamp: new Date(Date.now() - 45000).toISOString(),
    level: 'ERROR',
    source: 'frontend',
    service: 'security',
    message: 'Critical security breach attempt detected from IP: 45.123.45.67',
    ip_address: '45.123.45.67',
    meta: { attack_type: 'sql_injection', blocked: true }
  },
  {
    id: 102,
    timestamp: new Date(Date.now() - 300000).toISOString(),
    level: 'ERROR',
    source: 'dev',
    service: 'api',
    message: 'API rate limit exceeded 1000 times in last hour',
    meta: { requests_blocked: 1000, time_window: '1h' }
  },
  {
    id: 103,
    timestamp: new Date(Date.now() - 480000).toISOString(),
    level: 'ERROR',
    source: 'dev',
    service: 'ssl',
    message: 'SSL certificate expires in 24 hours',
    meta: { cert_domain: 'orthodoxmetrics.com', expires_at: '2025-08-02T00:00:00Z' }
  }
];

export const mockSystemMessages: LogEntry[] = [
  {
    id: 201,
    timestamp: new Date(Date.now() - 75000).toISOString(),
    level: 'WARN',
    source: 'backend',
    service: 'monitoring',
    message: 'Performance Alert\nAPI response time increased by 35% in the last hour',
    meta: { avg_response_time: '450ms', threshold: '300ms' }
  },
  {
    id: 202,
    timestamp: new Date(Date.now() - 360000).toISOString(),
    level: 'INFO',
    source: 'backend',
    service: 'config',
    message: 'Configuration Update\nLoad balancer configuration updated with new health check endpoints',
    meta: { config_version: '2.1.4', updated_by: 'admin' }
  }
];

export const mockHistoricalLogs: LogEntry[] = [
  {
    id: 301,
    timestamp: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
    level: 'ERROR',
    source: 'backend',
    service: 'database',
    message: 'Database connection timeout',
    meta: { connection_pool: 'main', timeout_seconds: 30 }
  },
  {
    id: 302,
    timestamp: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
    level: 'WARN',
    source: 'frontend',
    service: 'memory',
    message: 'High memory usage detected',
    meta: { memory_usage: '92%', threshold: '85%' }
  },
  {
    id: 303,
    timestamp: new Date(Date.now() - 259200000).toISOString(), // 3 days ago
    level: 'WARN',
    source: 'frontend',
    service: 'memory',
    message: 'High memory usage detected',
    meta: { memory_usage: '89%', threshold: '85%' }
  }
];

export const mockLogStats: LogStats = {
  totalLogs: 45789,
  recentErrors: 12,
  errorTrends: [
    { hour: '00:00', count: 2 },
    { hour: '01:00', count: 1 },
    { hour: '02:00', count: 0 },
    { hour: '03:00', count: 1 },
    { hour: '04:00', count: 3 },
    { hour: '05:00', count: 1 },
    { hour: '06:00', count: 2 },
    { hour: '07:00', count: 2 }
  ],
  levelDistribution: {
    ERROR: 234,
    WARN: 567,
    INFO: 12456,
    DEBUG: 23456,
    SUCCESS: 9076
  },
  topServices: [
    { service: 'auth', count: 8734 },
    { service: 'api', count: 6543 },
    { service: 'database', count: 4321 },
    { service: 'frontend', count: 3210 },
    { service: 'payments', count: 2109 }
  ]
};

// Simulate real-time log generation
export const generateMockLogEntry = (): LogEntry => {
  const sources = ['frontend', 'backend', 'dev'];
  const services = ['auth', 'api', 'database', 'payments', 'notifications', 'security'];
  const levels = ['INFO', 'WARN', 'ERROR', 'DEBUG', 'SUCCESS'];
  const messages = [
    'Database query executed successfully',
    'User authentication completed',
    'Payment transaction processed',
    'Cache invalidation triggered',
    'Background job completed',
    'API request rate limit exceeded',
    'Memory usage threshold reached',
    'Security scan completed',
    'File upload processed',
    'Email notification sent'
  ];

  return {
    id: Date.now(),
    timestamp: new Date().toISOString(),
    level: levels[Math.floor(Math.random() * levels.length)] as any,
    source: sources[Math.floor(Math.random() * sources.length)],
    service: services[Math.floor(Math.random() * services.length)],
    message: messages[Math.floor(Math.random() * messages.length)],
    user_email: Math.random() > 0.7 ? 'user@example.com' : undefined,
    session_id: Math.random() > 0.5 ? `sess_${Math.random().toString(36).substr(2, 9)}` : undefined,
    ip_address: Math.random() > 0.6 ? `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}` : undefined
  };
};

