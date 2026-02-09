#!/bin/bash

# Run Vite Dev Server on Linux Server (FAST!)
# This script should be run on the Linux server at 192.168.1.239

echo "🚀 Starting Vite Dev Server on Linux..."
echo "📍 Location: /var/www/orthodoxmetrics/prod/front-end"
echo ""

# Navigate to the correct directory
cd /var/www/orthodoxmetrics/prod/front-end || exit 1

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "⚠️  node_modules not found. Installing dependencies..."
    npm install --legacy-peer-deps
fi

# Clear Vite cache for fresh start
echo "🧹 Clearing Vite cache..."
rm -rf node_modules/.vite .vite 2>/dev/null

# Set environment variables for better performance
export NODE_ENV=development
export VITE_HOST=0.0.0.0
export VITE_PORT=5174

echo ""
echo "✅ Starting dev server..."
echo "🌐 Access at: http://192.168.1.239:5174"
echo "🌐 Or locally: http://localhost:5174"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

# Start the dev server
npm run dev
