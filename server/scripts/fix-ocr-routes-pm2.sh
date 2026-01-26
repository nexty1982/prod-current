#!/bin/bash
set -e

echo "=========================================="
echo "Fix OCR Routes PM2 Configuration"
echo "=========================================="
echo ""

# Change to server directory
cd /var/www/orthodoxmetrics/prod/server

echo "Step 1: Rebuilding TypeScript and copying files..."
# Run full build to ensure build-copy.js copies utils files
npm run build:ts
npm run build:copy || echo "⚠️  build:copy failed, continuing..."

echo ""
echo "Step 1b: Verifying safeRequire.js was copied to dist..."
if [ -f "dist/utils/safeRequire.js" ]; then
  echo "✅ safeRequire.js found in dist/utils/"
else
  echo "❌ safeRequire.js NOT found in dist/utils/ - build may have failed"
  echo "   Manually copying safeRequire.js..."
  cp utils/safeRequire.js dist/utils/safeRequire.js || true
fi

echo ""
echo "Step 2: Verifying routes are in compiled file..."
node -e "
const fs = require('fs');
const s = fs.readFileSync('dist/index.js', 'utf8');
const hasRoutes = s.includes('/api/church/:churchId/ocr/jobs');
const hasBootSig = s.includes('BOOT_SIGNATURE_OCR');
console.log('✅ Routes in dist:', hasRoutes);
console.log('✅ Boot signature:', hasBootSig);
if (!hasRoutes || !hasBootSig) {
  console.error('❌ Routes or boot signature missing in dist/index.js!');
  process.exit(1);
}
"

echo ""
echo "Step 3: Restarting PM2 with updated ecosystem config..."
cd /var/www/orthodoxmetrics/prod
pm2 delete orthodox-backend || true
pm2 start ecosystem.config.js

echo ""
echo "Step 4: Waiting for PM2 to start..."
sleep 3

echo ""
echo "Step 5: Verifying PM2 is running the correct file (checking boot signature)..."
if pm2 logs orthodox-backend --lines 10 --nostream | grep -q BOOT_SIGNATURE_OCR; then
  echo "✅ Boot signature found - PM2 is running dist/index.js"
else
  echo "⚠️  Boot signature not found in logs. PM2 might not be running dist/index.js"
  echo "   Checking PM2 process info..."
  pm2 describe orthodox-backend | grep -E "script|exec_mode|cwd" || true
fi

echo ""
echo "Step 6: Verifying routes are registered..."
cd /var/www/orthodoxmetrics/prod/server
if pm2 logs orthodox-backend --lines 100 --nostream | grep -q "OCR Jobs Routes"; then
  echo "✅ Route registration logs found"
  pm2 logs orthodox-backend --lines 100 --nostream | grep "OCR Jobs Routes" | tail -1
else
  echo "⚠️  Route registration logs not found (checking if route exists in code)..."
  if [ -f "dist/index.js" ] && grep -q "app.get('/api/church/:churchId/ocr/jobs'" dist/index.js; then
    echo "✅ Route exists in dist/index.js at line:"
    grep -n "app.get('/api/church/:churchId/ocr/jobs'" dist/index.js | head -1
  else
    echo "❌ Route NOT found in dist/index.js - checking if file exists..."
    if [ -f "dist/index.js" ]; then
      echo "   File exists but route not found - rebuild may have failed"
    else
      echo "   dist/index.js does not exist!"
    fi
  fi
fi

echo ""
echo "Step 7: Checking PM2 status and crash logs..."
pm2 status orthodox-backend
echo ""
echo "Checking if server is listening on port 3001..."
if netstat -tuln 2>/dev/null | grep -q ":3001 " || ss -tuln 2>/dev/null | grep -q ":3001 "; then
  echo "✅ Port 3001 is listening"
else
  echo "❌ Port 3001 is NOT listening - server is crashing on startup"
  echo ""
  echo "Checking PM2 error logs for crash reason..."
  pm2 logs orthodox-backend --err --lines 100 --nostream | tail -50
  echo ""
  echo "Checking if server is restarting repeatedly..."
  RESTART_COUNT=$(pm2 describe orthodox-backend | grep "restart time" | awk '{print $4}' || echo "0")
  echo "PM2 restart count: $RESTART_COUNT"
fi
echo ""
echo "Recent PM2 logs (last 50 lines):"
pm2 logs orthodox-backend --lines 50 --nostream | tail -30

echo ""
echo "Step 8: Testing the endpoint..."
cd /var/www/orthodoxmetrics/prod/server
echo "Testing: curl -i http://localhost:3001/api/church/46/ocr/jobs"
HTTP_CODE=$(curl -sS -o /tmp/ocr_jobs_body.txt -w "%{http_code}" http://localhost:3001/api/church/46/ocr/jobs 2>&1 | tail -1 || echo "000")
echo "HTTP Status Code: $HTTP_CODE"

if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ SUCCESS! Endpoint returned 200"
  echo "Response preview:"
  head -c 200 /tmp/ocr_jobs_body.txt
  echo ""
elif [ "$HTTP_CODE" = "404" ]; then
  echo "❌ FAILED: Endpoint returned 404"
  echo "Response body:"
  cat /tmp/ocr_jobs_body.txt 2>/dev/null || echo "(no response body)"
  echo ""
  echo "Checking PM2 logs for errors and OCR-related entries..."
  echo "--- Recent errors ---"
  pm2 logs orthodox-backend --lines 100 --nostream | grep -i "error" | tail -10 || echo "No errors found"
  echo ""
  echo "--- OCR-related logs (including debug) ---"
  pm2 logs orthodox-backend --lines 200 --nostream | grep -iE "ocr|debug" | tail -15 || echo "No OCR logs found"
  echo ""
  echo "--- Route registration check ---"
  pm2 logs orthodox-backend --lines 200 --nostream | grep -E "OCR Jobs Routes|Registering hardwired|BOOT_SIGNATURE" || echo "Route registration log not found"
  echo ""
  echo "--- Testing if server is responding at all ---"
  curl -sS -w "\nHTTP: %{http_code}\n" http://localhost:3001/api/church/46/ocr/settings | head -3 || echo "Server not responding"
else
  echo "⚠️  Unexpected HTTP code: $HTTP_CODE"
  if [ -f /tmp/ocr_jobs_body.txt ]; then
    echo "Response body:"
    cat /tmp/ocr_jobs_body.txt
  fi
fi

echo ""
echo "=========================================="
echo "Script completed"
echo "=========================================="
echo ""
echo "To check PM2 status: pm2 status"
echo "To view logs: pm2 logs orthodox-backend"
echo "To test endpoint: curl -i http://localhost:3001/api/church/46/ocr/jobs"
