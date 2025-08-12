#!/bin/bash

echo "🚀 Building frontend and testing Site Structure Visualizer..."
echo "============================================================"

# Navigate to frontend directory
cd front-end

echo "📦 Building frontend with increased memory allocation..."
export NODE_OPTIONS="--max-old-space-size=4096"
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
    echo ""
    echo "🎯 Next steps:"
    echo "1. Restart your server"
    echo "2. Navigate to /tools/site-structure"
    echo "3. Click 'Scan Project' to test the visualizer"
    echo "4. Verify the graph renders with nodes and edges"
    echo ""
    echo "📊 The Site Structure Visualizer should now be working!"
else
    echo "❌ Build failed. Check the error output above."
    echo "If there are still import errors, we may need to install missing packages."
fi 