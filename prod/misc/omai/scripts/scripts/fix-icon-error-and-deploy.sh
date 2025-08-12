#!/bin/bash

echo "🔧 Fixing IconXCircle Error and Deploying OMAI Settings"
echo "=================================================="

# Navigate to project root
cd /var/www/orthodox-church-mgmt/orthodoxmetrics/prod

echo "📁 Current directory: $(pwd)"

# Navigate to frontend
echo "🎨 Building Frontend..."
cd front-end

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install --legacy-peer-deps
fi

# Build frontend
echo "🔨 Building frontend with production settings..."
export NODE_OPTIONS="--max-old-space-size=4096"
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Frontend build successful!"
else
    echo "❌ Frontend build failed!"
    exit 1
fi

# Navigate back to project root
cd ..

# Restart backend
echo "🔄 Restarting backend server..."
pm2 restart orthodox-backend

# Wait for server to start
echo "⏳ Waiting for server to start..."
sleep 5

# Test OMAI endpoints
echo "🧪 Testing OMAI endpoints..."
echo "Testing /api/omai/status..."
curl -s -o /dev/null -w "%{http_code}" https://orthodoxmetrics.com/api/omai/status
echo " - Status endpoint"

echo "Testing /api/omai/settings..."
curl -s -o /dev/null -w "%{http_code}" https://orthodoxmetrics.com/api/omai/settings
echo " - Settings endpoint"

echo "Testing /api/omai/logs..."
curl -s -o /dev/null -w "%{http_code}" https://orthodoxmetrics.com/api/omai/logs
echo " - Logs endpoint"

echo ""
echo "🎉 Deployment Complete!"
echo "📱 You can now access the OMAI service settings at:"
echo "   https://orthodoxmetrics.com/admin/settings"
echo ""
echo "🔧 Features available:"
echo "   • OMAI Service Status & Statistics"
echo "   • OMAI Settings Configuration"
echo "   • OMAI Console Logs Viewer"
echo "   • OMAI Service Control (Start/Stop/Restart/Reload)" 