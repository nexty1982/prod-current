# Link & Permission Checker Documentation

## Overview

This toolkit provides comprehensive testing for broken links and permission errors in the Orthodox Metrics application. It's specifically designed to help identify issues where superadmin users are getting permission denied errors that shouldn't occur.

## Scripts Available

### 1. Quick Permission Test (`quick-permission-test.js`)
**Best for**: Quick health check without needing login credentials

- Tests core routes without authentication
- Fastest way to identify major issues
- Good for development environment testing
- No session management required

**Usage:**
```bash
cd server
npm run check:quick

# Or with custom URL
BASE_URL=http://localhost:3000 npm run check:quick
```

### 2. Full Link Checker (`check-links-permissions.js`)
**Best for**: Comprehensive testing with automatic login

- Automatically logs in as superadmin
- Crawls through HTML pages to find additional links
- Tests both frontend routes and API endpoints
- Generates detailed reports
- Saves results to JSON file

**Usage:**
```bash
cd server
npm run check:full

# Or with custom credentials
ADMIN_EMAIL=admin@mysite.com ADMIN_PASSWORD=mypass npm run check:full
```

### 3. Browser Session Test (`browser-session-test.js`)
**Best for**: Testing with your actual browser session

- Uses your real browser cookies
- Most accurate for permission testing
- Bypasses potential login issues
- Tests exactly what you're experiencing

**Usage:**
1. Login to the app in your browser
2. Open Developer Tools (F12)
3. Go to Application > Cookies
4. Find and copy the session cookie value
5. Run the test:

```bash
cd server
npm run check:session -- --cookie "connect.sid=s%3AyourCookieValue"
```

### 4. Churches API Diagnostic (`diagnose-churches-api.js`)
**Best for**: Investigating 500 errors on specific endpoints

- Specifically tests the Churches API endpoint
- Checks database connectivity and table structure
- Provides detailed error analysis
- Tests database connection separately

**Usage:**
```bash
cd server
npm run diagnose:churches
```

### 5. Comprehensive API Route Tester (`test-api-routes.js`)
**Best for**: Testing all API endpoints systematically

- Tests all major API routes in the application
- Categorizes issues by type (auth, permission, not found, server error)
- Provides specific recommendations for each type of error
- Comprehensive overview of API health

**Usage:**
```bash
cd server
npm run test:api
```

### 6. Churches API Debug (`debug-churches-api.js`)
**Best for**: Deep debugging of specific API issues

- Directly tests database queries and functions
- Simulates exact route execution
- Isolates the source of 500 errors
- Shows raw data and processed results

**Usage:**
```bash
cd server
npm run debug:churches
```

### 7. Database Table Fixer (`fix-database-tables.js`)
**Best for**: Fixing missing database tables that cause 500 errors

- Checks for missing required database tables
- Creates missing tables with proper structure
- Populates default menu items and permissions
- Fixes menu_role_permissions table errors

**Usage:**
```bash
cd server
npm run fix:database
```

## Quick Start Guide

If you're getting permission denied errors or API failures:

1. **Quick health check**:
   ```bash
   npm run check:quick
   ```

2. **Fix database issues** (if you see table errors in logs):
   ```bash
   npm run fix:database
   ```

3. **Test with your browser session** (most accurate):
   ```bash
   npm run check:session -- --cookie "your-session-cookie"
   ```

4. **Full API testing**:
   ```bash
   npm run test:api
   ```

## Getting Your Session Cookie

### Chrome/Edge:
1. Login to Orthodox Metrics
2. Press F12 to open Developer Tools
3. Go to **Application** tab
4. In the left sidebar, expand **Cookies**
5. Click on your site URL
6. Find the session cookie (usually named `connect.sid`)
7. Copy the entire **Value** (not just the name)

### Firefox:
1. Login to Orthodox Metrics
2. Press F12 to open Developer Tools
3. Go to **Storage** tab
4. In the left sidebar, expand **Cookies**
5. Click on your site URL
6. Find the session cookie and copy its value

## Common Issues & Solutions

### Permission Denied (403 Errors)
**Symptoms**: Superadmin getting "Access Denied" on routes they should access

**Check:**
1. User role in database:
   ```sql
   SELECT id, email, role, is_active FROM users 
   WHERE email = 'superadmin@orthodoxmetrics.com';
   ```
2. Verify `role` is 'superadmin' and `is_active` is 1
3. Check middleware permissions in the application

### Authentication Required (401 Errors)
**Symptoms**: Being redirected to login or getting "unauthorized"

**Solutions:**
1. Use the browser session test with fresh cookies
2. Check session configuration in the application
3. Verify session store is working properly

### Routes Not Found (404 Errors)
**Symptoms**: Pages that should exist return 404

**Check:**
1. Route definitions in the application
2. Frontend build is up to date
3. Server routing configuration

### Server Errors (500 Errors)
**Symptoms**: Internal server errors on accessible routes

**Check:**
1. Application logs for stack traces
2. Database connectivity
3. Missing environment variables

## Environment Variables

- `BASE_URL`: Application URL (default: http://localhost:3001)
- `ADMIN_EMAIL`: Superadmin email (default: superadmin@orthodoxmetrics.com)
- `ADMIN_PASSWORD`: Superadmin password (default: admin123)

## Output Files

Test results are automatically saved to:
- `logs/link-check-{timestamp}.json` (Full checker)
- `logs/session-test-{timestamp}.json` (Browser session test)

## Installation

If you get module errors, install the required dependency:

```bash
cd server
npm install axios
```

## Advanced Usage

### Testing Specific Routes
Edit the scripts to add/remove routes from the test arrays:

```javascript
const coreRoutes = [
  '/your/custom/route',
  '/another/route',
  // ... existing routes
];
```

### Custom Authentication
Modify the credentials in the scripts or use environment variables:

```bash
ADMIN_EMAIL=your-admin@domain.com ADMIN_PASSWORD=yourpass npm run check:full
```

### Testing Different Environments
```bash
# Test staging
BASE_URL=https://staging.orthodoxmetrics.com npm run check:quick

# Test production (be careful!)
BASE_URL=https://orthodoxmetrics.com npm run check:session -- --cookie "your-cookie"
```

## Troubleshooting

### "Connection Refused" Errors
- Verify the server is running
- Check the BASE_URL is correct
- Ensure no firewall is blocking the connection

### "Module Not Found" Errors
```bash
cd server
npm install
```

### "Login Failed" Errors
- Verify credentials are correct
- Check if the login endpoint is working
- Test manual login in browser first

### No Session Cookie Found
- Make sure you're logged in to the correct site
- Check if cookies are enabled in browser
- Look for different cookie names (session, auth, etc.)

## Security Notes

- Never commit real passwords or session cookies to version control
- Use environment variables for sensitive data
- Session cookies are temporary and will expire
- These scripts are for debugging only - don't use in production automation

## Support

If you encounter issues not covered here:

1. Check the console output for specific error messages
2. Review the saved JSON reports for detailed information
3. Test manual access to failing routes in your browser
4. Check application logs for server-side errors

The scripts are designed to provide clear, actionable feedback to help you identify and resolve permission and routing issues quickly.
