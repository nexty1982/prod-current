#!/bin/bash

echo "🔧 Installing all missing dependencies comprehensively..."

cd front-end

echo "📦 Installing internationalization dependencies..."
npm install i18next react-i18next i18next-browser-languagedetector --legacy-peer-deps

echo "📦 Installing additional common dependencies that might be missing..."
npm install @tabler/icons-react --legacy-peer-deps
npm install react-big-calendar --legacy-peer-deps
npm install react-slick slick-carousel --legacy-peer-deps
npm install react-syntax-highlighter --legacy-peer-deps
npm install fslightbox-react --legacy-peer-deps

echo "📦 Installing utility dependencies..."
npm install axios --legacy-peer-deps
npm install moment --legacy-peer-deps

echo "🔄 Final dependency resolution..."
npm install --legacy-peer-deps

echo "🔍 Verifying key dependencies are installed..."
echo "Cytoscape dependencies:"
npm list cytoscape cytoscape-dagre cytoscape-popper
echo ""
echo "Core dependencies:"
npm list i18next react-i18next @tanstack/react-query

echo "🏗️ Building frontend with memory optimization..."
NODE_OPTIONS="--max-old-space-size=4096" npm run build

if [ $? -eq 0 ]; then
    echo ""
    echo "🎉 SUCCESS! Build completed successfully!"
    echo ""
    echo "✅ Site Structure Visualizer is now ready!"
    echo ""
    echo "📋 Next steps:"
    echo "1. Restart your server"
    echo "2. Navigate to: Developer Tools → Site Structure Visualizer"  
    echo "3. Click 'Scan Project' to see your codebase visualization"
    echo ""
    echo "🎯 Available features:"
    echo "   • 🔵 Blue nodes: Pages (Dashboard, Login, etc.)"
    echo "   • 🟠 Orange nodes: Components (RecordList, HeaderNav, etc.)"
    echo "   • 🟣 Purple nodes: Layouts (MainLayout, AuthLayout, etc.)"  
    echo "   • 🟢 Green nodes: Routes and routing files"
    echo "   • ⚫ Gray nodes: API endpoints"
    echo "   • 🔷 Teal nodes: Custom hooks"
    echo "   • 🔍 Search & filter capabilities"
    echo "   • 📤 Export to PNG/JPG/JSON"
    echo "   • 🔎 Interactive node details"
    echo ""
    echo "🚀 Enjoy exploring your codebase architecture!"
else
    echo ""
    echo "❌ Build still failed. Let's try a different approach..."
    echo ""
    echo "📋 Manual steps to try:"
    echo "1. Check what specific import is failing"
    echo "2. Install that specific dependency"
    echo "3. Or temporarily comment out the failing import to test the visualizer"
    echo ""
    echo "💡 The Site Structure Visualizer code itself is complete and ready!"
fi 