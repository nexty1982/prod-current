#!/bin/bash

# Fix OMAI Import Path and Test
# This script fixes the OMAI import path and tests the endpoints

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

PROJECT_ROOT="/var/www/orthodox-church-mgmt/orthodoxmetrics/prod"

echo -e "${BLUE}🔧 Fixing OMAI Import Path and Testing${NC}"
echo -e "${BLUE}=====================================${NC}"

# Navigate to project directory
cd "$PROJECT_ROOT"

echo -e "${YELLOW}📁 Current directory: $(pwd)${NC}"

# Step 1: Verify the fix
echo -e "${YELLOW}🔍 Verifying the OMAI import path fix...${NC}"
if grep -q "require('../../services/om-ai')" server/index.js; then
    echo -e "${GREEN}✅ OMAI import path is correctly fixed${NC}"
else
    echo -e "${RED}❌ OMAI import path fix not found${NC}"
    exit 1
fi

# Step 2: Check syntax
echo -e "${YELLOW}🔍 Checking server syntax...${NC}"
if node -c server/index.js 2>/dev/null; then
    echo -e "${GREEN}✅ Server syntax is valid${NC}"
else
    echo -e "${RED}❌ Server has syntax errors${NC}"
    node -c server/index.js
    exit 1
fi

# Step 3: Restart server
echo -e "${YELLOW}🔄 Restarting server...${NC}"
pm2 restart orthodox-backend
sleep 5

# Step 4: Check server status
echo -e "${YELLOW}📊 Checking server status...${NC}"
pm2 list

# Step 5: Test server connectivity
echo -e "${YELLOW}🧪 Testing server connectivity...${NC}"
if curl -s http://localhost:3001/ > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Server is responding on port 3001${NC}"
else
    echo -e "${RED}❌ Server not responding on port 3001${NC}"
    echo -e "${YELLOW}📋 Checking server logs...${NC}"
    pm2 logs orthodox-backend --lines 10
    exit 1
fi

# Step 6: Test OMAI endpoints
echo -e "${YELLOW}🔐 Testing OMAI endpoints...${NC}"

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

# Step 7: Check server logs for OMAI activity
echo -e "${YELLOW}📋 Checking server logs for OMAI activity...${NC}"
pm2 logs orthodox-backend --lines 10 | grep -i "omai\|status\|fix" || echo "No OMAI-related logs found"

echo -e "${GREEN}🎉 OMAI Import Fix Complete!${NC}"
echo ""
echo -e "${BLUE}📊 Expected Results:${NC}"
echo "• GET /api/status should return 200 with OMAI status"
echo "• POST /api/fix should return 200 with fix response"
echo "• No more 'Cannot find module' errors"
echo ""
echo -e "${YELLOW}💡 Next Steps:${NC}"
echo "• Refresh the frontend page"
echo "• The OMAI status check should now work"
echo "• Check the browser console for OMAI availability" 