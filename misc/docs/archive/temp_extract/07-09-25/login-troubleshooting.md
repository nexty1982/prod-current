# Login Issues Troubleshooting Guide

## Step 1: Check if Backend API is Running
```bash
# Check if backend is running on port 3001
netstat -tlnp | grep :3001
ps aux | grep node

# Test API endpoint directly
curl -i http://localhost:3001/api/health
curl -i http://localhost:3001/api/auth/login
```

## Step 2: Check Browser Network Tab
1. Open browser Developer Tools (F12)
2. Go to Network tab
3. Try to login
4. Look for:
   - Failed API calls (red entries)
   - 401/403/500 error responses
   - CORS errors in console

## Step 3: Check API Base URL Configuration
Check your React app's API configuration:
```bash
# Look for API base URL in your React app
grep -r "baseURL\|API_URL\|REACT_APP" /var/www/orthodox-church-mgmt/front-end/src/
```

## Step 4: Test API Endpoints Manually
```bash
# Test login endpoint
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"testpassword"}'

# Test from external IP
curl -X POST http://192.168.1.239/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"testpassword"}'
```

## Step 5: Check Backend Logs
```bash
# Check your Node.js backend logs
cd /var/www/orthodox-church-mgmt/server
tail -f logs/app.log
# or wherever your backend logs are stored

# If using PM2
pm2 logs

# If running directly
# Check the terminal where you started the backend
```

## Step 6: Common Login Issues

### Issue 1: CORS (Cross-Origin Resource Sharing)
If you see CORS errors in browser console, add to your backend:
```javascript
// In your backend server (usually server/index.js or app.js)
const cors = require('cors');
app.use(cors({
  origin: ['http://192.168.1.239', 'http://localhost:3000'],
  credentials: true
}));
```

### Issue 2: API Base URL Configuration
Check your React app's API configuration:
```javascript
// Look for files like:
// src/api/config.js
// src/services/api.js
// src/utils/axios.js

// Should point to:
const API_BASE_URL = 'http://192.168.1.239/api' // or just '/api'
```

### Issue 3: Backend Not Started
```bash
cd /var/www/orthodox-church-mgmt/server
npm start
# or
node index.js
# or whatever your start command is
```

### Issue 4: Database Connection
```bash
# Check if database is running
sudo systemctl status mysql
# or
sudo systemctl status postgresql

# Check database connectivity from backend
```

## Step 7: Check Environment Variables
```bash
# Check if backend has correct environment variables
cd /var/www/orthodox-church-mgmt/server
cat .env

# Common variables needed:
# - DATABASE_URL
# - JWT_SECRET
# - PORT=3001
```

## Step 8: Test Authentication Flow
1. **Check user exists in database**
2. **Verify password hashing is working**
3. **Check JWT token generation**
4. **Verify token validation**

## Step 9: Nginx Proxy Headers
The current config should handle this, but verify API proxy is working:
```bash
# Test that nginx properly proxies API calls
curl -H "Host: 192.168.1.239" http://127.0.0.1/api/health
```

## Quick Debug Commands:
```bash
# 1. Check what's listening on port 3001
sudo lsof -i :3001

# 2. Check nginx is proxying correctly
tail -f /var/log/nginx/orthodox-church-mgmt_access.log

# 3. Test API directly (bypass nginx)
curl http://localhost:3001/api/

# 4. Test API through nginx
curl http://192.168.1.239/api/
```

## Common Error Messages and Solutions:

**"Network Error" / "Cannot reach server"**
- Backend not running
- Wrong API URL in frontend
- Firewall blocking port 3001

**"401 Unauthorized"**
- Wrong credentials
- Authentication logic issue
- Database user not found

**"CORS Error"**
- Backend CORS not configured for your IP
- Missing credentials: true in CORS config

**"500 Internal Server Error"**
- Backend crash/error
- Database connection issue
- Check backend logs

---

Run through these steps and let me know:
1. What error message you see when trying to login
2. Any errors in browser console (F12)
3. Backend logs output
4. Results of the curl tests above
