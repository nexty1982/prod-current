#!/bin/bash
#
# Rebuild and Test OCR Routes (systemd version)
#
# This script automates the rebuild, restart, and verification process
# for OCR route changes. Run this after modifying OCR routes.
#
# OCR routes are hardwired directly in src/index.ts (DB source of truth).
# There is no separate churchOcrRoutes router module.
#

set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVER_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
SERVICE_NAME="orthodox-backend"

cd "$SERVER_DIR"

echo "======================================================================"
echo "OCR Routes Rebuild and Test Script (systemd)"
echo "======================================================================"
echo "Server directory: $SERVER_DIR"
echo ""

# Step 1: Rebuild TypeScript
echo "Step 1: Rebuilding TypeScript..."
npm run build:ts
echo "  TypeScript build completed"
echo ""

# Step 2: Verify compiled entry point exists
echo "Step 2: Verifying compiled files..."
if [ ! -f "dist/index.js" ]; then
  echo "  dist/index.js not found!"
  exit 1
fi
echo "  dist/index.js exists"
ls -lh dist/index.js
echo ""

# Step 3: Verify OCR routes are present in compiled output
echo "Step 3: Verifying OCR routes in compiled index.js..."
OCR_ROUTE_COUNT=$(grep -c "app\.\(get\|post\|put\|patch\|delete\)('/api/church/:churchId/ocr" dist/index.js 2>/dev/null || echo "0")
if [ "$OCR_ROUTE_COUNT" -eq 0 ]; then
  echo "  No OCR routes found in dist/index.js!"
  exit 1
fi
echo "  Found $OCR_ROUTE_COUNT OCR route definitions in dist/index.js"
echo ""

# Step 4: Restart systemd service
echo "Step 4: Restarting systemd service ($SERVICE_NAME)..."
sudo systemctl restart "$SERVICE_NAME"
sudo systemctl is-active --quiet "$SERVICE_NAME"
echo "  Service restarted and active"
echo ""

# Step 5: Wait for server to start
echo "Step 5: Waiting for server to initialize..."
sleep 3
echo ""

# Step 6: Check journald logs for OCR-related messages
echo "Step 6: Checking journald logs for OCR messages..."
echo "----------------------------------------------------------------------"
sudo journalctl -u "$SERVICE_NAME" -n 200 --no-pager | grep -i OCR \
  || echo "  No OCR-related log messages found"
echo "----------------------------------------------------------------------"
echo ""

# Step 7: Verify hardwired OCR routes loaded
echo "Step 7: Verifying OCR routes loaded..."
OCR_HARDWIRED=$(sudo journalctl -u "$SERVICE_NAME" -n 200 --no-pager | grep -c "Church OCR routes: hardwired" || true)
OCR_HARDWIRED=${OCR_HARDWIRED:-0}

if [ "$OCR_HARDWIRED" -gt 0 ]; then
  echo "  Hardwired OCR routes confirmed in logs"
else
  echo "  Hardwired route log message not found (may be normal if scrolled past)"
fi
echo ""

# Step 8: Test endpoints
echo "Step 8: Testing OCR endpoints..."
echo "----------------------------------------------------------------------"
node scripts/test-ocr-endpoints.js 46 1 http://localhost:3001
TEST_EXIT_CODE=$?
echo "----------------------------------------------------------------------"
echo ""

# Step 9: Check for route execution logs
echo "Step 9: Checking for route execution logs..."
echo "----------------------------------------------------------------------"
sudo journalctl -u "$SERVICE_NAME" -n 200 --no-pager | grep "\[OCR" \
  || echo "  No [OCR] log messages found (routes may not have been hit yet)"
echo "----------------------------------------------------------------------"
echo ""

# Summary
echo "======================================================================"
echo "Summary"
echo "======================================================================"
if [ "$TEST_EXIT_CODE" -eq 0 ]; then
  echo "  All steps completed successfully"
  echo "  Endpoint tests passed"
else
  echo "  Endpoint tests returned exit code: $TEST_EXIT_CODE"
  echo "  Check the test output above for details"
fi
echo ""
echo "Next steps:"
echo "1. Review logs:"
echo "   journalctl -u $SERVICE_NAME -n 200 --no-pager"
echo "2. If routes return 404, check:"
echo "   - OCR route definitions in src/index.ts"
echo "   - Compiled output in dist/index.js"
echo "   - Service status: systemctl status $SERVICE_NAME"
echo ""

exit "$TEST_EXIT_CODE"
