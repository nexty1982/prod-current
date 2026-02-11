# Image Upload Troubleshooting Documentation

## Overview
This document outlines the backend and frontend API/route configurations for **TWO DIFFERENT** image upload features, all attempted fixes, and the current blocking issues.

**Date:** December 17, 2025  
**Status:** ❌ **BLOCKED** - Both endpoints experiencing issues

### Two Separate Upload Endpoints:

1. **Image Gallery Upload**
   - **Endpoint:** `POST /api/gallery/upload`
   - **Feature:** Image Gallery page upload functionality
   - **Status:** ❌ **500 Internal Server Error** - Request may not be reaching Express
   - **Route File:** `server/routes/gallery.js`

2. **Record Images Upload (Header Display Configuration)**
   - **Endpoint:** `POST /api/admin/churches/:id/record-images`
   - **Feature:** Header Display Configuration in Record Table Configuration
   - **Status:** ❌ **BLOCKED** - Request not reaching Express server
   - **Route File:** `server/routes/admin/churches.js`

---

## Backend Configuration

### Route Definition
**File:** `server/routes/admin/churches.js`  
**Route:** `POST /api/admin/churches/:id/record-images`  
**Line:** ~1531

```javascript
router.post('/:id/record-images', async (req, res, next) => {
  const requestId = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
  console.log(`[${requestId}] 🚀 ROUTE HIT: POST /api/admin/churches/:id/record-images`);
  // ... route handler
});
```

### Route Registration
**File:** `server/src/index.ts`  
**Line:** ~242

```typescript
app.use('/api/admin/churches', churchesManagementRouter);
```

### Multer Configuration
**File:** `server/routes/admin/churches.js`  
**Lines:** ~1410-1522

**Storage Configuration:**
- **Base Directory:** `/var/www/orthodoxmetrics/uploads/record-images` (or `RECORD_IMAGES_DIR` env var)
- **Directory Structure:** `{baseDir}/{churchId}/{type}/`
- **File Size Limit:** 25MB
- **Allowed Types:** `['baptism', 'marriage', 'funeral', 'logo', 'bg', 'g1', 'omLogo', 'recordImage']`
- **Allowed MIME Types:** `['image/png', 'image/jpeg', 'image/jpg', 'image/webp']`

**Key Features:**
- Dynamic directory creation based on `churchId` and `type`
- Async directory creation with proper error handling
- Filename sanitization and unique ID generation
- Comprehensive error handling for Multer callbacks

### Authentication
**File:** `server/routes/admin/churches.js`  
**Line:** ~26

```javascript
router.use(requireAuth); // Applied to ALL admin church routes
```

**Authentication Middleware:** `server/middleware/requireAuth.js`
- Supports session-based authentication (`req.session.user`)
- Supports JWT-based authentication (`Authorization: Bearer <token>`)
- Returns 401 JSON response if authentication fails

### Error Handling
**File:** `server/middleware/apiErrorHandler.js`
- Registered in `server/src/index.ts` at line ~638
- Ensures all `/api/*` routes return JSON error responses
- Logs structured error information

---

## Frontend Configuration

### Upload Function
**File:** `front-end/src/features/church/FieldMapperPage.tsx`  
**Line:** ~663

```typescript
const response = await fetch(`/api/admin/churches/${churchId}/record-images`, {
  method: 'POST',
  credentials: 'include',
  body: formData,
});
```

**FormData Structure:**
- Field name: `image` (file)
- Query parameter or body field: `type` (e.g., 'baptism', 'marriage', 'funeral', 'logo', 'bg', 'g1', 'omLogo')

**Error Handling:**
- Detects HTML error pages (Nginx/Apache) vs JSON responses
- Extracts error messages from JSON or HTML
- Displays user-friendly error messages

### Axios Configuration
**File:** `front-end/src/shared/lib/axiosInstance.ts`
- Automatically removes `Content-Type` header for FormData (allows browser to set boundary)
- Preserves `error.response` object for detailed error handling

---

## Attempted Fixes

### 1. Syntax Errors ✅ FIXED
**Issue:** `SyntaxError: Missing catch or finally after try` in `server/routes/admin/churches.js:1729`  
**Fix:** Removed redundant outer try-catch block, corrected nested try-catch structure  
**Status:** ✅ Resolved - Server starts without syntax errors

### 2. Route Registration ✅ FIXED
**Issue:** Routes not registered in production build (`server/src/index.ts`)  
**Fix:** Added `churchesManagementRouter` registration in TypeScript source  
**Status:** ✅ Resolved - Routes are registered

### 3. Error Handler Registration ✅ FIXED
**Issue:** `apiErrorHandler` missing from production build  
**Fix:** Added `apiErrorHandler` middleware registration in `server/src/index.ts`  
**Status:** ✅ Resolved - Error handler is registered

### 4. Multer Destination Callback ✅ FIXED
**Issue:** Async operations in synchronous Multer callback  
**Fix:** Wrapped async operations in IIFE with proper error handling  
**Status:** ✅ Resolved - Directory creation works correctly

### 5. Body Parser Limits ✅ FIXED
**Issue:** Default 10MB limit might be too small  
**Fix:** Increased to 50MB in `server/src/index.ts`  
**Status:** ✅ Resolved - Limits increased

### 6. Enhanced Logging ✅ ADDED
**Issue:** No visibility into request flow  
**Fix:** Added comprehensive logging at multiple points:
- Request entry point (`server/src/index.ts`)
- Authentication middleware (`server/middleware/requireAuth.js`)
- Route handler (`server/routes/admin/churches.js`)
- Multer callbacks

**Status:** ✅ Added - Logging in place

### 7. Error Handling in Route ✅ ENHANCED
**Issue:** Errors might not return JSON responses  
**Fix:** Added `handleError` helper function within route handler  
**Status:** ✅ Enhanced - All errors return JSON

---

## Current Blocking Issue

### Problem Statement
**The POST request to `/api/admin/churches/46/record-images` is NOT reaching the Express server.**

### Evidence

1. **No Logs in PM2:**
   - No `📤 POST Request` log (from request entry point)
   - No `[AUTH] 🔐 Authentication check` log (from auth middleware)
   - No `🚀 ROUTE HIT` log (from route handler)
   - No errors in PM2 error logs related to the upload

2. **Frontend Receives HTML 500:**
   - Browser console shows: `"Received HTML error page instead of JSON"`
   - Response contains: `<h1>500 Internal Server Error</h1>` and `nginx/1.18.0 (Ubuntu)`
   - This indicates Nginx is serving a generic 500 page, not Express

3. **Other Requests Work:**
   - GET requests to `/api/admin/churches/46/*` are successful (200/304)
   - Authentication is working (session: `frjames@ssppoc.org`)
   - Other routes are accessible

### Possible Causes

#### 1. Nginx Configuration Issues (MOST LIKELY)
- **`client_max_body_size`** too small for file uploads
- **Timeout settings** (`proxy_read_timeout`, `proxy_connect_timeout`) too short
- **Request size limits** blocking large multipart/form-data requests

**Check:**
```bash
grep -r "client_max_body_size" /etc/nginx/
grep -r "proxy_read_timeout" /etc/nginx/
grep -r "proxy_connect_timeout" /etc/nginx/
```

**Expected:** `client_max_body_size` should be at least 25MB (matching multer limit)

#### 2. Request Blocked Before Express
- Nginx might be rejecting the request before proxying to Node.js
- Check Nginx error logs: `/var/log/nginx/error.log`

#### 3. Express Body Parser Crash
- Express might be crashing while parsing multipart/form-data
- This would happen before our logging middleware
- Check if there are any uncaught exceptions in PM2 logs

#### 4. CORS Issues
- CORS middleware might be blocking the request
- However, other POST requests work, so this is less likely

#### 5. Session Store Issues
- MySQL session store is failing (falling back to MemoryStore)
- This shouldn't block requests, but could cause authentication issues
- Error: `ER_ACCESS_DENIED_ERROR: Access denied for user 'root'@'localhost' (using password: NO)`

---

## Diagnostic Steps Taken

1. ✅ Verified route is registered in `server/src/index.ts`
2. ✅ Verified route handler syntax is correct
3. ✅ Added comprehensive logging at multiple points
4. ✅ Increased body parser limits
5. ✅ Enhanced error handling
6. ✅ Verified multer configuration
7. ✅ Checked authentication middleware
8. ❌ **NOT DONE:** Check Nginx configuration
9. ❌ **NOT DONE:** Check Nginx error logs
10. ❌ **NOT DONE:** Test with a simple POST endpoint (not file upload)

---

## Next Steps to Resolve

### Priority 1: Check Nginx Configuration
```bash
# Check upload size limits
grep -r "client_max_body_size" /etc/nginx/

# Check timeout settings
grep -r "proxy_read_timeout\|proxy_connect_timeout" /etc/nginx/

# Check Nginx error logs
tail -50 /var/log/nginx/error.log
```

**Action:** If `client_max_body_size` is less than 25MB, increase it:
```nginx
client_max_body_size 50M;
```

### Priority 2: Test Simple POST Endpoint
Create a test route that doesn't use multer to verify POST requests work:
```javascript
router.post('/:id/record-images/test-post', (req, res) => {
  console.log('✅ TEST POST ROUTE HIT');
  res.json({ success: true, body: req.body });
});
```

### Priority 3: Check Nginx Error Logs
Look for specific errors when the upload is attempted:
```bash
tail -f /var/log/nginx/error.log
# Then attempt upload
```

### Priority 4: Fix MySQL Session Store
The session store is failing, which might cause authentication issues:
- Check MySQL credentials in `server/config/session.js`
- Verify MySQL user has proper permissions
- Or configure session store to use correct credentials

---

## Route Flow Diagram

```
Browser
  ↓
Nginx (Port 80/443)
  ↓ [PROBLEM: Request might be blocked here]
Express (Port 3001)
  ↓
Request Logger Middleware
  ↓ [Should log: 📤 POST Request]
Session Middleware
  ↓
Database Router Middleware
  ↓
Request Debugging Middleware
  ↓
Routes
  ↓
/api/admin/churches → churchesManagementRouter
  ↓
requireAuth Middleware
  ↓ [Should log: [AUTH] 🔐 Authentication check]
POST /:id/record-images Route Handler
  ↓ [Should log: 🚀 ROUTE HIT]
Multer Middleware (recordImageUpload.single('image'))
  ↓
Route Handler Logic
  ↓
Response
```

**Current State:** Request is not reaching the Express request logger middleware.

---

## Files Modified

### Backend
1. `server/routes/admin/churches.js` - Route handler, multer config, error handling
2. `server/src/index.ts` - Route registration, body parser limits, logging
3. `server/middleware/requireAuth.js` - Enhanced logging
4. `server/middleware/apiErrorHandler.js` - Error handler (already existed)

### Frontend
1. `front-end/src/features/church/FieldMapperPage.tsx` - Upload function (already existed)
2. `front-end/src/shared/lib/axiosInstance.ts` - FormData handling (modified earlier)

---

## Environment Variables

- `RECORD_IMAGES_DIR` - Base directory for record images (default: `/var/www/orthodoxmetrics/uploads/record-images`)
- `JWT_ACCESS_SECRET` - JWT secret for authentication
- `NODE_ENV` - Environment (production/development)

---

## Summary

**What Works:**
- ✅ Route is properly defined and registered
- ✅ Multer configuration is correct
- ✅ Error handling is comprehensive
- ✅ Logging is in place
- ✅ Authentication middleware is working (for GET requests)
- ✅ Other routes are accessible
- ✅ Nginx configuration: `client_max_body_size 50M` is set correctly
- ✅ Nginx is proxying `/api/` to `http://127.0.0.1:3001/api/`

**What Doesn't Work:**
- ❌ POST requests to `/api/admin/churches/:id/record-images` are not reaching Express
- ❌ POST requests to `/api/gallery/upload` are returning 500 errors
- ❌ Nginx is returning HTML 500 errors instead of proxying to Express
- ❌ No logs appear in PM2 when upload is attempted

**Root Cause Hypothesis:**
The request is being blocked or rejected by **Nginx** before it reaches the Express server. This is most likely due to:
1. `client_max_body_size` being too small (CHECKED: 50M is set, should be sufficient)
2. Timeout settings being too short
3. Nginx configuration issue with multipart/form-data handling
4. **NEW:** There are TWO different upload endpoints:
   - `/api/gallery/upload` - Used by Image Gallery feature (currently 500 error)
   - `/api/admin/churches/:id/record-images` - Used by Header Display Configuration (not reaching Express)

**Next Action:**
1. Check Nginx error logs when attempting gallery upload: `tail -f /var/log/nginx/error.log`
2. Verify gallery route is being hit in PM2 logs
3. Check if there are authentication requirements on gallery route
4. Test both endpoints separately to identify which one is actually failing

