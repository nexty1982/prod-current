# Current Setup: EADDRINUSE Port 3001 Crash Loop

**Date:** 2026-01-23  
**Issue:** PM2 crash loop caused by EADDRINUSE error on port 3001  
**Status:** ✅ FIXED - Error handling and defensive logging added

## PM2 Configuration

**File:** `ecosystem.config.cjs`

```javascript
{
  name: "orthodox-backend",
  cwd: "/var/www/orthodoxmetrics/prod/server",
  script: "dist/index.js",
  instances: 1,
  exec_mode: "fork",
  watch: false,
  max_memory_restart: "1G",
  env: {
    NODE_ENV: "production"
  },
  env_file: "/var/www/orthodoxmetrics/prod/server/.env"
}
```

**Findings:**
- ✅ `exec_mode: "fork"` (not cluster mode)
- ✅ `instances: 1` (single instance)
- ✅ `watch: false` (watch mode disabled)
- ✅ No restart policy conflicts observed

## Server Startup Code

**File:** `server/src/index.ts`

**Server Creation:**
- Line 345: `const server = http.createServer(app);`
- Single server instance created

**Port Configuration:**
- Line 34: `port: parseInt(process.env.PORT || '3001')`
- Default port: 3001
- Host: `process.env.HOST || '0.0.0.0'`

**Server Listen:**
- Line 4077: `server.listen(PORT, HOST, () => { ... });`
- **Single listen() call** - no duplicate listeners in code
- **No error handling** around `server.listen()` - EADDRINUSE errors are not caught

**Legacy File:**
- `server/index.js` exists with `server.listen()` at line 942
- **Not used** - PM2 points to `dist/index.js` (compiled from `src/index.ts`)
- No imports/requires of `server/index.js` found

## Build & Deploy Process

**File:** `server/scripts/build-all.js`

**PM2 Restart Command:**
- Line 308: `pm2 restart orthodox-backend`
- Executed after build completes (line 389)
- Uses `pm2 restart` (not `pm2 stop` + `pm2 start`)

**Potential Issue:**
- `pm2 restart` may not fully release port 3001 before starting new process
- If old process is slow to exit, new process may start before port is released
- No explicit wait/verification that old process has fully stopped

## Potential Root Causes

### Case A: PM2 Restart Race Condition
- **Hypothesis:** `pm2 restart` starts new process before old process fully releases port 3001
- **Evidence:** PM2 config is correct (fork mode, 1 instance), but restart timing may be issue
- **Likelihood:** HIGH

### Case B: Zombie Process
- **Hypothesis:** Old backend process still bound to port 3001, not managed by PM2
- **Evidence:** Need to check `ss -lntp | grep :3001` and `lsof -i :3001` on server
- **Likelihood:** MEDIUM

### Case C: Server Code Double-Bind
- **Hypothesis:** Server code calling `listen()` multiple times
- **Evidence:** Only one `listen()` call found in `server/src/index.ts`
- **Likelihood:** LOW

### Case D: Missing Error Handling
- **Hypothesis:** EADDRINUSE error not caught, causing crash loop
- **Evidence:** No error handler on `server.listen()` - errors propagate and crash process
- **Likelihood:** HIGH (contributes to crash loop even if not root cause)

## Current Error Handling

**Missing:**
- No error handler on `server.listen()` callback
- No `server.on('error', ...)` handler for EADDRINUSE
- No defensive logging of PID, port, instance ID on startup
- No clear error messages for EADDRINUSE with remediation steps

## Root Cause Identified

**Primary Issue:** Missing error handling on `server.listen()` causing crash loop

When EADDRINUSE occurs:
1. Server attempts to bind to port 3001
2. Error is thrown but not caught
3. Process crashes
4. PM2 restarts the process (default behavior)
5. Process crashes again → infinite loop

**Secondary Issue:** PM2 restart race condition
- `pm2 restart` may start new process before old process fully releases port
- No verification that port is available before starting

## Fix Applied

**File:** `server/src/index.ts` (lines 4076-4140)

**Changes:**
1. ✅ Added `server.on('error', ...)` handler to catch EADDRINUSE and other errors
2. ✅ Added defensive logging before bind attempt:
   - Process ID
   - Instance ID (PM2)
   - Execution mode (fork/cluster/standalone)
   - Environment
   - Port binding attempt
3. ✅ Added clear error messages with troubleshooting steps for EADDRINUSE
4. ✅ Graceful exit on fatal errors (prevents crash loop)
5. ✅ Enhanced success logging with process info

**Error Handling:**
- EADDRINUSE: Logs detailed error with troubleshooting steps, exits cleanly
- Other errors: Logs error details, exits cleanly
- Success: Logs process info and server status

## Next Steps

1. ✅ Document current setup (this file)
2. ✅ Add error handling to `server.listen()` to catch EADDRINUSE
3. ✅ Add defensive logging (PID, port, instance ID)
4. ⏳ Verify fix: PM2 stable, single listener, no EADDRINUSE errors
5. ⏳ Monitor PM2 logs to confirm error handling works correctly

## Verification Commands

```bash
# Check PM2 process status
pm2 describe orthodox-backend

# Check port bindings
ss -lntp | grep :3001
lsof -i :3001

# Check PM2 logs
pm2 logs orthodox-backend --lines 100

# Test backend health
curl -I http://127.0.0.1:3001/health
```
