#!/bin/bash

echo "🔍 Big Book Server Diagnostics Script"
echo "======================================"
echo "This script will diagnose the server connection and API endpoint issues."
echo ""

# Function to log with timestamp
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# Function to test URL accessibility
test_url() {
    local url="$1"
    local description="$2"
    echo ""
    log "Testing: $description"
    log "URL: $url"
    
    if command -v curl >/dev/null 2>&1; then
        response=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$url" 2>/dev/null)
        if [ "$response" = "000" ]; then
            echo "❌ FAILED: Connection refused or timeout"
        elif [ "$response" = "200" ]; then
            echo "✅ SUCCESS: Endpoint accessible (HTTP $response)"
        elif [ "$response" = "401" ] || [ "$response" = "403" ]; then
            echo "🔐 AUTH REQUIRED: Endpoint exists but requires authentication (HTTP $response)"
        elif [ "$response" = "404" ]; then
            echo "❌ NOT FOUND: Endpoint missing (HTTP $response)"
        else
            echo "⚠️  UNEXPECTED: HTTP $response"
        fi
    else
        echo "❌ curl not available, cannot test URL"
    fi
}

echo ""
log "=== SERVER CONNECTION TESTS ==="

# Test basic server connectivity
test_url "http://localhost:3001" "Basic server connectivity"
test_url "http://localhost:3001/api/status" "API status endpoint"

echo ""
log "=== BIG BOOK API ENDPOINTS ==="

# Test Big Book endpoints
test_url "http://localhost:3001/api/bigbook" "Big Book base endpoint"
test_url "http://localhost:3001/api/bigbook/custom-components-registry" "Custom Components Registry"
test_url "http://localhost:3001/api/bigbook/install-bigbook-component" "Install Big Book Component (POST endpoint)"
test_url "http://localhost:3001/api/bigbook/remove-bigbook-component" "Remove Big Book Component (DELETE endpoint)"
test_url "http://localhost:3001/api/bigbook/parse-tsx-component" "Parse TSX Component"

echo ""
log "=== EXISTING TSX ENDPOINTS ==="

# Test existing TSX endpoints
test_url "http://localhost:3001/api/bigbook/install-tsx-component" "Install TSX Component (general)"
test_url "http://localhost:3001/api/bigbook/remove-tsx-component" "Remove TSX Component (general)"

echo ""
log "=== SERVER PROCESS CHECK ==="

if command -v ps >/dev/null 2>&1; then
    echo "Checking for Node.js server processes:"
    ps aux | grep node | grep -v grep | head -10
    echo ""
    
    echo "Checking for processes on port 3001:"
    if command -v netstat >/dev/null 2>&1; then
        netstat -tlnp 2>/dev/null | grep ":3001" || echo "No process found on port 3001"
    elif command -v ss >/dev/null 2>&1; then
        ss -tlnp | grep ":3001" || echo "No process found on port 3001"
    else
        echo "netstat/ss not available, cannot check port usage"
    fi
else
    echo "ps command not available, cannot check processes"
fi

echo ""
log "=== BIG BOOK FILES CHECK ==="

# Check if Big Book route file exists and has new endpoints
if [ -f "server/routes/bigbook.js" ]; then
    echo "✅ bigbook.js route file exists"
    
    if grep -q "install-bigbook-component" "server/routes/bigbook.js"; then
        echo "✅ install-bigbook-component endpoint found in route file"
    else
        echo "❌ install-bigbook-component endpoint NOT found in route file"
    fi
    
    if grep -q "custom-components-registry" "server/routes/bigbook.js"; then
        echo "✅ custom-components-registry endpoint found in route file"
    else
        echo "❌ custom-components-registry endpoint NOT found in route file"
    fi
    
    if grep -q "installBigBookCustomComponent" "server/routes/bigbook.js"; then
        echo "✅ installBigBookCustomComponent function found in route file"
    else
        echo "❌ installBigBookCustomComponent function NOT found in route file"
    fi
else
    echo "❌ bigbook.js route file does not exist"
fi

# Check if custom components registry exists
if [ -f "front-end/src/config/bigbook-custom-components.json" ]; then
    echo "✅ bigbook-custom-components.json registry file exists"
    echo "Registry content:"
    cat "front-end/src/config/bigbook-custom-components.json" | head -20
else
    echo "❌ bigbook-custom-components.json registry file does not exist"
fi

echo ""
log "=== SERVER LOGS CHECK ==="

# Check recent server logs
if [ -f "server/logs/combined.log" ]; then
    echo "Recent server log entries (last 20 lines):"
    tail -20 "server/logs/combined.log"
elif [ -f "logs/combined.log" ]; then
    echo "Recent server log entries (last 20 lines):"
    tail -20 "logs/combined.log"
else
    echo "No combined.log found to check"
fi

echo ""
log "=== RECOMMENDATIONS ==="

echo "Based on the diagnostics above:"
echo ""
echo "1. If server connection fails (connection refused):"
echo "   - Start the server: cd server && npm start"
echo "   - Or use: node server/index.js"
echo ""
echo "2. If endpoints return 404:"
echo "   - Server needs restart to load new routes"
echo "   - Check if route changes were saved properly"
echo ""
echo "3. If endpoints return 401/403:"
echo "   - Authentication required for API access"
echo "   - Need to be logged in as super_admin or editor"
echo ""
echo "4. If functions are missing from route file:"
echo "   - Route file changes may not have been saved"
echo "   - Re-apply the route modifications"

echo ""
log "=== DIAGNOSTIC COMPLETE ==="
echo "Run this script again after making changes to verify fixes." 