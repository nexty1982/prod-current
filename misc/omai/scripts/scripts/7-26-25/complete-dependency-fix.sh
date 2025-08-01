#!/bin/bash

echo "🔧 Performing complete dependency restoration..."

cd front-end

echo "🗑️ Cleaning up corrupted dependencies..."
rm -rf node_modules
rm -f package-lock.json

echo "📦 Adding missing @tanstack/react-query dependency..."
npm install @tanstack/react-query@^5.81.5 --legacy-peer-deps

echo "🔄 Performing fresh install of all dependencies..."
npm install --legacy-peer-deps

echo "🔍 Verifying Cytoscape dependencies are installed..."
npm list cytoscape cytoscape-dagre cytoscape-popper

echo "🏗️ Building frontend with memory optimization..."
NODE_OPTIONS="--max-old-space-size=4096" npm run build

if [ $? -eq 0 ]; then
    echo "✅ Build succeeded! Site Structure Visualizer is ready!"
    echo ""
    echo "📋 Next steps:"
    echo "1. Restart your server"
    echo "2. Navigate to Developer Tools → Site Structure Visualizer"
    echo "3. Click 'Scan Project' to visualize your codebase"
    echo ""
    echo "🎯 Features you can now use:"
    echo "   • Interactive graph with zoom/pan"
    echo "   • Color-coded nodes by file type"
    echo "   • Search and filter functionality"
    echo "   • Export to PNG/JPG/JSON"
    echo "   • Detailed node information on click"
else
    echo "❌ Build failed. Check the error messages above."
    echo "You may need to manually install additional missing dependencies."
fi 