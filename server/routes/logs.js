const express = require('express');
const router = express.Router();
const winston = require('winston');
const fs = require('fs');
const path = require('path');

// Initialize winston logger with multiple transports
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
    ),
    transports: [
        new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
        new winston.transports.File({ filename: 'logs/combined.log' }),
        new winston.transports.Console({
            format: winston.format.simple()
        })
    ]
});

// Component-specific loggers
const componentLoggers = {
    'Authentication': winston.createLogger({
        level: 'info',
        format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json()
        ),
        transports: [
            new winston.transports.File({ filename: 'logs/auth.log' }),
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
            new winston.transports.File({ filename: 'logs/database.log' }),
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
            new winston.transports.File({ filename: 'logs/api.log' }),
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
            new winston.transports.File({ filename: 'logs/email.log' }),
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
            new winston.transports.File({ filename: 'logs/upload.log' }),
            new winston.transports.Console()
        ]
    }),
    'OCR Service': winston.createLogger({
        level: 'info',
        format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json()
        ),
        transports: [
            new winston.transports.File({ filename: 'logs/ocr.log' }),
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
    'File Upload': { level: 'info', enabled: true },
    'OCR Service': { level: 'info', enabled: true }
};

// Helper function to add log to recent logs
function addToRecentLogs(logEntry) {
    recentLogs.push(logEntry);
    if (recentLogs.length > MAX_RECENT_LOGS) {
        recentLogs.shift();
    }
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

// GET /api/logs - Get recent logs
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
            'OCR processing finished',
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

// Export the logger functions for use in other parts of the application
module.exports = {
    router,
    logger,
    componentLoggers,
    logMessage,
    createLogEntry
};
