#!/bin/bash

echo "🔧 Installing Cytoscape.js dependencies for Site Structure Visualizer..."

cd front-end

echo "📦 Installing cytoscape and extensions..."
npm install cytoscape@^3.26.0 cytoscape-dagre@^2.5.0 cytoscape-popper@^2.0.0

echo "✅ Cytoscape.js dependencies installed successfully!"
echo ""
echo "📋 Next steps:"
echo "1. Rebuild the frontend: npm run build"
echo "2. Restart your server"
echo "3. Navigate to Developer Tools → Site Structure Visualizer"
echo ""
echo "🚀 The Site Structure Visualizer should now work correctly!" 