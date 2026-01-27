# 🔧 Critical Code Fixes - Immediate Implementation Guide

## Fix 1: Route Mounting Conflicts in server/index.js

### Problem
Duplicate and conflicting route mountings causing unpredictable behavior.

### Solution
```javascript
// server/index.js - LINES TO MODIFY

// LINE 209 - Keep this
app.use('/api/churches', churchesRouter);

// LINE 221 - REMOVE THIS LINE (duplicate mounting)
// app.use('/api/users', usersRouter); // DELETE THIS

// LINE 254 - CHANGE FROM:
app.use('/api/omai', globalOmaiRouter);
// TO:
app.use('/api/omai/global', globalOmaiRouter);

// LINE 305 - CHANGE FROM:
app.use('/api/calendar', orthodoxCalendarRouter);
// TO:
app.use('/api/orthodox-calendar', orthodoxCalendarRouter);

// LINE 329 - REMOVE (duplicate)
// app.use('/api/kanban', kanbanRouter); // Already mounted at line 270

// LINE 330 - REMOVE (duplicate)
// app.use('/api/survey', require('./routes/survey')); // Already mounted at line 324
```

---

## Fix 2: Dashboard Authentication Missing

### Problem
Dashboard routes have no authentication checks, exposing sensitive data.

### Solution
```javascript
// server/routes/dashboard.js - ADD AUTH MIDDLEWARE

const express = require('express');
const router = express.Router();
const { promisePool } = require('../config/db');
const { requireAuth } = require('../middleware/auth'); // ADD THIS

// UPDATE ALL ROUTES - Add requireAuth middleware
// Line 6 - CHANGE FROM:
router.get('/summary/:churchId', async (req, res) => {
// TO:
router.get('/summary/:churchId', requireAuth, async (req, res) => {

// Line 87 - CHANGE FROM:
router.get('/activity-log/:churchId', async (req, res) => {
// TO:
router.get('/activity-log/:churchId', requireAuth, async (req, res) => {

// Line 149 - CHANGE FROM:
router.get('/activity/:churchId', async (req, res) => {
// TO:
router.get('/activity/:churchId', requireAuth, async (req, res) => {

// Line 211 - CHANGE FROM:
router.get('/notifications/:churchId', async (req, res) => {
// TO:
router.get('/notifications/:churchId', requireAuth, async (req, res) => {

// Line 259 - CHANGE FROM:
router.post('/notifications/:notificationId/read', async (req, res) => {
// TO:
router.post('/notifications/:notificationId/read', requireAuth, async (req, res) => {

// Line 272 - CHANGE FROM:
router.get('/church/:churchId', async (req, res) => {
// TO:
router.get('/church/:churchId', requireAuth, async (req, res) => {
```

---

## Fix 3: Standardize API Response Format

### Problem
Inconsistent response formats causing frontend parsing issues.

### Solution - Create new utility file:
```javascript
// server/utils/apiResponse.js - NEW FILE

class ApiResponse {
  /**
   * Success response
   * @param {any} data - Response data
   * @param {string} message - Success message
   * @param {object} meta - Additional metadata
   */
  static success(data = null, message = 'Success', meta = null) {
    const response = {
      success: true,
      message,
      timestamp: new Date().toISOString()
    };
    
    if (data !== null && data !== undefined) {
      response.data = data;
    }
    
    if (meta !== null && meta !== undefined) {
      response.meta = meta;
    }
    
    return response;
  }
  
  /**
   * Error response
   * @param {string} message - Error message
   * @param {string} code - Error code
   * @param {number} status - HTTP status code
   * @param {any} details - Additional error details
   */
  static error(message = 'An error occurred', code = 'ERROR', status = 500, details = null) {
    const response = {
      success: false,
      error: {
        message,
        code,
        status
      },
      timestamp: new Date().toISOString()
    };
    
    if (details !== null && details !== undefined) {
      response.error.details = details;
    }
    
    if (process.env.NODE_ENV === 'development' && details instanceof Error) {
      response.error.stack = details.stack;
    }
    
    return response;
  }
  
  /**
   * Paginated response
   * @param {array} items - Data items
   * @param {number} page - Current page
   * @param {number} limit - Items per page
   * @param {number} total - Total items
   */
  static paginated(items, page, limit, total) {
    return {
      success: true,
      data: items,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(total),
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1
      },
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = ApiResponse;
```

### Update Churches Route to Use Standard Response:
```javascript
// server/routes/churches.js - UPDATE RESPONSES

const ApiResponse = require('../utils/apiResponse'); // ADD THIS

// Line 104 - CHANGE FROM:
return res.status(401).json(apiResponse(false, null, {
  message: 'Authentication error - user context missing',
  code: 'USER_CONTEXT_MISSING'
}));
// TO:
return res.status(401).json(
  ApiResponse.error('Authentication error - user context missing', 'USER_CONTEXT_MISSING', 401)
);

// Line 172 - CHANGE FROM:
res.json(apiResponse(true, {
  churches: transformedChurches,
  pagination: {
    total: totalCount,
    page: parseInt(page),
    limit: parseInt(limit),
    totalPages: Math.ceil(totalCount / limit)
  }
}, null, {
  timestamp: new Date().toISOString(),
  requestId: req.id
}));
// TO:
res.json(ApiResponse.paginated(transformedChurches, page, limit, totalCount));
```

---

## Fix 4: Session Cookie Configuration

### Problem
Hardcoded production domain breaks development environment.

### Solution:
```javascript
// server/config/session.js - LINES 63-89

// REPLACE LINES 63-89 WITH:
const isProduction = process.env.NODE_ENV === 'production';
const sessionSecret = process.env.SESSION_SECRET || 'orthodox-metrics-dev-secret-2025';

// Dynamic cookie configuration
const getCookieConfig = () => {
  const baseConfig = {
    httpOnly: true,
    maxAge: 86400000, // 24 hours
    sameSite: 'lax'
  };
  
  if (isProduction) {
    return {
      ...baseConfig,
      secure: true,
      domain: process.env.COOKIE_DOMAIN || '.orthodoxmetrics.com'
    };
  }
  
  // Development config
  return {
    ...baseConfig,
    secure: false // Allow HTTP in development
    // No domain restriction in development
  };
};

const sessionConfig = {
  name: 'orthodoxmetrics.sid',
  secret: sessionSecret,
  store: store,
  resave: false,
  saveUninitialized: false,
  rolling: true,
  proxy: isProduction, // Only trust proxy in production
  cookie: getCookieConfig()
};

console.log('🍪 Session configuration:');
console.log('   Environment:', process.env.NODE_ENV || 'development');
console.log('   Secure cookies:', sessionConfig.cookie.secure);
console.log('   Cookie domain:', sessionConfig.cookie.domain || 'not set');
```

---

## Fix 5: Database Connection Pooling

### Problem
Creating new connections per request instead of using pool.

### Solution:
```javascript
// server/controllers/records.js - REPLACE connection logic

// DELETE LINES 10-17 (getDbConnection function)

// ADD AT TOP:
const { promisePool } = require('../config/db');

// UPDATE ALL DATABASE QUERIES
// CHANGE ALL INSTANCES OF:
connection = await getDbConnection();
const [rows] = await connection.execute(sql, params);
// TO:
const [rows] = await promisePool.execute(sql, params);

// REMOVE ALL finally BLOCKS with connection.end()
// Example - Line 124-126 REMOVE:
// } finally {
//   if (connection) await connection.end();
// }
```

---

## Fix 6: Remove Mock Data from Dashboard

### Problem
Production endpoints returning hardcoded mock data.

### Solution:
```javascript
// server/routes/dashboard.js - REPLACE mock data with real queries

// Line 11-67 - REPLACE ENTIRE FUNCTION BODY:
router.get('/summary/:churchId', requireAuth, async (req, res) => {
  try {
    const { churchId } = req.params;
    
    // Validate church access
    if (req.user.role !== 'super_admin' && req.user.church_id !== parseInt(churchId)) {
      return res.status(403).json(
        ApiResponse.error('Access denied to this church', 'FORBIDDEN', 403)
      );
    }
    
    // Get real record counts
    const [baptisms] = await promisePool.query(
      'SELECT COUNT(*) as count FROM baptism_records WHERE church_id = ? AND status = "active"',
      [churchId]
    );
    
    const [marriages] = await promisePool.query(
      'SELECT COUNT(*) as count FROM marriage_records WHERE church_id = ? AND status = "active"',
      [churchId]
    );
    
    const [funerals] = await promisePool.query(
      'SELECT COUNT(*) as count FROM funeral_records WHERE church_id = ? AND status = "active"',
      [churchId]
    );
    
    // Get records needing review
    const [needsReview] = await promisePool.query(
      `SELECT COUNT(*) as count FROM record_reviews 
       WHERE church_id = ? AND status = "pending"`,
      [churchId]
    );
    
    // Get upload errors from last 7 days
    const [uploadErrors] = await promisePool.query(
      `SELECT COUNT(*) as count FROM upload_logs 
       WHERE church_id = ? AND status = "error" 
       AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)`,
      [churchId]
    );
    
    // Get monthly activity (real data)
    const monthlyActivity = [];
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date();
      monthStart.setMonth(monthStart.getMonth() - i);
      monthStart.setDate(1);
      
      const monthEnd = new Date(monthStart);
      monthEnd.setMonth(monthEnd.getMonth() + 1);
      monthEnd.setDate(0);
      
      const [monthData] = await promisePool.query(
        `SELECT 
          (SELECT COUNT(*) FROM baptism_records 
           WHERE church_id = ? AND created_at BETWEEN ? AND ?) as baptisms,
          (SELECT COUNT(*) FROM marriage_records 
           WHERE church_id = ? AND created_at BETWEEN ? AND ?) as marriages,
          (SELECT COUNT(*) FROM funeral_records 
           WHERE church_id = ? AND created_at BETWEEN ? AND ?) as funerals
        `,
        [
          churchId, monthStart, monthEnd,
          churchId, monthStart, monthEnd,
          churchId, monthStart, monthEnd
        ]
      );
      
      monthlyActivity.push({
        month: monthStart.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        baptisms: monthData[0].baptisms || 0,
        marriages: monthData[0].marriages || 0,
        funerals: monthData[0].funerals || 0,
        total: (monthData[0].baptisms || 0) + (monthData[0].marriages || 0) + (monthData[0].funerals || 0)
      });
    }
    
    const summary = {
      totalBaptisms: baptisms[0]?.count || 0,
      totalMarriages: marriages[0]?.count || 0,
      totalFunerals: funerals[0]?.count || 0,
      recordsNeedingReview: needsReview[0]?.count || 0,
      uploadErrors: uploadErrors[0]?.count || 0,
      monthlyActivity,
      lastUpdated: new Date().toISOString()
    };
    
    res.json(ApiResponse.success(summary, 'Dashboard summary retrieved successfully'));
  } catch (error) {
    console.error('Dashboard summary error:', error);
    res.status(500).json(
      ApiResponse.error('Failed to fetch dashboard summary', 'DATABASE_ERROR', 500, error)
    );
  }
});
```

---

## Fix 7: Frontend Axios Error Handling

### Problem
Frontend not handling auth errors consistently.

### Solution:
```javascript
// front-end/src/api/utils/axiosInstance.ts - UPDATE interceptor

// Lines 59-79 - REPLACE response error interceptor:
this.instance.interceptors.response.use(
  (response: AxiosResponse) => {
    console.log(`✅ API Response: ${response.status} ${response.config.url}`);
    
    // Check for API-level errors in successful HTTP responses
    if (response.data && response.data.success === false) {
      const error = new Error(response.data.error?.message || 'Request failed');
      (error as any).apiError = true;
      (error as any).errorData = response.data.error;
      throw error;
    }
    
    return response;
  },
  async (error) => {
    console.error('❌ Response Error:', error.response?.status, error.response?.data);
    
    // Handle 401 - Unauthorized
    if (error.response?.status === 401) {
      const currentPath = window.location.pathname;
      const isAuthPage = currentPath.includes('/login') || 
                        currentPath.includes('/homepage') ||
                        currentPath.includes('/auth');
      
      if (!isAuthPage) {
        // Clear local storage
        localStorage.removeItem('auth_user');
        
        // Store intended destination
        localStorage.setItem('redirect_after_login', currentPath);
        
        // Redirect to login
        window.location.href = '/frontend-pages/homepage';
        return Promise.reject(error);
      }
    }
    
    // Handle 403 - Forbidden
    if (error.response?.status === 403) {
      const errorMessage = error.response.data?.error?.message || 
                          'You do not have permission to access this resource';
      
      // Show user-friendly error
      if (window.showNotification) {
        window.showNotification(errorMessage, 'error');
      }
    }
    
    // Create enhanced error
    const enhancedError = new Error(
      error.response?.data?.error?.message || 
      error.response?.data?.message || 
      error.message || 
      'Request failed'
    );
    
    (enhancedError as any).status = error.response?.status;
    (enhancedError as any).code = error.response?.data?.error?.code || error.code;
    (enhancedError as any).isNetworkError = !error.response;
    (enhancedError as any).originalError = error;
    
    throw enhancedError;
  }
);
```

---

## Testing Checklist

After implementing these fixes, test the following:

1. **Authentication Flow**
   - [ ] Login works and persists session
   - [ ] Logout clears session properly
   - [ ] Protected routes redirect to login when unauthenticated
   - [ ] Session persists across page refreshes

2. **API Responses**
   - [ ] All endpoints return consistent format
   - [ ] Error responses include proper status codes
   - [ ] Pagination works correctly
   - [ ] Frontend parses responses without errors

3. **Dashboard**
   - [ ] Summary loads real data
   - [ ] Activity log shows actual records
   - [ ] Notifications are fetched from database
   - [ ] All routes require authentication

4. **Church Records**
   - [ ] List, create, update, delete operations work
   - [ ] Filtering and search function properly
   - [ ] Audit trail is recorded
   - [ ] Proper error messages for validation failures

5. **Session Management**
   - [ ] Sessions work in both dev and production
   - [ ] Cookies are set with correct domain
   - [ ] Session timeout works as expected
   - [ ] Multiple login sessions handled correctly

---

## Deployment Steps

1. **Backup Current System**
   ```bash
   mysqldump -u root -p orthodoxmetrics_db > backup_$(date +%Y%m%d).sql
   cp -r /path/to/app /path/to/backup/
   ```

2. **Apply Database Changes**
   ```sql
   -- Add missing tables if needed
   CREATE TABLE IF NOT EXISTS record_reviews (
     id INT PRIMARY KEY AUTO_INCREMENT,
     church_id INT,
     record_type VARCHAR(50),
     record_id VARCHAR(255),
     status VARCHAR(50),
     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
   );
   
   CREATE TABLE IF NOT EXISTS upload_logs (
     id INT PRIMARY KEY AUTO_INCREMENT,
     church_id INT,
     filename VARCHAR(255),
     status VARCHAR(50),
     error_message TEXT,
     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
   );
   ```

3. **Deploy Code Changes**
   ```bash
   # Stop application
   pm2 stop orthodoxmetrics
   
   # Apply fixes
   git pull origin fixes
   npm install
   npm run build
   
   # Start application
   pm2 start orthodoxmetrics
   pm2 logs orthodoxmetrics
   ```

4. **Monitor for Issues**
   - Check error logs for new issues
   - Monitor session creation/destruction
   - Verify API response times
   - Test critical user flows

---

## Rollback Plan

If issues occur after deployment:

1. **Immediate Rollback**
   ```bash
   pm2 stop orthodoxmetrics
   git checkout previous-commit-hash
   npm install
   pm2 start orthodoxmetrics
   ```

2. **Database Rollback** (if schema changed)
   ```bash
   mysql -u root -p orthodoxmetrics_db < backup_20240101.sql
   ```

3. **Clear Sessions** (if session issues)
   ```sql
   TRUNCATE TABLE sessions;
   ```

4. **Notify Team**
   - Document issues encountered
   - Gather error logs
   - Schedule post-mortem

---

## Support Contacts

For urgent issues during deployment:
- Backend Lead: [Contact Info]
- DevOps: [Contact Info]
- Database Admin: [Contact Info]

Remember: Test in staging first, deploy during low-traffic hours, and have rollback ready!
