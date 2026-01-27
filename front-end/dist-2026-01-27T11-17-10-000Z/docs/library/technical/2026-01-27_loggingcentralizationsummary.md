# Logging Centralization Summary

## Overview
Successfully migrated the orthodmetrics-dev logging system from filesystem-based logs to a centralized MariaDB database storage system. This provides better querying, filtering, and long-term log management capabilities.

## 🗃️ Database Schema

### `system_logs` Table
```sql
CREATE TABLE system_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  level ENUM('INFO', 'WARN', 'ERROR', 'DEBUG', 'SUCCESS') NOT NULL,
  source VARCHAR(100) NOT NULL,
  message TEXT NOT NULL,
  meta JSON,
  user_email VARCHAR(255) NULL,
  service VARCHAR(100) NULL,
  session_id VARCHAR(255) NULL,
  request_id VARCHAR(100) NULL,
  ip_address VARCHAR(45) NULL,
  user_agent TEXT NULL,
  -- Indexes for performance
  INDEX idx_timestamp (timestamp),
  INDEX idx_level (level),
  INDEX idx_source (source),
  INDEX idx_service (service),
  INDEX idx_user_email (user_email),
  INDEX idx_session_id (session_id)
);
```

### `log_buffer` Table
```sql
CREATE TABLE log_buffer (
  id INT AUTO_INCREMENT PRIMARY KEY,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  log_data JSON NOT NULL,
  processed BOOLEAN DEFAULT FALSE,
  INDEX idx_processed (processed),
  INDEX idx_created_at (created_at)
);
```

## 🔧 Core Components

### 1. Database Logger (`server/utils/dbLogger.js`)
- **Singleton pattern** for consistent logging across the application
- **Fallback mechanism** to filesystem if database is unavailable
- **Buffering system** for resilience during database downtime
- **Automatic table creation** on initialization
- **Convenience methods** for different log levels (info, warn, error, debug, success)
- **Query helpers** for log retrieval and filtering
- **Cleanup functionality** with configurable retention policies

### 2. Request Logging Middleware (`server/middleware/requestLogger.js`)
- **Automatic API request/response logging** with timing
- **User context capture** (email, session, IP, user agent)
- **Configurable options** for headers, body, and error logging
- **Request ID generation** for request tracing
- **Multiple preset configurations** (detailed, minimal, default)

### 3. Winston Database Transport
- **Custom Winston transport** for backward compatibility
- **Level mapping** from Winston to database logger levels
- **Metadata preservation** from existing Winston logs
- **Console output maintained** for development

## 📂 Refactored Components

### Services Updated
- **`server/services/bigBookKanbanSync.js`**: Replaced file logging with database logging
- **`server/church-provisioner.js`**: Converted console.log statements to structured logging
- **`server/routes/logs.js`**: Added database query endpoints and stats

### Winston Configuration
- **File transports removed**: No longer writing to individual log files
- **Database transport added**: All Winston logs now go to database
- **Component-specific loggers**: Authentication, Database, API Server, Email Service, File Upload

### Express Integration
- **Automatic request logging**: All API calls logged with timing and context
- **User context**: Requests automatically include user information when available
- **Error tracking**: Failed requests automatically logged with error details

## 🛠️ Utilities and Scripts

### Migration Script (`server/scripts/migrate-logs-to-database.js`)
- **Import existing log files** to database
- **Support for JSON logs** (Winston format)
- **Support for plain text logs** with timestamp parsing
- **Pattern recognition** for different log formats
- **Performance tracking** and error reporting

### Testing Script (`server/scripts/test-database-logging.js`)
- **Comprehensive test suite** for database logging functionality
- **Performance testing** (logs per second metrics)
- **Database connectivity verification**
- **Error handling validation**
- **Cleanup after testing**

## 🌐 API Endpoints

### Database Log Querying
- **`GET /api/logs/database`**: Query logs with advanced filtering
  - Filter by: level, source, service, user_email, date range
  - Search functionality across message and metadata
  - Pagination support (limit/offset)
  - Maximum 1000 logs per request

- **`GET /api/logs/database/stats`**: Log statistics and analytics
  - Log level distribution (24 hours)
  - Top services by log volume
  - Total log count
  - Recent error count

- **`POST /api/logs/database/cleanup`**: Clean up old logs (superadmin only)
  - Configurable retention period
  - Returns count of deleted logs
  - Audit logging of cleanup operations

## 📊 Benefits Achieved

### Performance
- **Structured querying**: Fast filtering by indexed fields
- **Efficient pagination**: Database-level LIMIT/OFFSET
- **Bulk operations**: Batch inserts and cleanup

### Observability
- **Centralized view**: All logs in one location
- **Rich metadata**: User context, session tracking, request tracing
- **Real-time filtering**: Dynamic queries without file parsing
- **Statistics**: Built-in analytics and trending

### Maintenance
- **Automatic retention**: Configurable cleanup policies
- **Space management**: No filesystem bloat from log files
- **Backup integration**: Logs included in database backups
- **Migration support**: Import historical logs from files

### Development
- **Better debugging**: Correlation between logs via request_id
- **User tracking**: See all actions by specific users
- **Service isolation**: Filter logs by service/component
- **Error aggregation**: Quick identification of error patterns

## 🔄 Migration Process

### Completed Steps
1. ✅ Created database schema with indexes
2. ✅ Implemented shared database logger utility
3. ✅ Created Winston database transport for compatibility
4. ✅ Refactored services to use database logging
5. ✅ Added Express middleware for automatic request logging
6. ✅ Created migration script for existing log files
7. ✅ Added API endpoints for log querying and management
8. ✅ Implemented testing and validation scripts

### Backward Compatibility
- **Winston compatibility**: Existing Winston calls still work
- **Console output**: Development logging still visible in console
- **Fallback mechanism**: Filesystem logging if database fails
- **Legacy endpoints**: Old /api/logs endpoints still functional

## 🚀 Usage Examples

### Basic Logging
```javascript
const { info, warn, error } = require('./utils/dbLogger');

// Simple logging
await info('UserService', 'User logged in', { userId: 123 });

// With user context
await warn('PaymentService', 'Payment retry attempted', 
  { orderId: 456, attempt: 3 }, 
  user, 
  'payment-processor'
);

// With full context
await error('APIGateway', 'Request failed', 
  { statusCode: 500, endpoint: '/api/users' },
  user,
  'api-gateway',
  { requestId: 'req-789', sessionId: 'sess-456' }
);
```

### Querying Logs
```javascript
// Get recent errors
const errorLogs = await dbLogger.getLogs({
  level: 'ERROR',
  startDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
  limit: 50
});

// Get logs for specific user
const userLogs = await dbLogger.getLogs({
  user_email: 'user@example.com',
  service: 'user-management',
  limit: 100
});
```

### API Usage
```bash
# Get recent logs with filters
curl "https://orthodmetrics.com/api/logs/database?level=ERROR&limit=10&service=payment-processor"

# Get log statistics
curl "https://orthodmetrics.com/api/logs/database/stats"

# Search logs
curl "https://orthodmetrics.com/api/logs/database?search=login&limit=20"
```

## 📈 Next Steps

### Recommended Enhancements
1. **Real-time log streaming**: WebSocket endpoint for live log viewing
2. **Alerting system**: Email/Slack notifications for critical errors
3. **Log aggregation**: Daily/hourly summaries for trending
4. **Export functionality**: CSV/JSON export for external analysis
5. **Log correlation**: Link related logs across services
6. **Performance metrics**: Automatic performance logging for slow operations

### Monitoring
- **Database size monitoring**: Track system_logs table growth
- **Log volume alerts**: Notifications for unusual log volume
- **Error rate tracking**: Automated error rate calculations
- **Performance impact**: Monitor database logging performance

The centralized logging system is now fully operational and provides a solid foundation for improved observability and debugging capabilities in the orthodmetrics-dev environment.