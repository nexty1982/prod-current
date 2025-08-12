#!/bin/bash

# Quick API Audit Script for OrthodoxMetrics
# Discovers and tests backend API routes
# 
# Usage: ./scripts/api-audit-quick.sh [--test] [--usage]

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ROOT="$(pwd)"
SERVER_PORT="${PORT:-3000}"
SERVER_HOST="${HOST:-localhost}"
TEST_ENDPOINTS=false
CHECK_USAGE=false

# Parse arguments
for arg in "$@"; do
    case $arg in
        --test)
            TEST_ENDPOINTS=true
            ;;
        --usage)
            CHECK_USAGE=true
            ;;
        *)
            ;;
    esac
done

echo -e "${BLUE}🔍 Quick API Audit for OrthodoxMetrics${NC}"
echo -e "${BLUE}====================================${NC}"
echo ""

# Function to test if server is running
test_server() {
    if curl -f -s --max-time 3 "http://${SERVER_HOST}:${SERVER_PORT}/api/health" > /dev/null 2>&1; then
        return 0
    elif curl -f -s --max-time 3 "http://${SERVER_HOST}:${SERVER_PORT}/" > /dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

# Function to extract routes from a file
extract_routes() {
    local file="$1"
    echo -e "${YELLOW}📄 Scanning: $(basename "$file")${NC}"
    
    # Extract different route patterns
    grep -n -E "(router|app)\.(get|post|put|delete|patch|use)\s*\(\s*['\"\`]" "$file" 2>/dev/null | while IFS=: read -r line_num line_content; do
        # Extract method and path
        method=$(echo "$line_content" | sed -n "s/.*\.\(get\|post\|put\|delete\|patch\|use\).*/\1/p" | tr '[:lower:]' '[:upper:]')
        path=$(echo "$line_content" | sed -n "s/.*['\"\`]\([^'\"]*\)['\"\`].*/\1/p")
        
        if [ -n "$method" ] && [ -n "$path" ] && [ "$path" != "/" ]; then
            echo "  ${method} ${path} (line ${line_num})"
        fi
    done
}

# Function to test an endpoint
test_endpoint() {
    local method="$1"
    local path="$2"
    
    # Skip middleware routes
    if [ "$method" = "USE" ]; then
        return 0
    fi
    
    # Replace route parameters with test values
    test_path=$(echo "$path" | sed 's/:id/1/g' | sed 's/:userId/1/g' | sed 's/:[a-zA-Z_][a-zA-Z0-9_]*/test/g')
    
    local url="http://${SERVER_HOST}:${SERVER_PORT}${test_path}"
    
    case "$method" in
        "GET")
            if curl -f -s --max-time 5 "$url" > /dev/null 2>&1; then
                echo -e "    ${GREEN}✅ ${method} ${path}${NC}"
                return 0
            else
                echo -e "    ${RED}❌ ${method} ${path}${NC}"
                return 1
            fi
            ;;
        "POST"|"PUT"|"PATCH")
            if curl -f -s --max-time 5 -X "$method" -H "Content-Type: application/json" -d '{"test":true}' "$url" > /dev/null 2>&1; then
                echo -e "    ${GREEN}✅ ${method} ${path}${NC}"
                return 0
            else
                echo -e "    ${RED}❌ ${method} ${path}${NC}"
                return 1
            fi
            ;;
        "DELETE")
            if curl -f -s --max-time 5 -X DELETE "$url" > /dev/null 2>&1; then
                echo -e "    ${GREEN}✅ ${method} ${path}${NC}"
                return 0
            else
                echo -e "    ${RED}❌ ${method} ${path}${NC}"
                return 1
            fi
            ;;
        *)
            echo -e "    ${YELLOW}⚠️  ${method} ${path} (not tested)${NC}"
            return 0
            ;;
    esac
}

# Function to check route usage in frontend
check_route_usage() {
    local path="$1"
    local usage_count=0
    
    # Search in frontend directories
    for frontend_dir in "front-end/src" "frontend/src" "src"; do
        if [ -d "$frontend_dir" ]; then
            local count=$(grep -r -c "$path" "$frontend_dir" --include="*.js" --include="*.ts" --include="*.jsx" --include="*.tsx" 2>/dev/null | grep -v ":0" | wc -l)
            usage_count=$((usage_count + count))
        fi
    done
    
    if [ $usage_count -gt 0 ]; then
        echo -e "    ${GREEN}🔗 Used ($usage_count references)${NC}"
    else
        echo -e "    ${YELLOW}⚪ No frontend usage found${NC}"
    fi
}

# Step 1: Find all route files
echo -e "${CYAN}1. Discovering Route Files${NC}"
echo -e "${CYAN}==========================${NC}"

route_files=()
total_routes=0

# Look for route files in common locations
find server -name "*.js" -type f 2>/dev/null | while read -r file; do
    if grep -q -E "(router|app)\.(get|post|put|delete|patch|use)" "$file" 2>/dev/null; then
        echo "Found route file: $file"
    fi
done > /tmp/route_files.txt

if [ ! -s /tmp/route_files.txt ]; then
    echo -e "${RED}❌ No route files found!${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Found $(wc -l < /tmp/route_files.txt) route files${NC}"
echo ""

# Step 2: Extract all routes
echo -e "${CYAN}2. Extracting Routes${NC}"
echo -e "${CYAN}===================${NC}"

all_routes_file="/tmp/all_routes.txt"
> "$all_routes_file"

while IFS= read -r file; do
    extract_routes "$file" | tee -a "$all_routes_file"
done < /tmp/route_files.txt

total_routes=$(grep -c "^\s*[A-Z]" "$all_routes_file" 2>/dev/null || echo "0")
echo ""
echo -e "${GREEN}📊 Total Routes Found: $total_routes${NC}"
echo ""

# Step 3: Test endpoints (if requested)
if [ "$TEST_ENDPOINTS" = true ]; then
    echo -e "${CYAN}3. Testing API Endpoints${NC}"
    echo -e "${CYAN}=========================${NC}"
    
    if test_server; then
        echo -e "${GREEN}✅ Server is responding${NC}"
        echo ""
        
        working_routes=0
        error_routes=0
        
        # Read routes and test them
        while IFS= read -r route_line; do
            if [[ $route_line =~ ^[[:space:]]*([A-Z]+)[[:space:]]+([^[:space:]]+) ]]; then
                method="${BASH_REMATCH[1]}"
                path="${BASH_REMATCH[2]}"
                
                if test_endpoint "$method" "$path"; then
                    working_routes=$((working_routes + 1))
                else
                    error_routes=$((error_routes + 1))
                fi
            fi
        done < "$all_routes_file"
        
        echo ""
        echo -e "${GREEN}📊 Test Results:${NC}"
        echo -e "  ✅ Working: $working_routes"
        echo -e "  ❌ Errors: $error_routes"
        
    else
        echo -e "${YELLOW}⚠️  Server not responding - skipping endpoint tests${NC}"
        echo -e "${YELLOW}    Make sure your server is running on port $SERVER_PORT${NC}"
    fi
    echo ""
fi

# Step 4: Check usage (if requested)
if [ "$CHECK_USAGE" = true ]; then
    echo -e "${CYAN}4. Checking Route Usage${NC}"
    echo -e "${CYAN}=======================${NC}"
    
    while IFS= read -r route_line; do
        if [[ $route_line =~ ^[[:space:]]*([A-Z]+)[[:space:]]+([^[:space:]]+) ]]; then
            method="${BASH_REMATCH[1]}"
            path="${BASH_REMATCH[2]}"
            echo -e "${WHITE}${method} ${path}${NC}"
            check_route_usage "$path"
        fi
    done < "$all_routes_file"
    echo ""
fi

# Step 5: Summary
echo -e "${CYAN}📋 Summary${NC}"
echo -e "${CYAN}==========${NC}"

# Count routes by method
get_count=$(grep -c "^\s*GET" "$all_routes_file" 2>/dev/null || echo "0")
post_count=$(grep -c "^\s*POST" "$all_routes_file" 2>/dev/null || echo "0")
put_count=$(grep -c "^\s*PUT" "$all_routes_file" 2>/dev/null || echo "0")
delete_count=$(grep -c "^\s*DELETE" "$all_routes_file" 2>/dev/null || echo "0")
patch_count=$(grep -c "^\s*PATCH" "$all_routes_file" 2>/dev/null || echo "0")

echo -e "${WHITE}Route Breakdown:${NC}"
echo -e "  GET:    $get_count"
echo -e "  POST:   $post_count"
echo -e "  PUT:    $put_count"
echo -e "  DELETE: $delete_count"
echo -e "  PATCH:  $patch_count"
echo ""

# Show key API endpoints
echo -e "${WHITE}Key API Endpoints:${NC}"
grep -E "/(api|health|admin|auth|users|omai)" "$all_routes_file" 2>/dev/null | head -10 || echo "  No standard API routes found"
echo ""

# Cleanup
rm -f /tmp/route_files.txt /tmp/all_routes.txt

echo -e "${GREEN}✅ Quick API Audit Complete!${NC}"
echo ""
echo -e "${YELLOW}💡 For detailed analysis, run:${NC}"
echo -e "${YELLOW}   node scripts/api-audit-complete.js --test-endpoints --detailed${NC}" 