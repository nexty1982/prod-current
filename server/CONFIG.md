# OrthodoxMetrics Server Configuration

## Overview

The server uses a **centralized configuration system** that loads and validates settings from environment variables. This provides:

- ✅ **Type safety** with Zod validation
- ✅ **Backward compatibility** with existing `.env` keys
- ✅ **Secret redaction** for safe logging
- ✅ **Frozen config** to prevent runtime mutations
- ✅ **Clear defaults** for all settings

## Configuration Structure

### Server Configuration

```typescript
config.server: {
  env: 'development' | 'production' | 'test',
  port: number,              // Default: 3001
  host: string,             // Default: '0.0.0.0'
  baseUrl?: string,          // Optional base URL
  trustProxy: boolean,       // Default: true
}
```

### Database Configuration

**App Database** (main application data):
```typescript
config.db.app: {
  host: string,              // Default: 'localhost'
  user: string,              // Default: 'orthodoxapps'
  password: string,          // Default: '' (empty)
  database: string,          // Default: 'orthodoxmetrics_db'
  port: number,             // Default: 3306
}
```

**Auth Database** (sessions and authentication - MUST be separate):
```typescript
config.db.auth: {
  host: string,              // Default: 'localhost'
  user: string,              // Default: 'orthodoxapps'
  password: string,          // Default: '' (empty)
  database: string,          // Default: 'orthodoxmetrics_db'
  port: number,             // Default: 3306
}
```

**⚠️ IMPORTANT:** The auth database (`config.db.auth`) is **separate** from the app database (`config.db.app`). This separation is enforced to maintain security boundaries.

### Session Configuration

```typescript
config.session: {
  secret: string,            // Min 8 chars, default: 'dev-secret-change-in-production'
  cookieName: string,        // Default: 'orthodoxmetrics.sid'
  cookieDomain?: string,     // Optional — DO NOT SET (see warning below)
  secure: boolean,           // Default: false — DO NOT SET TO TRUE (see warning below)
  sameSite: 'strict' | 'lax' | 'none',  // Default: 'lax'
  maxAgeMs: number,          // Default: 86400000 (24 hours)
  store: 'memory' | 'mysql', // Default: 'mysql'
}
```

> **DO NOT CHANGE THESE SESSION DEFAULTS. READ THE WARNING SECTION BELOW.**

### CORS Configuration

```typescript
config.cors: {
  allowedOrigins: string[],  // Array of allowed origins
  credentials: boolean,       // Default: true
}
```

### Paths Configuration

```typescript
config.paths: {
  imagesRoot?: string,       // Optional
  docsRoot?: string,         // Optional
  uploadsRoot?: string,      // Optional
  tempRoot?: string,         // Optional
}
```

### Features Configuration (Feature Flags)

```typescript
config.features: {
  interactiveReports: boolean,  // Default: true
  notifications: boolean,      // Default: true
  ocr: boolean,                // Default: true
  certificates: boolean,       // Default: true
  invoices: boolean,           // Default: true
}
```

---

## Environment Variable Mapping

The configuration system maps legacy `.env` variables to the canonical structure:

### Server Variables

| Legacy .env Key | Canonical Path | Notes |
|----------------|----------------|-------|
| `NODE_ENV` | `config.server.env` | 'development', 'production', or 'test' |
| `PORT` | `config.server.port` | Server port (default: 3001) |
| `HOST` | `config.server.host` | Server host (default: '0.0.0.0') |
| `BASE_URL` or `FRONTEND_URL` | `config.server.baseUrl` | Base URL for the application |
| `TRUST_PROXY` | `config.server.trustProxy` | Trust proxy headers (default: true) |

### Database Variables - App Database

| Legacy .env Key | Canonical Path | Notes |
|----------------|----------------|-------|
| `DB_HOST` | `config.db.app.host` | Database host |
| `DB_USER` | `config.db.app.user` | Database user |
| `DB_PASSWORD` | `config.db.app.password` | Database password |
| `DB_NAME` | `config.db.app.database` | Database name |
| `DB_PORT` | `config.db.app.port` | Database port (default: 3306) |

### Database Variables - Auth Database

| Legacy .env Key | Canonical Path | Notes |
|----------------|----------------|-------|
| `AUTH_DB_HOST` | `config.db.auth.host` | Falls back to `DB_HOST` if not set |
| `AUTH_DB_USER` | `config.db.auth.user` | Falls back to `DB_USER` if not set |
| `AUTH_DB_PASSWORD` | `config.db.auth.password` | Falls back to `DB_PASSWORD` if not set |
| `AUTH_DB_NAME` or `AUTH_DB` | `config.db.auth.database` | Falls back to `DB_NAME` if not set |
| `AUTH_DB_PORT` | `config.db.auth.port` | Falls back to `DB_PORT` if not set |

**⚠️ IMPORTANT:** If auth database variables are not set, they fall back to app database values. For production, **always set separate auth database variables** to maintain security separation.

### Session Variables

| Legacy .env Key | Canonical Path | Notes |
|----------------|----------------|-------|
| `SESSION_SECRET` | `config.session.secret` | Must be at least 8 characters |
| `SESSION_COOKIE_NAME` | `config.session.cookieName` | Default: 'orthodoxmetrics.sid' |
| `SESSION_COOKIE_DOMAIN` | `config.session.cookieDomain` | Optional |
| `SESSION_SECURE` | `config.session.secure` | Boolean (default: false) |
| `SESSION_SAME_SITE` | `config.session.sameSite` | 'strict', 'lax', or 'none' |
| `SESSION_MAX_AGE_MS` | `config.session.maxAgeMs` | Milliseconds (default: 86400000) |
| `SESSION_STORE` | `config.session.store` | 'memory' or 'mysql' |

### CORS Variables

| Legacy .env Key | Canonical Path | Notes |
|----------------|----------------|-------|
| `CORS_ORIGINS` or `ALLOWED_ORIGINS` | `config.cors.allowedOrigins` | Comma-separated list |
| `FRONTEND_URL` | `config.cors.allowedOrigins` | Added to allowed origins |
| `CORS_CREDENTIALS` | `config.cors.credentials` | Boolean (default: true) |

### Path Variables

| Legacy .env Key | Canonical Path | Notes |
|----------------|----------------|-------|
| `IMAGES_ROOT` or `PUBLIC_IMAGES_ROOT` | `config.paths.imagesRoot` | Images directory |
| `DOCS_ROOT` | `config.paths.docsRoot` | Documents directory |
| `UPLOADS_ROOT` or `UPLOAD_BASE_PATH` | `config.paths.uploadsRoot` | Uploads directory |
| `TEMP_ROOT` or `TMP_DIR` | `config.paths.tempRoot` | Temporary files directory |

### Feature Flags

| Legacy .env Key | Canonical Path | Notes |
|----------------|----------------|-------|
| `FEATURE_INTERACTIVE_REPORTS` | `config.features.interactiveReports` | Boolean |
| `FEATURE_NOTIFICATIONS` | `config.features.notifications` | Boolean |
| `FEATURE_OCR` | `config.features.ocr` | Boolean |
| `FEATURE_CERTIFICATES` | `config.features.certificates` | Boolean |
| `FEATURE_INVOICES` | `config.features.invoices` | Boolean |

---

## Usage in Code

### Importing Configuration

```typescript
// In TypeScript files
import config from './config';

// In JavaScript files (CommonJS)
const config = require('./config');
```

### Accessing Configuration

```typescript
// Server settings
const port = config.server.port;
const env = config.server.env;

// Database settings
const appDbHost = config.db.app.host;
const authDbHost = config.db.auth.host; // Separate auth DB

// Session settings
const sessionSecret = config.session.secret;

// CORS settings
const allowedOrigins = config.cors.allowedOrigins;

// Feature flags
if (config.features.interactiveReports) {
  // Enable interactive reports
}
```

### Configuration is Frozen

The config object is **frozen** to prevent runtime mutations:

```typescript
// ❌ This will fail silently (in strict mode) or throw an error
config.server.port = 9999; // Not allowed

// ✅ Use environment variables to change configuration
process.env.PORT = '9999'; // Then restart server
```

---

## Environment Files

The configuration system loads environment variables from:

1. `.env.production` (if `NODE_ENV=production`)
2. `.env.development` (if `NODE_ENV=development`)
3. `.env` (root level, always loaded)

Files are loaded in order, with later files overriding earlier ones.

---

## Startup Logging

At server startup, the configuration is logged (with secrets redacted):

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
      "password": "***12 chars***",
      "database": "orthodoxmetrics_db",
      "port": 3306
    },
    "auth": {
      "host": "localhost",
      "user": "orthodoxapps",
      "password": "***12 chars***",
      "database": "orthodoxmetrics_auth_db",
      "port": 3306
    }
  },
  ...
}
```

**Secrets are automatically redacted** (passwords, secrets, tokens, etc.) for safe logging.

---

## System Endpoints

### GET /api/health

Basic health check endpoint:

```json
{
  "status": "ok",
  "uptime": 3600,
  "timestamp": "2025-01-XX...",
  "database": {
    "success": true,
    "message": "Database connection successful"
  }
}
```

### GET /api/system/health

Enhanced health check with memory usage:

```json
{
  "status": "ok",
  "uptime": 3600,
  "timestamp": "2025-01-XX...",
  "database": {
    "success": true,
    "message": "Database connection successful"
  },
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
  "config": {
    "server": { ... },
    "db": { ... },
    "session": { ... },
    "cors": { ... },
    "paths": { ... },
    "features": { ... }
  },
  "environment": "production",
  "timestamp": "2025-01-XX..."
}
```

**Access:** Requires admin role or development environment.

---

## Migration Guide

### For Existing Code

**Before:**
```javascript
const port = process.env.PORT || 3001;
const dbHost = process.env.DB_HOST || 'localhost';
```

**After:**
```javascript
const config = require('./config');
const port = config.server.port;
const dbHost = config.db.app.host;
```

### Backward Compatibility

The configuration system is **fully backward compatible**. Existing code using `process.env` will continue to work, but new code should use the centralized config.

---

## Production Checklist

- [ ] Set `SESSION_SECRET` to a strong, random value (min 8 chars)
- [ ] Configure separate `AUTH_DB_*` variables for auth database
- [ ] Set `NODE_ENV=production`
- [ ] Configure `CORS_ORIGINS` with production domains
- [ ] Set `TRUST_PROXY=true` if behind a reverse proxy
- [ ] Verify config is logged at startup (check for redacted secrets)
- [ ] Test `/api/system/health` endpoint
- [ ] Verify `/api/system/config` requires authentication

---

## Troubleshooting

### Configuration Validation Fails

If you see: `❌ Configuration validation failed:`

1. Check the error message for which field failed
2. Verify the environment variable is set correctly
3. Check data types (numbers must be numeric, booleans must be 'true'/'false')

### Config Not Loading

If config is `null` or `undefined`:

1. Check that `server/src/config/index.ts` exists
2. Verify TypeScript compilation includes the config module
3. Check build output: `ls -la server/dist/config/`

### Secrets Appearing in Logs

If you see actual passwords/secrets in logs:

1. Check `server/src/config/redact.ts` - ensure field names are in `SECRET_FIELDS`
2. Verify redaction is working: check startup logs for `***N chars***` patterns

### Sessions Break After Login (401 on every request)

This was a critical production outage on 2026-02-02. If sessions stop persisting after login, check these three things **in this order**:

#### 1. `cookieParser` MUST have the session secret

In `server/src/index.ts`:
```javascript
// CORRECT — secret must match the session secret
app.use(cookieParser(serverConfig.session.secret));

// WRONG — breaks express-session signed cookie parsing
app.use(cookieParser());
```

**Why:** `express-session` uses signed cookies (`s:SESSION_ID.SIGNATURE`). If `cookieParser()` runs without the same secret, it mangles the signed cookie value before express-session can read it. Express-session then can't verify the signature, discards the cookie, and creates a new empty session on every single request. Login appears to work (200 response) but the session cookie is never recognized on subsequent requests.

#### 2. `cookie.secure` MUST be `false`

In `server/src/config/session.js` and `.env`:
```javascript
cookie: {
  secure: false,  // MUST be false — nginx handles SSL, backend sees HTTP
}
```

**Why:** Nginx terminates SSL and proxies to `127.0.0.1:3001` over plain HTTP. If `secure: true`, the browser marks the cookie as HTTPS-only, but the backend connection is HTTP. Even with `trust proxy` and `X-Forwarded-Proto`, this creates unreliable behavior where the `Set-Cookie` header may be silently ignored by the browser.

**DO NOT** set `SESSION_SECURE=true` in `.env` or `.env.production`. The schema default is `false` for this reason.

#### 3. `cookie.domain` MUST be `undefined`

In `server/src/config/session.js` and `.env`:
```javascript
cookie: {
  domain: undefined,  // Let the browser handle domain matching
}
```

**Why:** Setting `domain: 'orthodoxmetrics.com'` explicitly can cause cookie domain mismatches depending on whether the browser sees `orthodoxmetrics.com` vs `www.orthodoxmetrics.com`. Leaving it `undefined` lets the browser auto-set the domain from the request origin, which always works.

**DO NOT** set `SESSION_COOKIE_DOMAIN` in `.env` or `.env.production`. The schema makes this field optional for this reason.

#### Diagnostic checklist

If sessions break, check startup logs for the `🔑 Session config check` line:
```
🔑 Session config check: {
  name: 'orthodoxmetrics.sid',
  secretLength: 32,            ← must be > 0
  secretPrefix: 'orthodox',    ← must match cookieParser secret prefix
  secure: false,               ← MUST be false
  domain: undefined,           ← MUST be undefined
  sameSite: 'lax',
  path: '/',
  maxAge: 86400000
}
🔑 cookieParser secret check: { length: 32, prefix: 'orthodox' }
```

Verify:
- Both `secretLength` values match
- Both `secretPrefix` values match
- `secure` is `false`
- `domain` is `undefined`

If the session ID changes on every request (visible in auth middleware logs), the cookie is not being parsed correctly. The three rules above will fix it.

#### Correct .env session block

```env
# Session Configuration
SESSION_SECRET=orthodox-metrics-dev-secret-2025
SESSION_SECURE=false
SESSION_SAME_SITE=lax
# SESSION_COOKIE_DOMAIN — intentionally NOT set, leave undefined
```

#### Correct middleware order in index.ts

```
1. express.json()           — parse request bodies
2. express.urlencoded()     — parse form data
3. cookieParser(SECRET)     — parse cookies WITH the session secret
4. sessionMiddleware        — express-session (reads parsed cookies)
5. databaseRouter           — multi-tenant DB routing
6. auth-protected routes    — require session to be established
```

---

## Critical Rules for AI Agents

**Any AI agent (Claude, Copilot, or otherwise) modifying this server MUST follow these rules:**

1. **NEVER** add `SESSION_SECURE=true` to any `.env` file. The backend runs behind nginx over HTTP.
2. **NEVER** add `SESSION_COOKIE_DOMAIN` to any `.env` file. Let the browser handle it.
3. **NEVER** call `cookieParser()` without passing the session secret as the first argument.
4. **NEVER** change the middleware order in `index.ts` — `cookieParser` must come before `sessionMiddleware`.
5. **NEVER** change `cookie.secure` or `cookie.domain` in `session.js` without reading this document first.
6. If sessions break after a change, check the three rules above before investigating anything else.

---

## Files

- `server/src/config/schema.ts` - Zod schema definitions
- `server/src/config/index.ts` - Main config loader
- `server/src/config/session.js` - Session middleware configuration (express-session + MySQL store)
- `server/src/config/redact.ts` - Secret redaction helper
- `server/src/middleware/auth.js` - Authentication middleware (session + JWT)
- `server/src/routes/auth.js` - Auth routes (login, logout, refresh, check, validate-session)
- `server/CONFIG.md` - This documentation

---

**Last Updated:** 2026-02-02
