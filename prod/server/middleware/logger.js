const { logMessage } = require('../src/api/logs');

// Middleware to log all API requests
const requestLogger = (req, res, next) => {
    const startTime = Date.now();

    // Log the incoming request
    logMessage('info', 'API Server', `${req.method} ${req.originalUrl}`, {
        method: req.method,
        url: req.originalUrl,
        userAgent: req.get('User-Agent'),
        ip: req.ip,
        timestamp: new Date().toISOString()
    }, req);

    // Override res.end to log the response
    const originalEnd = res.end;
    res.end = function (chunk, encoding) {
        const duration = Date.now() - startTime;

        logMessage('info', 'API Server', `${req.method} ${req.originalUrl} - ${res.statusCode}`, {
            method: req.method,
            url: req.originalUrl,
            statusCode: res.statusCode,
            duration: duration,
            timestamp: new Date().toISOString()
        }, req);

        originalEnd.call(this, chunk, encoding);
    };

    next();
};

// Middleware to log authentication events
const authLogger = (eventType, details, req) => {
    logMessage('info', 'Authentication', `${eventType}`, details, req);
};

// Middleware to log database operations
const dbLogger = (operation, details) => {
    logMessage('debug', 'Database', `${operation}`, details);
};

// Middleware to log email operations
const emailLogger = (operation, details) => {
    logMessage('info', 'Email Service', `${operation}`, details);
};

// Middleware to log file upload operations
const uploadLogger = (operation, details, req) => {
    logMessage('info', 'File Upload', `${operation}`, details, req);
};

// Middleware to log OCR operations
const ocrLogger = (operation, details, req) => {
    logMessage('info', 'OCR Service', `${operation}`, details, req);
};

// Error logging middleware
const errorLogger = (err, req, res, next) => {
    logMessage('error', 'API Server', `Error: ${err.message}`, {
        error: err.message,
        stack: err.stack,
        method: req.method,
        url: req.originalUrl,
        timestamp: new Date().toISOString()
    }, req);

    next(err);
};

module.exports = {
    requestLogger,
    authLogger,
    dbLogger,
    emailLogger,
    uploadLogger,
    ocrLogger,
    errorLogger
};
