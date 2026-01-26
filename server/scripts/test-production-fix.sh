#!/bin/bash
# Production Fix Verification Script
# Tests that both issues are resolved

set -e

echo "🔍 Verifying Production Fix..."
echo ""

cd "$(dirname "$0")/.."

# Step 1: Build
echo "📦 Building server..."
npm run build
echo "✅ Build complete"
echo ""

# Step 2: Verify files exist
echo "📁 Checking dist files..."
if [ -f "dist/routes/interactiveReports.js" ]; then
    echo "✅ dist/routes/interactiveReports.js exists"
else
    echo "❌ dist/routes/interactiveReports.js MISSING"
    exit 1
fi

if [ -f "dist/routes/clientApi.js" ]; then
    echo "✅ dist/routes/clientApi.js exists"
else
    echo "❌ dist/routes/clientApi.js MISSING"
    exit 1
fi
echo ""

# Step 3: Check syntax
echo "🔍 Checking syntax..."
if node -c dist/routes/clientApi.js 2>/dev/null; then
    echo "✅ dist/routes/clientApi.js syntax OK"
else
    echo "❌ dist/routes/clientApi.js has syntax errors"
    exit 1
fi

if node -c dist/routes/interactiveReports.js 2>/dev/null; then
    echo "✅ dist/routes/interactiveReports.js syntax OK"
else
    echo "❌ dist/routes/interactiveReports.js has syntax errors"
    exit 1
fi
echo ""

# Step 4: Check for duplicate router declarations
echo "🔍 Checking for duplicate router declarations..."
ROUTER_COUNT=$(grep -c "const router = express.Router()" dist/routes/clientApi.js || echo "0")
if [ "$ROUTER_COUNT" -eq "1" ]; then
    echo "✅ clientApi.js has exactly 1 router declaration"
else
    echo "❌ clientApi.js has $ROUTER_COUNT router declarations (expected 1)"
    exit 1
fi

MODULE_EXPORT_COUNT=$(grep -c "module.exports = router" dist/routes/clientApi.js || echo "0")
if [ "$MODULE_EXPORT_COUNT" -eq "1" ]; then
    echo "✅ clientApi.js has exactly 1 module.exports"
else
    echo "❌ clientApi.js has $MODULE_EXPORT_COUNT module.exports (expected 1)"
    exit 1
fi
echo ""

echo "✅ All checks passed!"
echo ""
echo "Next steps:"
echo "1. Restart PM2: pm2 restart orthodox-backend"
echo "2. Check logs: pm2 logs orthodox-backend --lines 30"
echo "3. Test endpoints: curl -i http://127.0.0.1:3001/api/admin/churches/46/tables"
