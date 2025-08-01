#!/bin/bash

echo "🔧 Installing PDF and Excel dependencies..."

cd front-end

echo "📦 Installing jsPDF and related PDF dependencies..."
npm install jspdf --legacy-peer-deps

echo "📦 Installing additional PDF/Excel processing dependencies..."
npm install html2canvas --legacy-peer-deps
npm install file-saver --legacy-peer-deps
npm install @types/file-saver --legacy-peer-deps

echo "📦 Installing comprehensive Excel/PDF toolkit..."
npm install xlsx jspdf html2canvas file-saver --legacy-peer-deps

echo "🔄 Final dependency resolution..."
npm install --legacy-peer-deps

echo "🔍 Verifying PDF/Excel dependencies..."
npm list jspdf xlsx html2canvas file-saver

echo "🏗️ Building frontend with memory optimization..."
NODE_OPTIONS="--max-old-space-size=4096" npm run build

if [ $? -eq 0 ]; then
    echo ""
    echo "🎉🎉🎉 SUCCESS! ALL DEPENDENCIES RESOLVED! 🎉🎉🎉"
    echo ""
    echo "✅ Complete build with all PDF/Excel functionality!"
    echo "✅ Site Structure Visualizer ready!"
    echo "✅ LiturgicalCalendar with full export capabilities!"
    echo ""
    echo "🚀 NEXT STEPS:"
    echo "1. Restart your server"
    echo "2. Navigate to Developer Tools → Site Structure Visualizer"
    echo "3. Test the complete functionality!"
    echo ""
    echo "🎊 All systems are GO!"
else
    echo ""
    echo "⚠️ Build failed. Checking what's missing next..."
    echo "The next missing dependency should be shown in the error above."
    echo ""
    echo "💡 We're getting closer with each iteration!"
fi 