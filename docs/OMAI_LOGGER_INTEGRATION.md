# 🚀 OMAI Ultimate Logger Integration Guide

## Overview
The OMAI Ultimate Logger is a comprehensive logging solution for OrthodoxMetrics that provides centralized logging, error tracking, and real-time monitoring across the entire application stack.

---

## 🛠️ Backend Integration

### Step 1: Add Logger to server/index.js

Add these lines to your `server/index.js` file:

```javascript
// Add after other requires (around line 15)
const omaiLogger = require('./utils/omaiLogger');
const { 
  requestLogger, 
  errorLogger, 
  performanceLogger 
} = require('./middleware/omaiLoggerMiddleware');

// Add logger routes (around line 117 after other route imports)
const omaiLoggerRouter = require('./routes/omaiLogger');

// Add request logging middleware (after session middleware, around line 183)
app.use(requestLogger);
app.use(performanceLogger(1000)); // Log requests taking > 1 second

// Add logger routes (around line 246 with other API routes)
app.use('/api/logger', omaiLoggerRouter);

// Add error logging middleware (at the END, after all routes, around line 453)
app.use(errorLogger);

// Update server start logging (around line 534)
server.listen(PORT, HOST, () => {
  const nodeEnv = process.env.NODE_ENV || 'production';
  
  // Log server startup
  omaiLogger.info('Server started successfully', {
    component: 'server',
    port: PORT,
    host: HOST,
    environment: nodeEnv
  });
  
  console.log(`🚀 Server running in ${nodeEnv.toUpperCase()} mode at http://${HOST}:${PORT}`);
});
```

### Step 2: Update Authentication Routes

In `server/routes/auth.js`, add logging for auth events:

```javascript
const omaiLogger = require('../utils/omaiLogger');
const { securityLogger } = require('../middleware/omaiLoggerMiddleware');

// In login route (around line 45)
if (!isValidPassword) {
  securityLogger.logFailedAuth(req, 'Invalid password');
  return res.status(401).json({...});
}

// After successful login (around line 103)
securityLogger.logSuccessfulAuth(req, user);

// In logout route
omaiLogger.info('User logged out', {
  component: 'auth',
  userId: req.session?.user?.id,
  email: req.session?.user?.email
});
```

### Step 3: Add Database Query Logging

In any database query file, add slow query logging:

```javascript
const { databaseLogger } = require('../middleware/omaiLoggerMiddleware');

// Wrap database queries
const startTime = Date.now();
const [rows] = await promisePool.execute(query, params);
const duration = Date.now() - startTime;
databaseLogger.logSlowQuery(query, duration);
```

### Step 4: Service/Worker Logging

For cron jobs and background services:

```javascript
const { serviceLogger } = require('../middleware/omaiLoggerMiddleware');

// In cron job (e.g., email queue processor)
cron.schedule('*/5 * * * *', async () => {
  try {
    const processedCount = await notificationService.processEmailQueue();
    serviceLogger.logCronJob('email-queue', 'success', { 
      processedCount 
    });
  } catch (error) {
    serviceLogger.logCronJob('email-queue', 'error', { 
      error: error.message 
    });
  }
});
```

---

## 🎨 Frontend Integration

### Step 1: Wrap App with Error Boundary

In your main App component (`front-end/src/App.tsx`):

```typescript
import { OMAIErrorBoundary } from './utils/omaiLogger';

function App() {
  return (
    <OMAIErrorBoundary>
      <ChakraProvider theme={theme}>
        {/* Your app content */}
      </ChakraProvider>
    </OMAIErrorBoundary>
  );
}
```

### Step 2: Log User Actions

In components, log important user actions:

```typescript
import { omaiLogger } from '@/utils/omaiLogger';

// In a button click handler
const handleSubmit = async () => {
  omaiLogger.logAction('form_submit', {
    formName: 'baptism_record',
    churchId: selectedChurch
  });
  
  try {
    const result = await omaiLogger.timeExecution(
      'submit_baptism_record',
      () => api.submitRecord(data)
    );
    omaiLogger.info('Record submitted successfully', {
      component: 'baptism-form',
      recordId: result.id
    });
  } catch (error) {
    omaiLogger.apiError('/api/records', error, 'POST');
  }
};
```

### Step 3: Log API Errors

In your API service layer:

```typescript
import { omaiLogger } from '@/utils/omaiLogger';

class ChurchService {
  async fetchChurches() {
    try {
      const response = await axios.get('/api/churches');
      return response.data;
    } catch (error) {
      omaiLogger.apiError('/api/churches', error, 'GET');
      throw error;
    }
  }
}
```

### Step 4: Add Dashboard to Routes

In your router (`front-end/src/routes/Router.tsx`):

```typescript
import { OMLoggerDashboard } from '@/components/logger/OMLoggerDashboard';

// Add route for logger dashboard
{
  path: '/admin/logger',
  element: <ProtectedRoute role="admin">
    <OMLoggerDashboard />
  </ProtectedRoute>
}
```

---

## 📊 Using the Dashboard

### Access the Dashboard
Navigate to `/admin/logger` to view the OMAI Logger Dashboard.

### Dashboard Features

1. **Real-Time Logs** (Top Left)
   - Live stream of all system logs
   - Auto-scroll enabled by default
   - Color-coded by severity

2. **Critical Events** (Top Right)
   - Unresolved critical errors
   - Click ✓ to mark as resolved
   - Shows occurrence count

3. **System Messages** (Bottom Left)
   - Service actions from last 24 hours
   - Shows success/failure status

4. **Historical Logs** (Bottom Right)
   - Searchable log history
   - Filter by date range
   - Expandable for full details

### Dashboard Controls

- **Pause/Play**: Stop/resume real-time updates
- **Refresh**: Manually refresh all panels
- **Filter**: Apply filters to view specific logs
- **Dark/Light Mode**: Toggle theme

---

## 🔍 Log Levels and When to Use Them

### ERROR
- Unhandled exceptions
- Failed API calls
- Database connection failures
- Critical business logic failures

```javascript
omaiLogger.error('Payment processing failed', {
  component: 'payment',
  orderId: order.id,
  error: error.message
});
```

### WARN
- Deprecated API usage
- Performance issues
- Recoverable errors
- Missing optional configuration

```javascript
omaiLogger.warn('Slow database query detected', {
  component: 'database',
  query: sql,
  duration: 3500
});
```

### INFO
- Successful operations
- User actions
- System state changes
- Important business events

```javascript
omaiLogger.info('User registered successfully', {
  component: 'auth',
  userId: user.id,
  email: user.email
});
```

### DEBUG
- Detailed diagnostic information
- Variable values during execution
- Flow control tracking

```javascript
omaiLogger.debug('Processing batch', {
  component: 'worker',
  batchId: batch.id,
  itemCount: items.length
});
```

---

## 🏷️ Tagging System

Use tags to categorize and filter logs:

```javascript
omaiLogger.error('API rate limit exceeded', {
  component: 'api',
  tags: ['rate-limit', 'external-api', 'critical']
});
```

Common tags:
- `security`: Security-related events
- `performance`: Performance issues
- `user-action`: User-initiated events
- `system`: System-level events
- `database`: Database operations
- `api`: API calls
- `auth`: Authentication events

---

## 📈 Monitoring and Alerts

### View Statistics
Access logger statistics at `/api/logger/stats`:

```javascript
GET /api/logger/stats

Response:
{
  "errors": [...],      // Error breakdown by severity
  "components": [...],  // Errors by component
  "services": [...],    // Service action statistics
  "recentLogsCount": 42
}
```

### Clear Old Logs
Super admins can clear resolved errors:

```javascript
DELETE /api/logger/clear-resolved?days=30
```

---

## 🛡️ Security Considerations

1. **Authentication Required**: All logger endpoints require authentication
2. **Role-Based Access**: Only admins can view the dashboard
3. **Sensitive Data**: Never log passwords, tokens, or PII
4. **Rate Limiting**: Frontend logger batches requests to prevent spam

---

## 🔧 Configuration

### Environment Variables
```env
# Logging level (error, warn, info, debug)
LOG_LEVEL=info

# Max logs to keep in memory
MAX_RECENT_LOGS=100

# Log file paths
LOG_ERROR_FILE=./logs/error.log
LOG_COMBINED_FILE=./logs/combined.log
```

### Database Tables Used
- `omai_error_tracking_db.errors` - Unique errors (deduplicated)
- `omai_error_tracking_db.error_events` - Each error occurrence
- `omai_error_tracking_db.error_tags` - Error categorization
- `omai_error_tracking_db.service_actions` - Service/worker actions

---

## 🚨 Troubleshooting

### Logs Not Appearing
1. Check authentication - user must be logged in
2. Verify database connection to `omai_error_tracking_db`
3. Check browser console for frontend errors
4. Ensure middleware is properly registered

### Performance Issues
1. Reduce polling frequency in dashboard
2. Limit number of logs displayed
3. Clear old resolved errors regularly
4. Index database tables on frequently queried columns

### Missing Logs
1. Check log level setting (may be filtering out debug/info)
2. Verify component is using logger utility
3. Check network tab for failed API calls
4. Review server logs for middleware errors

---

## 📝 Best Practices

1. **Always log errors** with full context
2. **Use appropriate log levels** - don't use ERROR for warnings
3. **Include metadata** - user ID, session ID, request ID
4. **Tag consistently** - use standard tag names
5. **Don't log sensitive data** - passwords, tokens, credit cards
6. **Time critical operations** - use `timeExecution` helper
7. **Batch frontend logs** - avoid sending one log at a time
8. **Monitor performance** - watch for slow queries and requests
9. **Review logs regularly** - catch issues before users report them
10. **Clean up old logs** - maintain database performance

---

## 🎯 Quick Start Checklist

- [ ] Backend logger utility installed (`server/utils/omaiLogger.js`)
- [ ] Middleware registered in `server/index.js`
- [ ] Logger routes mounted at `/api/logger`
- [ ] Frontend logger utility imported (`front-end/src/utils/omaiLogger.ts`)
- [ ] Error boundary wrapping main App
- [ ] Dashboard component accessible at `/admin/logger`
- [ ] Database tables exist in `omai_error_tracking_db`
- [ ] Authentication required for logger endpoints
- [ ] Test log sent and visible in dashboard

---

## 📚 API Reference

### Backend Logger Methods
```javascript
logger.error(message, metadata)
logger.warn(message, metadata)
logger.info(message, metadata)
logger.debug(message, metadata)
logger.getCriticalErrors()
logger.getServiceActions(hours)
logger.getHistoricalLogs(filters)
```

### Frontend Logger Methods
```typescript
omaiLogger.error(message, metadata)
omaiLogger.warn(message, metadata)
omaiLogger.info(message, metadata)
omaiLogger.debug(message, metadata)
omaiLogger.componentError(name, error, info)
omaiLogger.apiError(endpoint, error, method)
omaiLogger.logAction(action, metadata)
omaiLogger.logPerformance(metric, duration, metadata)
omaiLogger.timeExecution(name, fn, metadata)
```

### REST API Endpoints
```
POST   /api/logger                 - Send log entry
GET    /api/logger/recent          - Get recent logs
GET    /api/logger/critical        - Get critical errors
GET    /api/logger/service-actions - Get service actions
GET    /api/logger/history         - Get historical logs
GET    /api/logger/stats           - Get statistics
POST   /api/logger/error/:id/resolve - Resolve error
POST   /api/logger/error/:id/tag   - Add tags
GET    /api/logger/components      - List components
DELETE /api/logger/clear-resolved  - Clear old logs
```

---

## Support

For issues or questions about the OMAI Logger:
1. Check the dashboard for system errors
2. Review this documentation
3. Check server logs at `/logs/error.log`
4. Contact the development team

Remember: Good logging today prevents debugging nightmares tomorrow! 🚀
