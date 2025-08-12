#!/bin/bash

# Restart Server After Fix
# This script restarts the server after fixing the duplicate variable declaration

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

PROJECT_ROOT="/var/www/orthodox-church-mgmt/orthodoxmetrics/prod"

echo -e "${BLUE}🚀 Restarting Server After Fix${NC}"
echo -e "${BLUE}============================${NC}"

# Navigate to project directory
cd "$PROJECT_ROOT"

echo -e "${YELLOW}📁 Current directory: $(pwd)${NC}"

# Step 1: Verify the fix
echo -e "${YELLOW}🔍 Verifying the duplicate variable fix...${NC}"
jit_declarations=$(grep -c "const jitTerminalRouter" server/index.js)
if [ "$jit_declarations" -eq 1 ]; then
    echo -e "${GREEN}✅ Only one jitTerminalRouter declaration found${NC}"
else
    echo -e "${RED}❌ Still have $jit_declarations jitTerminalRouter declarations${NC}"
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

# Step 3: Stop current server
echo -e "${YELLOW}🛑 Stopping current server...${NC}"
pm2 stop orthodox-backend 2>/dev/null || true
pm2 delete orthodox-backend 2>/dev/null || true

# Step 4: Start server
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

# Step 8: Test JIT endpoints
echo -e "${YELLOW}🔐 Testing JIT endpoints...${NC}"

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

# Step 9: Check for JIT WebSocket initialization
echo -e "${YELLOW}📋 Checking for JIT WebSocket initialization...${NC}"
pm2 logs orthodox-backend --lines 10 | grep -i "jit\|terminal\|websocket" || echo "No JIT-related logs found"

echo -e "${GREEN}🎉 Server Restart Complete!${NC}"
echo ""
echo -e "${BLUE}📊 Summary:${NC}"
echo "✅ Duplicate variable declaration fixed"
echo "✅ Server syntax is valid"
echo "✅ Server is running and responding"
echo "✅ All JIT endpoints should now return 401 (auth required) instead of 404"
echo ""
echo -e "${YELLOW}💡 Next Steps:${NC}"
echo "• Refresh the JIT terminal page in your browser"
echo "• Try creating a new JIT session"
echo "• Click the eye icon (👁️) to connect to sessions" 