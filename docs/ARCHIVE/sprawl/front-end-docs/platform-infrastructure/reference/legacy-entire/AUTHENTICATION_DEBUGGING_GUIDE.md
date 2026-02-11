# Authentication & Session Debugging Guide

## Current Status: TEMPORARY AUTHENTICATION BYPASS ACTIVE ⚠️

**IMPORTANT**: The authentication system currently has temporary bypasses in place to allow testing while debugging session issues. These bypasses should be removed once the root cause is identified and fixed.

## Problem Summary

The Orthodox Metrics application is experiencing session authentication issues where:
- Users can log in successfully 
- Session IDs are generated correctly
- But session user data is not persisting across requests
- This causes 401 authentication errors on admin features

## Affected Features

- ❌ Password Change
- ❌ Church Management 
- ❌ User Management (partially working)
- ❌ Logs (partially working)
- ❌ Notifications
- ❌ Notes
- ❌ All admin functionality

## Temporary Bypasses Active

### Location: `z:\server\middleware\auth.js`
- **Function**: `requireAuth()`
- **Bypass**: Automatically finds first admin user and sets session
- **Security Risk**: HIGH - Anyone can access admin functions

### Location: `z:\server\routes\admin.js`
- **Functions**: `requireAdmin()`, `requireSuperAdmin()`, `requireRolePermission()`
- **Bypass**: Same auto-admin detection
- **Security Risk**: HIGH - Complete admin access without authentication

## Debug Information

### Session Configuration
```javascript
// File: z:\server\config\session.js
{
  key: 'orthodoxmetrics.sid',
  secret: process.env.SESSION_SECRET,
  store: MySQLStore,
  resave: false,
  saveUninitialized: false,
  rolling: true,
  proxy: true,
  cookie: {
    secure: false,
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 1 day
    sameSite: 'lax',
    domain: undefined,
    path: '/'
  }
}
```

### Nginx Proxy Configuration
```nginx
# All proxy locations include:
proxy_set_header Cookie $http_cookie;
proxy_pass_header Set-Cookie;
proxy_cookie_path / /;
```

### Current Debug Logging
The auth middleware now logs:
- Request URL and method
- Cookie headers
- Session ID
- Session user data
- Session object contents
- IP addresses and forwarded headers
- User agent

## Troubleshooting Steps

### 1. Check Session Store
```bash
# Check MySQL sessions table
mysql -u orthodoxapp -p orthodoxmetrics_db
SELECT * FROM sessions;
```

### 2. Monitor Backend Logs
```bash
cd /var/www/orthodox-church-mgmt/server
tail -f logs/auth.log
tail -f logs/error.log
```

### 3. Check Nginx Logs
```bash
tail -f /var/log/nginx/orthodox-church-mgmt_access.log
tail -f /var/log/nginx/orthodox-church-mgmt_error.log
```

### 4. Debug Session Flow
1. Login via frontend
2. Check if session is created in database
3. Make subsequent request to admin endpoint
4. Verify session cookie is sent
5. Check if session user is loaded from store

## Common Issues & Solutions

### Issue: Session ID exists but user is undefined
**Symptoms**: Session ID is logged but `req.session.user` is undefined
**Possible Causes**:
- Session store corruption
- Cookie domain/path mismatch
- Proxy not forwarding cookies correctly
- Session serialization issues

**Solutions**:
- Clear sessions table: `DELETE FROM sessions;`
- Restart backend server
- Check nginx cookie forwarding
- Verify session store configuration

### Issue: Cookies not being sent through proxy
**Symptoms**: No cookie header in backend logs
**Possible Causes**:
- Nginx not configured to forward cookies
- Frontend not setting cookies correctly
- CORS issues with credentials

**Solutions**:
- Update nginx configuration
- Ensure frontend sends `withCredentials: true`
- Check CORS settings

## To Remove Temporary Bypasses

### 1. Remove from auth.js
Remove the entire "TEMPORARY BYPASS" section and restore:
```javascript
if (!req.session?.user) {
    console.log('No session user found, returning 401');
    return res.status(401).json({ error: 'Unauthenticated' });
}
```

### 2. Remove from admin.js
Restore original middleware functions without bypass logic.

### 3. Test Authentication
1. Clear browser cookies
2. Clear session store
3. Restart backend
4. Test login flow
5. Verify admin features work with proper authentication

## Files Modified for Debugging

- `z:\server\middleware\auth.js` - Enhanced debugging + bypass
- `z:\server\routes\admin.js` - Admin middleware bypasses
- `z:\server\config\session.js` - Session configuration for proxy
- `z:\server\index.js` - Direct route mounting
- `z:\orthodox-church-mgmt-nginx.conf` - Proxy configurations

## Next Steps

1. **Test with bypasses**: Verify all admin features work
2. **Monitor logs**: Collect detailed session debugging data
3. **Identify root cause**: Determine why sessions aren't persisting
4. **Fix session issue**: Address the underlying problem
5. **Remove bypasses**: Restore proper authentication
6. **Final testing**: Ensure everything works with real auth

## Security Warning ⚠️

**DO NOT DEPLOY TO PRODUCTION** with these bypasses active. They completely circumvent authentication and pose a serious security risk.
