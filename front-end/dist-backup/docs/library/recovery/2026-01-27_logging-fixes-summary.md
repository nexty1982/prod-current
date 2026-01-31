# Logging System Fixes - Summary

## Overview
This document summarizes the critical fixes applied to resolve logging system issues, including the "Cannot read properties of undefined (reading 'execute')" error and schema/database mismatches.

---

## Critical Issues Fixed

### 1. ✅ Fixed `promisePool` Undefined Error

**Problem**: 
- `dbLogger.js` imported `promisePool` from `db-compat.js`, but it doesn't exist
- This caused "Cannot read properties of undefined (reading 'execute')" errors

**Fix**: 
- Removed unused `promisePool` import
- Removed unused `omaiPool` (pointed to wrong database)
- Created `omaiLoggingPool` pointing to `om_logging_db` (canonical logging database)

**File**: `server/src/utils/dbLogger.js`
```diff
- const { promisePool } = require('../../config/db-compat');
- const omaiPool = mysql.createPool({
-   database: 'orthodoxmetrics_db',
+ const omaiLoggingPool = mysql.createPool({
+   database: 'om_logging_db',
```

---

### 2. ✅ Fixed Schema Mismatch (Writes vs Reads)

**Problem**: 
- `dbLogger.writeToDatabase()` wrote to `system_logs` table in `orthodoxmetrics_db`
- `dbLogger.getLogs()` read from `errors` table in `orthodoxmetrics_db` (but table didn't exist there)
- Ultimate Logger UI reads from `errors` table in `om_logging_db`
- Result: Logs written via `dbLogger` were invisible to Ultimate Logger UI

**Fix**: 
- Updated `writeToDatabase()` to write to `errors` table in `om_logging_db` with hash-based deduplication
- Updated `getLogs()` to read from `errors` table in `om_logging_db`
- Aligned with `api/logger.js` pattern (canonical logging system)

**File**: `server/src/utils/dbLogger.js`

**Key Changes**:
1. `writeToDatabase()` now:
   - Creates hash for deduplication (matching `api/logger.js`)
   - Writes to `om_logging_db.errors` table
   - Updates existing entries or creates new ones
   - Creates `error_events` records

2. `getLogs()` now:
   - Queries `om_logging_db.errors` table (via `omaiLoggingPool`)
   - Returns data in format expected by Ultimate Logger UI

---

### 3. ✅ Fixed Database Selection

**Problem**: 
- `dbLogger` used `getAppPool()` which connects to `orthodoxmetrics_db`
- Ultimate Logger UI expects logs from `om_logging_db`
- Two separate databases with no sync

**Fix**: 
- `dbLogger` now uses `omaiLoggingPool` (connects to `om_logging_db`)
- All logging writes go to `om_logging_db.errors` table
- All logging reads come from `om_logging_db.errors` table
- Single canonical logging database

---

### 4. ✅ Fixed Initialization

**Problem**: 
- `initializeDatabase()` tried to create `system_logs` table in `orthodoxmetrics_db`
- SQL file path might not exist in production
- No verification that `errors` table exists

**Fix**: 
- Removed SQL file reading (table should exist from `api/logger.js`)
- Added verification that `errors` table exists in `om_logging_db`
- Graceful fallback if table doesn't exist (logs will fail gracefully with fallback file)

---

## Files Modified

### `server/src/utils/dbLogger.js`
- Removed `promisePool` import (undefined)
- Removed `omaiPool` (wrong database)
- Added `omaiLoggingPool` (connects to `om_logging_db`)
- Added `crypto` import for hash generation
- Updated `writeToDatabase()` to use `errors` table with deduplication
- Updated `getLogs()` to query `om_logging_db.errors`
- Updated `cleanupOldLogs()` to clean `errors` table
- Updated `initializeDatabase()` to verify `errors` table exists

---

## Testing Checklist

After deploying these fixes, verify:

1. ✅ **No more "execute undefined" errors**
   - Check `db-logger-fallback.log` for errors
   - Should see no "Cannot read properties of undefined" errors

2. ✅ **Logs appear in Ultimate Logger UI**
   - Write a log via `dbLogger.info('test', 'Test message')`
   - Check `/church/omai-logger` UI
   - Log should appear in real-time

3. ✅ **Deduplication works**
   - Write same log message multiple times
   - Check `errors` table: `occurrences` should increment
   - Only one row per unique hash

4. ✅ **Database writes succeed**
   - Check `om_logging_db.errors` table has new rows
   - Check `om_logging_db.error_events` table has event records

5. ✅ **Fallback logging works**
   - Temporarily break DB connection
   - Verify logs go to `server/logs/db-logger-fallback.log`
   - Restore connection, verify buffered logs flush

---

## Migration Notes

### Existing `system_logs` Data
- Old logs in `orthodoxmetrics_db.system_logs` are not migrated automatically
- If needed, create migration script to:
  1. Read from `orthodoxmetrics_db.system_logs`
  2. Transform to `errors` table format (create hash, map fields)
  3. Insert into `om_logging_db.errors`
  4. Create corresponding `error_events` records

### Backward Compatibility
- `dbLogger` API remains the same (`info()`, `error()`, etc.)
- No changes needed to code using `dbLogger`
- Only internal implementation changed

---

## Next Steps (Optional Cleanup)

1. **Remove unused `system_logs` table** (after migration if needed)
2. **Consolidate logging endpoints** (consider deprecating `/api/logs/database` in favor of `/api/logger/logs`)
3. **Remove duplicate logging paths** (Winston transports can all use `dbLogger`)
4. **Add monitoring** for logging system health (alert if fallback file grows)

---

## Deployment Commands

```bash
# Rebuild server
cd server
npm run build

# Restart PM2
pm2 restart orthodoxmetrics

# Verify logs
tail -f ~/.pm2/logs/orthodoxmetrics-out.log | grep -i "database logger"
tail -f server/logs/db-logger-fallback.log
```

---

## Summary

All critical logging issues have been fixed:
- ✅ `promisePool` undefined error resolved
- ✅ Schema mismatch resolved (writes and reads now use same table)
- ✅ Database mismatch resolved (all logging uses `om_logging_db`)
- ✅ Hash-based deduplication implemented
- ✅ Ultimate Logger UI will now show all logs written via `dbLogger`

The logging system is now unified: all logs go to `om_logging_db.errors` table and are visible in the Ultimate Logger UI.

