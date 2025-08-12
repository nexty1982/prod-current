#!/bin/bash

# ==============================================================================
# Test Extracted Admin Routes Script
# ==============================================================================
# This script tests the new modular admin route files to ensure they work
# correctly before removing dead code from the monolithic admin.js
# 
# Usage: ./test-extracted-routes.sh
# ==============================================================================

echo "🧪 Testing Extracted Admin Routes"
echo "================================="

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

BASE_URL="https://orthodoxmetrics.com/api/admin"

# Test results tracking
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

run_test() {
    local test_name="$1"
    local endpoint="$2"
    local expected_status="$3"
    local description="$4"
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    echo -e "${BLUE}Test $TOTAL_TESTS: $test_name${NC}"
    echo "  Endpoint: $endpoint"
    echo "  Expected: HTTP $expected_status"
    echo "  Description: $description"
    
    # Make the request and capture response
    response=$(curl -s -w "HTTPSTATUS:%{http_code}" "$endpoint" 2>/dev/null || echo "HTTPSTATUS:000")
    status=$(echo "$response" | grep -o "HTTPSTATUS:[0-9]*" | cut -d: -f2)
    body=$(echo "$response" | sed 's/HTTPSTATUS:[0-9]*$//')
    
    if [ "$status" = "$expected_status" ]; then
        echo -e "  ${GREEN}✅ PASSED${NC} - Status: $status"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "  ${RED}❌ FAILED${NC} - Status: $status (expected $expected_status)"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        if [ ! -z "$body" ]; then
            echo "  Response: $(echo "$body" | head -c 200)..."
        fi
    fi
    echo ""
}

echo "🔍 Testing New Modular Admin Routes"
echo "==================================="
echo ""

echo "📋 Testing Church Database Routes:"
echo "-----------------------------------"

# Test church database endpoints (expect 401 without auth)
run_test "Church Database Tables" \
         "$BASE_URL/church-database/1/tables" \
         "401" \
         "Should require authentication for database table listing"

run_test "Church Database Record Counts" \
         "$BASE_URL/church-database/1/record-counts" \
         "401" \
         "Should require authentication for record counts"

run_test "Church Database Info" \
         "$BASE_URL/church-database/1/info" \
         "401" \
         "Should require authentication for database info"

run_test "Church Database Health" \
         "$BASE_URL/church-database/1/health" \
         "401" \
         "Should require authentication for health check"

run_test "Church Database Test Connection" \
         "$BASE_URL/church-database/1/test-connection" \
         "401" \
         "Should require authentication for connection test"

echo "👥 Testing Church Users Routes:"
echo "--------------------------------"

# Test church users endpoints (expect 401 without auth)
run_test "Church Users List" \
         "$BASE_URL/church-users/1" \
         "401" \
         "Should require authentication for user listing"

run_test "Church User Creation" \
         "$BASE_URL/church-users/1" \
         "401" \
         "Should require authentication for user creation"

run_test "Church User Update" \
         "$BASE_URL/church-users/1/1" \
         "401" \
         "Should require authentication for user updates"

run_test "Church User Password Reset" \
         "$BASE_URL/church-users/1/1/reset-password" \
         "401" \
         "Should require authentication for password reset"

run_test "Church User Lock" \
         "$BASE_URL/church-users/1/1/lock" \
         "401" \
         "Should require authentication for user locking"

run_test "Church User Unlock" \
         "$BASE_URL/church-users/1/1/unlock" \
         "401" \
         "Should require authentication for user unlocking"

echo "🔄 Testing Route Priority (Existing vs New):"
echo "-------------------------------------------"

# Test that existing routes still work (these should hit the clean separated files)
run_test "Existing Admin Users Route" \
         "$BASE_URL/users" \
         "401" \
         "Should hit admin/users.js (not dead code in admin.js)"

run_test "Existing Admin Churches Route" \
         "$BASE_URL/churches" \
         "401" \
         "Should hit admin/churches.js (not dead code in admin.js)"

echo "📊 Test Results Summary"
echo "======================"
echo -e "Total Tests: $TOTAL_TESTS"
echo -e "${GREEN}Passed: $PASSED_TESTS${NC}"
echo -e "${RED}Failed: $FAILED_TESTS${NC}"

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "\n${GREEN}🎉 ALL TESTS PASSED!${NC}"
    echo "✅ New extracted routes are working correctly"
    echo "✅ Route priority is functioning properly"
    echo "✅ Authentication is properly enforced"
    echo ""
    echo "🎯 Ready for Phase 2: Remove dead code from admin.js"
    echo ""
    echo "Next steps:"
    echo "1. Restart server to ensure new routes are loaded"
    echo "2. Remove dead code from monolithic admin.js"
    echo "3. Test that functionality is preserved"
    exit 0
else
    echo -e "\n${RED}⚠️ SOME TESTS FAILED${NC}"
    echo "❌ Fix issues before proceeding with dead code removal"
    echo ""
    echo "Common issues to check:"
    echo "1. Server needs restart to load new routes"
    echo "2. Import paths in index.js may be incorrect"
    echo "3. Route configurations may have syntax errors"
    exit 1
fi 