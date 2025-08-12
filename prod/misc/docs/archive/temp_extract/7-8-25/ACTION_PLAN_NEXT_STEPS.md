# Action Plan - Next Steps Required - July 8, 2025

## IMMEDIATE PRIORITY ACTIONS

### 🚨 CRITICAL: Server Route Loading Issue
**Problem:** New routes return 404 despite being added to code
**Impact:** Cannot debug session issues without working debug routes

**Actions Required:**
1. **Check server startup for errors**
   ```bash
   cd z:\server
   node index.js
   # Look for syntax errors, missing modules, or loading failures
   ```

2. **Verify route files exist and have correct syntax**
   - Check `z:\server\routes\debug.js` exists
   - Check `z:\server\routes\auth.js` has /check endpoint
   - Run syntax check: `node -c z:\server\routes\debug.js`

3. **Clean server restart**
   - Stop all Node.js processes
   - Clear module cache if needed
   - Start server fresh

**Expected Result:** New routes should respond instead of 404

---

### 🚨 CRITICAL: User Authentication Failure  
**Problem:** `session.user` is always undefined
**Impact:** No users can access protected features

**Actions Required:**
1. **Check if users are attempting to log in**
   - Monitor login endpoint for incoming requests
   - Check if frontend is sending login attempts

2. **Test login endpoint manually**
   ```bash
   curl -X POST -H "Content-Type: application/json" \
     -c cookies.txt \
     -d '{"email":"VALID_EMAIL","password":"VALID_PASSWORD"}' \
     https://orthodoxmetrics.com/auth/login
   ```

3. **Verify user credentials in database**
   - Check if test user exists
   - Verify password hash is correct
   - Confirm user account is active

4. **Test session creation in login endpoint**
   - Add detailed logging to login endpoint
   - Verify session.user is being set properly
   - Check if session.save() completes successfully

**Expected Result:** Login should set `session.user` and persist

---

### 🚨 CRITICAL: Session Persistence Issue
**Problem:** New session ID on each request
**Impact:** Sessions don't persist, breaking authentication

**Actions Required:**
1. **Test cookie behavior with curl**
   ```bash
   # Test session creation and persistence
   curl -c cookies.txt https://orthodoxmetrics.com/debug/session-continuity
   curl -b cookies.txt https://orthodoxmetrics.com/debug/session-continuity
   # Second request should show same session ID
   ```

2. **Check browser cookie behavior**
   - Open browser dev tools
   - Navigate to site
   - Check Application > Cookies for `orthodox.sid`
   - Verify cookie is being stored and sent

3. **Verify session store configuration**
   - Check session store setup in `z:\server\config\session.js`
   - Verify database connection if using DB store
   - Test memory store if using default

**Expected Result:** Same session ID should persist across requests

---

## SYSTEMATIC DEBUGGING PLAN

### Phase 1: Server Infrastructure (IMMEDIATE)
**Goal:** Get server loading all routes properly

**Steps:**
1. Stop current server
2. Check for syntax errors in all modified files
3. Clean restart server
4. Test basic route: `curl https://orthodoxmetrics.com/api/test-basic`
5. Test new route: `curl https://orthodoxmetrics.com/auth/check`

**Success Criteria:** Both routes return valid responses (not 404)

### Phase 2: Session Persistence (URGENT)
**Goal:** Ensure sessions persist across requests

**Steps:**
1. Test session continuity with curl
2. Check browser cookie storage
3. Verify session store configuration
4. Test session save/load cycle

**Success Criteria:** Same session ID persists across multiple requests

### Phase 3: Login Flow (URGENT)  
**Goal:** Users can successfully log in

**Steps:**
1. Verify user exists in database
2. Test login endpoint with curl
3. Check frontend login form functionality
4. Verify session.user is set after login
5. Test protected route access after login

**Success Criteria:** Login sets session.user and allows access to protected routes

### Phase 4: Frontend Integration (HIGH)
**Goal:** Frontend login works end-to-end

**Steps:**
1. Test frontend login form submission
2. Verify API requests include credentials
3. Check cookie handling in browser
4. Test protected page access after login

**Success Criteria:** Users can log in through frontend and access protected features

---

## DEBUGGING COMMANDS TO RUN

### 1. Server Startup Check
```bash
cd z:\server
node index.js
# Watch for errors in console output
```

### 2. Route Availability Test
```bash
# Existing route (should work)
curl -v https://orthodoxmetrics.com/logs/frontend

# New route (currently fails)  
curl -v https://orthodoxmetrics.com/auth/check

# Test route with /api prefix
curl -v https://orthodoxmetrics.com/api/auth/check
```

### 3. Session Persistence Test
```bash
# Create session and cookie
curl -c cookies.txt -v https://orthodoxmetrics.com/debug/session-continuity

# Use same session
curl -b cookies.txt -v https://orthodoxmetrics.com/debug/session-continuity

# Check session details  
curl -b cookies.txt -v https://orthodoxmetrics.com/debug/session-full-debug
```

### 4. Login Flow Test
```bash
# Test login with real credentials
curl -X POST -H "Content-Type: application/json" \
  -c login_cookies.txt -v \
  -d '{"email":"admin@orthodoxmetrics.com","password":"REAL_PASSWORD"}' \
  https://orthodoxmetrics.com/auth/login

# Test protected route with login cookies
curl -b login_cookies.txt -v https://orthodoxmetrics.com/notifications/counts

# Check auth status
curl -b login_cookies.txt -v https://orthodoxmetrics.com/auth/check
```

---

## FILES TO VERIFY/FIX

### High Priority Files to Check:
1. **`z:\server\index.js`** - Verify routes are registered correctly
2. **`z:\server\routes\debug.js`** - Check for syntax errors
3. **`z:\server\routes\auth.js`** - Verify /check endpoint exists
4. **`z:\server\config\session.js`** - Verify session configuration
5. **`z:\server\middleware\auth.js`** - Check auth middleware logic

### Package Files to Check:
1. **`z:\server\package.json`** - Verify dependencies
2. **`z:\server\.env`** - Check environment variables

---

## SUCCESS METRICS

### Immediate Success (Next 30 minutes):
- ✅ Server starts without errors
- ✅ New routes respond (no 404s)
- ✅ Session IDs persist across requests

### Short Term Success (Next 2 hours):
- ✅ Users can log in successfully
- ✅ `session.user` contains user data after login
- ✅ Protected routes accessible after login
- ✅ Frontend login form works

### Complete Success:
- ✅ No more "User: undefined" errors
- ✅ No more "No valid session found" errors  
- ✅ Session persistence across browser sessions
- ✅ All protected features accessible after login

---

## ROLLBACK PLAN

If changes cause more issues:

1. **Revert session config:**
   ```javascript
   // In z:\server\config\session.js
   sameSite: 'strict',
   domain: process.env.COOKIE_DOMAIN,
   ```

2. **Revert frontend config:**
   ```
   REACT_APP_API_BASE_URL=http://localhost:3001
   ```

3. **Remove new debug routes** if causing server startup issues

4. **Test with original configuration** to confirm baseline functionality

**Important:** Document what breaks when reverting to isolate which changes are beneficial vs harmful.
