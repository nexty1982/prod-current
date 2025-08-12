#!/bin/bash

# Test Backup System Fix
# This script tests the backup API endpoints to verify the fix

echo "🔧 Testing Backup System Fix..."
echo "==============================="

# Check if the server is running
if ! curl -s http://localhost:3001/api/auth/check > /dev/null; then
    echo "❌ Server not running. Please start the server first."
    exit 1
fi

echo "✅ Server is running"

# Test the backup list endpoint
echo "📋 Testing backup list endpoint..."
echo "GET /api/backups/list?env=prod"

# Make the API call and check the response
response=$(curl -s -H "Content-Type: application/json" \
    -H "Cookie: $(cat ~/.orthodoxmetrics_session 2>/dev/null || echo '')" \
    "http://localhost:3001/api/backups/list?env=prod")

echo "Response:"
echo "$response" | jq . 2>/dev/null || echo "$response"

# Check if the response has the expected structure
if echo "$response" | grep -q '"backups"'; then
    echo "✅ Backup list endpoint returns expected structure"
else
    echo "❌ Backup list endpoint response structure issue"
fi

echo ""
echo "🧪 Frontend Test Instructions:"
echo "1. Open https://orthodoxmetrics.com/admin/settings"
echo "2. Go to the 'Your Backups' tab"
echo "3. Check if the backup list loads without the error:"
echo "   'Failed to load backups: TypeError: can't access property \"backups\", u.data is undefined'"
echo "4. If the list loads properly, the fix is working!"

echo ""
echo "🔍 Manual API Test:"
echo "curl -H 'Content-Type: application/json' \\"
echo "     'https://orthodoxmetrics.com/api/backups/list?env=prod'"

echo ""
echo "✅ Test script complete!" 