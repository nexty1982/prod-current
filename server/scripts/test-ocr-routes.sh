#!/bin/bash
set -e

echo "=========================================="
echo "OCR Routes Diagnostic Test"
echo "=========================================="
echo ""

echo "1. Checking if PM2 is running dist/index.js..."
if pm2 logs orthodox-backend --lines 50 --nostream | grep -q "BOOT_SIGNATURE_OCR"; then
  echo "✅ Boot signature found - PM2 is running dist/index.js"
  pm2 logs orthodox-backend --lines 50 --nostream | grep "BOOT_SIGNATURE_OCR" | tail -1
else
  echo "❌ Boot signature NOT found - PM2 might be running wrong file"
fi

echo ""
echo "2. Checking for route registration logs..."
if pm2 logs orthodox-backend --lines 100 --nostream | grep -q "OCR Jobs Routes"; then
  echo "✅ Route registration log found"
  pm2 logs orthodox-backend --lines 100 --nostream | grep "OCR Jobs Routes"
else
  echo "⚠️  Route registration log not found (might have scrolled past)"
fi

echo ""
echo "3. Checking PM2 process info..."
pm2 describe orthodox-backend | grep -E "script|cwd|exec_mode" || true

echo ""
echo "4. Testing /api/church/46/ocr/settings (should work)..."
curl -sS -w "\nHTTP Status: %{http_code}\n" http://localhost:3001/api/church/46/ocr/settings | head -5

echo ""
echo "5. Testing /api/church/46/ocr/jobs (should work but currently 404)..."
curl -sS -w "\nHTTP Status: %{http_code}\n" http://localhost:3001/api/church/46/ocr/jobs | head -5

echo ""
echo "6. Checking recent PM2 logs for OCR-related entries..."
pm2 logs orthodox-backend --lines 100 --nostream | grep -i "ocr" | tail -10 || echo "No OCR logs found"

echo ""
echo "7. Checking if route exists in dist/index.js..."
if grep -q "app.get('/api/church/:churchId/ocr/jobs'" /var/www/orthodoxmetrics/prod/server/dist/index.js; then
  echo "✅ Route found in dist/index.js"
  echo "Route location:"
  grep -n "app.get('/api/church/:churchId/ocr/jobs'" /var/www/orthodoxmetrics/prod/server/dist/index.js | head -1
else
  echo "❌ Route NOT found in dist/index.js"
fi

echo ""
echo "=========================================="
echo "Diagnostic complete"
echo "=========================================="
