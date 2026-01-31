# Authentication Flow Documentation

## 🔐 Orthodox Metrics Authentication System

This document provides comprehensive documentation for the authentication and authorization flows in the Orthodox Metrics system.

## 🎯 Authentication Overview

### Authentication Methods
- **Session-based Authentication**: Primary method using cookies
- **Role-based Access Control**: Hierarchical permission system
- **Multi-factor Authentication**: Optional TOTP-based MFA
- **Password Security**: BCrypt hashing with salt

### Flow Types
1. **Login Flow**: User authentication and session creation
2. **Logout Flow**: Session termination and cleanup
3. **Password Change Flow**: Secure password updates
4. **Session Validation**: Ongoing authentication verification
5. **Access Control**: Permission-based resource access

## 🚀 Login Flow

### 1. User Login Process

#### Frontend Login Request
```typescript
// Login component - frontend
const handleLogin = async (credentials: LoginCredentials) => {
  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include', // Include cookies
      body: JSON.stringify(credentials)
    });
    
    const data = await response.json();
    
    if (data.success) {
      // Update auth context
      setUser(data.user);
      setIsAuthenticated(true);
      
      // Redirect to dashboard
      navigate('/admin/dashboard');
    } else {
      setError(data.error);
    }
  } catch (error) {
    setError('Login failed. Please try again.');
  }
};
```

#### Backend Login Handler
```javascript
// controllers/authController.js
const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Step 1: Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required'
      });
    }
    
    // Step 2: Rate limiting check
    const clientIP = req.ip;
    const attempts = await getFailedAttempts(clientIP);
    
    if (attempts >= 5) {
      await logSecurityEvent('LOGIN_BLOCKED', {
        ip: clientIP,
        email: email,
        reason: 'Too many failed attempts'
      });
      
      return res.status(429).json({
        success: false,
        error: 'Account temporarily locked. Try again later.'
      });
    }
    
    // Step 3: Find user in database
    const [users] = await db.execute(
      'SELECT id, email, password, name, role, is_active, mfa_secret FROM users WHERE email = ?',
      [email]
    );
    
    if (users.length === 0) {
      await incrementFailedAttempts(clientIP);
      await logSecurityEvent('LOGIN_FAILED', {
        ip: clientIP,
        email: email,
        reason: 'User not found'
      });
      
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }
    
    const user = users[0];
    
    // Step 4: Check if account is active
    if (!user.is_active) {
      await logSecurityEvent('LOGIN_FAILED', {
        ip: clientIP,
        email: email,
        reason: 'Account inactive'
      });
      
      return res.status(401).json({
        success: false,
        error: 'Account is inactive'
      });
    }
    
    // Step 5: Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    
    if (!isValidPassword) {
      await incrementFailedAttempts(clientIP);
      await logSecurityEvent('LOGIN_FAILED', {
        ip: clientIP,
        email: email,
        reason: 'Invalid password'
      });
      
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }
    
    // Step 6: MFA verification (if enabled)
    if (user.mfa_secret && req.body.mfaToken) {
      const isValidMFA = verifyMFAToken(req.body.mfaToken, user.mfa_secret);
      
      if (!isValidMFA) {
        await logSecurityEvent('LOGIN_FAILED', {
          ip: clientIP,
          email: email,
          reason: 'Invalid MFA token'
        });
        
        return res.status(401).json({
          success: false,
          error: 'Invalid MFA token'
        });
      }
    } else if (user.mfa_secret && !req.body.mfaToken) {
      // MFA required but not provided
      return res.status(200).json({
        success: false,
        requiresMFA: true,
        message: 'MFA token required'
      });
    }
    
    // Step 7: Create session
    req.session.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role
    };
    
    req.session.loginTime = new Date();
    req.session.lastActivity = new Date();
    
    // Step 8: Clear failed attempts
    await clearFailedAttempts(clientIP);
    
    // Step 9: Log successful login
    await logSecurityEvent('LOGIN_SUCCESS', {
      ip: clientIP,
      userId: user.id,
      email: user.email,
      sessionId: req.sessionID
    });
    
    // Step 10: Update user last login
    await db.execute(
      'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?',
      [user.id]
    );
    
    // Step 11: Return success response
    res.json({
      success: true,
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });
    
  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Login failed'
    });
  }
};
```

### 2. Login Flow Diagram

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend      │    │   Database      │
│   (React)       │    │   (Express)     │    │   (MySQL)       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                        │                        │
         │ POST /auth/login       │                        │
         │ { email, password }    │                        │
         │──────────────────────> │                        │
         │                        │                        │
         │                        │ SELECT user WHERE      │
         │                        │ email = ?              │
         │                        │──────────────────────> │
         │                        │                        │
         │                        │ User data              │
         │                        │ <────────────────────── │
         │                        │                        │
         │                        │ bcrypt.compare()       │
         │                        │ (password verification)│
         │                        │                        │
         │                        │ CREATE SESSION         │
         │                        │ req.session.user = {}  │
         │                        │                        │
         │                        │ UPDATE last_login      │
         │                        │──────────────────────> │
         │                        │                        │
         │ { success: true,       │                        │
         │   user: {...} }        │                        │
         │ <────────────────────── │                        │
         │                        │                        │
         │ Set-Cookie: connect.sid│                        │
         │ <────────────────────── │                        │
         │                        │                        │
         │ Redirect to /dashboard │                        │
         └────────────────────────┘                        │
```

## 🔒 Session Management Flow

### 1. Session Creation and Storage

#### Session Configuration
```javascript
// config/session.js
const sessionConfig = {
  key: 'orthodox.sid',
  secret: process.env.SESSION_SECRET,
  store: new MySQLStore({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    createDatabaseTable: true,
    schema: {
      tableName: 'sessions',
      columnNames: {
        session_id: 'session_id',
        expires: 'expires',
        data: 'data'
      }
    }
  }),
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 30 * 60 * 1000, // 30 minutes
    sameSite: 'strict'
  }
};
```

#### Session Validation Middleware
```javascript
// middleware/auth.js
const requireAuth = async (req, res, next) => {
  try {
    // Check if session exists
    if (!req.session) {
      return res.status(401).json({
        success: false,
        error: 'No session found'
      });
    }
    
    // Check if user is in session
    if (!req.session.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }
    
    // Check session expiry
    const now = new Date();
    const lastActivity = new Date(req.session.lastActivity);
    const sessionTimeout = 30 * 60 * 1000; // 30 minutes
    
    if (now - lastActivity > sessionTimeout) {
      req.session.destroy();
      return res.status(401).json({
        success: false,
        error: 'Session expired'
      });
    }
    
    // Update last activity
    req.session.lastActivity = now;
    
    // Verify user still exists and is active
    const [users] = await db.execute(
      'SELECT id, email, name, role, is_active FROM users WHERE id = ? AND is_active = 1',
      [req.session.user.id]
    );
    
    if (users.length === 0) {
      req.session.destroy();
      return res.status(401).json({
        success: false,
        error: 'User account not found or inactive'
      });
    }
    
    // Update session with current user data
    req.session.user = users[0];
    
    next();
  } catch (error) {
    logger.error('Auth middleware error:', error);
    res.status(500).json({
      success: false,
      error: 'Authentication check failed'
    });
  }
};
```

### 2. Session Lifecycle

```
┌─────────────────┐
│  Session Start  │
│  (Login)        │
└─────────────────┘
         │
         ▼
┌─────────────────┐
│  Create Session │
│  Store in MySQL │
│  Set Cookie     │
└─────────────────┘
         │
         ▼
┌─────────────────┐
│  Session Active │
│  Validate on    │
│  Each Request   │
└─────────────────┘
         │
         ▼
┌─────────────────┐
│  Session Update │
│  Last Activity  │
│  Rolling Expiry │
└─────────────────┘
         │
         ▼
┌─────────────────┐
│  Session End    │
│  (Logout/Expire)│
│  Clear Cookie   │
└─────────────────┘
```

## 🔐 Authorization Flow

### 1. Role-Based Access Control

#### Role Hierarchy
```javascript
// utils/roles.js
const ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  MODERATOR: 'moderator',
  USER: 'user'
};

const ROLE_LEVELS = {
  [ROLES.SUPER_ADMIN]: 4,
  [ROLES.ADMIN]: 3,
  [ROLES.MODERATOR]: 2,
  [ROLES.USER]: 1
};

const hasRole = (userRole, requiredRole) => {
  return ROLE_LEVELS[userRole] >= ROLE_LEVELS[requiredRole];
};
```

#### Permission Checking Middleware
```javascript
// middleware/permissions.js
const requireRole = (requiredRole) => {
  return async (req, res, next) => {
    try {
      // First check authentication
      if (!req.session?.user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }
      
      const userRole = req.session.user.role;
      
      // Check if user has required role
      if (!hasRole(userRole, requiredRole)) {
        await logSecurityEvent('ACCESS_DENIED', {
          userId: req.session.user.id,
          userRole: userRole,
          requiredRole: requiredRole,
          resource: req.path,
          ip: req.ip
        });
        
        return res.status(403).json({
          success: false,
          error: 'Insufficient permissions'
        });
      }
      
      next();
    } catch (error) {
      logger.error('Permission check error:', error);
      res.status(500).json({
        success: false,
        error: 'Permission check failed'
      });
    }
  };
};

const requirePermission = (permission) => {
  return async (req, res, next) => {
    try {
      if (!req.session?.user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }
      
      const userRole = req.session.user.role;
      const userPermissions = ROLE_PERMISSIONS[userRole] || [];
      
      if (!userPermissions.includes(permission)) {
        await logSecurityEvent('PERMISSION_DENIED', {
          userId: req.session.user.id,
          userRole: userRole,
          permission: permission,
          resource: req.path,
          ip: req.ip
        });
        
        return res.status(403).json({
          success: false,
          error: 'Permission denied'
        });
      }
      
      next();
    } catch (error) {
      logger.error('Permission check error:', error);
      res.status(500).json({
        success: false,
        error: 'Permission check failed'
      });
    }
  };
};
```

### 2. Resource-Based Access Control

#### Resource Ownership Check
```javascript
// middleware/resourceAuth.js
const requireOwnership = (resourceType) => {
  return async (req, res, next) => {
    try {
      const resourceId = req.params.id;
      const userId = req.session.user.id;
      const userRole = req.session.user.role;
      
      // Admins can access any resource
      if (userRole === 'admin' || userRole === 'super_admin') {
        return next();
      }
      
      // Check resource ownership
      let ownershipQuery;
      
      switch (resourceType) {
        case 'user':
          // Users can only access their own profile
          if (resourceId != userId) {
            return res.status(403).json({
              success: false,
              error: 'Access denied'
            });
          }
          break;
          
        case 'church':
          // Check if user is assigned to this church
          ownershipQuery = 'SELECT id FROM user_churches WHERE user_id = ? AND church_id = ?';
          break;
          
        case 'notification':
          // Check if notification belongs to user
          ownershipQuery = 'SELECT id FROM notifications WHERE user_id = ? AND id = ?';
          break;
          
        default:
          return res.status(400).json({
            success: false,
            error: 'Invalid resource type'
          });
      }
      
      if (ownershipQuery) {
        const [results] = await db.execute(ownershipQuery, [userId, resourceId]);
        
        if (results.length === 0) {
          return res.status(403).json({
            success: false,
            error: 'Access denied'
          });
        }
      }
      
      next();
    } catch (error) {
      logger.error('Resource auth error:', error);
      res.status(500).json({
        success: false,
        error: 'Authorization check failed'
      });
    }
  };
};
```

## 🔄 Password Change Flow

### 1. Password Change Process

#### Frontend Password Change
```typescript
// ChangePassword component
const handlePasswordChange = async (passwordData: PasswordChangeData) => {
  try {
    const response = await fetch('/api/auth/change-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify(passwordData)
    });
    
    const data = await response.json();
    
    if (data.success) {
      setMessage('Password changed successfully');
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } else {
      setError(data.error);
    }
  } catch (error) {
    setError('Failed to change password');
  }
};
```

#### Backend Password Change Handler
```javascript
// controllers/authController.js
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.session.user.id;
    
    // Validate input
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Current and new passwords are required'
      });
    }
    
    // Validate new password strength
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.isValid) {
      return res.status(400).json({
        success: false,
        error: 'Password does not meet requirements',
        requirements: passwordValidation.requirements
      });
    }
    
    // Get current user
    const [users] = await db.execute(
      'SELECT password FROM users WHERE id = ?',
      [userId]
    );
    
    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, users[0].password);
    
    if (!isValidPassword) {
      await logSecurityEvent('PASSWORD_CHANGE_FAILED', {
        userId: userId,
        reason: 'Invalid current password',
        ip: req.ip
      });
      
      return res.status(401).json({
        success: false,
        error: 'Current password is incorrect'
      });
    }
    
    // Check password history
    const isPasswordReused = await checkPasswordHistory(userId, newPassword);
    
    if (isPasswordReused) {
      return res.status(400).json({
        success: false,
        error: 'Cannot reuse recent passwords'
      });
    }
    
    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    
    // Update password
    await db.execute(
      'UPDATE users SET password = ?, password_changed_at = CURRENT_TIMESTAMP WHERE id = ?',
      [hashedPassword, userId]
    );
    
    // Add to password history
    await db.execute(
      'INSERT INTO password_history (user_id, password_hash, created_at) VALUES (?, ?, CURRENT_TIMESTAMP)',
      [userId, hashedPassword]
    );
    
    // Clean old password history (keep last 5)
    await db.execute(
      'DELETE FROM password_history WHERE user_id = ? AND id NOT IN (SELECT id FROM (SELECT id FROM password_history WHERE user_id = ? ORDER BY created_at DESC LIMIT 5) AS t)',
      [userId, userId]
    );
    
    // Log successful password change
    await logSecurityEvent('PASSWORD_CHANGED', {
      userId: userId,
      ip: req.ip
    });
    
    res.json({
      success: true,
      message: 'Password changed successfully'
    });
    
  } catch (error) {
    logger.error('Change password error:', error);
    res.status(500).json({
      success: false,
      error: 'Password change failed'
    });
  }
};
```

## 🚪 Logout Flow

### 1. Logout Process

#### Frontend Logout
```typescript
// Logout function
const handleLogout = async () => {
  try {
    const response = await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include'
    });
    
    const data = await response.json();
    
    if (data.success) {
      // Clear auth context
      setUser(null);
      setIsAuthenticated(false);
      
      // Redirect to login
      navigate('/login');
    }
  } catch (error) {
    console.error('Logout error:', error);
    // Force logout on error
    setUser(null);
    setIsAuthenticated(false);
    navigate('/login');
  }
};
```

#### Backend Logout Handler
```javascript
// controllers/authController.js
const logout = async (req, res) => {
  try {
    const userId = req.session?.user?.id;
    const sessionId = req.sessionID;
    
    // Log logout event
    if (userId) {
      await logSecurityEvent('LOGOUT', {
        userId: userId,
        sessionId: sessionId,
        ip: req.ip
      });
    }
    
    // Destroy session
    req.session.destroy((err) => {
      if (err) {
        logger.error('Session destroy error:', err);
        return res.status(500).json({
          success: false,
          error: 'Logout failed'
        });
      }
      
      // Clear session cookie
      res.clearCookie('orthodox.sid');
      
      res.json({
        success: true,
        message: 'Logout successful'
      });
    });
    
  } catch (error) {
    logger.error('Logout error:', error);
    res.status(500).json({
      success: false,
      error: 'Logout failed'
    });
  }
};
```

## 🔍 Session Debugging

### 1. Session Debug Endpoint

#### Debug Session Information
```javascript
// routes/debug.js
router.get('/session', (req, res) => {
  try {
    const sessionInfo = {
      sessionId: req.sessionID,
      hasSession: !!req.session,
      user: req.session?.user || null,
      isAuthenticated: !!req.session?.user,
      loginTime: req.session?.loginTime || null,
      lastActivity: req.session?.lastActivity || null,
      cookie: req.session?.cookie || null
    };
    
    res.json({
      success: true,
      session: sessionInfo
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Session debug failed'
    });
  }
});
```

### 2. Authentication Flow Testing

#### Test Authentication Endpoints
```javascript
// Test script for authentication flows
const testAuthentication = async () => {
  try {
    // Test login
    const loginResponse = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        email: 'admin@example.com',
        password: 'password123'
      })
    });
    
    console.log('Login:', await loginResponse.json());
    
    // Test session
    const sessionResponse = await fetch('/api/debug/session', {
      credentials: 'include'
    });
    
    console.log('Session:', await sessionResponse.json());
    
    // Test protected route
    const protectedResponse = await fetch('/api/admin/users', {
      credentials: 'include'
    });
    
    console.log('Protected route:', await protectedResponse.json());
    
    // Test logout
    const logoutResponse = await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include'
    });
    
    console.log('Logout:', await logoutResponse.json());
    
  } catch (error) {
    console.error('Test error:', error);
  }
};
```

## 📊 Authentication Metrics

### 1. Security Metrics Tracking

#### Failed Login Attempts
```javascript
// utils/loginAttempts.js
const redis = require('redis');
const client = redis.createClient();

const incrementFailedAttempts = async (ip) => {
  const key = `failed_attempts:${ip}`;
  await client.incr(key);
  await client.expire(key, 900); // 15 minutes
};

const getFailedAttempts = async (ip) => {
  const key = `failed_attempts:${ip}`;
  const attempts = await client.get(key);
  return parseInt(attempts) || 0;
};

const clearFailedAttempts = async (ip) => {
  const key = `failed_attempts:${ip}`;
  await client.del(key);
};
```

#### Session Statistics
```javascript
// utils/sessionStats.js
const getSessionStats = async () => {
  const [results] = await db.execute(`
    SELECT 
      COUNT(*) as total_sessions,
      COUNT(DISTINCT JSON_EXTRACT(data, '$.user.id')) as active_users,
      AVG(TIMESTAMPDIFF(MINUTE, FROM_UNIXTIME(JSON_EXTRACT(data, '$.loginTime')/1000), NOW())) as avg_session_length
    FROM sessions 
    WHERE expires > NOW()
  `);
  
  return results[0];
};
```

---

*This authentication flow documentation provides comprehensive coverage of the Orthodox Metrics authentication system. It should be updated whenever authentication flows are modified or enhanced.*
