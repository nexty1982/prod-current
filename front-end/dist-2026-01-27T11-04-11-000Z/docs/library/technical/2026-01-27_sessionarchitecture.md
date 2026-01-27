# Session & Authentication Architecture

## Overview

The Orthodox Metrics application uses a session-based authentication system with the following components:

## Architecture Components

### 1. Session Storage
- **Type**: MySQL-based session store
- **Table**: `sessions` in `orthodoxmetrics_db`
- **Library**: `express-mysql-session`
- **Persistence**: Database-backed for reliability

### 2. Session Middleware
- **Library**: `express-session`
- **Configuration**: `z:\server\config\session.js`
- **Cookie Name**: `orthodoxmetrics.sid`
- **Max Age**: 24 hours

### 3. Authentication Middleware
- **Location**: `z:\server\middleware\auth.js`
- **Function**: `requireAuth()`
- **Purpose**: Validates session and user existence

### 4. Authorization Middleware
- **Location**: `z:\server\routes\admin.js`
- **Functions**: 
  - `requireAdmin()` - Admin or Super Admin
  - `requireSuperAdmin()` - Super Admin only
  - `requireRolePermission()` - Role-based creation permissions

## Session Flow

### 1. Login Process
```javascript
// POST /auth/login
1. User submits credentials
2. Backend validates against database
3. Creates session: req.session.user = userData
4. Returns success response
5. Session cookie sent to browser
```

### 2. Subsequent Requests
```javascript
// Any authenticated endpoint
1. Browser sends session cookie
2. Express-session loads session from MySQL
3. Auth middleware checks req.session.user
4. If valid, request proceeds
5. If invalid, returns 401
```

### 3. Logout Process
```javascript
// POST /auth/logout
1. Destroy session: req.session.destroy()
2. Clear session from database
3. Clear cookie from browser
```

## Session Configuration

### Database Schema
```sql
CREATE TABLE sessions (
  session_id VARCHAR(128) COLLATE utf8mb4_unicode_ci NOT NULL,
  expires INT(11) UNSIGNED NOT NULL,
  data MEDIUMTEXT COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (session_id)
);
```

### Session Options
```javascript
{
  key: 'orthodoxmetrics.sid',           // Cookie name
  secret: process.env.SESSION_SECRET,   // Encryption key
  store: MySQLStore,                    // Database storage
  resave: false,                        // Don't save unchanged sessions
  saveUninitialized: false,             // Don't save empty sessions
  rolling: true,                        // Reset expiration on activity
  proxy: true,                          // Trust reverse proxy
  cookie: {
    secure: false,                      // HTTP allowed (nginx handles SSL)
    httpOnly: true,                     // Prevent XSS
    maxAge: 24 * 60 * 60 * 1000,       // 24 hours
    sameSite: 'lax',                    // CSRF protection
    domain: undefined,                  // Let browser handle
    path: '/'                           // Available site-wide
  }
}
```

## Route Structure

### API Routes (with /api prefix)
```
/api/auth/*          - Authentication endpoints
/api/admin/*         - User/admin management
/api/churches/*      - Church management
/api/logs/*          - System logs
/api/notifications/* - Notifications
/api/notes/*         - Notes system
```

### Direct Routes (without /api prefix)
```
/auth/*              - Direct auth access
/admin/*             - Direct admin access
/churches/*          - Direct church access
/logs/*              - Direct logs access
/notifications/*     - Direct notifications access
/notes/*             - Direct notes access
```

## Nginx Proxy Configuration

### Cookie Forwarding
```nginx
proxy_set_header Cookie $http_cookie;
proxy_pass_header Set-Cookie;
proxy_cookie_path / /;
```

### CORS Headers
```nginx
add_header 'Access-Control-Allow-Credentials' 'true' always;
add_header 'Access-Control-Allow-Origin' '$http_origin' always;
```

## Security Considerations

### Session Security
- **HTTPOnly**: Prevents JavaScript access to session cookie
- **SameSite**: Protects against CSRF attacks
- **Secure**: Would be true in production with HTTPS
- **Rolling**: Extends session on activity

### Role-Based Access
- **super_admin**: Full system access
- **admin**: User and church management (limited)
- **user**: Basic access to own data

### Database Security
- Session data encrypted with secret
- Automatic session cleanup on expiration
- SQL injection protection via parameterized queries

## Monitoring & Debugging

### Session Health Check
```javascript
// GET /debug/session
{
  sessionId: "...",
  user: {...},
  isAuthenticated: true,
  sessionAge: "2 hours",
  expiresIn: "22 hours"
}
```

### Key Metrics to Monitor
- Session creation rate
- Session duration
- Authentication failures
- Database connection health
- Cookie delivery success

## Common Issues

### Session Not Persisting
- Check MySQL connection
- Verify session table exists
- Check session secret consistency
- Monitor session store errors

### Cookie Not Sent
- Verify nginx proxy configuration
- Check CORS settings
- Ensure frontend sends credentials
- Validate cookie domain/path

### Authentication Failures
- Check user exists in database
- Verify password hashing
- Monitor session middleware errors
- Check authorization logic

## Performance Considerations

### Session Cleanup
- Automatic cleanup of expired sessions
- Monitor session table size
- Consider session pruning strategy

### Database Load
- Connection pooling for session store
- Monitor MySQL performance
- Consider Redis for high-traffic scenarios

### Memory Usage
- Session data kept minimal
- Avoid storing large objects in session
- Regular garbage collection monitoring
