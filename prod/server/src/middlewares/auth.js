// server/middleware/auth.js - Enhanced Session Authentication Middleware

const authMiddleware = (req, res, next) => {
const hasOMSession = req.headers.cookie?.includes('orthodoxmetrics.sid=');

  console.log('🔐 Auth middleware - Session ID:', req.sessionID);
  console.log('🔐 Auth middleware - User:', req.session?.user?.email);
  console.log('🔐 Auth middleware - Method:', req.method, req.originalUrl);
  console.log('🔐 Cookie check for orthodoxmetrics.sid:', hasOMSession);
  
  // Enhanced debugging for session persistence issues
  if (req.sessionID) {
    console.log('🔐 Session cookie received:', !!req.headers.cookie);
    console.log('🔐 Session store available:', !!req.sessionStore);
    
    // Check if session exists in store
    if (req.sessionStore && req.session) {
      console.log('🔐 Session data exists:', Object.keys(req.session));
      console.log('🔐 Session user data:', req.session.user ? 'PRESENT' : 'MISSING');
    }
  }
  
  // Check if session exists and has user
  if (!req.session || !req.session.user) {
    console.log('❌ No valid session found');
    
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
  }

  // Verify session hasn't expired
  if (req.session.expires && new Date() > new Date(req.session.expires)) {
    console.log('❌ Session expired');
    req.session.destroy();
    return res.status(401).json({ 
      error: 'Session expired',
      code: 'SESSION_EXPIRED'
    });
  }

  // Verify user data integrity
  if (!req.session.user.id || !req.session.user.email || !req.session.user.role) {
    console.log('❌ Incomplete session user data:', req.session.user);
    return res.status(401).json({ 
      error: 'Invalid session data',
      code: 'INVALID_SESSION_DATA'
    });
  }

  // Add user to request object for easy access
  req.user = req.session.user;
  
  // Update last activity timestamp
  req.session.lastActivity = new Date();
  
  // Log successful authentication
  console.log('✅ Authentication successful for:', req.user.email, 'Role:', req.user.role);
  
  next();
};

const optionalAuth = (req, res, next) => {
  if (req.session?.user) {
    req.user = req.session.user;
    console.log('🔐 Optional auth - User found:', req.user.email);
  } else {
    console.log('🔐 Optional auth - No user session');
  }
  next();
};

// 🔄 Role checking refactored to use unified role system (see utils/roles.js)
const { requireRole: unifiedRequireRole } = require('../utils/roles');

const requireRole = (allowedRoles) => {
  return unifiedRequireRole(allowedRoles);
};

/**
 * Enhanced session validator to help debug session persistence issues
 */
const validateSession = (req, res, next) => {
  console.log('🔍 Session Validation Debug:');
  console.log('  Session ID:', req.sessionID);
  console.log('  Has Session Object:', !!req.session);
  console.log('  Has User Data:', !!req.session?.user);
  console.log('  Cookie Header Present:', !!req.headers.cookie);
  
  if (req.session?.user) {
    console.log('  User ID:', req.session.user.id);
    console.log('  User Email:', req.session.user.email);
    console.log('  User Role:', req.session.user.role);
    console.log('  Login Time:', req.session.loginTime);
    console.log('  Last Activity:', req.session.lastActivity);
  }
  
  // Check for potential session issues
  if (req.sessionID && req.headers.cookie) {
    const sessionCookie = req.headers.cookie.includes('orthodoxmetrics.sid=') ||
req.headers.cookie.includes('orthodoxmetrics.sid=');
    console.log('  Session Cookie Present:', sessionCookie);
    
    if (!sessionCookie) {
      console.log('⚠️  Session ID exists but no session cookie found in headers');
    }
  }
  
  next();
};

/**
 * Middleware to handle session regeneration issues during login
 */
const handleSessionRegeneration = (req, res, next) => {
  // Store original regenerate function
  const originalRegenerate = req.session.regenerate;
  
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

module.exports = { 
  authMiddleware, 
  optionalAuth,
  requireAuth: authMiddleware,
  requireRole,
  validateSession,
  handleSessionRegeneration
};
