#!/bin/bash

echo "🔄 Restarting server cleanly..."

# Stop any running Node.js processes
echo "📴 Stopping any running Node.js processes..."
pkill -f "node index.js" || true
pkill -f "npm start" || true

# Clear Node.js cache
echo "🧹 Clearing Node.js cache..."
rm -rf node_modules/.cache || true

# Wait a moment
sleep 2

# Start the server
echo "🚀 Starting server..."
NODE_ENV=production npm start 