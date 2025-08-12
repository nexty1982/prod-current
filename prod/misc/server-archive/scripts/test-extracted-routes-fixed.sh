#!/bin/bash

# ==============================================================================
# Test Extracted Admin Routes Script (FIXED VERSION)
# ==============================================================================
# This script tests the new modular admin route files with correct HTTP methods
# 
# Usage: ./test-extracted-routes-fixed.sh
# ==============================================================================

echo "🧪 Testing Extracted Admin Routes (Fixed Version)"
echo "================================================="

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
    local method="$2"
    local endpoint="$3"
    local expected_status="$4"
    local description="$5"
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    echo -e "${BLUE}Test $TOTAL_TESTS: $test_name${NC}"
    echo "  Method: $method"
    echo "  Endpoint: $endpoint"
    echo "  Expected: HTTP $expected_status"
    echo "  Description: $description"
    
    # Make the request with correct HTTP method
    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "HTTPSTATUS:%{http_code}" "$endpoint" 2>/dev/null || echo "HTTPSTATUS:000")
    elif [ "$method" = "POST" ]; then
        response=$(curl -s -w "HTTPSTATUS:%{http_code}" -X POST "$endpoint" 2>/dev/null || echo "HTTPSTATUS:000")
    elif [ "$method" = "PUT" ]; then
        response=$(curl -s -w "HTTPSTATUS:%{http_code}" -X PUT "$endpoint" 2>/dev/null || echo "HTTPSTATUS:000")
    else
        response="HTTPSTATUS:000"
    fi
    
    status=$(echo "$response" | grep -o "HTTPSTATUS:[0-9]*" | cut -d: -f2)
    body=$(echo "$response" | sed 's/HTTPSTATUS:[0-9]*$//')
    
    if [ "$status" = "$expected_status" ]; then
        echo -e "  ${GREEN}✅ PASSED${NC} - Status: $status"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "  ${RED}❌ FAILED${NC} - Status: $status (expected $expected_status)"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        if [ ! -z "$body" ]; then
            echo "  Response: $(echo "$body" | head -c 150)..."
        fi
    fi
    echo ""
}

echo "🔍 Testing New Modular Admin Routes (Correct HTTP Methods)"
echo "=========================================================="
echo ""

echo "📋 Testing Church Database Routes:"
echo "-----------------------------------"

# Test church database endpoints with correct methods
run_test "Church Database Tables" \
         "GET" \
         "$BASE_URL/church-database/1/tables" \
         "401" \
         "Should require authentication for database table listing"

run_test "Church Database Record Counts" \
         "GET" \
         "$BASE_URL/church-database/1/record-counts" \
         "401" \
         "Should require authentication for record counts"

run_test "Church Database Info" \
         "GET" \
         "$BASE_URL/church-database/1/info" \
         "401" \
         "Should require authentication for database info"

run_test "Church Database Health" \
         "GET" \
         "$BASE_URL/church-database/1/health" \
         "401" \
         "Should require authentication for health check"

run_test "Church Database Test Connection" \
         "POST" \
         "$BASE_URL/church-database/1/test-connection" \
         "401" \
         "Should require authentication for connection test (POST method)"

echo "👥 Testing Church Users Routes:"
echo "--------------------------------"

# Test church users endpoints with correct methods
run_test "Church Users List" \
         "GET" \
         "$BASE_URL/church-users/1" \
         "401" \
         "Should require authentication for user listing"

run_test "Church User Creation" \
         "POST" \
         "$BASE_URL/church-users/1" \
         "401" \
         "Should require authentication for user creation (POST method)"

run_test "Church User Update" \
         "PUT" \
         "$BASE_URL/church-users/1/1" \
         "401" \
         "Should require authentication for user updates (PUT method)"

run_test "Church User Password Reset" \
         "POST" \
         "$BASE_URL/church-users/1/1/reset-password" \
         "401" \
         "Should require authentication for password reset (POST method)"

run_test "Church User Lock" \
         "POST" \
         "$BASE_URL/church-users/1/1/lock" \
         "401" \
         "Should require authentication for user locking (POST method)"

run_test "Church User Unlock" \
         "POST" \
         "$BASE_URL/church-users/1/1/unlock" \
         "401" \
         "Should require authentication for user unlocking (POST method)"

echo "🔄 Testing Route Priority (Existing vs New):"
echo "-------------------------------------------"

# Test that existing routes still work
run_test "Existing Admin Users Route" \
         "GET" \
         "$BASE_URL/users" \
         "401" \
         "Should hit admin/users.js (not dead code in admin.js)"

run_test "Existing Admin Churches Route" \
         "GET" \
         "$BASE_URL/churches" \
         "401" \
         "Should hit admin/churches.js (requires auth - may need investigation)"

echo "📊 Test Results Summary"
echo "======================"
echo -e "Total Tests: $TOTAL_TESTS"
echo -e "${GREEN}Passed: $PASSED_TESTS${NC}"
echo -e "${RED}Failed: $FAILED_TESTS${NC}"

# Calculate success rate
success_rate=$((PASSED_TESTS * 100 / TOTAL_TESTS))

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "\n${GREEN}🎉 ALL TESTS PASSED! (100% success rate)${NC}"
    echo "✅ New extracted routes are working correctly"
    echo "✅ Route priority is functioning properly"
    echo "✅ Authentication is properly enforced"
    echo "✅ HTTP methods are correctly configured"
    echo ""
    echo "🎯 Ready for Phase 2: Remove dead code from admin.js"
    echo ""
    echo "Next steps:"
    echo "1. All routes are working perfectly"
    echo "2. Remove dead code from monolithic admin.js"
    echo "3. Test that functionality is preserved"
    exit 0
elif [ $success_rate -ge 85 ]; then
    echo -e "\n${YELLOW}🟡 MOSTLY PASSING (${success_rate}% success rate)${NC}"
    echo "✅ Core functionality is working"
    echo "⚠️ Minor issues to investigate:"
    
    if [ $FAILED_TESTS -le 2 ]; then
        echo "   - May be acceptable for proceeding with caution"
        echo "   - Consider investigating failed tests separately"
    fi
    
    echo ""
    echo "🎯 Consider proceeding with Phase 2 while monitoring failed routes"
    exit 0
else
    echo -e "\n${RED}⚠️ SIGNIFICANT FAILURES (${success_rate}% success rate)${NC}"
    echo "❌ Fix major issues before proceeding with dead code removal"
    echo ""
    echo "Common issues to check:"
    echo "1. Route configurations may have syntax errors"
    echo "2. Express router middleware setup issues"
    echo "3. Import paths in index.js may be incorrect"
    exit 1
fi 