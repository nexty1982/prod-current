# Session Security Implementation

## 🔐 Orthodox Metrics Session Security

This document provides comprehensive documentation for the session security implementation in the Orthodox Metrics system.

## 🛡️ Session Security Overview

### Security Principles
1. **Secure Session Storage**: MySQL-based session storage with encryption
2. **Cookie Security**: HTTP-only, secure, and SameSite cookies
3. **Session Validation**: Continuous session integrity checking
4. **Timeout Management**: Automatic session expiration
5. **Concurrent Session Control**: Prevent session hijacking
6. **Activity Monitoring**: Track and log session activities

### Security Features
- **Session Encryption**: Encrypted session data
- **IP Validation**: Session-IP binding
- **User Agent Validation**: Browser fingerprinting
- **Session Rotation**: Periodic session ID regeneration
- **Secure Logout**: Proper session cleanup

## 🔧 Session Configuration

### 1. Secure Session Setup

#### Enhanced Session Configuration
```javascript
// config/session.js
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const crypto = require('crypto');

// Create secure session store
const sessionStore = new MySQLStore({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  
  // Table configuration
  createDatabaseTable: true,
  schema: {
    tableName: 'sessions',
    columnNames: {
      session_id: 'session_id',
      expires: 'expires',
      data: 'data'
    }
  },
  
  // Security options
  clearExpired: true,
  checkExpirationInterval: 900000, // 15 minutes
  expiration: 1800000, // 30 minutes
  
  // Connection options
  connectionLimit: 10,
  acquireTimeout: 60000,
  timeout: 60000,
  reconnect: true
});

// Session configuration
const sessionConfig = {
  // Session identification
  key: 'orthodox.sid',
  name: 'orthodox.sid',
  
  // Session secret (should be strong and unique)
  secret: process.env.SESSION_SECRET || crypto.randomBytes(64).toString('hex'),
  
  // Store configuration
  store: sessionStore,
  
  // Session behavior
  resave: false,
  saveUninitialized: false,
  rolling: true, // Reset expiration on activity
  
  // Cookie security
  cookie: {
    // Security flags
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    httpOnly: true, // Prevent XSS
    sameSite: 'strict', // CSRF protection
    
    // Expiration
    maxAge: 30 * 60 * 1000, // 30 minutes
    
    // Additional security
    domain: process.env.COOKIE_DOMAIN || undefined,
    path: '/'
  },
  
  // Custom session ID generator
  genid: (req) => {
    return crypto.randomBytes(32).toString('hex');
  },
  
  // Session middleware options
  proxy: true, // Trust proxy headers
  unset: 'destroy' // Destroy session on unset
};

module.exports = session(sessionConfig);
```

### 2. Session Store Events

#### Session Store Monitoring
```javascript
// config/session.js (continued)
const logger = require('../utils/logger');

// Session store event handlers
sessionStore.on('connect', () => {
  logger.info('Session store connected to database');
});

sessionStore.on('disconnect', () => {
  logger.warn('Session store disconnected from database');
});

sessionStore.on('error', (error) => {
  logger.error('Session store error:', error);
});

// Session cleanup events
sessionStore.on('destroy', (sessionId) => {
  logger.debug('Session destroyed:', sessionId);
});

sessionStore.on('touch', (sessionId) => {
  logger.debug('Session touched:', sessionId);
});
```

## 🔒 Session Security Middleware

### 1. Session Security Enhancement

#### Session Security Middleware
```javascript
// middleware/sessionSecurity.js
const crypto = require('crypto');
const logger = require('../utils/logger');

const sessionSecurity = (req, res, next) => {
  // Skip if no session
  if (!req.session) {
    return next();
  }
  
  try {
    // Get current request information
    const currentIP = req.ip || req.connection.remoteAddress;
    const currentUA = req.get('User-Agent') || '';
    const currentTime = Date.now();
    
    // Initialize session security data
    if (!req.session.security) {
      req.session.security = {
        createdAt: currentTime,
        initialIP: currentIP,
        initialUA: currentUA,
        lastActivity: currentTime,
        activityCount: 0,
        ipHistory: [currentIP],
        regenerationCount: 0
      };
    }
    
    const security = req.session.security;
    
    // Update activity tracking
    security.lastActivity = currentTime;
    security.activityCount++;
    
    // IP validation
    if (security.initialIP !== currentIP) {
      // Log IP change
      logger.warn('Session IP change detected:', {
        sessionId: req.sessionID,
        userId: req.session.user?.id,
        initialIP: security.initialIP,
        currentIP: currentIP,
        userAgent: currentUA
      });
      
      // Add to IP history
      if (!security.ipHistory.includes(currentIP)) {
        security.ipHistory.push(currentIP);
      }
      
      // Strict IP validation (optional)
      if (process.env.STRICT_IP_VALIDATION === 'true') {
        logger.error('Session terminated due to IP change');
        req.session.destroy();
        return res.status(401).json({
          success: false,
          error: 'Session terminated for security reasons'
        });
      }
    }
    
    // User Agent validation
    if (security.initialUA !== currentUA) {
      logger.warn('Session User Agent change detected:', {
        sessionId: req.sessionID,
        userId: req.session.user?.id,
        initialUA: security.initialUA,
        currentUA: currentUA
      });
      
      // Optionally terminate session on UA change
      if (process.env.STRICT_UA_VALIDATION === 'true') {
        logger.error('Session terminated due to User Agent change');
        req.session.destroy();
        return res.status(401).json({
          success: false,
          error: 'Session terminated for security reasons'
        });
      }
    }
    
    // Session duration validation
    const sessionDuration = currentTime - security.createdAt;
    const maxSessionDuration = 12 * 60 * 60 * 1000; // 12 hours
    
    if (sessionDuration > maxSessionDuration) {
      logger.info('Session terminated due to maximum duration exceeded:', {
        sessionId: req.sessionID,
        userId: req.session.user?.id,
        duration: sessionDuration
      });
      
      req.session.destroy();
      return res.status(401).json({
        success: false,
        error: 'Session expired due to maximum duration'
      });
    }
    
    // Activity-based session regeneration
    if (security.activityCount > 0 && security.activityCount % 100 === 0) {
      const oldSessionId = req.sessionID;
      
      req.session.regenerate((err) => {
        if (err) {
          logger.error('Session regeneration failed:', err);
          return next();
        }
        
        security.regenerationCount++;
        
        logger.info('Session regenerated:', {
          oldSessionId: oldSessionId,
          newSessionId: req.sessionID,
          userId: req.session.user?.id,
          regenerationCount: security.regenerationCount
        });
        
        next();
      });
    } else {
      next();
    }
    
  } catch (error) {
    logger.error('Session security middleware error:', error);
    next();
  }
};

module.exports = sessionSecurity;
```

### 2. Session Timeout Management

#### Session Timeout Middleware
```javascript
// middleware/sessionTimeout.js
const logger = require('../utils/logger');

const sessionTimeout = (req, res, next) => {
  if (!req.session || !req.session.user) {
    return next();
  }
  
  try {
    const now = Date.now();
    const lastActivity = req.session.lastActivity || now;
    const sessionTimeout = 30 * 60 * 1000; // 30 minutes
    const warningTime = 5 * 60 * 1000; // 5 minutes before timeout
    
    // Check if session has expired
    if (now - lastActivity > sessionTimeout) {
      logger.info('Session expired due to inactivity:', {
        sessionId: req.sessionID,
        userId: req.session.user.id,
        lastActivity: new Date(lastActivity),
        timeout: sessionTimeout
      });
      
      req.session.destroy((err) => {
        if (err) {
          logger.error('Session destruction error:', err);
        }
        
        res.status(401).json({
          success: false,
          error: 'Session expired due to inactivity',
          code: 'SESSION_EXPIRED'
        });
      });
      
      return;
    }
    
    // Update last activity
    req.session.lastActivity = now;
    
    // Add timeout warning to response
    const timeUntilExpiry = sessionTimeout - (now - lastActivity);
    if (timeUntilExpiry <= warningTime) {
      res.set('X-Session-Warning', 'true');
      res.set('X-Session-Time-Left', Math.floor(timeUntilExpiry / 1000).toString());
    }
    
    next();
    
  } catch (error) {
    logger.error('Session timeout middleware error:', error);
    next();
  }
};

module.exports = sessionTimeout;
```

## 🔐 Session Encryption

### 1. Session Data Encryption

#### Session Encryption Utilities
```javascript
// utils/sessionEncryption.js
const crypto = require('crypto');

const ENCRYPTION_KEY = process.env.SESSION_ENCRYPTION_KEY || crypto.randomBytes(32);
const ALGORITHM = 'aes-256-gcm';

const encrypt = (data) => {
  try {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher(ALGORITHM, ENCRYPTION_KEY);
    cipher.setAAD(Buffer.from('session-data', 'utf8'));
    
    let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return {
      iv: iv.toString('hex'),
      data: encrypted,
      authTag: authTag.toString('hex')
    };
  } catch (error) {
    throw new Error('Encryption failed');
  }
};

const decrypt = (encryptedData) => {
  try {
    const decipher = crypto.createDecipher(ALGORITHM, ENCRYPTION_KEY);
    decipher.setAAD(Buffer.from('session-data', 'utf8'));
    decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));
    
    let decrypted = decipher.update(encryptedData.data, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return JSON.parse(decrypted);
  } catch (error) {
    throw new Error('Decryption failed');
  }
};

module.exports = {
  encrypt,
  decrypt
};
```

### 2. Secure Session Storage

#### Custom Session Store with Encryption
```javascript
// stores/EncryptedMySQLStore.js
const MySQLStore = require('express-mysql-session');
const { encrypt, decrypt } = require('../utils/sessionEncryption');

class EncryptedMySQLStore extends MySQLStore {
  constructor(options) {
    super(options);
  }
  
  // Override set method to encrypt data
  set(sessionId, session, callback) {
    try {
      const encryptedSession = encrypt(session);
      super.set(sessionId, encryptedSession, callback);
    } catch (error) {
      callback(error);
    }
  }
  
  // Override get method to decrypt data
  get(sessionId, callback) {
    super.get(sessionId, (error, session) => {
      if (error) {
        return callback(error);
      }
      
      if (!session) {
        return callback(null, null);
      }
      
      try {
        const decryptedSession = decrypt(session);
        callback(null, decryptedSession);
      } catch (decryptError) {
        callback(decryptError);
      }
    });
  }
}

module.exports = EncryptedMySQLStore;
```

## 🔍 Session Monitoring

### 1. Session Activity Logging

#### Session Activity Logger
```javascript
// middleware/sessionLogger.js
const logger = require('../utils/logger');

const sessionLogger = (req, res, next) => {
  if (!req.session || !req.session.user) {
    return next();
  }
  
  try {
    const sessionInfo = {
      sessionId: req.sessionID,
      userId: req.session.user.id,
      userEmail: req.session.user.email,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      method: req.method,
      url: req.url,
      timestamp: new Date().toISOString(),
      referer: req.get('Referer'),
      origin: req.get('Origin')
    };
    
    // Log session activity
    logger.info('Session activity:', sessionInfo);
    
    // Store activity in database for analysis
    if (process.env.STORE_SESSION_ACTIVITY === 'true') {
      storeSessionActivity(sessionInfo);
    }
    
    next();
    
  } catch (error) {
    logger.error('Session logging error:', error);
    next();
  }
};

const storeSessionActivity = async (activityData) => {
  try {
    const db = require('../database/connection');
    
    await db.execute(`
      INSERT INTO session_activities (
        session_id, user_id, ip_address, user_agent, method, url, 
        referer, origin, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `, [
      activityData.sessionId,
      activityData.userId,
      activityData.ip,
      activityData.userAgent,
      activityData.method,
      activityData.url,
      activityData.referer,
      activityData.origin
    ]);
    
  } catch (error) {
    logger.error('Failed to store session activity:', error);
  }
};

module.exports = sessionLogger;
```

### 2. Session Analytics

#### Session Analytics Utilities
```javascript
// utils/sessionAnalytics.js
const db = require('../database/connection');

const getSessionStats = async (timeRange = '24h') => {
  try {
    let timeCondition;
    
    switch (timeRange) {
      case '1h':
        timeCondition = 'created_at > DATE_SUB(NOW(), INTERVAL 1 HOUR)';
        break;
      case '24h':
        timeCondition = 'created_at > DATE_SUB(NOW(), INTERVAL 24 HOUR)';
        break;
      case '7d':
        timeCondition = 'created_at > DATE_SUB(NOW(), INTERVAL 7 DAY)';
        break;
      default:
        timeCondition = 'created_at > DATE_SUB(NOW(), INTERVAL 24 HOUR)';
    }
    
    const [results] = await db.execute(`
      SELECT 
        COUNT(DISTINCT session_id) as active_sessions,
        COUNT(DISTINCT user_id) as unique_users,
        COUNT(*) as total_activities,
        COUNT(DISTINCT ip_address) as unique_ips,
        AVG(TIMESTAMPDIFF(MINUTE, MIN(created_at), MAX(created_at))) as avg_session_duration
      FROM session_activities 
      WHERE ${timeCondition}
    `);
    
    return results[0];
  } catch (error) {
    logger.error('Session analytics error:', error);
    throw error;
  }
};

const getTopUsersByActivity = async (limit = 10) => {
  try {
    const [results] = await db.execute(`
      SELECT 
        u.id,
        u.email,
        u.name,
        COUNT(sa.id) as activity_count,
        MAX(sa.created_at) as last_activity
      FROM users u
      JOIN session_activities sa ON u.id = sa.user_id
      WHERE sa.created_at > DATE_SUB(NOW(), INTERVAL 24 HOUR)
      GROUP BY u.id
      ORDER BY activity_count DESC
      LIMIT ?
    `, [limit]);
    
    return results;
  } catch (error) {
    logger.error('Top users analytics error:', error);
    throw error;
  }
};

const getSuspiciousActivities = async () => {
  try {
    const [results] = await db.execute(`
      SELECT 
        user_id,
        COUNT(DISTINCT ip_address) as ip_count,
        COUNT(DISTINCT user_agent) as ua_count,
        COUNT(*) as activity_count,
        GROUP_CONCAT(DISTINCT ip_address) as ip_addresses
      FROM session_activities
      WHERE created_at > DATE_SUB(NOW(), INTERVAL 24 HOUR)
      GROUP BY user_id
      HAVING ip_count > 3 OR ua_count > 2
      ORDER BY ip_count DESC, ua_count DESC
    `);
    
    return results;
  } catch (error) {
    logger.error('Suspicious activities analytics error:', error);
    throw error;
  }
};

module.exports = {
  getSessionStats,
  getTopUsersByActivity,
  getSuspiciousActivities
};
```

## 🔒 Session Hijacking Prevention

### 1. Session Hijacking Detection

#### Session Hijacking Detector
```javascript
// middleware/hijackingDetector.js
const logger = require('../utils/logger');
const { logSecurityEvent } = require('../utils/securityLogger');

const hijackingDetector = (req, res, next) => {
  if (!req.session || !req.session.user) {
    return next();
  }
  
  try {
    const currentIP = req.ip;
    const currentUA = req.get('User-Agent');
    const sessionId = req.sessionID;
    const userId = req.session.user.id;
    
    // Initialize fingerprint if not exists
    if (!req.session.fingerprint) {
      req.session.fingerprint = {
        ip: currentIP,
        userAgent: currentUA,
        created: Date.now()
      };
    }
    
    const fingerprint = req.session.fingerprint;
    
    // Check for IP changes
    if (fingerprint.ip !== currentIP) {
      logSecurityEvent('IP_CHANGE', {
        sessionId,
        userId,
        oldIP: fingerprint.ip,
        newIP: currentIP,
        userAgent: currentUA
      });
      
      // Check if IP change is suspicious
      if (await isSuspiciousIPChange(fingerprint.ip, currentIP)) {
        logger.error('Suspicious IP change detected - terminating session:', {
          sessionId,
          userId,
          oldIP: fingerprint.ip,
          newIP: currentIP
        });
        
        req.session.destroy();
        return res.status(401).json({
          success: false,
          error: 'Session terminated for security reasons',
          code: 'SUSPICIOUS_ACTIVITY'
        });
      }
    }
    
    // Check for User Agent changes
    if (fingerprint.userAgent !== currentUA) {
      logSecurityEvent('USER_AGENT_CHANGE', {
        sessionId,
        userId,
        oldUA: fingerprint.userAgent,
        newUA: currentUA,
        ip: currentIP
      });
      
      // Terminate session on UA change (more strict)
      if (process.env.STRICT_UA_VALIDATION === 'true') {
        logger.error('User Agent change detected - terminating session');
        req.session.destroy();
        return res.status(401).json({
          success: false,
          error: 'Session terminated for security reasons',
          code: 'SUSPICIOUS_ACTIVITY'
        });
      }
    }
    
    // Check for concurrent sessions
    const concurrentSessions = await getConcurrentSessions(userId);
    if (concurrentSessions > 3) {
      logger.warn('Multiple concurrent sessions detected:', {
        userId,
        sessionCount: concurrentSessions
      });
      
      logSecurityEvent('CONCURRENT_SESSIONS', {
        userId,
        sessionCount: concurrentSessions,
        currentSessionId: sessionId
      });
    }
    
    next();
    
  } catch (error) {
    logger.error('Hijacking detector error:', error);
    next();
  }
};

const isSuspiciousIPChange = async (oldIP, newIP) => {
  // Check if IPs are from different geographic regions
  // This is a simplified check - in production, use a proper geolocation service
  
  const oldIPParts = oldIP.split('.');
  const newIPParts = newIP.split('.');
  
  // Simple check for different subnets
  if (oldIPParts[0] !== newIPParts[0] || oldIPParts[1] !== newIPParts[1]) {
    return true;
  }
  
  return false;
};

const getConcurrentSessions = async (userId) => {
  try {
    const db = require('../database/connection');
    
    const [results] = await db.execute(`
      SELECT COUNT(*) as session_count
      FROM sessions 
      WHERE JSON_EXTRACT(data, '$.user.id') = ? 
      AND expires > NOW()
    `, [userId]);
    
    return results[0].session_count;
  } catch (error) {
    logger.error('Failed to get concurrent sessions:', error);
    return 0;
  }
};

module.exports = hijackingDetector;
```

### 2. Session Cleanup

#### Session Cleanup Utilities
```javascript
// utils/sessionCleanup.js
const db = require('../database/connection');
const logger = require('./logger');

const cleanupExpiredSessions = async () => {
  try {
    const [result] = await db.execute(`
      DELETE FROM sessions 
      WHERE expires < NOW()
    `);
    
    logger.info(`Cleaned up ${result.affectedRows} expired sessions`);
    
    return result.affectedRows;
  } catch (error) {
    logger.error('Session cleanup error:', error);
    throw error;
  }
};

const cleanupOldSessionActivities = async (daysToKeep = 30) => {
  try {
    const [result] = await db.execute(`
      DELETE FROM session_activities 
      WHERE created_at < DATE_SUB(NOW(), INTERVAL ? DAY)
    `, [daysToKeep]);
    
    logger.info(`Cleaned up ${result.affectedRows} old session activities`);
    
    return result.affectedRows;
  } catch (error) {
    logger.error('Session activities cleanup error:', error);
    throw error;
  }
};

const terminateUserSessions = async (userId) => {
  try {
    const [result] = await db.execute(`
      DELETE FROM sessions 
      WHERE JSON_EXTRACT(data, '$.user.id') = ?
    `, [userId]);
    
    logger.info(`Terminated ${result.affectedRows} sessions for user ${userId}`);
    
    return result.affectedRows;
  } catch (error) {
    logger.error('User session termination error:', error);
    throw error;
  }
};

// Schedule cleanup jobs
const scheduleCleanup = () => {
  // Clean expired sessions every hour
  setInterval(async () => {
    try {
      await cleanupExpiredSessions();
    } catch (error) {
      logger.error('Scheduled session cleanup failed:', error);
    }
  }, 60 * 60 * 1000); // 1 hour
  
  // Clean old activities daily
  setInterval(async () => {
    try {
      await cleanupOldSessionActivities();
    } catch (error) {
      logger.error('Scheduled activity cleanup failed:', error);
    }
  }, 24 * 60 * 60 * 1000); // 24 hours
};

module.exports = {
  cleanupExpiredSessions,
  cleanupOldSessionActivities,
  terminateUserSessions,
  scheduleCleanup
};
```

## 📊 Session Security Dashboard

### 1. Session Security Metrics

#### Session Security API
```javascript
// routes/admin/sessionSecurity.js
const express = require('express');
const { requireAdmin } = require('../../middleware/auth');
const { getSessionStats, getSuspiciousActivities } = require('../../utils/sessionAnalytics');

const router = express.Router();

// Get session security overview
router.get('/overview', requireAdmin, async (req, res) => {
  try {
    const stats = await getSessionStats();
    const suspiciousActivities = await getSuspiciousActivities();
    
    res.json({
      success: true,
      data: {
        stats,
        suspiciousActivities,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get session security overview'
    });
  }
});

// Get active sessions
router.get('/active-sessions', requireAdmin, async (req, res) => {
  try {
    const [sessions] = await db.execute(`
      SELECT 
        session_id,
        JSON_EXTRACT(data, '$.user.id') as user_id,
        JSON_EXTRACT(data, '$.user.email') as user_email,
        JSON_EXTRACT(data, '$.security.initialIP') as ip_address,
        expires,
        TIMESTAMPDIFF(MINUTE, 
          FROM_UNIXTIME(JSON_EXTRACT(data, '$.security.createdAt')/1000), 
          NOW()
        ) as duration_minutes
      FROM sessions 
      WHERE expires > NOW()
      ORDER BY expires DESC
    `);
    
    res.json({
      success: true,
      sessions: sessions
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get active sessions'
    });
  }
});

// Terminate session
router.delete('/sessions/:sessionId', requireAdmin, async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    const [result] = await db.execute(
      'DELETE FROM sessions WHERE session_id = ?',
      [sessionId]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Session terminated successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to terminate session'
    });
  }
});

module.exports = router;
```

---

*This session security documentation provides comprehensive coverage of the Orthodox Metrics session security implementation. It should be updated whenever session security features are modified or enhanced.*
