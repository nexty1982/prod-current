# 🔍 Backend API Audit Report - OrthodoxMetrics Production Application

## Executive Summary
This audit identifies critical issues affecting the stability of a production Node.js + React application. The backend shows several architectural problems that cause silent failures, inconsistent API responses, and session management issues.

---

## 📋 Critical Issues & Fixes

### ❌ Category 1: Broken/Miswired Endpoints

#### 1.1 **Duplicate Route Mounting**
**Location**: `server/index.js`
- **Issue**: Multiple routes mounted at conflicting paths
  - `/api/churches` router mounted twice (line 209, 264)
  - `/api/admin/users` mounted at both `/api/admin/users` and `/api/users` (lines 220-221)
  - `/api/omai` mounted twice for different routers (lines 251, 254)
  - `/api/calendar` mounted for both calendar and orthodoxCalendar (lines 304-305)
  
**Fix**:
```javascript
// Remove duplicate mounts - keep only one instance
app.use('/api/churches', churchesRouter); // Line 209 only
// Remove line 264

app.use('/api/admin/users', usersRouter); // Line 220 only
// Remove line 221

app.use('/api/omai', omaiRouter); // Line 251
app.use('/api/omai/global', globalOmaiRouter); // Change line 254 to avoid conflict
```

#### 1.2 **Database Connection Handling**
**Location**: `server/controllers/records.js`
- **Issue**: Creating new MySQL connections per request instead of using connection pool
- **Lines**: 10-17, connection closed in finally blocks

**Fix**:
```javascript
// Use promisePool from config instead of creating new connections
const { promisePool } = require('../config/db');

// Replace getDbConnection() calls with promisePool
const [rows] = await promisePool.execute(sql, params);
// Remove connection.end() calls
```

#### 1.3 **Missing Route Definitions**
**Location**: Various frontend API calls expecting endpoints that don't exist
- `/api/church-records` route exists but controller might not handle all expected methods
- `/api/config` endpoint returns static data (lines 353-366 in index.js)

---

### ⚠️ Category 2: Inconsistent Return Shapes

#### 2.1 **Churches API Response Format**
**Location**: `server/routes/churches.js`
- **Issue**: API returns different response formats based on conditions
  - Success: `{ success: true, data: { churches: [...] }, meta: {...} }`
  - Error: `{ success: false, error: {...} }`
  
**Frontend Expectation**: `front-end/src/services/churchService.ts`
- Handles multiple formats (lines 68-89) but causes confusion

**Fix**: Standardize all responses:
```javascript
// Standard response wrapper
function apiResponse(success, data = null, error = null, meta = null) {
  return {
    success,
    ...(data && { data }),
    ...(error && { error }),
    ...(meta && { meta })
  };
}
```

#### 2.2 **Auth Response Inconsistency**
**Location**: `server/routes/auth.js`
- Login success returns: `{ success: true, user: {...}, message: "..." }`
- Check auth returns: `{ authenticated: boolean, user: {...} }`
- Logout returns: `{ success: true, message: "..." }`

**Fix**: Standardize auth responses:
```javascript
// All auth endpoints should return:
{
  success: boolean,
  authenticated: boolean,
  user: User | null,
  message: string
}
```

---

### 🧱 Category 3: Middleware & Session Issues

#### 3.1 **Session Cookie Configuration**
**Location**: `server/config/session.js`
- **Issue**: Forced HTTPS cookies (line 64) but domain hardcoded to `.orthodoxmetrics.com`
- **Problem**: Won't work in development or different domains

**Fix**:
```javascript
const sessionConfig = {
  name: 'orthodoxmetrics.sid',
  secret: sessionSecret,
  store: store,
  resave: false,
  saveUninitialized: false,
  rolling: true,
  proxy: true,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 86400000,
    sameSite: 'lax',
    domain: process.env.COOKIE_DOMAIN || undefined // Use env var
  }
};
```

#### 3.2 **Auth Middleware Race Condition**
**Location**: `server/middleware/auth.js`
- **Issue**: Session regeneration override (lines 130-142) prevents proper session handling
- **Problem**: Can cause "phantom user" issues where session exists but no user data

**Fix**:
```javascript
// Remove handleSessionRegeneration middleware
// Use proper session.save() callbacks in auth routes
req.session.save((err) => {
  if (err) return next(err);
  res.json({ success: true, user: req.session.user });
});
```

#### 3.3 **Missing Error Boundaries**
**Location**: Multiple route handlers
- **Issue**: Many routes don't have proper try-catch blocks
- **Example**: Dashboard routes (server/routes/dashboard.js) use try-catch but return mock data

---

### 🔄 Category 4: Unused/Duplicate Logic

#### 4.1 **Mock Data in Production Routes**
**Location**: `server/routes/dashboard.js`
- Lines 93-145: Returns hardcoded mock activity data
- Lines 212-249: Returns mock notifications
- Lines 275-293: Returns mock church data

**Fix**: Remove mock data and implement actual database queries:
```javascript
// Replace mock data with actual queries
const [activities] = await promisePool.query(
  'SELECT * FROM activity_logs WHERE church_id = ? ORDER BY timestamp DESC LIMIT ?',
  [churchId, limit]
);
```

#### 4.2 **Redundant Test Endpoints**
**Location**: Various routes
- `/api/baptism-records/test` (baptism.js line 69)
- Multiple test/debug endpoints in production

**Fix**: Remove or protect test endpoints:
```javascript
if (process.env.NODE_ENV === 'development') {
  router.get('/test', testHandler);
}
```

---

## 🔁 Frontend → Backend Call Map

### Authentication Flow
```
Frontend                          Backend
--------                          -------
authService.login()          →   POST /api/auth/login
  ↓ axios.post()                   ↓ requireAuth middleware
userAPI.auth.login()              ↓ session creation
  ↓ store session                 ↓ return user object
localStorage.setItem()        ←   { success, user, message }
```

### Church Records Flow
```
Frontend                          Backend
--------                          -------
churchService.fetchChurches() → GET /api/churches
  ↓ axios.get()                   ↓ requireAuth
  ↓ handle multiple formats       ↓ validateChurchAccess
  ↓ fallback to mock             ↓ database query
return Church[]              ←   { success, data: { churches } }
```

### Dashboard Flow
```
Frontend                          Backend
--------                          -------
dashboard.loadMetrics()      →   GET /api/dashboard/summary/:churchId
  ↓ fetch()                       ↓ NO AUTH CHECK (!)
  ↓ parse response                ↓ returns mock data
display metrics              ←   { totalBaptisms, totalMarriages, ... }
```

---

## 🛠️ Refactoring Recommendations

### 1. **Centralized Error Handling**
Create middleware for consistent error responses:
```javascript
// middleware/errorHandler.js
const errorHandler = (err, req, res, next) => {
  const status = err.status || 500;
  const message = err.message || 'Internal Server Error';
  
  res.status(status).json({
    success: false,
    error: {
      message,
      code: err.code || 'INTERNAL_ERROR',
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    }
  });
};
```

### 2. **API Response Schema**
Implement a standardized response format:
```javascript
// utils/apiResponse.js
class ApiResponse {
  static success(data, message = 'Success', meta = null) {
    return {
      success: true,
      message,
      data,
      ...(meta && { meta }),
      timestamp: new Date().toISOString()
    };
  }
  
  static error(message, code = 'ERROR', status = 500) {
    return {
      success: false,
      error: {
        message,
        code,
        status
      },
      timestamp: new Date().toISOString()
    };
  }
}
```

### 3. **Database Connection Pool**
Use a single connection pool manager:
```javascript
// services/database.js
class DatabaseManager {
  constructor() {
    this.pools = new Map();
  }
  
  async getPool(databaseName) {
    if (!this.pools.has(databaseName)) {
      const pool = await this.createPool(databaseName);
      this.pools.set(databaseName, pool);
    }
    return this.pools.get(databaseName);
  }
}
```

### 4. **Route Organization**
Restructure routes with proper versioning:
```
/api/v1/
  ├── auth/
  │   ├── login
  │   ├── logout
  │   └── check
  ├── churches/
  │   ├── :id
  │   └── :id/records
  ├── records/
  │   ├── baptism/
  │   ├── marriage/
  │   └── funeral/
  └── admin/
      ├── users/
      └── churches/
```

### 5. **Session Management**
Implement proper session handling:
```javascript
// services/sessionManager.js
class SessionManager {
  static async createSession(req, user) {
    return new Promise((resolve, reject) => {
      req.session.regenerate((err) => {
        if (err) return reject(err);
        req.session.user = user;
        req.session.save((err) => {
          if (err) return reject(err);
          resolve(req.session);
        });
      });
    });
  }
}
```

### 6. **Request Validation**
Add request validation middleware:
```javascript
// middleware/validate.js
const { body, validationResult } = require('express-validator');

const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json(
      ApiResponse.error('Validation failed', 'VALIDATION_ERROR', 400)
    );
  }
  next();
};
```

---

## 🚨 Priority Actions

1. **IMMEDIATE (P0)**
   - Fix duplicate route mounting in index.js
   - Add authentication to dashboard routes
   - Standardize API response format

2. **HIGH (P1)**
   - Replace mock data with actual database queries
   - Fix session cookie configuration for multi-environment
   - Implement proper connection pooling

3. **MEDIUM (P2)**
   - Add request validation to all POST/PUT endpoints
   - Implement centralized error handling
   - Remove test endpoints from production

4. **LOW (P3)**
   - Restructure routes with API versioning
   - Add comprehensive logging
   - Implement rate limiting

---

## 📊 Metrics & Monitoring

### Recommended Monitoring Points
- API response times per endpoint
- Error rates by status code
- Session creation/destruction rates
- Database connection pool usage
- Failed authentication attempts

### Suggested Tools
- **APM**: New Relic or DataDog
- **Logging**: Winston with Elasticsearch
- **Metrics**: Prometheus + Grafana
- **Error Tracking**: Sentry

---

## 🔒 Security Recommendations

1. **SQL Injection Prevention**
   - Use parameterized queries everywhere (partially implemented)
   - Validate all user inputs

2. **Session Security**
   - Implement session rotation on privilege escalation
   - Add CSRF tokens for state-changing operations

3. **Rate Limiting**
   - Add rate limiting to auth endpoints
   - Implement progressive delays for failed attempts

4. **API Keys**
   - Move from session-only to JWT + refresh tokens for API access
   - Implement API key management for service-to-service calls

---

## Conclusion

The backend has solid foundations but needs architectural improvements to be production-ready. The main issues are:
1. Route conflicts and duplications
2. Inconsistent API responses
3. Mock data in production endpoints
4. Session management issues
5. Missing error boundaries

Implementing the recommended fixes will significantly improve stability and maintainability.

**Estimated effort**: 2-3 weeks for P0/P1 items with a team of 2 developers
**Risk level**: HIGH if left unaddressed - silent failures affect user experience
**Business impact**: Authentication issues and data inconsistencies directly impact user trust
