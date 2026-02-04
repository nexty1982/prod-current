/**
 * Rate Limiting Middleware for Interactive Reports
 * Protects public endpoints from abuse
 */

// Simple in-memory rate limiter (use Redis in production)
const requestCounts = new Map();

function createRateLimiter(options) {
  const { windowMs, maxRequests, keyGenerator = (req) => req.ip || 'unknown' } = options;

  return (req, res, next) => {
    const key = keyGenerator(req);
    const now = Date.now();
    const record = requestCounts.get(key);

    // Clean up old entries periodically
    if (Math.random() < 0.01) {
      // 1% chance to clean up
      for (const [k, v] of requestCounts.entries()) {
        if (v.resetAt < now) {
          requestCounts.delete(k);
        }
      }
    }

    if (!record || record.resetAt < now) {
      // New window
      requestCounts.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    if (record.count >= maxRequests) {
      return res.status(429).json({
        error: 'Too many requests',
        message: `Rate limit exceeded. Maximum ${maxRequests} requests per ${windowMs / 1000} seconds.`,
        retryAfter: Math.ceil((record.resetAt - now) / 1000),
      });
    }

    record.count++;
    next();
  };
}

// Rate limiters for specific endpoints
const recipientGetLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 60, // 60 requests per minute
});

const recipientSubmitLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 10, // 10 requests per minute
  keyGenerator: (req) => {
    // Rate limit by IP + token
    const token = req.params.token || '';
    return `${req.ip || 'unknown'}_${token.substring(0, 8)}`;
  },
});

module.exports = {
  createRateLimiter,
  recipientGetLimiter,
  recipientSubmitLimiter,
};
