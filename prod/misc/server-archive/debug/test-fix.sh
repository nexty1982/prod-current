#!/bin/bash

echo "🔧 Testing the user status toggle fix..."

echo "1. Rebuilding frontend with debugging..."
cd /root/site/prod/front-end
npm run build

echo "2. Frontend built! Now restart your Node.js server and refresh the page"
echo "3. Click a status toggle button and check both:"
echo "   - Browser console should show: 'User X: email - is_active: true/false (type: boolean)'"
echo "   - The UI should now update correctly!"

echo ""
echo "✅ If you see 'is_active: true/false' instead of 'undefined', the fix worked!" 