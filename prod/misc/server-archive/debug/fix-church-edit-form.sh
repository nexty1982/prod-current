#!/bin/bash

echo "🔧 Fixing Church Edit Form - API Response Mismatch"
echo "=============================================="
echo ""
echo "✅ ISSUE IDENTIFIED AND FIXED:"
echo "   Backend: { success: true, church: {...} }"
echo "   Frontend: Expected church data directly"
echo "   Solution: Updated orthodoxMetricsAPI.churches.getById() to extract church from response"
echo ""
echo "🏗️ Rebuilding frontend to apply the fix..."
echo ""

# Navigate to frontend directory
cd /root/site/prod/front-end

echo "📦 Installing dependencies..."
npm install

echo "🧹 Clearing build cache..."
rm -rf dist/
rm -rf node_modules/.vite/

echo "🏗️ Building frontend with the API fix..."
npm run build

echo ""
echo "✅ Build complete!"
echo ""
echo "🧪 TESTING INSTRUCTIONS:"
echo "========================"
echo ""
echo "1. 🔄 Restart your Node.js server:"
echo "   - Stop current server (Ctrl+C)" 
echo "   - Start: node server/index.js"
echo ""
echo "2. 🌐 Go to: https://orthodoxmetrics.com/apps/church-management"
echo ""
echo "3. ✏️ Click 'Edit' on the church"
echo ""
echo "4. 🔍 EXPECTED RESULTS:"
echo "   ✅ Form fields should now be populated with existing church data"
echo "   ✅ You should see data like:"
echo "      - Name: Saints Peter and Paul Orthodox Church"
echo "      - Email: [church email]"
echo "      - Phone: [church phone]"
echo "      - Address: [church address]"
echo "      - etc."
echo ""
echo "5. 📊 Check browser console for debug logs:"
echo "   - F12 → Console tab"
echo "   - Look for: '📋 Loaded church data for editing:'"
echo "   - Should show the church object with all data"
echo ""
echo "🚨 If form fields are still blank:"
echo "   1. Check browser console for errors"
echo "   2. Check server terminal for API call logs"
echo "   3. Verify the church ID in the URL matches an existing church"
echo ""
echo "💡 The fix handles the backend response format properly:"
echo "   Backend sends: { success: true, church: {...} }"
echo "   Frontend now extracts: church data directly"
echo ""
echo "🎯 This should resolve the blank form fields issue!" 