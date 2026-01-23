#!/bin/bash
# Rebuild backend and restart PM2

cd /var/www/orthodoxmetrics/prod/server

echo "═══════════════════════════════════════════════════════════"
echo "  Rebuilding Backend and Restarting PM2"
echo "═══════════════════════════════════════════════════════════"
echo ""

echo "1. Building TypeScript..."
npm run build:ts

if [ $? -ne 0 ]; then
    echo "❌ TypeScript build failed!"
    exit 1
fi

echo ""
echo "2. Restarting PM2..."
pm2 restart orthodox-backend

if [ $? -ne 0 ]; then
    echo "❌ PM2 restart failed!"
    exit 1
fi

echo ""
echo "3. Waiting for backend to start..."
sleep 3

echo ""
echo "4. Checking backend status..."
pm2 status orthodox-backend

echo ""
echo "5. Testing backend health..."
curl -s http://127.0.0.1:3001/api/health | head -20 || echo "⚠️  Backend not responding yet"

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "✅ Done! Backend rebuilt and restarted."
echo "═══════════════════════════════════════════════════════════"
