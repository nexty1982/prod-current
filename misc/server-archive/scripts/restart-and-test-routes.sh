#!/bin/bash

echo "🔄 Restarting Server and Testing New Routes"
echo "==========================================="

# Step 1: Restart PM2 to load new route files
echo "1. Restarting PM2 to load new route files..."
pm2 restart orthodox-backend

echo "2. Waiting for server to fully start..."
sleep 5

# Step 2: Test if server is responding
echo "3. Testing server health..."
if curl -s https://orthodoxmetrics.com/api/health > /dev/null 2>&1; then
    echo "   ✅ Server is responding"
else
    echo "   ❌ Server may not be responding properly"
    echo "   Checking PM2 status..."
    pm2 list
    exit 1
fi

echo ""
echo "4. Running route tests..."
echo "========================"

# Step 3: Run the route tests
./test-extracted-routes.sh 