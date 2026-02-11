# API Audit Tools for OrthodoxMetrics

## Overview

Two powerful tools to give you complete understanding of your backend API landscape:

1. **`api-audit-complete.js`** - Comprehensive Node.js tool with full analysis
2. **`api-audit-quick.sh`** - Fast shell script for quick insights

## 🚀 Quick Start

### Option 1: Quick Shell Audit (Recommended for first run)

```bash
# Basic discovery - shows all routes
./scripts/api-audit-quick.sh

# With endpoint testing (if server is running)
./scripts/api-audit-quick.sh --test

# With usage analysis
./scripts/api-audit-quick.sh --usage

# Full analysis
./scripts/api-audit-quick.sh --test --usage
```

### Option 2: Comprehensive Node.js Audit

```bash
# Basic route discovery and usage analysis
node scripts/api-audit-complete.js

# With live endpoint testing
node scripts/api-audit-complete.js --test-endpoints

# Full detailed analysis with error debugging
node scripts/api-audit-complete.js --test-endpoints --detailed
```

## 📊 What You'll Get

### Route Discovery
- **All API endpoints** found in your backend
- **HTTP methods** (GET, POST, PUT, DELETE, PATCH)
- **File locations** and line numbers
- **Route parameters** and middleware detection

### Usage Analysis
- **Frontend references** - where routes are called in React/TS
- **Backend references** - internal API calls
- **Unused routes** - potential cleanup candidates
- **Cross-references** - how APIs connect

### Live Testing (with `--test` flags)
- **Health checks** - which endpoints respond
- **Status codes** - 200, 404, 500, etc.
- **Response times** - performance insights
- **Error details** - what's broken and why

### Smart Features
- **Parameter replacement** - automatically tests `:id` routes with test data
- **Middleware detection** - finds auth, validation, CORS
- **Comment extraction** - shows route descriptions
- **Pattern matching** - discovers routes even with complex patterns

## 📋 Sample Output

```
🔍 API Audit Tool for OrthodoxMetrics
=====================================

📊 Statistics:
  Total Routes: 127
  Working Routes: 98
  Error Routes: 12
  Unused Routes: 17
  Tested Routes: 110

📋 All Discovered Routes:
--------------------------------------------------------------------------------

✅ 🔗 GET    /api/admin/users
    📁 server/routes/admin.js:45
    💬 Get all users with pagination
    🛡️  Middleware: authenticate, authorize
    🔗 8 references (5 frontend, 3 backend)

❌ ⚪ POST   /api/legacy/sync
    📁 server/routes/legacy.js:123
    ⚠️  Error: Connection refused
    ⚪ No usage found - may be unused

✅ 🔗 GET    /api/omai/health
    📁 server/routes/omai.js:23
    💬 OMAI system health check
    🔗 3 references (2 frontend, 1 backend)
```

## 🔍 Specific Use Cases

### "Show me all my APIs"
```bash
./scripts/api-audit-quick.sh
```

### "Which APIs are broken?"
```bash
./scripts/api-audit-quick.sh --test
# or for details:
node scripts/api-audit-complete.js --test-endpoints --detailed
```

### "What APIs can I remove?"
```bash
./scripts/api-audit-quick.sh --usage
# Look for routes marked "No frontend usage found"
```

### "Find new/undocumented routes"
The tools automatically discover ALL routes, including:
- Routes in new files you forgot about
- Nested routes in subdirectories  
- Complex route patterns
- Middleware-mounted routes

### "Performance check my APIs"
```bash
node scripts/api-audit-complete.js --test-endpoints
# Shows response times and status codes
```

## 🛠 Configuration

### Environment Variables
```bash
export PORT=3000              # Your server port
export HOST=localhost         # Server host
export HTTPS=true            # If using HTTPS
```

### Customizing Search Patterns

Edit `scripts/api-audit-complete.js` to modify:
- `routePatterns` - where to look for route files
- `frontendPaths` - where to search for usage
- `excludePatterns` - what to ignore

## 🚨 Troubleshooting

### "No route files found"
- Check if you're in the project root
- Verify `server/` directory exists
- Routes might be in unusual locations

### "Server not responding" 
- Make sure your server is running: `npm start` or `node server/index.js`
- Check the correct port is set
- Try testing individual endpoints manually

### "Permission denied"
On Linux, make scripts executable:
```bash
chmod +x scripts/api-audit-quick.sh
chmod +x scripts/api-audit-complete.js
```

### "No usage found for active routes"
- Routes might be called dynamically (template strings)
- Check if API calls use different base URLs
- Frontend might be in non-standard location

## ⚡ Pro Tips

1. **Run quick audit first** to get overview
2. **Test with server running** for best results  
3. **Check unused routes** before removing (might be called externally)
4. **Monitor new routes** by running regularly
5. **Use detailed mode** when debugging specific issues

## 🔗 Integration

### Add to package.json
```json
{
  "scripts": {
    "audit:api": "node scripts/api-audit-complete.js",
    "audit:api:test": "node scripts/api-audit-complete.js --test-endpoints",
    "audit:quick": "./scripts/api-audit-quick.sh --test --usage"
  }
}
```

### CI/CD Integration
```bash
# In your deployment pipeline
./scripts/api-audit-quick.sh --test > api-audit-report.txt
# Fail build if critical APIs are broken
```

---

These tools give you **complete visibility** into your API ecosystem. Run them regularly to:
- **Discover forgotten APIs**
- **Find broken endpoints** 
- **Identify unused routes**
- **Monitor API health**
- **Understand usage patterns**

**Start with**: `./scripts/api-audit-quick.sh --test --usage` 