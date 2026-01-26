/**
 * Global API Error Handler Middleware
 * 
 * Ensures all /api/* routes return JSON error responses instead of HTML.
 * Logs structured error information for debugging.
 * 
 * This middleware MUST be registered AFTER all routes.
 */

const apiErrorHandler = (err, req, res, next) => {
  // Only handle errors for API routes
  if (!req.path.startsWith('/api/')) {
    return next(err);
  }

  // Extract error information
  const statusCode = err.statusCode || err.status || 500;
  const errorMessage = err.message || 'Internal Server Error';
  const errorCode = err.code || 'INTERNAL_ERROR';
  
  // Get user information for logging
  const userId = req.user?.id || req.session?.user?.id || 'anonymous';
  const userEmail = req.user?.email || req.session?.user?.email || 'unknown';
  const churchId = req.params?.id || req.params?.churchId || req.body?.churchId || 'N/A';

  // Structured error logging
  const errorLog = {
    timestamp: new Date().toISOString(),
    method: req.method,
    path: req.path,
    statusCode,
    error: {
      message: errorMessage,
      code: errorCode,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    },
    user: {
      id: userId,
      email: userEmail,
      role: req.user?.role || req.session?.user?.role || 'unknown'
    },
    churchId,
    requestId: req.id || req.headers['x-request-id'] || 'N/A'
  };

  // Log error with appropriate level
  if (statusCode >= 500) {
    console.error('❌ API Server Error:', errorLog);
  } else {
    console.warn('⚠️  API Client Error:', errorLog);
  }

  // Always return JSON for API routes
  res.status(statusCode).json({
    success: false,
    error: errorMessage,
    code: errorCode,
    ...(process.env.NODE_ENV === 'development' && {
      details: err.details || err.stack,
      path: req.path,
      method: req.method
    })
  });
};

module.exports = apiErrorHandler;

