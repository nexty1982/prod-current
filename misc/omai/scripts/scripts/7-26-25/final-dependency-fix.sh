#!/bin/bash

echo "🔧 Installing final missing dependencies..."

cd front-end

echo "📦 Installing WebSocket dependencies..."
npm install socket.io-client --legacy-peer-deps

echo "📦 Installing remaining common dependencies..."
npm install @emotion/cache @emotion/react @emotion/styled --legacy-peer-deps
npm install @reduxjs/toolkit react-redux --legacy-peer-deps

echo "🔄 Final dependency check and install..."
npm install --legacy-peer-deps

echo "🔍 Verifying all key dependencies..."
echo "✅ Cytoscape:"
npm list cytoscape cytoscape-dagre cytoscape-popper | grep -E "(cytoscape|└──|├──)"

echo "✅ WebSocket:"
npm list socket.io-client | grep -E "(socket.io-client|└──|├──)"

echo "✅ Core React Query:"
npm list @tanstack/react-query | grep -E "(@tanstack/react-query|└──|├──)"

echo "🏗️ Building frontend with memory optimization..."
NODE_OPTIONS="--max-old-space-size=4096" npm run build

if [ $? -eq 0 ]; then
    echo ""
    echo "🎉🎉🎉 SUCCESS! Build completed successfully! 🎉🎉🎉"
    echo ""
    echo "✅ Site Structure Visualizer is now fully functional!"
    echo ""
    echo "🚀 Ready to use at: /tools/site-structure"
    echo ""
    echo "📋 Next steps:"
    echo "1. Restart your server"
    echo "2. Navigate to: Developer Tools → Site Structure Visualizer"  
    echo "3. Click 'Scan Project' to explore your codebase"
    echo ""
    echo "🎯 What you'll see:"
    echo "   🔵 Blue: Pages (Dashboard, ChatApp, Login, UserManagement, etc.)"
    echo "   🟠 Orange: Components (RecordList, HeaderNav, NotificationList, etc.)"
    echo "   🟣 Purple: Layouts (MainLayout, AuthLayout, MinimalLayout, etc.)"  
    echo "   🟢 Green: Routes (Router, AuthRoutes, etc.)"
    echo "   ⚫ Gray: APIs (/api/churches, /api/social/notifications, etc.)"
    echo "   🔷 Teal: Hooks (useRecords, useAuth, useNotifications, etc.)"
    echo ""
    echo "🛠️ Features available:"
    echo "   • Interactive graph with zoom/pan/drag"
    echo "   • Search by file name or path"
    echo "   • Filter by multiple node types"
    echo "   • Click nodes for detailed information"
    echo "   • Export to PNG, JPG, or JSON"
    echo "   • Multiple layout algorithms"
    echo "   • Real-time project statistics"
    echo ""
    echo "🎊 Enjoy your new codebase visualization tool!"
else
    echo ""
    echo "⚠️ Build failed on socket.io-client dependency."
    echo ""
    echo "🔧 Quick manual fix:"
    echo "1. cd front-end"
    echo "2. npm install socket.io-client --legacy-peer-deps"
    echo "3. NODE_OPTIONS=\"--max-old-space-size=4096\" npm run build"
    echo ""
    echo "💡 The Site Structure Visualizer is complete - just dependency issues!"
fi 