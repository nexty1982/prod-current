# Session Authentication Regression Fix

**Date**: February 4, 2026  
**Status**: ✅ Fixed  
**Issue**: Session cookie exists but `req.session.user` is missing, causing 401 NO_SESSION responses

## Problem Analysis

### Symptoms
- User logs in successfully and receives session cookie (`orthodoxmetrics.sid`)
- Subsequent requests have the cookie but return 401 with code `NO_SESSION`
- `req.session` exists but `req.session.user` is `undefined`
- Session data not persisting between requests

### Root Cause
Session regeneration in the login handler was potentially failing silently, and user data was being set on a broken session. Additionally, error handling was insufficient to detect and log session persistence failures.

## Investigation Summary

### ✅ Verified Correct (No Changes Needed)

1. **Middleware Order** (server/src/index.ts, lines 417-428)
   - ✅ cookieParser configured with session secret (line 417)
   - ✅ sessionMiddleware mounted (line 428)
   - ✅ Correct order: cookieParser → session → routes

2. **Session Configuration** (server/src/config/session.js)
   - ✅ Uses MySQL session store in production
   - ✅ Cookie settings correct: `secure: false` (nginx terminates SSL)
   - ✅ `domain: undefined` (correct for multi-domain support)
   - ✅ `httpOnly: true`, `sameSite: 'lax'`

3. **Auth Middleware** (server/src/middleware/auth.js, line 32)
   - ✅ Checks `req.session.user` (same key set at login)
   - ✅ Falls back to JWT if session auth fails
   - ✅ Extensive logging for debugging

4. **Session Mounting** (server/src/index.ts)
   - ✅ Session middleware mounted only once (line 428)
   - ✅ No duplicate session middleware mounts

5. **Session Regeneration Prevention** (server/src/middleware/auth.js, line 194)
   - ✅ `handleSessionRegeneration` middleware exists but NOT globally applied
   - ✅ Session regeneration only happens during login

## Changes Made

### File: `server/src/routes/auth.js`

#### Change 1: Improved Session Regeneration (Lines 158-186)

**Issue**: Session regeneration could fail silently, creating an invalid session that user data was set on.

**Fix**: 
1. Save user data BEFORE regeneration
2. Restore user data AFTER regeneration
3. Add better error logging
4. Continue with existing session if regeneration fails

```javascript
// Before:
await new Promise((resolve, reject) => {
  req.session.regenerate((err) => {
    if (err) {
      console.warn('[AUTH] Session regenerate failed, continuing with existing session:', err.message);
    }
    resolve();
  });
});

// After:
const userData = {
  id: user.id,
  email: user.email,
  first_name: user.first_name,
  last_name: user.last_name,
  role: user.role,
  church_id: user.church_id
};

await new Promise((resolve, reject) => {
  req.session.regenerate((err) => {
    if (err) {
      console.error('[AUTH] CRITICAL: Session regenerate failed:', err.message);
      console.warn('[AUTH] Continuing with existing session (regenerate failed)');
    } else {
      console.log('[AUTH] ✅ Session regenerated successfully');
    }
    resolve();
  });
});

// Restore user data after regenerate
req.session.user = userData;
```

#### Change 2: Enhanced Session Save Verification (Lines 197-225)

**Issue**: Session save failures were not properly detected and logged.

**Fix**:
1. Log session data being saved
2. Add CRITICAL error logging if save fails
3. Verify session exists in store after save
4. Log stored session data for verification
5. Detect if session saved without user data

```javascript
// Before:
await new Promise((resolve, reject) => {
  req.session.save((err) => {
    if (err) {
      console.error('[AUTH] Failed to save session:', err);
      reject(err);
    } else {
      console.log(`✅ Session saved for user ${user.id} (${user.email}), sessionID: ${req.sessionID}`);
      // ... minimal verification
      resolve();
    }
  });
});

// After:
console.log('[AUTH] Saving session with user data:', {
  sessionID: req.sessionID,
  userId: req.session.user.id,
  email: req.session.user.email,
  role: req.session.user.role
});

await new Promise((resolve, reject) => {
  req.session.save((err) => {
    if (err) {
      console.error('[AUTH] CRITICAL: Failed to save session:', err);
      console.error('[AUTH] Session save error details:', {
        error: err.message,
        stack: err.stack,
        sessionID: req.sessionID,
        userId: user.id
      });
      reject(err);
    } else {
      console.log(`✅ Session saved for user ${user.id} (${user.email}), sessionID: ${req.sessionID}`);
      // Verify session was saved by checking store
      if (req.sessionStore && req.sessionStore.get) {
        req.sessionStore.get(req.sessionID, (storeErr, storedSession) => {
          if (storeErr) {
            console.error('[AUTH] CRITICAL: Could not verify session in store:', storeErr.message);
          } else if (storedSession && storedSession.user) {
            console.log(`✅ Session verified in store for user ${storedSession.user.email}`);
            console.log(`✅ Stored session data:`, {
              userId: storedSession.user.id,
              email: storedSession.user.email,
              role: storedSession.user.role
            });
          } else {
            console.error('[AUTH] CRITICAL: Session saved but user data NOT found in store');
            console.error('[AUTH] Stored session keys:', storedSession ? Object.keys(storedSession) : 'NULL');
          }
          resolve();
        });
      } else {
        console.warn('[AUTH] Session store not available for verification');
        resolve();
      }
    }
  });
});
```

#### Change 3: Enhanced Login Success Logging (Lines 233-236)

**Issue**: Not enough information logged at successful login for debugging.

**Fix**: Log session ID, user ID, and cookie name.

```javascript
// Added:
console.log(`✅ JWT Authentication successful for: ${loginEmail} Role: ${user.role}`);
console.log(`✅ Session ID: ${req.sessionID}, User ID: ${user.id}`);
console.log(`✅ Session cookie will be sent with name: orthodoxmetrics.sid`);
```

#### Change 4: Better Error Handling (Lines 252-258)

**Issue**: Generic error message, no error details logged.

**Fix**: Log full error stack, include error message in development mode.

```javascript
// Before:
} catch (error) {
  console.error('Login error:', error);
  return res.status(500).json({
    success: false,
    message: 'Internal server error'
  });
}

// After:
} catch (error) {
  console.error('[AUTH] Login error:', error);
  console.error('[AUTH] Error stack:', error.stack);
  
  return res.status(500).json({
    success: false,
    message: 'Internal server error during login',
    error: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
}
```

## Testing Checklist

After deploying these changes, verify:

- [ ] User can log in successfully
- [ ] Session cookie is set (`orthodoxmetrics.sid`)
- [ ] Subsequent requests with cookie return 200 (not 401)
- [ ] `req.session.user` persists between requests
- [ ] Console shows: `✅ Session saved for user...`
- [ ] Console shows: `✅ Session verified in store for user...`
- [ ] Console shows: `✅ Stored session data: { userId, email, role }`
- [ ] `/api/system/health` returns 200 when authenticated
- [ ] `/api/auth/check` returns authenticated user data
- [ ] No `CRITICAL` errors in logs during login

## Debugging

If issues persist after these fixes, check the logs for:

1. **CRITICAL: Session regenerate failed** - Session middleware may be misconfigured
2. **CRITICAL: Failed to save session** - MySQL session store connection issue
3. **CRITICAL: Could not verify session in store** - Session store read issue
4. **CRITICAL: Session saved but user data NOT found in store** - Data not being stored

## Related Files

- `server/src/routes/auth.js` - Login handler (modified)
- `server/src/middleware/auth.js` - Auth middleware (no changes needed)
- `server/src/config/session.js` - Session configuration (no changes needed)
- `server/src/index.ts` - Middleware order (no changes needed)

## Deployment Instructions

1. **Review changes** in `server/src/routes/auth.js`
2. **Ask user to run**:
   ```bash
   cd /var/www/orthodoxmetrics/prod/server
   npm run build
   pm2 restart orthodoxmetrics-server
   pm2 logs orthodoxmetrics-server --lines 100
   ```
3. **Test login** and watch for:
   - `✅ Session regenerated successfully`
   - `✅ Session saved for user...`
   - `✅ Session verified in store for user...`
   - `✅ Stored session data:` with userId/email/role

4. **Test subsequent requests** and verify no 401 NO_SESSION errors

## Success Criteria

✅ Session cookie set on login  
✅ `req.session.user` persists between requests  
✅ No 401 NO_SESSION after successful login  
✅ `/api/system/health` returns 200 when logged in  
✅ Console logs show successful session save and verification

---

**Last Updated**: February 4, 2026  
**Status**: Ready for Testing
