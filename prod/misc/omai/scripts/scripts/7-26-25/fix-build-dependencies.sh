#!/bin/bash

echo "🔧 Fixing missing build dependencies..."

cd front-end

echo "📦 Installing missing @svgr/rollup dependency..."
npm install @svgr/rollup --legacy-peer-deps

echo "🔍 Verifying all Cytoscape dependencies are still installed..."
npm install cytoscape@^3.26.0 cytoscape-dagre@^2.5.0 cytoscape-popper@^2.0.0 --legacy-peer-deps

echo "🏗️ Building frontend with memory optimization..."
NODE_OPTIONS="--max-old-space-size=4096" npm run build

echo "✅ Build process completed!"
echo ""
echo "📋 Next steps:"
echo "1. Restart your server"
echo "2. Navigate to Developer Tools → Site Structure Visualizer"
echo "3. Test the new visualization tool"
echo ""
echo "🚀 The Site Structure Visualizer should now be fully functional!" 