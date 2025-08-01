# Diagnostic Toolkit Documentation

## Overview

This document describes the comprehensive diagnostic toolkit developed for Orthodox Metrics to identify and resolve link, permission, and API issues. The toolkit consists of 7 specialized Node.js scripts designed for different testing scenarios.

## Architecture

```
server/scripts/
├── quick-permission-test.js          # Fast health check
├── check-links-permissions.js        # Comprehensive auth testing
├── browser-session-test.js           # Real session testing
├── diagnose-churches-api.js          # Specific endpoint investigation
├── test-api-routes.js                # Systematic API testing
├── debug-churches-api.js             # Deep database debugging
└── fix-database-tables.js            # Infrastructure repair
```

## Script Specifications

### 1. Quick Permission Test (`quick-permission-test.js`)

**Purpose**: Rapid health assessment without authentication requirements

**Features**:
- Tests 11 core routes (8 frontend, 3 API)
- No session management required
- Categorizes errors by type (auth, not found, server error)
- Provides success rate percentage
- Generates actionable recommendations

**Output Format**:
```
🚀 Quick Permission Test for Orthodox Metrics
==================================================
✅ 200 - Route Name (Success)
❌ 404 - Route Name (Expected 200) - Route not found
📊 SUMMARY: 8/11 successful (72.7%)
```

**Use Cases**:
- Development environment testing
- CI/CD pipeline health checks
- Quick issue identification
- Pre-deployment verification

### 2. Full Link Checker (`check-links-permissions.js`)

**Purpose**: Comprehensive authentication-aware testing

**Features**:
- Automatic superadmin login
- HTML page crawling for additional links
- Session cookie management
- Detailed JSON report generation
- Frontend and API endpoint testing

**Authentication Flow**:
1. POST to `/api/auth/login` with credentials
2. Extract session cookies
3. Use cookies for subsequent requests
4. Crawl HTML responses for additional links

**Output**:
- Console progress reporting
- JSON file: `logs/link-check-{timestamp}.json`
- Categorized error analysis

### 3. Browser Session Test (`browser-session-test.js`)

**Purpose**: Testing with real user browser sessions

**Features**:
- Uses actual browser cookies
- Command-line cookie input
- Most accurate permission testing
- Bypasses potential login issues

**Usage Pattern**:
```bash
npm run check:session -- --cookie "connect.sid=s%3AyourValue"
```

**Cookie Extraction**:
- Chrome/Edge: Developer Tools > Application > Cookies
- Firefox: Developer Tools > Storage > Cookies

### 4. Churches API Diagnostic (`diagnose-churches-api.js`)

**Purpose**: Targeted investigation of Churches API 500 errors

**Features**:
- Database connectivity testing
- Table structure verification
- Query simulation
- Error isolation and analysis

**Diagnostic Steps**:
1. Test database connection
2. Verify table existence
3. Simulate API queries
4. Analyze error patterns

### 5. Comprehensive API Route Tester (`test-api-routes.js`)

**Purpose**: Systematic testing of all major API endpoints

**Features**:
- Tests 15+ API routes
- Authentication simulation
- Error categorization
- Specific recommendations per error type

**API Categories Tested**:
- Authentication endpoints
- User management
- Church management
- Template management
- Administrative functions

### 6. Churches API Debug (`debug-churches-api.js`)

**Purpose**: Deep debugging with direct database queries

**Features**:
- Direct SQL query execution
- Function-level testing
- Raw data examination
- Execution path simulation

**Debug Levels**:
1. Database connection
2. Table queries
3. Data processing
4. Response formatting

### 7. Database Table Fixer (`fix-database-tables.js`)

**Purpose**: Automated database migration and repair

**Features**:
- Table existence checking
- Missing table creation
- Default data population
- Migration logging

**Migration Capabilities**:
- `menu_role_permissions` table creation
- Default permission insertion
- Foreign key establishment
- Data integrity verification

## npm Scripts Integration

Enhanced `package.json` with diagnostic commands:

```json
{
  "scripts": {
    "check:quick": "node scripts/quick-permission-test.js",
    "check:full": "node scripts/check-links-permissions.js", 
    "check:session": "node scripts/browser-session-test.js",
    "diagnose:churches": "node scripts/diagnose-churches-api.js",
    "test:api": "node scripts/test-api-routes.js",
    "debug:churches": "node scripts/debug-churches-api.js",
    "fix:database": "node scripts/fix-database-tables.js"
  }
}
```

## Error Classification System

### HTTP Status Code Categories

#### 200 (Success)
- ✅ Green checkmark
- Route functioning correctly
- No action required

#### 401 (Authentication Required)
- 🔒 Lock icon
- Session cookies needed
- Use browser session test

#### 403 (Permission Denied)
- 🚫 Prohibition sign
- Role/permission issue
- Check user role in database

#### 404 (Not Found)
- 💥 Explosion icon
- Route not implemented
- Verify endpoint existence

#### 500 (Server Error)
- 🔥 Fire icon
- Backend issue
- Check application logs and database

## Environment Configuration

### Default Values
```javascript
const BASE_URL = process.env.BASE_URL || 'http://localhost:3001';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'superadmin@orthodoxmetrics.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
```

### Custom Configuration
```bash
# Different environment
BASE_URL=https://staging.orthodoxmetrics.com npm run check:quick

# Custom credentials
ADMIN_EMAIL=admin@church.com ADMIN_PASSWORD=secret npm run check:full
```

## Output File Management

### Log Directory Structure
```
server/logs/
├── link-check-2025-07-11-14-30-00.json
├── session-test-2025-07-11-14-35-00.json
└── diagnostic-report-2025-07-11-14-40-00.json
```

### JSON Report Schema
```json
{
  "timestamp": "2025-07-11T14:30:00.000Z",
  "testType": "quick-permission",
  "summary": {
    "total": 11,
    "successful": 8,
    "failed": 3,
    "successRate": "72.7%"
  },
  "results": [
    {
      "route": "/dashboard",
      "status": 200,
      "success": true,
      "responseTime": 150
    }
  ],
  "recommendations": [
    "Check application logs for 500 errors",
    "Verify database connectivity"
  ]
}
```

## Performance Considerations

### Script Execution Times
- Quick test: ~5-10 seconds
- Full test: ~30-60 seconds
- Session test: ~10-20 seconds
- Database debug: ~5-15 seconds

### Resource Usage
- Minimal CPU impact
- Low memory footprint
- Network dependent on endpoint count
- Database connection pooling utilized

## Security Features

### Credential Protection
- Environment variable support
- No hardcoded passwords
- Session cookie expiration respect
- Secure output logging

### Access Control
- Superadmin role verification
- Permission hierarchy testing
- Role-based route access validation
- Authentication flow verification

## Troubleshooting Common Issues

### Connection Refused
```
Error: connect ECONNREFUSED ::1:3001
```
**Solution**: Verify server is running on correct port

### Module Not Found
```
Error: Cannot find module 'axios'
```
**Solution**: Run `npm install axios` in server directory

### Login Failed
```
❌ Login failed: Invalid credentials
```
**Solution**: Verify ADMIN_EMAIL and ADMIN_PASSWORD are correct

### Database Connection Failed
```
Error: ER_ACCESS_DENIED_ERROR
```
**Solution**: Check database credentials and connection string

## Integration with CI/CD

### GitHub Actions Example
```yaml
- name: Run Permission Tests
  run: |
    cd server
    npm run check:quick
    if [ $? -ne 0 ]; then
      echo "Permission tests failed"
      exit 1
    fi
```

### Pre-deployment Checks
```bash
#!/bin/bash
cd server
npm run check:quick
npm run fix:database
npm run test:api
```

## Maintenance and Updates

### Adding New Routes
```javascript
const newRoutes = [
  '/your/new/route',
  '/api/your/new/endpoint'
];
```

### Extending Error Categories
```javascript
const errorCategories = {
  401: { icon: '🔒', message: 'Authentication required' },
  403: { icon: '🚫', message: 'Permission denied' },
  404: { icon: '💥', message: 'Route not found' },
  500: { icon: '🔥', message: 'Server error' },
  502: { icon: '🌐', message: 'Bad gateway' }  // New category
};
```

### Database Migration Extensions
```javascript
const additionalTables = [
  'user_sessions',
  'audit_logs', 
  'templates'
];
```

## Future Enhancements

### Planned Features
1. **Automated Scheduling**: Cron job integration for regular health checks
2. **Slack/Email Notifications**: Alert system for critical failures
3. **Performance Monitoring**: Response time tracking and alerting
4. **Historical Analysis**: Trend analysis of success rates over time
5. **Load Testing**: Concurrent request testing capabilities

### API Expansion
1. **GraphQL Testing**: Support for GraphQL endpoints
2. **WebSocket Testing**: Real-time connection testing
3. **File Upload Testing**: Multipart form data testing
4. **Rate Limit Testing**: API throttling verification

---

**Toolkit Status**: ✅ COMPLETE AND OPERATIONAL  
**Last Updated**: July 11, 2025  
**Maintenance**: Ongoing as application evolves
