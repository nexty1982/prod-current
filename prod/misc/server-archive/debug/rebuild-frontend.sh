#!/bin/bash

echo "🔧 Rebuilding frontend to apply UserManagement changes..."

# Navigate to frontend directory
cd /root/site/prod/front-end

echo "📦 Installing dependencies..."
npm install

echo "🧹 Clearing any build cache..."
rm -rf dist/
rm -rf node_modules/.vite/

echo "🏗️ Building frontend..."
npm run build

echo "✅ Build complete! Checking if dist directory was created..."
ls -la dist/

echo ""
echo "🔄 Now restart your server and refresh your browser (hard refresh: Ctrl+F5)"
echo "🔍 You should now see frontend debugging logs in the browser console when clicking toggle buttons" 