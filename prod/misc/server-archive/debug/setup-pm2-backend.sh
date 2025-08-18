#!/bin/bash

echo "🔧 Setting up PM2 for Orthodox Metrics Backend"
echo "==============================================="
echo ""

# Navigate to the project directory (configurable)
PROJECT_ROOT=${PROJECT_ROOT:-"/var/www/orthodox-church-mgmt/orthodoxmetrics/prod"}
echo "📁 Using project root: $PROJECT_ROOT"
cd "$PROJECT_ROOT"

echo "📦 Installing PM2 globally (if not already installed)..."
if ! command -v pm2 &> /dev/null; then
    npm install -g pm2
    echo "✅ PM2 installed successfully"
else
    echo "✅ PM2 already installed"
fi

echo ""
echo "🛑 Stopping any existing backend processes..."
# Stop any existing processes
pm2 stop orthodox-backend 2>/dev/null || echo "   No existing orthodox-backend process found"
pm2 delete orthodox-backend 2>/dev/null || echo "   No existing orthodox-backend process to delete"

# Kill any process running on port 3001
echo "🔍 Checking for processes on port 3001..."
if lsof -i :3001 > /dev/null 2>&1; then
    echo "⚠️  Port 3001 is in use. Attempting to free it..."
    sudo lsof -ti:3001 | xargs sudo kill -9 2>/dev/null || echo "   Could not kill processes on port 3001"
    sleep 2
fi

echo ""
echo "🚀 Starting backend server with PM2 and .env.production..."
if [ -f "ecosystem.config.js" ]; then
    pm2 start ecosystem.config.js --env production
    echo "✅ Started using ecosystem.config.js"
elif [ -f ".env.production" ]; then
    pm2 start server/index.js --name orthodox-backend --env-file .env.production --env production
    echo "✅ Started with .env.production file"
else
    pm2 start server/index.js --name orthodox-backend --env production
    echo "⚠️  Started without .env.production (file not found)"
fi

echo ""
echo "📊 PM2 Status:"
pm2 list

echo ""
echo "🔄 Setting up PM2 startup script..."
pm2 startup
echo ""
echo "💾 Saving PM2 configuration..."
pm2 save

echo ""
echo "✅ Backend server setup complete!"
echo ""
echo "🛠️  Useful PM2 commands:"
echo "   pm2 list                    - Show all processes"
echo "   pm2 logs orthodox-backend   - View backend logs"
echo "   pm2 restart orthodox-backend - Restart backend"
echo "   pm2 stop orthodox-backend   - Stop backend"
echo "   pm2 monit                  - Monitor all processes"
echo ""
echo "🌐 Your backend should now be running at: http://localhost:3001"
echo "🔍 Check the Services page in your web UI to see the status!" 