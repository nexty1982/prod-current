#!/bin/bash

# Test OMAI Frontend Compatibility
# This script tests the OMAI frontend compatibility endpoints

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

PROJECT_ROOT="/var/www/orthodox-church-mgmt/orthodoxmetrics/prod"

echo -e "${BLUE}🧪 Testing OMAI Frontend Compatibility${NC}"
echo -e "${BLUE}=====================================${NC}"

# Navigate to project directory
cd "$PROJECT_ROOT"

echo -e "${YELLOW}📁 Current directory: $(pwd)${NC}"

# Step 1: Check server status
echo -e "${YELLOW}📊 Checking server status...${NC}"
pm2 list

# Step 2: Restart server to load new endpoints
echo -e "${YELLOW}🔄 Restarting server to load new OMAI endpoints...${NC}"
pm2 restart orthodox-backend
sleep 5

# Step 3: Test server connectivity
echo -e "${YELLOW}🧪 Testing server connectivity...${NC}"
if curl -s http://localhost:3001/ > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Server is responding on port 3001${NC}"
else
    echo -e "${RED}❌ Server not responding on port 3001${NC}"
    exit 1
fi

# Step 4: Test OMAI frontend compatibility endpoints
echo -e "${YELLOW}🔐 Testing OMAI frontend compatibility endpoints...${NC}"

echo -e "${BLUE}📡 Testing GET /api/status (frontend compatibility)...${NC}"
response=$(curl -s -w "\nHTTP_STATUS:%{http_code}" "http://localhost:3001/api/status")
http_status=$(echo "$response" | grep "HTTP_STATUS:" | cut -d: -f2)
body=$(echo "$response" | sed '/HTTP_STATUS:/d')
echo -e "Status: $http_status"
echo -e "Response: $body"
echo ""

echo -e "${BLUE}📡 Testing POST /api/fix (frontend compatibility)...${NC}"
response=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST -H "Content-Type: application/json" -d '{"component": "test", "issues": ["test issue"]}' "http://localhost:3001/api/fix")
http_status=$(echo "$response" | grep "HTTP_STATUS:" | cut -d: -f2)
body=$(echo "$response" | sed '/HTTP_STATUS:/d')
echo -e "Status: $http_status"
echo -e "Response: $body"
echo ""

# Step 5: Test OMAI specific endpoints (should still work)
echo -e "${YELLOW}🔐 Testing OMAI specific endpoints...${NC}"

echo -e "${BLUE}📡 Testing GET /api/omai/status...${NC}"
response=$(curl -s -w "\nHTTP_STATUS:%{http_code}" "http://localhost:3001/api/omai/status")
http_status=$(echo "$response" | grep "HTTP_STATUS:" | cut -d: -f2)
body=$(echo "$response" | sed '/HTTP_STATUS:/d')
echo -e "Status: $http_status"
echo -e "Response: $body"
echo ""

echo -e "${BLUE}📡 Testing POST /api/omai/fix...${NC}"
response=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST -H "Content-Type: application/json" -d '{"component": "test", "issues": ["test issue"]}' "http://localhost:3001/api/omai/fix")
http_status=$(echo "$response" | grep "HTTP_STATUS:" | cut -d: -f2)
body=$(echo "$response" | sed '/HTTP_STATUS:/d')
echo -e "Status: $http_status"
echo -e "Response: $body"
echo ""

# Step 6: Check server logs for OMAI activity
echo -e "${YELLOW}📋 Checking server logs for OMAI activity...${NC}"
pm2 logs orthodox-backend --lines 10 | grep -i "omai\|status\|fix" || echo "No OMAI-related logs found"

echo -e "${GREEN}🎉 OMAI Frontend Compatibility Test Complete!${NC}"
echo ""
echo -e "${BLUE}📊 Expected Results:${NC}"
echo "• GET /api/status should return 200 with OMAI status"
echo "• POST /api/fix should return 200 with fix response"
echo "• GET /api/omai/status should return 401 (auth required)"
echo "• POST /api/omai/fix should return 401 (auth required)"
echo ""
echo -e "${YELLOW}💡 Next Steps:${NC}"
echo "• Refresh the frontend page"
echo "• The OMAI status check should now work"
echo "• Check the browser console for OMAI availability" 