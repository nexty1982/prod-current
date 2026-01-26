/**
 * Authentication middleware - locks down routes requiring auth
 * Supports both session-based and JWT-based authentication
 */
const jwt = require("jsonwebtoken");

const JWT_ACCESS_SECRET =
  process.env.JWT_ACCESS_SECRET || "change_me_access_256bit";

function requireAuth(req, res, next) {
  // Log authentication attempts for debugging (only for POST requests to sensitive endpoints)
  if (req.method === 'POST' && req.path.includes('record-images')) {
    console.log(`[AUTH] 🔐 Authentication check for ${req.method} ${req.path}`, {
      hasSession: !!req.session?.user,
      hasAuthHeader: !!req.headers.authorization,
      sessionUserId: req.session?.user?.id,
      cookies: Object.keys(req.cookies || {}),
    });
  }

  // Check session-based authentication first
  if (req.session?.user) {
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
      
      return next();
    } catch (jwtError) {
      console.log("🔐 Invalid JWT token:", jwtError.message);
    }
  }

  // No valid authentication found
  if (req.method === 'POST' && req.path.includes('record-images')) {
    console.log(`[AUTH] ❌ Authentication failed for ${req.method} ${req.path}`);
  }
  return res.status(401).json({
    error: "Authentication required",
    code: "NO_SESSION",
  });
}

module.exports = { requireAuth };
