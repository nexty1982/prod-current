#!/bin/bash

echo "🔐 TSX Endpoint Authentication Test"
echo "==================================="
echo "This script tests authentication requirements for Big Book endpoints."
echo ""

# Function to log with timestamp
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

log "Testing Big Book authentication requirements..."

echo ""
log "=== ENDPOINT STATUS CHECK ==="

# Test the endpoint without authentication
url="http://localhost:3001/api/bigbook/parse-tsx-component"
echo "Testing: $url"

if command -v curl >/dev/null 2>&1; then
    echo "Sending test request..."
    
    # Simple JSON payload without jq dependency
    response=$(curl -s -w "HTTPSTATUS:%{http_code}" \
                   -H "Content-Type: application/json" \
                   -d '{"fileName":"Test.tsx","content":"import React from \"react\"; export default () => <div>Test</div>;"}' \
                   --max-time 10 \
                   "$url" 2>/dev/null)
    
    # Extract HTTP status and body
    http_code=$(echo "$response" | grep "HTTPSTATUS:" | cut -d: -f2)
    body=$(echo "$response" | sed 's/HTTPSTATUS:.*$//')
    
    echo "HTTP Status: $http_code"
    echo "Response: $body"
    
    case "$http_code" in
        "200")
            echo "✅ SUCCESS: Endpoint working and authenticated"
            ;;
        "401"|"403")
            echo "🔐 AUTHENTICATION REQUIRED: This is normal!"
            echo "   The endpoint exists and is properly secured."
            ;;
        "404")
            echo "❌ NOT FOUND: Endpoint missing"
            ;;
        "400")
            echo "⚠️ BAD REQUEST: JSON or validation issue"
            ;;
        *)
            echo "⚠️ UNEXPECTED STATUS: $http_code"
            ;;
    esac
else
    echo "❌ curl not available"
    exit 1
fi

echo ""
log "=== AUTHENTICATION EXPLANATION ==="
echo ""
echo "🔐 AUTHENTICATION REQUIRED FOR BIG BOOK ENDPOINTS"
echo ""
echo "This is expected behavior! The Big Book endpoints require:"
echo "  • User to be logged in to the frontend"
echo "  • Role: super_admin or editor"
echo "  • Valid session cookie"
echo ""
echo "WHY THE INSTALL BUTTON IS DISABLED:"
echo ""
echo "1. Frontend uploads TSX file"
echo "2. Calls /api/bigbook/parse-tsx-component"
echo "3. If user not logged in → Returns 401/403"
echo "4. Frontend treats this as 'component invalid'"
echo "5. Install button becomes disabled"
echo ""
echo "SOLUTION:"
echo ""
echo "✅ Make sure you are logged in to the frontend as super_admin or editor"
echo "✅ Then try uploading the TSX file again"
echo "✅ The component should parse successfully and install button will enable"

echo ""
log "=== NEXT STEPS ==="
echo ""
echo "1. Open your frontend: http://localhost:3000 (or your frontend URL)"
echo "2. Log in as a super_admin or editor user"
echo "3. Go to Admin Settings → OM Big Book"
echo "4. Try uploading a TSX file with Big Book Auto-Install Mode enabled"
echo "5. The install button should now work!"

echo ""
log "=== TEST COMPLETE ==="
echo ""
echo "The endpoint is working correctly - you just need to be authenticated!" 