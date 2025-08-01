#!/bin/bash

echo "🔧 Restoring all missing dependencies after Cytoscape installation..."

cd front-end

echo "📦 Installing core missing dependencies..."
npm install bootstrap --legacy-peer-deps

echo "📦 Installing Material-UI and related UI dependencies..."
npm install @mui/material @mui/icons-material @mui/lab @mui/system --legacy-peer-deps

echo "📦 Installing React and build dependencies..."
npm install @types/react @types/react-dom --legacy-peer-deps
npm install @vitejs/plugin-react @svgr/rollup --legacy-peer-deps

echo "📦 Ensuring Cytoscape dependencies are still installed..."
npm install cytoscape@^3.26.0 cytoscape-dagre@^2.5.0 cytoscape-popper@^2.0.0 --legacy-peer-deps

echo "🔄 Running npm install to resolve all dependencies..."
npm install --legacy-peer-deps

echo "🏗️ Building frontend with memory optimization..."
NODE_OPTIONS="--max-old-space-size=4096" npm run build

echo "✅ Dependency restoration and build completed!"
echo ""
echo "📋 Next steps:"
echo "1. Restart your server"  
echo "2. Navigate to Developer Tools → Site Structure Visualizer"
echo "3. Click 'Scan Project' to visualize your codebase"
echo ""
echo "🚀 The Site Structure Visualizer should now work perfectly!" 