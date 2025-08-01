# Quick Diagnostic Commands - July 8, 2025

## Copy-Paste Ready Commands for Immediate Testing

### 1. CHECK SERVER STARTUP
```powershell
# Navigate to server directory
cd z:\server

# Start server and watch for errors
node index.js
# Press Ctrl+C to stop after checking for errors
```

### 2. TEST ROUTE AVAILABILITY
```powershell
# Test existing route (should work)
curl.exe -v https://orthodoxmetrics.com/logs/frontend

# Test new auth check route (currently 404)
curl.exe -v https://orthodoxmetrics.com/auth/check

# Test with /api prefix
curl.exe -v https://orthodoxmetrics.com/api/auth/check

# Test basic test route
curl.exe -v https://orthodoxmetrics.com/api/test-basic
```

### 3. TEST SESSION PERSISTENCE
```powershell
# Create session and save cookies
curl.exe -c cookies.txt -v https://orthodoxmetrics.com/debug/session-continuity

# Use saved cookies (should show same session ID)
curl.exe -b cookies.txt -v https://orthodoxmetrics.com/debug/session-continuity

# Full session debug
curl.exe -b cookies.txt -v https://orthodoxmetrics.com/debug/session-full-debug
```

### 4. TEST LOGIN FLOW
```powershell
# Attempt login (replace with real credentials)
curl.exe -X POST -H "Content-Type: application/json" -c login_cookies.txt -v -d "{\"email\":\"admin@orthodoxmetrics.com\",\"password\":\"REAL_PASSWORD\"}" https://orthodoxmetrics.com/auth/login

# Test protected route with login cookies
curl.exe -b login_cookies.txt -v https://orthodoxmetrics.com/notifications/counts

# Check authentication status
curl.exe -b login_cookies.txt -v https://orthodoxmetrics.com/auth/check
```

### 5. CHECK FILE SYNTAX
```powershell
# Check debug routes file for syntax errors
node -c z:\server\routes\debug.js

# Check auth routes file for syntax errors
node -c z:\server\routes\auth.js

# Check main server file for syntax errors
node -c z:\server\index.js
```

### 6. DATABASE USER CHECK
```sql
-- Connect to MySQL and run:
USE orthodox_metrics;
SELECT id, email, is_active, role, created_at, last_login 
FROM users 
WHERE email = 'admin@orthodoxmetrics.com' 
   OR email LIKE '%admin%' 
   OR role = 'admin';
```

---

## Expected vs Actual Results

### Route Tests Expected Results:
- **Existing route:** HTTP 200 OK with JSON response
- **New routes:** HTTP 200 OK (currently getting 404)
- **Login endpoint:** HTTP 200 with success message

### Session Tests Expected Results:
- **First request:** New session ID created
- **Second request:** Same session ID returned
- **Session data:** Should persist between requests

### Login Tests Expected Results:
- **Login attempt:** HTTP 200 with success and session cookie
- **Protected route:** HTTP 200 with data (currently 401)
- **Auth check:** HTTP 200 with user info (currently 404)

---

## Quick Fixes to Try

### If Routes Return 404:
```powershell
# Restart server completely
cd z:\server
# Kill any existing node processes first
taskkill /F /IM node.exe
# Start fresh
node index.js
```

### If Syntax Errors Found:
```powershell
# Check which file has the error
node -c z:\server\routes\debug.js
node -c z:\server\routes\auth.js
# Fix the syntax error and restart server
```

### If Login Fails:
```powershell
# Check if user exists
mysql -u root -p orthodox_metrics -e "SELECT email, is_active FROM users WHERE email='admin@orthodoxmetrics.com';"
# Create test user if needed
```

### If Sessions Don't Persist:
```powershell
# Test direct backend (bypass nginx)
curl.exe -c cookies.txt http://localhost:3001/debug/session-continuity
curl.exe -b cookies.txt http://localhost:3001/debug/session-continuity
```

---

## Files to Check if Issues Persist

### Route Files:
- `z:\server\routes\debug.js` - Contains new debug endpoints
- `z:\server\routes\auth.js` - Contains /check endpoint
- `z:\server\index.js` - Route registration

### Config Files:
- `z:\server\config\session.js` - Session configuration
- `z:\server\.env` - Environment variables
- `z:\front-end\.env.development` - Frontend API URL

### Log Files:
- Server console output
- `z:\server\logs\` directory if exists
- Browser dev tools network tab

---

## One-Liner Health Check
```powershell
# Quick overall health check
curl.exe -v https://orthodoxmetrics.com/api/test-basic && echo "✅ Server responding" || echo "❌ Server not responding"
```
