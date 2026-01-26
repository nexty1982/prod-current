#!/bin/bash
#
# Rebuild and Test OCR Routes
# 
# This script automates the rebuild, restart, and verification process
# for OCR route changes. Run this after modifying OCR routes.
#

set -e  # Exit on error

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVER_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$SERVER_DIR"

echo "======================================================================"
echo "OCR Routes Rebuild and Test Script"
echo "======================================================================"
echo "Server directory: $SERVER_DIR"
echo ""

# Step 1: Rebuild TypeScript
echo "Step 1: Rebuilding TypeScript..."
npm run build:ts
if [ $? -ne 0 ]; then
    echo "❌ TypeScript build failed!"
    exit 1
fi
echo "✅ TypeScript build completed"
echo ""

# Step 2: Fix router exports
echo "Step 2: Fixing router exports..."
node scripts/fix-router-exports.js
if [ $? -ne 0 ]; then
    echo "❌ Router export fix failed!"
    exit 1
fi
echo "✅ Router exports fixed"
echo ""

# Step 3: Verify compiled files exist
echo "Step 3: Verifying compiled files..."
if [ ! -f "dist/index.js" ]; then
    echo "❌ dist/index.js not found!"
    exit 1
fi
if [ ! -f "dist/routes/churchOcrRoutes.js" ]; then
    echo "❌ dist/routes/churchOcrRoutes.js not found!"
    exit 1
fi
echo "✅ Compiled files verified"
ls -lh dist/index.js dist/routes/churchOcrRoutes.js
echo ""

# Step 4: Restart PM2 server
echo "Step 4: Restarting PM2 server (orthodox-backend)..."
pm2 restart orthodox-backend
if [ $? -ne 0 ]; then
    echo "❌ PM2 restart failed!"
    exit 1
fi
echo "✅ Server restarted"
echo ""

# Step 5: Wait a moment for server to start
echo "Step 5: Waiting for server to initialize..."
sleep 3
echo ""

# Step 6: Check PM2 logs for router loading
echo "Step 6: Checking PM2 logs for router loading messages..."
echo "----------------------------------------------------------------------"
pm2 logs orthodox-backend --lines 100 --nostream | grep -i OCR || echo "⚠️  No OCR-related log messages found"
echo "----------------------------------------------------------------------"
echo ""

# Check for specific router loading messages
echo "Step 7: Verifying router loaded successfully..."
ROUTER_LOADED=$(pm2 logs orthodox-backend --lines 100 --nostream | grep -c "Loaded churchOcrRoutes from compiled dist" || true)
ROUTER_REGISTERED=$(pm2 logs orthodox-backend --lines 100 --nostream | grep -c "routes registered via router" || true)

# Convert to integers, defaulting to 0 if empty
ROUTER_LOADED=${ROUTER_LOADED:-0}
ROUTER_REGISTERED=${ROUTER_REGISTERED:-0}

if [ "$ROUTER_LOADED" -gt 0 ] && [ "$ROUTER_REGISTERED" -gt 0 ]; then
    echo "✅ Router loaded and registered successfully"
else
    echo "⚠️  Router loading messages not found in logs"
    echo "   Router loaded count: $ROUTER_LOADED"
    echo "   Router registered count: $ROUTER_REGISTERED"
    echo "   This might be normal if server was already running"
fi
echo ""

# Step 8: Test endpoints
echo "Step 8: Testing OCR endpoints..."
echo "----------------------------------------------------------------------"
node scripts/test-ocr-endpoints.js 46 1 http://localhost:3001
TEST_EXIT_CODE=$?
echo "----------------------------------------------------------------------"
echo ""

# Step 9: Check for route logs
echo "Step 9: Checking for route execution logs..."
echo "----------------------------------------------------------------------"
pm2 logs orthodox-backend --lines 50 --nostream | grep "\[OCR Jobs\]" || echo "⚠️  No [OCR Jobs] log messages found (routes may not have been hit)"
echo "----------------------------------------------------------------------"
echo ""

# Summary
echo "======================================================================"
echo "Summary"
echo "======================================================================"
if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo "✅ All steps completed successfully"
    echo "✅ Endpoint tests passed"
else
    echo "⚠️  Endpoint tests returned exit code: $TEST_EXIT_CODE"
    echo "   Check the test output above for details"
fi
echo ""
echo "Next steps:"
echo "1. Review PM2 logs: pm2 logs orthodox-backend --lines 100"
echo "2. If routes still return 404, check:"
echo "   - Router loading messages in logs"
echo "   - Route definitions in dist/routes/churchOcrRoutes.js"
echo "   - Route mount in dist/index.js (line ~685)"
echo ""

exit $TEST_EXIT_CODE
