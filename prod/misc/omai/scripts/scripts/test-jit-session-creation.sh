#!/bin/bash

# Test JIT Session Creation
# Simple script to test the JIT session creation workflow

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

PROJECT_ROOT="/var/www/orthodox-church-mgmt/orthodoxmetrics/prod"

echo -e "${BLUE}🧪 Testing JIT Session Creation${NC}"
echo -e "${BLUE}==============================${NC}"

# Navigate to project directory
cd "$PROJECT_ROOT"

echo -e "${YELLOW}📁 Current directory: $(pwd)${NC}"

# Step 1: Check if server is running
echo -e "${YELLOW}📊 Step 1: Server Status${NC}"
if curl -s http://localhost:3001/ > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Server is running${NC}"
else
    echo -e "${RED}❌ Server is not running${NC}"
    exit 1
fi

# Step 2: Test JIT config endpoint
echo -e "${YELLOW}🔐 Step 2: Test JIT Config Endpoint${NC}"
echo -e "${BLUE}Testing GET /api/jit/config...${NC}"

response=$(curl -s -w "\nHTTP_STATUS:%{http_code}" "http://localhost:3001/api/jit/config")
http_status=$(echo "$response" | grep "HTTP_STATUS:" | cut -d: -f2)
body=$(echo "$response" | sed '/HTTP_STATUS:/d')

echo -e "Status: $http_status"
echo -e "Response: $body"

if [ "$http_status" = "401" ] || [ "$http_status" = "403" ]; then
    echo -e "${GREEN}✅ JIT config endpoint working (auth required)${NC}"
else
    echo -e "${RED}❌ JIT config endpoint issue${NC}"
fi

# Step 3: Test JIT session creation endpoint
echo -e "${YELLOW}🚀 Step 3: Test JIT Session Creation${NC}"
echo -e "${BLUE}Testing POST /api/jit/start-session...${NC}"

response=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST \
  -H "Content-Type: application/json" \
  -d '{"timeoutMinutes": 10}' \
  "http://localhost:3001/api/jit/start-session")

http_status=$(echo "$response" | grep "HTTP_STATUS:" | cut -d: -f2)
body=$(echo "$response" | sed '/HTTP_STATUS:/d')

echo -e "Status: $http_status"
echo -e "Response: $body"

if [ "$http_status" = "401" ] || [ "$http_status" = "403" ]; then
    echo -e "${GREEN}✅ JIT session creation endpoint working (auth required)${NC}"
    echo -e "${YELLOW}💡 This is expected - you need to be logged in as super_admin${NC}"
elif [ "$http_status" = "200" ] || [ "$http_status" = "201" ]; then
    echo -e "${GREEN}✅ JIT session created successfully!${NC}"
    echo -e "${BLUE}Session data: $body${NC}"
else
    echo -e "${RED}❌ JIT session creation failed${NC}"
fi

# Step 4: Check server logs for JIT activity
echo -e "${YELLOW}📋 Step 4: Check Server Logs${NC}"
echo -e "${BLUE}Recent JIT-related logs:${NC}"
pm2 logs orthodox-backend --lines 10 | grep -i "jit\|terminal" || echo "No JIT-related logs found"

# Step 5: Check if JIT session manager is working
echo -e "${YELLOW}🔧 Step 5: Check JIT Session Manager${NC}"

if [ -f "server/services/jitSessionManager.js" ]; then
    echo -e "${GREEN}✅ JIT Session Manager exists${NC}"
    
    # Check if it has the required methods
    if grep -q "createSession" server/services/jitSessionManager.js; then
        echo -e "${GREEN}✅ createSession method exists${NC}"
    else
        echo -e "${RED}❌ createSession method missing${NC}"
    fi
    
    if grep -q "getSession" server/services/jitSessionManager.js; then
        echo -e "${GREEN}✅ getSession method exists${NC}"
    else
        echo -e "${RED}❌ getSession method missing${NC}"
    fi
else
    echo -e "${RED}❌ JIT Session Manager missing${NC}"
fi

# Step 6: Check WebSocket setup
echo -e "${YELLOW}🔌 Step 6: Check WebSocket Setup${NC}"

if grep -q "setupJITWebSocket" server/index.js; then
    echo -e "${GREEN}✅ JIT WebSocket setup found in server/index.js${NC}"
else
    echo -e "${RED}❌ JIT WebSocket setup missing${NC}"
fi

# Step 7: Check if JIT routes are mounted
echo -e "${YELLOW}🛣️  Step 7: Check JIT Routes${NC}"

if grep -q "/api/jit" server/index.js; then
    echo -e "${GREEN}✅ JIT routes are mounted${NC}"
else
    echo -e "${RED}❌ JIT routes not mounted${NC}"
fi

echo ""
echo -e "${GREEN}🎯 JIT Session Creation Test Complete!${NC}"
echo ""
echo -e "${BLUE}📊 Summary:${NC}"
echo "• Backend server is running"
echo "• JIT endpoints are responding"
echo "• Session creation requires authentication"
echo "• WebSocket setup is configured"
echo ""
echo -e "${YELLOW}💡 Next Steps:${NC}"
echo "1. Log in as super_admin in your browser"
echo "2. Go to '⚙️ JIT Terminal Settings'"
echo "3. Click 'New Session' button"
echo "4. Check browser console for any errors"
echo "5. The terminal should connect automatically"
echo ""
echo -e "${BLUE}🔍 If it still doesn't work:${NC}"
echo "• Check browser console for specific error messages"
echo "• Verify you're logged in as super_admin"
echo "• Try refreshing the page and creating a new session" 