#!/bin/bash

# ==============================================================================
# OrthodoxMetrics API v2 Diagnostic Script
# ==============================================================================
# This script diagnoses why the churches API isn't properly requiring auth
# 
# Usage: ./diagnose-api-v2.sh
# ==============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Current directory
CURRENT_DIR="$(pwd)"
SERVER_DIR="$CURRENT_DIR"

log() {
    echo -e "${2:-$NC}$(date '+%Y-%m-%d %H:%M:%S') - $1${NC}"
}

info() {
    log "ℹ️ $1" "$BLUE"
}

success() {
    log "✅ $1" "$GREEN"
}

warning() {
    log "⚠️ $1" "$YELLOW"
}

error() {
    log "❌ $1" "$RED"
}

echo "========================================"
echo "🔍 OrthodoxMetrics API v2 Diagnostics"
echo "========================================"

info "Checking route file status..."

# Check if our refactored files exist and have the right markers
echo ""
echo "📁 Checking refactored files:"

if [ -f "$SERVER_DIR/routes/churches.js" ]; then
    if grep -q "REFACTORED for API v2 consistency" "$SERVER_DIR/routes/churches.js"; then
        success "churches.js has API v2 refactor markers"
    else
        error "churches.js exists but doesn't have API v2 markers"
    fi
    
    # Check if it has the right middleware
    if grep -q "requireAuth, requireAdmin" "$SERVER_DIR/routes/churches.js"; then
        success "churches.js has requireAuth middleware"
    else
        warning "churches.js missing requireAuth middleware"
    fi
    
    # Check for API response wrapper
    if grep -q "apiResponse" "$SERVER_DIR/routes/churches.js"; then
        success "churches.js has API v2 response wrapper"
    else
        warning "churches.js missing API v2 response wrapper"
    fi
else
    error "churches.js not found!"
fi

if [ -f "$SERVER_DIR/middleware/auth.js" ]; then
    if grep -q "Enhanced Session Authentication Middleware" "$SERVER_DIR/middleware/auth.js"; then
        success "auth.js has been enhanced"
    else
        warning "auth.js exists but not enhanced"
    fi
else
    error "auth.js not found!"
fi

echo ""
echo "🔍 Checking for duplicate routes:"

# Look for duplicate churches route files
find "$SERVER_DIR" -name "*churches*" -type f | while read -r file; do
    if [[ "$file" == *.js ]]; then
        echo "Found churches-related file: $file"
        
        # Check if it defines GET / route
        if grep -q "router\.get.*/" "$file"; then
            if grep -q "requireAuth\|requireAdmin" "$file"; then
                echo "  ✅ Has authentication middleware"
            else
                echo "  ❌ Missing authentication middleware"
            fi
        fi
    fi
done

echo ""
echo "🔍 Checking route loading in main files:"

# Check how routes are loaded in index.js or app.js
if [ -f "$SERVER_DIR/index.js" ]; then
    echo "Checking index.js route loading:"
    if grep -n "churches" "$SERVER_DIR/index.js"; then
        echo "  Found churches route references"
    else
        echo "  No churches route references found"
    fi
fi

if [ -f "$SERVER_DIR/app.js" ]; then
    echo "Checking app.js route loading:"
    if grep -n "churches" "$SERVER_DIR/app.js"; then
        echo "  Found churches route references"
    else
        echo "  No churches route references found"
    fi
fi

echo ""
echo "🧪 Testing actual API responses:"

# Test the churches endpoint and show full response
echo "Testing GET /api/churches:"
response=$(curl -s -i "https://orthodoxmetrics.com/api/churches" 2>/dev/null || echo "Failed to connect")

if [[ "$response" == *"HTTP/"* ]]; then
    # Extract status code
    status=$(echo "$response" | grep "HTTP/" | head -1 | awk '{print $2}')
    echo "  Status: $status"
    
    # Show first few lines of response
    echo "  Response headers:"
    echo "$response" | head -10 | sed 's/^/    /'
    
    # Check if it's JSON and has our API v2 format
    if echo "$response" | grep -q "Content-Type.*application/json"; then
        echo "  ✅ Response is JSON"
        
        # Extract JSON body
        json_body=$(echo "$response" | sed -n '/^\r*$/,$p' | tail -n +2)
        if echo "$json_body" | grep -q '"success"'; then
            echo "  ✅ Has API v2 success field"
        else
            echo "  ❌ Missing API v2 success field"
        fi
        
        if echo "$json_body" | grep -q '"error"'; then
            echo "  ℹ️ Has error field"
        fi
        
        if echo "$json_body" | grep -q '"code"'; then
            echo "  ✅ Has error code field"
        fi
    else
        echo "  ❌ Response is not JSON"
    fi
else
    echo "  ❌ Failed to get response: $response"
fi

echo ""
echo "🔍 Checking server logs for route loading:"

# Check recent logs for route loading messages
if [ -f "$SERVER_DIR/logs/server.log" ]; then
    echo "Recent server log entries related to routes:"
    tail -50 "$SERVER_DIR/logs/server.log" | grep -i -E "(route|church|auth|middleware)" | tail -10 || echo "  No route-related log entries found"
else
    echo "  No server.log found"
fi

echo ""
echo "🔧 Suggested fixes:"

if curl -s "https://orthodoxmetrics.com/api/churches" | grep -q '"success"'; then
    echo "  ✅ Response has 'success' field - API v2 format is working"
    if curl -s "https://orthodoxmetrics.com/api/churches" | grep -q '"error".*"code".*"NO_SESSION"'; then
        echo "  ✅ Proper authentication error format"
    else
        echo "  ⚠️ Not returning proper authentication error"
        echo "     🔧 Check that requireAuth middleware is applied to the route"
    fi
else
    echo "  ❌ Response doesn't have API v2 format"
    echo "     🔧 Check that the refactored churches.js is being loaded"
    echo "     🔧 Look for route conflicts or duplicate registrations"
fi

echo ""
echo "🚀 Quick fixes to try:"
echo "1. Restart the server to ensure new routes are loaded:"
echo "   pm2 restart orthodox-backend"
echo ""
echo "2. Check which churches.js file is being loaded:"
echo "   grep -r 'churches' index.js app.js"
echo ""
echo "3. Test auth middleware directly:"
echo "   curl -i https://orthodoxmetrics.com/api/auth/check"
echo ""
echo "4. Check PM2 logs for errors:"
echo "   pm2 logs orthodox-backend --lines 20"

echo ""
echo "========================================"
echo "🏁 Diagnostic completed"
echo "========================================" 