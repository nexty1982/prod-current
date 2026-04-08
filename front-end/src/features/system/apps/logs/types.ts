import React from 'react';

// Types
export interface LogEntry {
    id: string;
    timestamp: string;
    level: 'debug' | 'info' | 'warn' | 'error' | 'fatal';
    component: string;
    message: string;
    details?: any;
    userId?: string;
    ip?: string;
    method?: string;
    url?: string;
    statusCode?: number;
    duration?: number;
}

export interface LogLevel {
    component: string;
    level: 'debug' | 'info' | 'warn' | 'error' | 'fatal';
    enabled: boolean;
}

export interface ComponentInfo {
    name: string;
    icon: React.ReactNode;
    description: string;
    logCount: number;
    lastActivity: string;
}

export interface LogStats {
    debug: number;
    info: number;
    warn: number;
    error: number;
    fatal: number;
    total: number;
}
