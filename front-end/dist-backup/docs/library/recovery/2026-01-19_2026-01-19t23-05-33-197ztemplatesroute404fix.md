# Templates Route 404 Error Fix

## Problem
The `/api/admin/templates` endpoint is returning 404 errors, preventing the Live Table Builder from loading templates from the database.

## Root Cause Analysis

The route is correctly registered in `server/index.js` at line 246:
```javascript
app.use('/api/admin/templates', templatesRouter);
```

The route file `server/routes/admin/templates.js` exists and exports the router correctly.

**Most Likely Causes:**
1. **Server not restarted** - The backend server needs to be restarted after adding the route
2. **Route registration order** - The general `app.use('/api/admin', adminRoutes)` at line 298 might be intercepting requests (though specific routes should be registered first)
3. **Authentication middleware** - The route requires `requireAuth` and `requireAdmin`, but 404 suggests the route isn't being found at all (401/403 would indicate auth issues)

## Solution

### Step 1: Verify Route Registration Order
The route is registered BEFORE the general admin routes (line 246 vs line 298), which is correct. Specific routes should come before catch-all routes.

### Step 2: Restart the Backend Server
The server must be restarted for the route to be available:

```bash
# Stop the current server process
# Then restart it
cd server
npm start
# or
node index.js
```

### Step 3: Verify Route is Accessible
After restarting, test the endpoint:
```bash
curl http://localhost:YOUR_PORT/api/admin/templates
# Should return 401 (not authenticated) or 403 (not admin), NOT 404
```

### Step 4: Check Server Logs
When the server starts, check for any errors loading the templates router:
- Look for "Error loading routes/admin/templates" messages
- Verify the route is being registered without errors

## Verification Checklist

- [ ] Backend server has been restarted
- [ ] Route file `server/routes/admin/templates.js` exists and exports router
- [ ] Route is registered in `server/index.js` at line 246
- [ ] Route is registered BEFORE general admin routes (line 298)
- [ ] Server logs show no errors when loading the templates router
- [ ] Endpoint returns 401/403 (not 404) when accessed without auth
- [ ] Frontend can successfully call `/api/admin/templates` with proper auth

## Expected Behavior

1. **Without Authentication:**
   - Should return: 401 Unauthorized
   - NOT: 404 Not Found

2. **With Authentication but Not Admin:**
   - Should return: 403 Forbidden
   - NOT: 404 Not Found

3. **With Admin Authentication:**
   - Should return: 200 OK with templates array
   - NOT: 404 Not Found

## Next Steps

1. Restart the backend server
2. Verify the route is accessible (should get 401/403, not 404)
3. Test with proper admin authentication
4. Check browser console - errors should change from 404 to 401/403 if route is found
