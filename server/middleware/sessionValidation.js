// server/middleware/sessionValidation.js
const { promisePool } = require('../config/db');

/**
 * Middleware to validate OCR session
 * Checks if session is verified and not expired
 */
const validateOCRSession = async (req, res, next) => {
  try {
    const { sessionId } = req.body;
    
    if (!sessionId) {
      return res.status(400).json({ 
        error: 'Session ID is required',
        code: 'MISSING_SESSION_ID' 
      });
    }

    // Check session in database
    const [sessions] = await promisePool.query(
      'SELECT * FROM ocr_sessions WHERE session_id = ?',
      [sessionId]
    );

    if (sessions.length === 0) {
      return res.status(403).json({ 
        error: 'Invalid session ID',
        code: 'INVALID_SESSION' 
      });
    }

    const session = sessions[0];
    const now = new Date();
    const expiresAt = new Date(session.expires_at);

    // Check if session is expired
    if (now > expiresAt) {
      return res.status(403).json({ 
        error: 'Session has expired',
        code: 'SESSION_EXPIRED' 
      });
    }

    // Check if session is verified
    if (!session.verified) {
      return res.status(403).json({ 
        error: 'Session not verified. Please scan the barcode first.',
        code: 'SESSION_NOT_VERIFIED' 
      });
    }

    // Check if session is already used (optional - depends on business logic)
    if (session.used) {
      return res.status(403).json({ 
        error: 'Session already used',
        code: 'SESSION_USED' 
      });
    }

    // Attach session to request for use in route handlers
    req.ocrSession = session;
    next();

  } catch (error) {
    console.error('Session validation error:', error);
    res.status(500).json({ 
      error: 'Internal server error during session validation',
      code: 'VALIDATION_ERROR'
    });
  }
};

/**
 * Optional middleware to mark session as used after successful processing
 */
const markSessionAsUsed = async (req, res, next) => {
  try {
    if (req.ocrSession) {
      await promisePool.query(
        'UPDATE ocr_sessions SET used = TRUE, used_at = CURRENT_TIMESTAMP WHERE session_id = ?',
        [req.ocrSession.session_id]
      );
    }
    next();
  } catch (error) {
    console.error('Error marking session as used:', error);
    // Don't fail the request if we can't update the session
    next();
  }
};

/**
 * Middleware to validate user authentication for session creation
 */
const validateUserAuth = (req, res, next) => {
  if (!req.session?.user) {
    return res.status(401).json({ 
      error: 'Authentication required',
      code: 'UNAUTHENTICATED' 
    });
  }
  next();
};

module.exports = {
  validateOCRSession,
  markSessionAsUsed,
  validateUserAuth
};
