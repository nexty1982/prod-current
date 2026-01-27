# Centralized Configuration Implementation

## Summary

Successfully implemented a centralized configuration system for the OrthodoxMetrics backend server, migrating from scattered `.env` usage to a validated, type-safe configuration layer.

---

## Files Created

### 1. `server/src/config/schema.ts`
- Defines Zod schemas for all configuration sections
- Provides type-safe validation and defaults
- Structure:
  - `server` - Server settings (env, port, host, baseUrl, trustProxy)
  - `db.app` - App database configuration
  - `db.auth` - Auth database configuration (separate from app)
  - `session` - Session configuration
  - `cors` - CORS settings
  - `paths` - File system paths
  - `features` - Feature flags

### 2. `server/src/config/redact.ts`
- Helper functions to safely log configuration
- Automatically redacts secrets (passwords, tokens, keys, etc.)
- Formats config as JSON for console logging

### 3. `server/src/config/index.ts`
- Main configuration loader
- Maps legacy `.env` variables to canonical structure
- Validates configuration with Zod
- Freezes config object to prevent mutations
- Logs redacted config at startup

### 4. `server/CONFIG.md`
- Complete documentation of configuration system
- Environment variable mapping table
- Usage examples
- Migration guide
- Troubleshooting

---

## Files Modified

### 1. `server/config/db.js`
- Updated to use centralized config
- Falls back to `process.env` if config not available (backward compatible)
- Uses `config.db.app` for app database
- Uses `config.db.auth` for auth database (separate)

### 2. `server/config/session.js`
- Updated to use centralized config
- Uses `config.db.auth` for session store (auth database)
- Uses `config.session` for session settings
- Falls back to `process.env` if config not available

### 3. `server/src/index.ts`
- Loads centralized config at startup
- Uses `config.server` for port, host, trustProxy
- Uses `config.cors` for CORS settings
- Added `/api/system/health` endpoint (enhanced)
- Added `/api/system/config` endpoint (redacted, admin/dev only)

---

## Configuration Structure

```typescript
{
  server: {
    env: 'development' | 'production' | 'test',
    port: number,
    host: string,
    baseUrl?: string,
    trustProxy: boolean
  },
  db: {
    app: { host, user, password, database, port },
    auth: { host, user, password, database, port }  // Separate!
  },
  session: {
    secret: string,
    cookieName: string,
    cookieDomain?: string,
    secure: boolean,
    sameSite: 'strict' | 'lax' | 'none',
    maxAgeMs: number,
    store: 'memory' | 'mysql'
  },
  cors: {
    allowedOrigins: string[],
    credentials: boolean
  },
  paths: {
    imagesRoot?: string,
    docsRoot?: string,
    uploadsRoot?: string,
    tempRoot?: string
  },
  features: {
    interactiveReports: boolean,
    notifications: boolean,
    ocr: boolean,
    certificates: boolean,
    invoices: boolean
  }
}
```

---

## Environment Variable Mapping

### Legacy → Canonical

| Legacy .env | Canonical Path |
|------------|----------------|
| `NODE_ENV` | `config.server.env` |
| `PORT` | `config.server.port` |
| `HOST` | `config.server.host` |
| `TRUST_PROXY` | `config.server.trustProxy` |
| `DB_HOST` | `config.db.app.host` |
| `DB_USER` | `config.db.app.user` |
| `DB_PASSWORD` | `config.db.app.password` |
| `DB_NAME` | `config.db.app.database` |
| `DB_PORT` | `config.db.app.port` |
| `AUTH_DB_HOST` | `config.db.auth.host` |
| `AUTH_DB_USER` | `config.db.auth.user` |
| `AUTH_DB_PASSWORD` | `config.db.auth.password` |
| `AUTH_DB_NAME` | `config.db.auth.database` |
| `AUTH_DB_PORT` | `config.db.auth.port` |
| `SESSION_SECRET` | `config.session.secret` |
| `SESSION_COOKIE_NAME` | `config.session.cookieName` |
| `CORS_ORIGINS` | `config.cors.allowedOrigins` |
| `FRONTEND_URL` | `config.cors.allowedOrigins` (added to list) |

**Full mapping table:** See `server/CONFIG.md`

---

## Backward Compatibility

✅ **Fully backward compatible:**
- All existing `.env` variables continue to work
- Code falls back to `process.env` if config module fails to load
- No breaking changes to existing functionality

---

## Startup Logging

At server startup, you'll see:

```
✅ Loaded server configuration:
{
  "server": {
    "env": "production",
    "port": 3001,
    "host": "0.0.0.0",
    "trustProxy": true
  },
  "db": {
    "app": {
      "host": "localhost",
      "user": "orthodoxapps",
      "password": "***12 chars***",  // Redacted!
      "database": "orthodoxmetrics_db",
      "port": 3306
    },
    "auth": {
      "host": "localhost",
      "user": "orthodoxapps",
      "password": "***12 chars***",  // Redacted!
      "database": "orthodoxmetrics_auth_db",
      "port": 3306
    }
  },
  ...
}
```

**Secrets are automatically redacted** for safe logging.

---

## New Endpoints

### GET /api/system/health
Enhanced health check with memory usage:
```json
{
  "status": "ok",
  "uptime": 3600,
  "timestamp": "2025-01-XX...",
  "database": { "success": true, "message": "..." },
  "memory": {
    "heapUsed": 45,
    "heapTotal": 67,
    "rss": 120
  }
}
```

### GET /api/system/config
Returns redacted configuration (admin/dev only):
```json
{
  "config": { ...redacted config... },
  "environment": "production",
  "timestamp": "2025-01-XX..."
}
```

**Access:** Requires admin role OR development environment.

---

## Build & Verification

### Build Process
The config module is compiled by TypeScript:
- `server/src/config/*.ts` → `server/dist/src/config/*.js`

### Verification Steps

1. **Build backend:**
   ```bash
   cd server
   npm run build
   ```

2. **Check compiled output:**
   ```bash
   ls -la server/dist/src/config/
   # Should show: index.js, schema.js, redact.js
   ```

3. **Start server and check logs:**
   ```bash
   pm2 restart orthodox-backend
   pm2 logs orthodox-backend | grep "Loaded server configuration"
   ```
   
   Expected output:
   ```
   ✅ Loaded server configuration:
   { ...redacted config JSON... }
   ```

4. **Test endpoints:**
   ```bash
   curl http://127.0.0.1:3001/api/system/health
   curl http://127.0.0.1:3001/api/system/config
   ```

---

## Migration Status

### ✅ Completed
- [x] Config schema with Zod validation
- [x] Secret redaction helper
- [x] Config loader with backward compatibility
- [x] Database config migration (`db.js`)
- [x] Session config migration (`session.js`)
- [x] Server/CORS config migration (`index.ts`)
- [x] System health/config endpoints
- [x] Documentation (`CONFIG.md`)

### 🔄 Not Yet Migrated (Future Work)
- Other modules still using `process.env` directly
- Paths configuration usage
- Feature flags usage

**Note:** This is intentional - only foundational pieces were migrated as requested.

---

## Usage in Code

### Importing Config

```javascript
// In any file
const config = require('./config');  // or '../config' depending on location

// Access configuration
const port = config.server.port;
const dbHost = config.db.app.host;
const authDbHost = config.db.auth.host;  // Separate auth DB
```

### Config is Frozen

```javascript
// ❌ This will fail (config is frozen)
config.server.port = 9999;  // Not allowed

// ✅ Use environment variables instead
process.env.PORT = '9999';  // Then restart server
```

---

## Production Checklist

- [ ] Verify config loads at startup (check logs)
- [ ] Verify secrets are redacted in logs
- [ ] Set `SESSION_SECRET` to strong value (min 8 chars)
- [ ] Configure separate `AUTH_DB_*` variables
- [ ] Test `/api/system/health` endpoint
- [ ] Verify `/api/system/config` requires authentication
- [ ] Confirm server starts without errors

---

## Troubleshooting

### Config Not Loading

**Symptom:** Server starts but no "Loaded server configuration" log

**Check:**
1. Verify TypeScript compilation: `ls -la server/dist/src/config/`
2. Check for compilation errors: `npm run build`
3. Verify zod is installed: `npm list zod`

### Validation Errors

**Symptom:** `❌ Configuration validation failed`

**Fix:**
1. Check error message for which field failed
2. Verify environment variable is set correctly
3. Check data types (numbers must be numeric)

### Secrets in Logs

**Symptom:** Actual passwords appear in logs

**Fix:**
1. Check `server/src/config/redact.ts` - ensure field names are in `SECRET_FIELDS`
2. Verify redaction is working (should see `***N chars***`)

---

## Next Steps (Future)

1. Migrate remaining modules to use centralized config
2. Add config validation at startup (warn about missing required vars)
3. Add config hot-reload for development (optional)
4. Create config migration script to help users migrate .env files

---

**Implementation Complete** ✅

**Status:** Production-ready, backward compatible, fully documented
