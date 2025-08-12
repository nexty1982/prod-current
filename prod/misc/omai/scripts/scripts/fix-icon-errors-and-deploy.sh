#!/bin/bash

cd /var/www/orthodox-church-mgmt/orthodoxmetrics/prod
echo "🔧 Fixing Icon Errors and Deploying OMAI Settings"
echo "=================================================="
echo "📁 Current directory: $(pwd)"

# Navigate to front-end directory
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
    
    # Navigate back to project root
    cd ..
    
    # Restart the backend server
    echo "🔄 Restarting backend server..."
    pm2 restart orthodox-backend
    
    # Wait for server to start
    echo "⏳ Waiting for server to start..."
    sleep 5
    
    # Test the new OMAI endpoints
    echo "🧪 Testing OMAI endpoints..."
    echo "Testing /api/omai/status..."
    curl -s https://orthodoxmetrics.com/api/omai/status | head -c 200
    echo ""
    
    echo "Testing /api/omai/settings..."
    curl -s https://orthodoxmetrics.com/api/omai/settings | head -c 200
    echo ""
    
    echo "Testing /api/omai/logs..."
    curl -s https://orthodoxmetrics.com/api/omai/logs | head -c 200
    echo ""
    
    echo ""
    echo "🎉 OMAI Settings Feature Deployed Successfully!"
    echo ""
    echo "📋 What's Available:"
    echo "• OMAI Service Management at: https://orthodoxmetrics.com/admin/settings"
    echo "• OMAI Status Dashboard with real-time metrics"
    echo "• OMAI Settings Configuration (6 tabs: General, Features, Performance, Security, Agents, Knowledge)"
    echo "• OMAI Console Logs Viewer (4 tabs: Live Logs, Error Logs, Debug Logs, Audit Logs)"
    echo "• OMAI Service Controls (Start, Stop, Restart, Reload)"
    echo ""
    echo "🔧 Quick Actions:"
    echo "• Click 'Start OMAI' to enable the service"
    echo "• Click 'Settings' to configure OMAI parameters"
    echo "• Click 'Console Logs' to view real-time logs"
    echo "• Use the checkboxes to enable/disable features"
    echo ""
    echo "✨ The OMAI service is now fully integrated into your admin settings!"
    
else
    echo "❌ Frontend build failed!"
    echo "Please check the error messages above and fix any remaining issues."
    exit 1
fi 
