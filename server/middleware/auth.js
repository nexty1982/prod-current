// server/middleware/auth.js - NEW FILE
const authMiddleware = (req, res, next) => {
  // console.log('🔐 Auth middleware - Session ID:', req.sessionID);
  // console.log('🔐 Auth middleware - User:', req.session?.user?.email);
  
  // Check if session exists and has user
  if (!req.session || !req.session.user) {
    // console.log('❌ No valid session found');
    return res.status(401).json({ 
      error: 'Authentication required',
      code: 'NO_SESSION'
    });
  }

  // Verify session hasn't expired
  if (req.session.expires && new Date() > new Date(req.session.expires)) {
    // console.log('❌ Session expired');
    req.session.destroy();
    return res.status(401).json({ 
      error: 'Session expired',
      code: 'SESSION_EXPIRED'
    });
  }

  // Add user to request object for easy access
  req.user = req.session.user;
  
  // Update last activity
  req.session.lastActivity = new Date();
  
  next();
};

const optionalAuth = (req, res, next) => {
  if (req.session?.user) {
    req.user = req.session.user;
  }
  next();
};

const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    console.log('🔐 Role check - User role:', req.session?.user?.role);
    console.log('🔐 Role check - Allowed roles:', allowedRoles);
    
    // First check if user is authenticated
    if (!req.session || !req.session.user) {
      console.log('❌ No valid session found for role check');
      return res.status(401).json({ 
        error: 'Authentication required',
        code: 'NO_SESSION'
      });
    }

    const userRole = req.session.user.role;
    
    // Check if user's role is in the allowed roles array
    if (!allowedRoles.includes(userRole)) {
      console.log(`❌ Access denied - User role '${userRole}' not in allowed roles:`, allowedRoles);
      return res.status(403).json({ 
        error: 'Insufficient permissions',
        code: 'INSUFFICIENT_ROLE',
        required: allowedRoles,
        current: userRole
      });
    }

    console.log(`✅ Role check passed - User role '${userRole}' is authorized`);
    next();
  };
};

module.exports = { 
  authMiddleware, 
  optionalAuth,
  requireAuth: authMiddleware,  // Export requireAuth as an alias
  requireRole  // Export requireRole middleware
};
