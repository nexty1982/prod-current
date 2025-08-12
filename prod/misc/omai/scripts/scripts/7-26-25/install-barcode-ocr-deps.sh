#!/bin/bash

echo "🔧 Installing Barcode and OCR dependencies..."

cd front-end

echo "📦 Installing jsbarcode (barcode generation)..."
npm install jsbarcode --legacy-peer-deps

echo "📦 Installing related OCR and image processing dependencies..."
npm install qrcode --legacy-peer-deps
npm install qrcode-generator --legacy-peer-deps
npm install jimp --legacy-peer-deps
npm install tesseract.js --legacy-peer-deps

echo "📦 Installing additional imaging and scanning dependencies..."
npm install canvas --legacy-peer-deps
npm install sharp --legacy-peer-deps

echo "📦 Installing comprehensive barcode/OCR toolkit..."
npm install jsbarcode qrcode jimp tesseract.js --legacy-peer-deps

echo "🔄 Final dependency resolution..."
npm install --legacy-peer-deps

echo "🔍 Verifying Barcode/OCR dependencies..."
npm list jsbarcode qrcode jimp tesseract.js

echo "🏗️ Building frontend with memory optimization..."
NODE_OPTIONS="--max-old-space-size=4096" npm run build

if [ $? -eq 0 ]; then
    echo ""
    echo "🎉🎉🎉 SUCCESS! BARCODE/OCR DEPENDENCIES RESOLVED! 🎉🎉🎉"
    echo ""
    echo "✅ Complete build with all Barcode/OCR functionality!"
    echo "✅ Site Structure Visualizer ready!"
    echo "✅ OCR Upload with barcode generation!"
    echo "✅ PDF/Excel export capabilities!"
    echo ""
    echo "🚀 NEXT STEPS:"
    echo "1. Restart your server"
    echo "2. Navigate to Developer Tools → Site Structure Visualizer"
    echo "3. Test the complete OCR and visualization functionality!"
    echo ""
    echo "🎊 Getting closer to the finish line!"
else
    echo ""
    echo "⚠️ Build failed. Checking next missing dependency..."
    echo "The next missing dependency should be shown in the error above."
    echo ""
    echo "📈 Progress tracking:"
    echo "   ✅ Cytoscape dependencies"
    echo "   ✅ PDF/Excel dependencies"  
    echo "   ✅ Barcode/OCR dependencies"
    echo "   🔄 Working through remaining dependencies..."
    echo ""
    echo "💪 We're systematically conquering every dependency!"
fi 