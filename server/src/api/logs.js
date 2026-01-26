const { getAppPool } = require('../../config/db-compat');
const express = require('express');
const router = express.Router();
const winston = require('winston');
const fs = require('fs');
const path = require('path');
const { dbLogger, info, warn, error, debug } = require('../utils/dbLogger');

// Database-backed Winston transport
class DatabaseTransport extends winston.Transport {
  constructor(opts = {}) {
    super(opts);
    this.source = opts.source || 'winston';
    this.service = opts.service || 'logging';
  }

  log(info, callback) {
    setImmediate(() => {
      this.emit('logged', info);
    });

    // Map Winston levels to our database logger levels
    const levelMap = {
      error: 'ERROR',
      warn: 'WARN', 
      info: 'INFO',
      debug: 'DEBUG',
      verbose: 'DEBUG',
      silly: 'DEBUG'
    };

    const dbLevel = levelMap[info.level] || 'INFO';
    
    // Extract metadata
    const { message, level, timestamp, ...meta } = info;
    
    // Log to database
    dbLogger.log(
      dbLevel,
      this.source,
      message,
      meta,
      meta.user_email || null,
      this.service
    ).catch(err => {
      console.error('Database logging failed:', err);
    });

    callback();
  }
}

// Initialize winston logger with database transport
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
    ),
    transports: [
        new DatabaseTransport({ source: 'main-logger', service: 'logging' }),
        new winston.transports.Console({
            format: winston.format.simple()
        })
    ]
});

// Component-specific loggers using database transport
const componentLoggers = {
    'Authentication': winston.createLogger({
        level: 'info',
        format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json()
        ),
        transports: [
            new DatabaseTransport({ source: 'Authentication', service: 'auth' }),
            new winston.transports.Console()
        ]
    }),
    'Database': winston.createLogger({
        level: 'info',
        format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json()
        ),
        transports: [
            new DatabaseTransport({ source: 'Database', service: 'database' }),
            new winston.transports.Console()
        ]
    }),
    'API Server': winston.createLogger({
        level: 'info',
        format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json()
        ),
        transports: [
            new DatabaseTransport({ source: 'API Server', service: 'api' }),
            new winston.transports.Console()
        ]
    }),
    'Email Service': winston.createLogger({
        level: 'info',
        format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json()
        ),
        transports: [
            new DatabaseTransport({ source: 'Email Service', service: 'email' }),
            new winston.transports.Console()
        ]
    }),
    'File Upload': winston.createLogger({
        level: 'info',
        format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json()
        ),
        transports: [
            new DatabaseTransport({ source: 'File Upload', service: 'upload' }),
            new winston.transports.Console()
        ]
    })
};

// In-memory storage for recent logs (for real-time streaming)
const recentLogs = [];
const MAX_RECENT_LOGS = 1000;

// Store for component log levels
const componentLogLevels = {
    'Authentication': { level: 'info', enabled: true },
    'Database': { level: 'info', enabled: true },
    'API Server': { level: 'info', enabled: true },
    'Email Service': { level: 'info', enabled: true },
    'File Upload': { level: 'info', enabled: true }
};

// Helper function to add log to recent logs (now from database)
async function addToRecentLogs(logEntry) {
    recentLogs.push(logEntry);
    if (recentLogs.length > MAX_RECENT_LOGS) {
        recentLogs.shift();
    }
    
    // Also log to database
    await info('LogsAPI', 'Log entry added', logEntry, null, 'logs-api');
}

// Helper function to create log entry
function createLogEntry(level, component, message, details = null, req = null) {
    const logEntry = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        timestamp: new Date().toISOString(),
        level,
        component,
        message,
        details,
        userId: req?.user?.id || null,
        ip: req?.ip || null,
        method: req?.method || null,
        url: req?.originalUrl || null,
        statusCode: null,
        duration: null
    };

    addToRecentLogs(logEntry);
    return logEntry;
}

// Custom logging function
function logMessage(level, component, message, details = null, req = null) {
    const componentConfig = componentLogLevels[component];
    if (!componentConfig || !componentConfig.enabled) {
        return;
    }

    const logEntry = createLogEntry(level, component, message, details, req);

    // Log to component-specific logger
    if (componentLoggers[component]) {
        componentLoggers[component].log(level, message, { ...logEntry });
    }

    // Log to main logger
    logger.log(level, message, { ...logEntry });
}

// GET /api/logs/database - Get logs from database with advanced filtering
router.get('/database', async (req, res) => {
    try {
        const {
            level,
            source,
            service,
            user_email,
            start_date,
            end_date,
            limit = 100,
            offset = 0,
            search,
            sort = 'desc'
        } = req.query;

        const filters = {
            level: level && level !== 'ALL' ? level : null,
            source,
            service,
            user_email,
            startDate: start_date ? new Date(start_date) : null,
            endDate: end_date ? new Date(end_date) : null,
            limit: Math.min(parseInt(limit), 1000), // Cap at 1000
            offset: parseInt(offset),
            sort: sort === 'asc' ? 'asc' : 'desc'
        };

        let logs = await dbLogger.getLogs(filters, req.useOmaiDatabase);

        // Apply search filter if provided
        if (search) {
            const searchLower = search.toLowerCase();
            logs = logs.filter(log => 
                log.message.toLowerCase().includes(searchLower) ||
                log.source.toLowerCase().includes(searchLower) ||
                (log.service && log.service.toLowerCase().includes(searchLower))
            );
        }

        // Add occurrence count for similar messages (for historical view)
        if (req.query.group_similar === 'true') {
            const groupedLogs = new Map();
            logs.forEach(log => {
                const key = `${log.level}-${log.source}-${log.message.substring(0, 100)}`;
                if (groupedLogs.has(key)) {
                    const existing = groupedLogs.get(key);
                    existing.occurrence_count = (existing.occurrence_count || 1) + 1;
                    existing.latest_timestamp = log.timestamp > existing.latest_timestamp ? log.timestamp : existing.latest_timestamp;
                } else {
                    groupedLogs.set(key, {
                        ...log,
                        occurrence_count: 1,
                        latest_timestamp: log.timestamp
                    });
                }
            });
            logs = Array.from(groupedLogs.values()).sort((a, b) => 
                sort === 'asc' 
                    ? new Date(a.latest_timestamp).getTime() - new Date(b.latest_timestamp).getTime()
                    : new Date(b.latest_timestamp).getTime() - new Date(a.latest_timestamp).getTime()
            );
        }

        res.json({
            logs,
            pagination: {
                total: logs.length,
                limit: filters.limit,
                offset: filters.offset
            },
            filters: {
                level,
                source,
                service,
                user_email,
                start_date,
                end_date,
                search,
                sort
            }
        });

    } catch (logError) {
        console.error('Failed to fetch database logs:', logError);
        res.status(500).json({ 
            error: 'Failed to fetch database logs',
            message: logError.message
        });
    }
});

// GET /api/logs/database/critical - Get critical events (errors with specific patterns)
router.get('/database/critical', async (req, res) => {
    try {
        const { limit = 20 } = req.query;
        
        // Get recent errors that match critical patterns
        const criticalLogs = await dbLogger.getLogs({
            level: 'ERROR',
            limit: Math.min(parseInt(limit), 100),
            startDate: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
        }, req.useOmaiDatabase);

        // Filter for critical patterns
        const criticalEvents = criticalLogs.filter(log => {
            const message = log.message.toLowerCase();
            return (
                message.includes('failed') ||
                message.includes('critical') ||
                message.includes('security') ||
                message.includes('breach') ||
                message.includes('unauthorized') ||
                message.includes('timeout') ||
                message.includes('connection') ||
                message.includes('payment')
            );
        }).map(log => ({
            ...log,
            severity: log.message.toLowerCase().includes('critical') || 
                     log.message.toLowerCase().includes('security') ? 'high' : 'medium'
        }));

        res.json({
            events: criticalEvents,
            count: criticalEvents.length,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Failed to fetch critical events:', error);
        res.status(500).json({ 
            error: 'Failed to fetch critical events',
            message: error.message
        });
    }
});

// GET /api/logs/database/stats - Get log statistics
router.get('/database/stats', async (req, res) => {
    try {
        const { promisePool } = require('../../config/db-compat');
        
        // Get basic statistics
        const [levelStats] = await getAppPool().query(`
            SELECT level, COUNT(*) as count 
            FROM system_logs 
            WHERE timestamp >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
            GROUP BY level
        `);

        const [serviceStats] = await getAppPool().query(`
            SELECT service, COUNT(*) as count 
            FROM system_logs 
            WHERE timestamp >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
            AND service IS NOT NULL
            GROUP BY service
            ORDER BY count DESC
            LIMIT 10
        `);

        const [totalLogs] = await getAppPool().query(`
            SELECT COUNT(*) as total FROM system_logs
        `);

        const [recentErrors] = await getAppPool().query(`
            SELECT COUNT(*) as count
            FROM system_logs 
            WHERE level = 'ERROR' 
            AND timestamp >= DATE_SUB(NOW(), INTERVAL 1 HOUR)
        `);

        const [errorTrends] = await getAppPool().query(`
            SELECT 
                DATE_FORMAT(timestamp, '%Y-%m-%d %H:00:00') as hour,
                COUNT(*) as error_count
            FROM system_logs 
            WHERE level = 'ERROR' 
            AND timestamp >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
            GROUP BY DATE_FORMAT(timestamp, '%Y-%m-%d %H:00:00')
            ORDER BY hour DESC
        `);

        res.json({
            summary: {
                totalLogs: totalLogs[0].total,
                recentErrors: recentErrors[0].count,
                timeRange: '24 hours'
            },
            levelDistribution: levelStats,
            topServices: serviceStats,
            errorTrends: errorTrends
        });

    } catch (statsError) {
        console.error('Failed to fetch log statistics:', statsError);
        res.status(500).json({ 
            error: 'Failed to fetch log statistics',
            message: statsError.message
        });
    }
});

// POST /api/logs/database/cleanup - Clean up old logs (superadmin only)
router.post('/database/cleanup', async (req, res) => {
    try {
        // Role gating - only superadmin can cleanup logs
        if (!req.user || req.user.role !== 'super_admin') {
            return res.status(403).json({ 
                error: 'Insufficient permissions',
                message: 'Only super administrators can clean up logs'
            });
        }

        const { days_to_keep = 30, cutoff_date } = req.body;
        
        let deletedCount;
        let cutoffDate;

        if (cutoff_date) {
            // Use specific cutoff date
            cutoffDate = new Date(cutoff_date);
            if (isNaN(cutoffDate.getTime())) {
                return res.status(400).json({
                    error: 'Invalid cutoff_date format',
                    message: 'Please provide a valid ISO date string'
                });
            }
        } else {
            // Use days to keep
            cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - days_to_keep);
        }

        // Execute cleanup
        const { promisePool } = require('../../config/db-compat');
        const [result] = await getAppPool().query(
            'DELETE FROM system_logs WHERE timestamp < ?',
            [cutoffDate]
        );
        
        deletedCount = result.affectedRows;

        // Create audit record of cleanup
        await info('LogsAPI', 'Log cleanup executed', {
            deletedCount,
            cutoffDate: cutoffDate.toISOString(),
            daysKept: days_to_keep,
            executedBy: req.user.email,
            requestId: req.requestId
        }, req.user, 'logs-api');

        res.json({
            success: true,
            message: 'Log cleanup completed successfully',
            deletedCount,
            cutoffDate: cutoffDate.toISOString(),
            daysKept: days_to_keep
        });

    } catch (cleanupError) {
        console.error('Failed to cleanup logs:', cleanupError);
        res.status(500).json({ 
            error: 'Failed to cleanup logs',
            message: cleanupError.message
        });
    }
});

// GET /api/logs - Get recent logs (legacy in-memory)
router.get('/', (req, res) => {
    try {
        const {
            component,
            level,
            limit = 100,
            offset = 0,
            search
        } = req.query;

        let filteredLogs = [...recentLogs];

        // Filter by component
        if (component && component !== 'all') {
            filteredLogs = filteredLogs.filter(log => log.component === component);
        }

        // Filter by level
        if (level && level !== 'all') {
            filteredLogs = filteredLogs.filter(log => log.level === level);
        }

        // Search filter
        if (search) {
            const searchLower = search.toLowerCase();
            filteredLogs = filteredLogs.filter(log =>
                log.message.toLowerCase().includes(searchLower) ||
                log.component.toLowerCase().includes(searchLower)
            );
        }

        // Sort by timestamp (newest first)
        filteredLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        // Pagination
        const total = filteredLogs.length;
        const paginatedLogs = filteredLogs.slice(
            parseInt(offset),
            parseInt(offset) + parseInt(limit)
        );

        res.json({
            logs: paginatedLogs,
            total,
            offset: parseInt(offset),
            limit: parseInt(limit)
        });
    } catch (error) {
        logger.error('Error fetching logs', { error: error.message, stack: error.stack });
        res.status(500).json({ error: 'Failed to fetch logs' });
    }
});

// GET /api/logs/stream - Server-Sent Events endpoint for real-time logs
router.get('/stream', (req, res) => {
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control'
    });

    const { component, level } = req.query;
    let lastLogId = recentLogs.length > 0 ? recentLogs[recentLogs.length - 1].id : null;

    // Send initial connection message
    res.write(`data: ${JSON.stringify({ type: 'connected', timestamp: new Date().toISOString() })}\n\n`);

    const streamInterval = setInterval(() => {
        // Find new logs since last sent
        const lastIndex = lastLogId ? recentLogs.findIndex(log => log.id === lastLogId) : -1;
        const newLogs = lastIndex >= 0 ? recentLogs.slice(lastIndex + 1) : recentLogs.slice(-10);

        let filteredNewLogs = newLogs;

        // Apply filters
        if (component && component !== 'all') {
            filteredNewLogs = filteredNewLogs.filter(log => log.component === component);
        }

        if (level && level !== 'all') {
            filteredNewLogs = filteredNewLogs.filter(log => log.level === level);
        }

        // Send new logs
        if (filteredNewLogs.length > 0) {
            filteredNewLogs.forEach(log => {
                res.write(`data: ${JSON.stringify({ type: 'log', data: log })}\n\n`);
            });
            lastLogId = filteredNewLogs[filteredNewLogs.length - 1].id;
        }
    }, 2000); // Send updates every 2 seconds

    // Clean up on client disconnect
    req.on('close', () => {
        clearInterval(streamInterval);
        res.end();
    });
});

// GET /api/logs/components - Get available log components
router.get('/components', (req, res) => {
    try {
        const components = ['all', 'Authentication', 'Database', 'API Server', 'Email', 'File System', 'Cache', 'External API', 'Frontend', 'Other'];
        res.json({ components });
    } catch (error) {
        logger.error('Error fetching log components', { error: error.message, stack: error.stack });
        res.status(500).json({ error: 'Failed to fetch log components' });
    }
});

// GET /api/logs/components - Get component log levels
router.get('/components', (req, res) => {
    try {
        const components = Object.keys(componentLogLevels).map(componentName => ({
            name: componentName,
            level: componentLogLevels[componentName].level,
            enabled: componentLogLevels[componentName].enabled,
            logCount: recentLogs.filter(log => log.component === componentName).length,
            lastActivity: recentLogs
                .filter(log => log.component === componentName)
                .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0]?.timestamp || null
        }));

        res.json({ components });
    } catch (error) {
        logger.error('Error fetching component log levels', { error: error.message, stack: error.stack });
        res.status(500).json({ error: 'Failed to fetch component log levels' });
    }
});

// PUT /api/logs/components/:component/level - Update component log level
router.put('/components/:component/level', (req, res) => {
    try {
        const { component } = req.params;
        const { level } = req.body;

        if (!componentLogLevels[component]) {
            return res.status(404).json({ error: 'Component not found' });
        }

        const validLevels = ['debug', 'info', 'warn', 'error', 'fatal'];
        if (!validLevels.includes(level)) {
            return res.status(400).json({ error: 'Invalid log level' });
        }

        componentLogLevels[component].level = level;

        // Update the actual logger level
        if (componentLoggers[component]) {
            componentLoggers[component].level = level;
        }

        logMessage('info', 'API Server', `Log level updated for ${component}`, {
            component,
            newLevel: level
        }, req);

        res.json({
            message: `Log level updated for ${component}`,
            component,
            level
        });
    } catch (error) {
        logger.error('Error updating component log level', { error: error.message, stack: error.stack });
        res.status(500).json({ error: 'Failed to update component log level' });
    }
});

// PUT /api/logs/components/:component/toggle - Toggle component logging
router.put('/components/:component/toggle', (req, res) => {
    try {
        const { component } = req.params;

        if (!componentLogLevels[component]) {
            return res.status(404).json({ error: 'Component not found' });
        }

        componentLogLevels[component].enabled = !componentLogLevels[component].enabled;

        logMessage('info', 'API Server', `Logging ${componentLogLevels[component].enabled ? 'enabled' : 'disabled'} for ${component}`, {
            component,
            enabled: componentLogLevels[component].enabled
        }, req);

        res.json({
            message: `Logging ${componentLogLevels[component].enabled ? 'enabled' : 'disabled'} for ${component}`,
            component,
            enabled: componentLogLevels[component].enabled
        });
    } catch (error) {
        logger.error('Error toggling component logging', { error: error.message, stack: error.stack });
        res.status(500).json({ error: 'Failed to toggle component logging' });
    }
});

// GET /api/logs/component/:component - Get logs for specific component
router.get('/component/:component', (req, res) => {
    try {
        const { component } = req.params;
        const { limit = 100, offset = 0 } = req.query;

        const componentLogs = recentLogs
            .filter(log => log.component === component)
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        const total = componentLogs.length;
        const paginatedLogs = componentLogs.slice(
            parseInt(offset),
            parseInt(offset) + parseInt(limit)
        );

        res.json({
            logs: paginatedLogs,
            total,
            offset: parseInt(offset),
            limit: parseInt(limit),
            component
        });
    } catch (error) {
        logger.error('Error fetching component logs', { error: error.message, stack: error.stack });
        res.status(500).json({ error: 'Failed to fetch component logs' });
    }
});

// DELETE /api/logs - Clear all logs
router.delete('/', (req, res) => {
    try {
        recentLogs.length = 0;

        logMessage('info', 'API Server', 'All logs cleared', {
            action: 'clear_logs'
        }, req);

        res.json({ message: 'All logs cleared successfully' });
    } catch (error) {
        logger.error('Error clearing logs', { error: error.message, stack: error.stack });
        res.status(500).json({ error: 'Failed to clear logs' });
    }
});

// POST /api/logs/test - Generate test logs (for development/testing)
router.post('/test', (req, res) => {
    try {
        const { count = 10, component = 'API Server' } = req.body;

        const levels = ['debug', 'info', 'warn', 'error'];
        const messages = [
            'User authentication successful',
            'Database query executed',
            'API request processed',
            'Email notification sent',
            'File upload completed',
            'File processing finished',
            'Cache updated',
            'Session created',
            'Data validation passed',
            'Background task completed'
        ];

        for (let i = 0; i < count; i++) {
            const level = levels[Math.floor(Math.random() * levels.length)];
            const message = messages[Math.floor(Math.random() * messages.length)];

            logMessage(level, component, message, {
                test: true,
                iteration: i + 1
            }, req);
        }

        res.json({
            message: `Generated ${count} test logs for ${component}`
        });
    } catch (error) {
        logger.error('Error generating test logs', { error: error.message, stack: error.stack });
        res.status(500).json({ error: 'Failed to generate test logs' });
    }
});

// POST /api/logs/frontend - Frontend logging endpoint
router.post('/frontend', (req, res) => {
    try {
        const {
            level,
            component,
            message,
            details,
            userAction,
            timestamp,
            sessionId,
            userId,
            userAgent,
            url
        } = req.body;

        if (!level || !component || !message) {
            return res.status(400).json({ error: 'Missing required fields: level, component, message' });
        }

        // Create enhanced log entry with frontend data
        const logEntry = createLogEntry(level, component, message, {
            ...details,
            userAction,
            sessionId,
            userAgent,
            url,
            source: 'frontend'
        }, req);

        // Override userId if provided from frontend
        if (userId) {
            logEntry.userId = userId;
        }

        res.json({ success: true, logId: logEntry.id });
    } catch (error) {
        logger.error('Error processing frontend log', { error: error.message, stack: error.stack });
        res.status(500).json({ error: 'Failed to process frontend log' });
    }
});

// Client-side error logging endpoint (for Error Boundaries)
router.post('/client-errors', (req, res) => {
    try {
        const { error, errorInfo, userAgent, timestamp, userId, componentStack, url } = req.body;
        
        const logEntry = createLogEntry('error', 'ErrorBoundary', error?.message || 'Client-side error', {
            errorName: error?.name,
            errorStack: error?.stack,
            componentStack,
            userAgent,
            url,
            source: 'error-boundary',
            userId: userId || (req.session?.user?.id),
            sessionId: req.session?.id,
            timestamp: timestamp || new Date().toISOString()
        }, req);

        console.error('CLIENT ERROR BOUNDARY:', {
            userId: logEntry.userId,
            message: error?.message,
            url,
            timestamp: logEntry.timestamp
        });

        res.json({ success: true, logged: true, logId: logEntry.id });
    } catch (err) {
        logger.error('Failed to log client error boundary', { error: err.message, stack: err.stack });
        res.status(500).json({ error: 'Failed to log error' });
    }
});

// Admin-specific error logging endpoint (for AdminErrorBoundary)
router.post('/admin-errors', (req, res) => {
    try {
        const { error, errorInfo, userAgent, timestamp, userId, componentStack, url, adminAction } = req.body;
        
        // Enhanced logging for admin errors
        const logEntry = createLogEntry('error', 'AdminErrorBoundary', error?.message || 'Admin-side error', {
            errorName: error?.name,
            errorStack: error?.stack,
            componentStack,
            userAgent,
            url,
            adminAction,
            userRole: req.session?.user?.role,
            source: 'admin-error-boundary',
            userId: userId || (req.session?.user?.id),
            sessionId: req.session?.id,
            timestamp: timestamp || new Date().toISOString(),
            priority: 'high'
        }, req);

        console.error('ADMIN ERROR BOUNDARY:', {
            userId: logEntry.userId,
            userRole: req.session?.user?.role,
            message: error?.message,
            adminAction,
            url,
            timestamp: logEntry.timestamp
        });

        res.json({ success: true, logged: true, logId: logEntry.id, priority: 'high' });
    } catch (err) {
        logger.error('Failed to log admin error boundary', { error: err.message, stack: err.stack });
        res.status(500).json({ error: 'Failed to log error' });
    }
});

// GET admin errors (for retrieving admin error logs)
router.get('/admin-errors', (req, res) => {
    try {
        // Return empty array for now - this prevents 404 errors
        // In the future, this could return actual admin error logs from the database
        res.json({ 
            success: true, 
            errors: [],
            message: 'Admin error logs endpoint (not yet implemented)' 
        });
    } catch (err) {
        console.error('Failed to fetch admin errors:', err);
        res.status(500).json({ error: 'Failed to fetch admin errors' });
    }
});

// Export the logger functions for use in other parts of the application
module.exports = {
    router,
    logger,
    componentLoggers,
    logMessage,
    createLogEntry
};
