#!/bin/bash

echo "🔐 Testing Authentication Status for Parish Map Upload"
echo "===================================================="

BASE_URL="http://localhost:3001"

echo ""
echo "1. Testing basic connectivity..."
curl -s -w "Status: %{http_code}\n" "$BASE_URL/api/health" || echo "❌ Server not responding"

echo ""
echo "2. Testing session status..."
curl -s -w "Status: %{http_code}\n" \
     -H "Content-Type: application/json" \
     -c cookies.txt \
     -b cookies.txt \
     "$BASE_URL/api/auth/status" | jq . 2>/dev/null || echo "No JSON response"

echo ""
echo "3. Testing OMAI endpoint (needs authentication)..."
curl -s -w "Status: %{http_code}\n" \
     -H "Content-Type: application/json" \
     -c cookies.txt \
     -b cookies.txt \
     "$BASE_URL/api/omai/learning-status" | jq . 2>/dev/null || echo "No JSON response"

echo ""
echo "4. Testing bigbook addons endpoint..."
curl -s -w "Status: %{http_code}\n" \
     -H "Content-Type: application/json" \
     -c cookies.txt \
     -b cookies.txt \
     "$BASE_URL/api/bigbook/addons" | jq . 2>/dev/null || echo "No JSON response"

echo ""
echo "5. Checking browser cookies..."
echo "Instructions:"
echo "  1. Open your browser developer tools (F12)"
echo "  2. Go to Application/Storage > Cookies"
echo "  3. Look for 'orthodoxmetrics.sid' cookie"
echo "  4. Check if you're logged in as super_admin"

echo ""
echo "6. If not logged in, try logging in first:"
echo "  Visit: http://localhost:3001/admin/login"
echo "  Login with super_admin credentials"
echo "  Then try the Parish Map upload again"

echo ""
echo "7. Cookie file created: cookies.txt"
if [ -f cookies.txt ]; then
    echo "Contents:"
    cat cookies.txt
fi 