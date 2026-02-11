# Logging System Map

## Overview
This document maps the end-to-end logging architecture, identifying all entry points, data sinks, and configuration.

---

## 1. Logging Entry Points

### A. Backend Logging Sources

#### 1.1 `dbLogger.js` (Centralized Database Logger)
- **Location**: `server/src/utils/dbLogger.js`
- **Purpose**: Primary logging utility for backend services
- **Writes to**: `system_logs` table in `orthodoxmetrics_db`
- **Used by**: 
  - Winston transports (`api/logs.js`)
  - Direct imports across backend modules
  - `dbLogger.info()`, `dbLogger.error()`, etc.

#### 1.2 `api/logger.js` (OMAI Error Tracking API)
- **Location**: `server/src/api/logger.js`
- **Purpose**: Deduplicated error tracking with hash-based aggregation
- **Writes to**: `errors` and `error_events` tables in `om_logging_db`
- **Endpoints**:
  - `POST /api/logger` - Create/update log entry
  - `POST /api/logger/client` - Frontend console logs
  - `POST /api/logger/batch` - Batch debug logs
  - `GET /api/logger/logs` - Read logs
  - `GET /api/logger/realtime` - Real-time logs
  - `GET /api/logger/critical` - Critical events

#### 1.3 Winston Transports (`api/logs.js`)
- **Location**: `server/src/api/logs.js`
- **Purpose**: Component-specific loggers with DatabaseTransport
- **Writes to**: `system_logs` via `dbLogger`
- **Components**: Authentication, Database, API Server, Email Service, File Upload

#### 1.4 Request Middleware (`middleware/logger.js`)
- **Location**: `server/src/middleware/logger.js`
- **Purpose**: HTTP request/response logging
- **Writes to**: In-memory `recentLogs` array + `dbLogger` via `logMessage()`

#### 1.5 Build Console Logs
- **Location**: `server/src/api/build.js`
- **Purpose**: Build execution output
- **Writes to**: 
  - `server/logs/builds/*.log` (files)
  - `build-history.json` (JSON file)
  - Console output (PM2 captures)

#### 1.6 File-based Logger (`utils/logger.js`)
- **Location**: `server/src/utils/logger.js`
- **Purpose**: Encrypted storage logging (Big Book system)
- **Writes to**: `/var/www/orthodox-church-mgmt/orthodoxmetrics/prod/bigbook/logs/encrypted-storage.log`

---

### B. Frontend Logging Sources

#### 2.1 Frontend Console Interceptor
- **Sends to**: `POST /api/logger/client`
- **Destination**: `errors` table in `om_logging_db`

#### 2.2 Error Boundaries
- **Sends to**: `POST /api/logs/client-errors`, `POST /api/logs/admin-errors`
- **Destination**: In-memory `recentLogs` + `dbLogger`

---

## 2. Data Sinks (Where Logs Go)

### A. Database Tables

#### 2.1 `system_logs` Table
- **Database**: `orthodoxmetrics_db` (via `getAppPool()`)
- **Schema**: Append-only log entries
- **Written by**: `dbLogger.js`, Winston transports
- **Read by**: `api/logs.js` (via `dbLogger.getLogs()` - **BUT MISMATCH: reads from `errors` table**)
- **Location**: `orthodoxmetrics_db.system_logs`

#### 2.2 `errors` Table
- **Database**: `om_logging_db` (via `errorTrackingDb` pool)
- **Schema**: Deduplicated error tracking with hash, occurrences, status
- **Written by**: `api/logger.js` (all endpoints)
- **Read by**: `api/logger.js` endpoints, `dbLogger.getLogs()` (line 270)
- **Location**: `om_logging_db.errors`

#### 2.3 `error_events` Table
- **Database**: `om_logging_db`
- **Schema**: Individual event records linked to `errors` table
- **Written by**: `api/logger.js`
- **Read by**: Not currently exposed via API

---

### B. File System

#### 3.1 Build Logs
- **Path**: `server/logs/builds/*.log`
- **Written by**: `api/build.js`
- **Format**: Plain text build output

#### 3.2 Fallback Logs
- **Path**: `server/logs/db-logger-fallback.log`
- **Written by**: `dbLogger.js` when DB write fails
- **Format**: JSON lines with `fallback_reason`

#### 3.3 Debug Logs (if enabled)
- **Path**: `/var/log/omai/debug-YYYYMMDD.log`
- **Written by**: `api/logger.js` (batch endpoint, debug mode)
- **Format**: Plain text

#### 3.4 Encrypted Storage Logs
- **Path**: `/var/www/orthodox-church-mgmt/orthodoxmetrics/prod/bigbook/logs/encrypted-storage.log`
- **Written by**: `utils/logger.js`
- **Format**: JSON lines

#### 3.5 PM2 Logs
- **Path**: PM2 default log directory (typically `~/.pm2/logs/`)
- **Captures**: All `console.log/error/warn` output
- **Format**: PM2 log format

---

## 3. Database Pool Configuration

### 3.1 `getAppPool()` (Primary App Database)
- **Config**: `server/config/db.js`
- **Database**: `orthodoxmetrics_db` (from `DB_NAME` env var)
- **Used by**: 
  - `dbLogger.js` (writes to `system_logs`)
  - Most backend modules
- **Connection**: `mysql2/promise` pool

### 3.2 `errorTrackingDb` (OMAI Logging Database)
- **Config**: `server/src/api/logger.js` (line 11-21)
- **Database**: `om_logging_db` (hardcoded)
- **Used by**: `api/logger.js` endpoints
- **Connection**: `mysql2/promise` pool

### 3.3 `omaiPool` (Legacy/Unused)
- **Config**: `server/src/utils/dbLogger.js` (line 10-20)
- **Database**: `orthodoxmetrics_db` (hardcoded, same as `getAppPool()`)
- **Used by**: `dbLogger.getLogs()` (line 327) - **BUT NEVER ACTUALLY USED** (always uses `getAppPool()`)

---

## 4. Root Cause Analysis

### 4.1 "Cannot read properties of undefined (reading 'execute')" Error

**Location**: `server/src/utils/dbLogger.js:4`
```javascript
const { promisePool } = require('../../config/db-compat');
```

**Problem**: 
- `db-compat.js` does NOT export `promisePool`
- It only exports `{ getAppPool, getAuthPool, pool: { query, execute } }`
- `promisePool` is `undefined`, so any code trying to use it fails

**Impact**: 
- Line 327: `const dbPool = useOmaiDatabase ? omaiPool : promisePool;` - `promisePool` is undefined
- However, line 328 immediately uses `getAppPool()` instead, so this bug is masked

**Fix**: Remove unused `promisePool` import, use `getAppPool()` consistently

---

### 4.2 Schema Mismatch: Writes vs Reads

**Problem**: 
- `dbLogger.writeToDatabase()` writes to `system_logs` table (line 106)
- `dbLogger.getLogs()` reads from `errors` table (line 270)
- These are different tables in different databases!

**Impact**:
- Logs written via `dbLogger.info/error()` never appear in `dbLogger.getLogs()` results
- Ultimate Logger UI (which uses `/api/logger/logs`) shows `errors` table data, not `system_logs`
- Two separate logging systems that don't talk to each other

**Fix**: 
- **Option A**: Make `dbLogger` write to `errors` table in `om_logging_db` (align with API)
- **Option B**: Make `dbLogger.getLogs()` read from `system_logs` table (align with writes)
- **Recommended**: Option A - use deduplicated `errors` table as canonical source

---

### 4.3 Database Selection Mismatch

**Problem**:
- `dbLogger.js` writes to `orthodoxmetrics_db.system_logs` (via `getAppPool()`)
- `api/logger.js` writes to `om_logging_db.errors` (via `errorTrackingDb`)
- Ultimate Logger UI reads from `om_logging_db.errors` (via `/api/logger/logs`)
- Therefore, `dbLogger` writes are invisible to Ultimate Logger UI

**Fix**: 
- Make `dbLogger` write to `om_logging_db.errors` table (or create unified logging DB)
- Or create migration to sync `system_logs` → `errors` table

---

## 5. Configuration Summary

### Environment Variables
- `DB_HOST` - Database host (default: `localhost`)
- `DB_USER` - Database user (default: `orthodoxapps`)
- `DB_PASSWORD` - Database password
- `DB_NAME` - App database name (default: `orthodoxmetrics_db`)
- `AUTH_DB_NAME` - Auth database name (defaults to `DB_NAME`)
- `DEBUG_MODE` - Enable debug file logging (default: `false`)

### File Paths (Production)
- Build logs: `server/logs/builds/`
- Fallback logs: `server/logs/db-logger-fallback.log`
- Debug logs: `/var/log/omai/` (if enabled)
- Encrypted storage: `/var/www/orthodox-church-mgmt/orthodoxmetrics/prod/bigbook/logs/`

---

## 6. Current State Issues

### Critical Issues (Must Fix)
1. ✅ **`promisePool` undefined** - Import error in `dbLogger.js`
2. ✅ **Schema mismatch** - Writes to `system_logs`, reads from `errors`
3. ✅ **Database mismatch** - Writes to `orthodoxmetrics_db`, reads from `om_logging_db`
4. ✅ **`dbLogger.getLogs()` queries wrong table** - Should query `system_logs` if using Option B

### Medium Priority (Cleanup)
1. Remove unused `omaiPool` in `dbLogger.js`
2. Consolidate logging to single database (`om_logging_db`)
3. Remove duplicate logging paths (Winston + dbLogger + api/logger)
4. Align Ultimate Logger UI with chosen canonical schema

---

## 7. Recommended Architecture

### Single Canonical Logging System
- **Database**: `om_logging_db`
- **Table**: `errors` (deduplicated with hash)
- **Write Path**: All loggers → `api/logger.js` endpoints → `om_logging_db.errors`
- **Read Path**: Ultimate Logger UI → `/api/logger/logs` → `om_logging_db.errors`
- **Migration**: 
  - Update `dbLogger.js` to write to `om_logging_db.errors` via `api/logger.js` endpoints (or direct DB)
  - Deprecate `system_logs` table (or migrate existing data)

---

## 8. Next Steps

1. Fix `promisePool` import error
2. Choose canonical schema (`errors` table recommended)
3. Update `dbLogger.js` to write to chosen schema
4. Update `dbLogger.getLogs()` to read from chosen schema
5. Test end-to-end: write → read → UI display
6. Migrate existing `system_logs` data if needed
7. Remove duplicate/unused logging code

