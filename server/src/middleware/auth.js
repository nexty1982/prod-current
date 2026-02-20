// server/middleware/auth.js - Enhanced Session and JWT Authentication Middleware
const jwt = require("jsonwebtoken");

const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || "change_me_access_256bit";

const authMiddleware = (req, res, next) => {
  // IMMEDIATE BYPASS - Health and maintenance endpoints
  const path = req.path;
  
  if (
    path === '/api/system/health' ||
    path === '/api/maintenance/status'
  ) {
    return next();
  }

  const hasOMSession = req.headers.cookie?.includes('orthodoxmetrics.sid=');

  // Log raw cookie to debug session persistence
  const rawCookie = req.headers.cookie || '';
  const sidMatch = rawCookie.match(/orthodoxmetrics\.sid=([^;]+)/);
  console.log('🔐 Auth middleware - Session ID:', req.sessionID);
  console.log('🔐 Auth middleware - Raw SID cookie:', sidMatch ? sidMatch[1].substring(0, 40) + '...' : 'NONE');
  console.log('🔐 Auth middleware - User:', req.session?.user?.email);
  console.log('🔐 Auth middleware - Method:', req.method, req.originalUrl);
  console.log('🔐 Cookie check for orthodoxmetrics.sid:', hasOMSession);

  // Enhanced debugging for session persistence issues
  if (req.sessionID) {
    console.log('🔐 Session cookie received:', !!req.headers.cookie);
    console.log('�� Session store available:', !!req.sessionStore);

    // Check if session exists in store
    if (req.sessionStore && req.session) {
      console.log('🔐 Session data exists:', Object.keys(req.session));
      console.log('🔐 Session user data:', req.session.user ? 'PRESENT' : 'MISSING');
    }
  }

  // Check session-based authentication first
  // CRITICAL: Ensure session exists and has user data
  if (req.session && req.session.user && req.session.user.id) {
    // Verify session hasn't expired
    if (req.session.expires && new Date() > new Date(req.session.expires)) {
      console.log('❌ Session expired');
      req.session.destroy();
      return res.status(401).json({
        error: 'Session expired',
        code: 'SESSION_EXPIRED'
      });
    }

    // Check account expiration
    if (req.session.user.account_expires_at && new Date(req.session.user.account_expires_at) < new Date()) {
      console.log('❌ Account expired for:', req.session.user.email);
      return res.status(401).json({
        error: 'Account expired',
        code: 'ACCOUNT_EXPIRED',
        message: 'Your account has expired. Please contact an administrator.'
      });
    }

    // Update last activity
    req.session.lastActivity = new Date();

    // Set req.user from session for compatibility with routes expecting req.user
    req.user = req.session.user;

    console.log('✅ Session authentication successful for:', req.session.user.email);
    return next();
  }

  // Check JWT-based authentication
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    try {
      const token = authHeader.substring(7);
      const decoded = jwt.verify(token, JWT_ACCESS_SECRET);
      
      // Add user info to req for compatibility
      req.user = {
        id: decoded.userId,
        email: decoded.email,
        role: decoded.role,
        church_id: decoded.churchId
      };
      
      console.log('✅ JWT authentication successful for:', decoded.email);
      return next();
    } catch (jwtError) {
      console.log("🔐 Invalid JWT token:", jwtError.message);
    }
  }

  // No valid authentication found
  console.log('❌ No valid session or JWT token found');

  // Enhanced debugging for session issues
  const debugInfo = {
    sessionExists: !!req.session,
    sessionID: req.sessionID,
    hasUserData: !!req.session?.user,
    sessionKeys: req.session ? Object.keys(req.session) : [],
    cookieHeader: !!req.headers.cookie,
    userAgent: req.headers['user-agent']?.substring(0, 50),
    timestamp: new Date().toISOString()
  };

  console.log('🔍 Session debug info:', debugInfo);

  return res.status(401).json({
    error: 'Authentication required',
    code: 'NO_SESSION',
    debug: process.env.NODE_ENV === 'development' ? debugInfo : undefined
  });
};

// Optional authentication - doesn't reject if no auth
const optionalAuth = (req, res, next) => {
  const hasOMSession = req.headers.cookie?.includes('orthodoxmetrics.sid=');

  // Check session-based authentication
  if (req.session && req.session.user) {
    // Set req.user from session for compatibility
    req.user = req.session.user;
    console.log('✅ Optional session auth found');
    return next();
  }

  // Check JWT-based authentication
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    try {
      const token = authHeader.substring(7);
      const decoded = jwt.verify(token, JWT_ACCESS_SECRET);
      
      req.user = {
        id: decoded.userId,
        email: decoded.email,
        role: decoded.role,
        church_id: decoded.churchId
      };
      
      console.log('✅ Optional JWT auth found for:', decoded.email);
      return next();
    } catch (jwtError) {
      console.log("🔐 Optional JWT check - Invalid token:", jwtError.message);
    }
  }

  // No authentication found but that's OK for optional auth
  console.log('ℹ️ No authentication found (optional)');
  next();
};

// Role-based authentication
const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    // First run authentication
    authMiddleware(req, res, (err) => {
      if (err) return next(err);

      // Check user role from session or JWT
      const userRole = req.session?.user?.role || req.user?.role;
      
      if (!userRole) {
        return res.status(401).json({
          error: 'Authentication required for role check',
          code: 'NO_ROLE'
        });
      }

      if (!allowedRoles.includes(userRole)) {
        return res.status(403).json({
          error: 'Insufficient permissions',
          code: 'INSUFFICIENT_ROLE',
          required: allowedRoles,
          current: userRole
        });
      }

      next();
    });
  };
};

// Session validation middleware
const validateSession = (req, res, next) => {
  if (req.session && req.session.user) {
    // Update last activity
    req.session.lastActivity = new Date();
    
    // Check if session should be renewed
    const sessionAge = Date.now() - new Date(req.session.cookie.originalMaxAge).getTime();
    const renewThreshold = 30 * 60 * 1000; // 30 minutes

    if (sessionAge > renewThreshold) {
      // Extend session
      req.session.cookie.maxAge = 8 * 60 * 60 * 1000; // 8 hours
      console.log('🔄 Session extended for user:', req.session.user.email);
    }
  }
  
  next();
};

// Session regeneration handler
const handleSessionRegeneration = (req, res, next) => {
  if (!req.session) {
    return next();
  }

  // Override regenerate to prevent timing issues
  req.session.regenerate = function(callback) {
    console.log('🔄 Session regeneration called - preventing to avoid timing issues');

    // Instead of regenerating, just call the callback
    if (callback) {
      setImmediate(callback);
    }
  };

  next();
};

// ============================================================================
// AUTH-OPTIONAL PATHS - For logging and documentation
// ============================================================================
// These paths bypass authentication checks for system health monitoring.
// They are defined at the top of authMiddleware for early exit.
const AUTH_OPTIONAL_PATHS = [
  '/api/system/health',
  '/api/maintenance/status'
];

// Log auth-optional paths at startup (DEBUG level)
// This helps document which endpoints don't require authentication
const logAuthConfiguration = () => {
  if (process.env.NODE_ENV === 'development' || process.env.DEBUG) {
    console.log('🔓 [AUTH CONFIG] Auth-optional paths configured:');
    AUTH_OPTIONAL_PATHS.forEach(path => {
      console.log(`   - ${path}`);
    });
    console.log('   → These endpoints bypass session and JWT checks for monitoring');
  }
};

// Export configuration for startup logging
module.exports = {
  authMiddleware,
  optionalAuth,
  requireAuth: authMiddleware,
  requireRole,
  validateSession,
  handleSessionRegeneration,
  AUTH_OPTIONAL_PATHS,
  logAuthConfiguration
};
