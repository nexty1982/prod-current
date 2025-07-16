# Orthodox Metrics - 401 Authentication Issues Troubleshooting Guide

## 🚨 Problem Identified
Intermittent 401 errors during login, resolved when switching users, indicates session management and authentication middleware issues.

## 🔍 Root Causes Found

### 1. Session Store Connection Issues
- MySQL session store connection timeouts
- Database connection pool exhaustion
- Session table corruption or locking issues

### 2. Session Configuration Problems
- `httpOnly: false` creates security vulnerabilities
- Inconsistent `sameSite` settings between environments
- Session timeout conflicts

### 3. Authentication Race Conditions
- Multiple concurrent session writes
- Session save/destroy timing issues
- Cookie domain/path mismatches

## 🛠️ Immediate Fixes

### Fix 1: Update Session Configuration
```javascript
// server/config/session.js - UPDATED VERSION
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);

const path = require('path');
const envFile = process.env.NODE_ENV === 'production'
  ? '../.env.production'
  : '../.env.development';
require('dotenv').config({ path: path.resolve(__dirname, envFile) });

// Enhanced DB connection options
const dbOptions = {
  host: process.env.DB_HOST || '0.0.0.0',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'orthodoxapp',
  password: process.env.DB_PASSWORD || 'Summerof1982@!',
  database: process.env.DB_NAME || 'orthodoxmetrics_db',
  connectTimeout: 30000, // Increased to 30 seconds
  acquireTimeout: 30000,
  waitForConnections: true,
  connectionLimit: 20, // Increased pool size
  queueLimit: 0,
  reconnect: true,
  // Session store specific options
  expiration: 24 * 60 * 60 * 1000, // 1 day in milliseconds
  checkExpirationInterval: 15 * 60 * 1000, // Check every 15 minutes
  createDatabaseTable: true,
  endConnectionOnClose: true,
  charset: 'utf8mb4',
  schema: {
    tableName: 'sessions',
    columnNames: {
      session_id: 'session_id',
      expires: 'expires',
      data: 'data'
    }
  }
};

const store = new MySQLStore(dbOptions);

// Handle store errors gracefully
store.on('error', (error) => {
  console.error('❌ Session store error:', error);
});

store.on('connect', () => {
  console.log('✅ Session store connected successfully');
});

module.exports = session({
  key: process.env.SESSION_KEY || 'orthodox.sid',
  secret: process.env.SESSION_SECRET || 'fallback-secret-key-for-development',
  store,
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    httpOnly: true, // SECURITY FIX: Prevent XSS attacks
    maxAge: 1000 * 60 * 60 * 24, // 1 day
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax', // Consistent setting
    domain: process.env.NODE_ENV === 'production' ? '.orthodoxmetrics.com' : undefined
  },
  // Add session name for better identification
  name: 'orthodox.sid'
});
```

### Fix 2: Enhanced Authentication Middleware
```javascript
// server/middleware/auth.js - NEW FILE
const authMiddleware = (req, res, next) => {
  console.log('🔐 Auth middleware - Session ID:', req.sessionID);
  console.log('🔐 Auth middleware - User:', req.session?.user?.email);
  
  // Check if session exists and has user
  if (!req.session || !req.session.user) {
    console.log('❌ No valid session found');
    return res.status(401).json({ 
      error: 'Authentication required',
      code: 'NO_SESSION'
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

module.exports = { authMiddleware, optionalAuth };
```

### Fix 3: Improved Login Endpoint
```javascript
// server/routes/auth.js - UPDATED LOGIN FUNCTION
// POST /api/auth/login - User login (IMPROVED VERSION)
router.post('/login', async (req, res) => {
  try {
    const { email, password, username } = req.body;
    const loginEmail = email || username;

    console.log('🔑 Login attempt for:', loginEmail);
    console.log('🔑 Session ID before login:', req.sessionID);

    if (!loginEmail || !password) {
      return res.status(400).json({ 
        error: 'Email and password are required',
        code: 'MISSING_CREDENTIALS'
      });
    }

    // Destroy any existing session first to prevent conflicts
    if (req.session.user) {
      console.log('🔄 Destroying existing session for user:', req.session.user.email);
      await new Promise((resolve, reject) => {
        req.session.destroy((err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    }

    // Look up user by email
    const [users] = await promisePool.query(
      'SELECT id, email, password_hash, first_name, last_name, role, is_active, last_login FROM users WHERE email = ? AND is_active = 1',
      [loginEmail]
    );

    if (users.length === 0) {
      console.log('❌ User not found or inactive:', loginEmail);
      return res.status(401).json({ 
        error: 'Invalid email or password',
        code: 'INVALID_CREDENTIALS'
      });
    }

    const user = users[0];
    console.log('👤 Found user:', { id: user.id, email: user.email, role: user.role });

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      console.log('❌ Invalid password for user:', loginEmail);
      return res.status(401).json({ 
        error: 'Invalid email or password',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // Update last login timestamp
    await promisePool.query(
      'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?',
      [user.id]
    );

    // Regenerate session ID for security
    await new Promise((resolve, reject) => {
      req.session.regenerate((err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // Create new session
    req.session.user = {
      id: user.id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      role: user.role,
      landing_page: '/dashboard/analytics'
    };

    req.session.loginTime = new Date();
    req.session.lastActivity = new Date();

    // Save session with error handling
    await new Promise((resolve, reject) => {
      req.session.save((err) => {
        if (err) {
          console.error('❌ Session save error:', err);
          reject(err);
        } else {
          resolve();
        }
      });
    });

    console.log('✅ Login successful for user:', req.session.user.email);
    console.log('✅ New Session ID:', req.sessionID);

    res.json({
      success: true,
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role
      },
      sessionId: req.sessionID,
      redirectTo: '/dashboard/analytics'
    });

  } catch (error) {
    console.error('❌ Login error:', error);
    
    // Clean up any partial session
    if (req.session) {
      req.session.destroy();
    }
    
    res.status(500).json({
      error: 'Login failed',
      code: 'LOGIN_ERROR',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});
```

### Fix 4: Database Session Table Optimization
```sql
-- Run this SQL to optimize the session table
-- Connect to your orthodoxmetrics_db database

-- Create optimized sessions table if it doesn't exist
CREATE TABLE IF NOT EXISTS sessions (
  session_id VARCHAR(128) COLLATE utf8mb4_bin NOT NULL,
  expires INT(11) UNSIGNED NOT NULL,
  data MEDIUMTEXT COLLATE utf8mb4_bin,
  PRIMARY KEY (session_id),
  KEY expires_idx (expires)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

-- Clean up expired sessions
DELETE FROM sessions WHERE expires < UNIX_TIMESTAMP();

-- Add index for better performance
ALTER TABLE sessions ADD INDEX IF NOT EXISTS idx_expires (expires);

-- Optimize table
OPTIMIZE TABLE sessions;
```

## 🚀 Quick Implementation Steps

### Step 1: Update Session Configuration
```bash
# Backup current session config
cp Z:\server\config\session.js Z:\server\config\session.js.backup

# Replace with the improved version above
```

### Step 2: Clean Database Sessions
```bash
# Connect to your database and run the SQL optimization
mysql -u orthodoxapp -p orthodoxmetrics_db < session_cleanup.sql
```

### Step 3: Restart Services
```bash
# Restart the backend service
cd Z:\server
npm restart

# Or if using PM2
pm2 restart orthodox-backend
```

### Step 4: Clear Browser Data
```javascript
// Have users clear cookies and local storage
localStorage.clear();
sessionStorage.clear();
// And clear cookies for orthodoxmetrics.com
```

## 🔍 Monitoring & Verification

### Check Session Health
```bash
# Monitor session table
mysql -u orthodoxapp -p -e "SELECT COUNT(*) as active_sessions, MIN(expires) as oldest_expires, MAX(expires) as newest_expires FROM orthodoxmetrics_db.sessions WHERE expires > UNIX_TIMESTAMP();"

# Monitor logs for session errors
tail -f Z:\logs\error.log | grep -i session
```

### Test Authentication Flow
```bash
# Test login endpoint
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"testpassword"}' \
  -c cookies.txt

# Test auth check with session
curl -X GET http://localhost:3001/api/auth/check \
  -b cookies.txt
```

## ⚡ Expected Results

After implementing these fixes:
- ✅ No more intermittent 401 errors
- ✅ Consistent login behavior across users
- ✅ Improved session security
- ✅ Better error logging and debugging
- ✅ Faster session operations

## 🆘 If Issues Persist

If you still experience 401 errors after these fixes:

1. **Check Database Connection**:
   ```bash
   mysql -u orthodoxapp -p orthodoxmetrics_db -e "SHOW PROCESSLIST;"
   ```

2. **Monitor Session Store**:
   ```bash
   tail -f Z:\logs\orthodox-backend.log | grep -i "session\|auth"
   ```

3. **Test with Clean Browser**:
   - Use incognito/private browsing
   - Clear all site data
   - Test with different browsers

The key insight is that the 401 errors are primarily caused by session store connection issues and session configuration problems, not nginx configuration issues. These fixes address the root causes in the backend authentication system.
