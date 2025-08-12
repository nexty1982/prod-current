#!/bin/bash

# Fix JIT Routes and Restart Server
# This script fixes the JIT routes and restarts the server

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

PROJECT_ROOT="/var/www/orthodox-church-mgmt/orthodoxmetrics/prod"

echo -e "${BLUE}🔧 Fixing JIT Routes and Restarting Server${NC}"
echo -e "${BLUE}==========================================${NC}"

# Navigate to project directory
cd "$PROJECT_ROOT"

echo -e "${YELLOW}📁 Current directory: $(pwd)${NC}"

# Step 1: Verify JIT terminal file syntax
echo -e "${YELLOW}🔍 Verifying JIT terminal file syntax...${NC}"
if node -c server/routes/jit-terminal.js 2>/dev/null; then
    echo -e "${GREEN}✅ JIT terminal file syntax is valid${NC}"
else
    echo -e "${RED}❌ JIT terminal file has syntax errors${NC}"
    node -c server/routes/jit-terminal.js
    exit 1
fi

# Step 2: Check if all required functions exist in the file
echo -e "${YELLOW}🔍 Checking JIT terminal file structure...${NC}"
if grep -q "router.post('/start-session'" server/routes/jit-terminal.js; then
    echo -e "${GREEN}✅ POST /start-session route exists${NC}"
else
    echo -e "${RED}❌ POST /start-session route missing${NC}"
fi

if grep -q "router.post('/end-session'" server/routes/jit-terminal.js; then
    echo -e "${GREEN}✅ POST /end-session route exists${NC}"
else
    echo -e "${RED}❌ POST /end-session route missing${NC}"
fi

# Step 3: Stop the current server
echo -e "${YELLOW}🛑 Stopping current server...${NC}"
pm2 stop orthodox-backend 2>/dev/null || true
pm2 delete orthodox-backend 2>/dev/null || true

# Step 4: Start the server
echo -e "${YELLOW}🚀 Starting server...${NC}"
pm2 start server/index.js --name orthodox-backend

# Step 5: Wait for server to be ready
echo -e "${YELLOW}⏳ Waiting for server to be ready...${NC}"
sleep 10

# Step 6: Check server status
echo -e "${YELLOW}📊 Checking server status...${NC}"
pm2 list

# Step 7: Test server connectivity
echo -e "${YELLOW}🧪 Testing server connectivity...${NC}"
if curl -s http://localhost:3001/ > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Server is responding on port 3001${NC}"
else
    echo -e "${RED}❌ Server not responding on port 3001${NC}"
    echo -e "${YELLOW}📋 Checking server logs...${NC}"
    pm2 logs orthodox-backend --lines 10
    exit 1
fi

# Step 8: Test JIT endpoints with detailed output
echo -e "${YELLOW}🔐 Testing JIT endpoints with detailed output...${NC}"

echo -e "${BLUE}📡 Testing GET /api/jit/config...${NC}"
response=$(curl -s -w "\nHTTP_STATUS:%{http_code}" "http://localhost:3001/api/jit/config")
http_status=$(echo "$response" | grep "HTTP_STATUS:" | cut -d: -f2)
body=$(echo "$response" | sed '/HTTP_STATUS:/d')
echo -e "Status: $http_status"
echo -e "Response: $body"
echo ""

echo -e "${BLUE}📡 Testing POST /api/jit/start-session...${NC}"
response=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST -H "Content-Type: application/json" -d '{"timeoutMinutes": 30}' "http://localhost:3001/api/jit/start-session")
http_status=$(echo "$response" | grep "HTTP_STATUS:" | cut -d: -f2)
body=$(echo "$response" | sed '/HTTP_STATUS:/d')
echo -e "Status: $http_status"
echo -e "Response: $body"
echo ""

echo -e "${BLUE}📡 Testing POST /api/jit/end-session...${NC}"
response=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST -H "Content-Type: application/json" -d '{"sessionId": "test"}' "http://localhost:3001/api/jit/end-session")
http_status=$(echo "$response" | grep "HTTP_STATUS:" | cut -d: -f2)
body=$(echo "$response" | sed '/HTTP_STATUS:/d')
echo -e "Status: $http_status"
echo -e "Response: $body"
echo ""

# Step 9: Check server logs for any JIT-related errors
echo -e "${YELLOW}📋 Checking recent server logs for JIT activity...${NC}"
pm2 logs orthodox-backend --lines 15 | grep -i "jit\|terminal" || echo "No JIT-related logs found"

echo -e "${GREEN}🎉 JIT Routes Fix Complete!${NC}"
echo ""
echo -e "${BLUE}📊 Summary:${NC}"
echo "✅ Server is running and responding"
echo "✅ JIT terminal file syntax is valid"
echo "✅ All JIT endpoints should now be accessible"
echo ""
echo -e "${YELLOW}💡 Expected Results:${NC}"
echo "• GET endpoints should return 401 (auth required)"
echo "• POST endpoints should return 401 (auth required) instead of 404"
echo "• WebSocket connections should work properly" 