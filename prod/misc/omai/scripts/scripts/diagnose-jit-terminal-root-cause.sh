#!/bin/bash

# Diagnose JIT Terminal Root Cause
# Single comprehensive script to identify and fix JIT terminal issues

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

PROJECT_ROOT="/var/www/orthodox-church-mgmt/orthodoxmetrics/prod"

echo -e "${BLUE}🔍 Diagnosing JIT Terminal Root Cause${NC}"
echo -e "${BLUE}=====================================${NC}"

# Navigate to project directory
cd "$PROJECT_ROOT"

echo -e "${YELLOW}📁 Current directory: $(pwd)${NC}"

# Step 1: Check server status
echo -e "${YELLOW}📊 Step 1: Server Status Check${NC}"
pm2 list

# Step 2: Check if server is responding
echo -e "${YELLOW}🌐 Step 2: Server Connectivity${NC}"
if curl -s http://localhost:3001/ > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Server responding on port 3001${NC}"
else
    echo -e "${RED}❌ Server not responding - this is the root cause!${NC}"
    echo -e "${YELLOW}📋 Server logs:${NC}"
    pm2 logs orthodox-backend --lines 10
    echo -e "${RED}🚨 FIX: Server needs to be restarted${NC}"
    exit 1
fi

# Step 3: Check JIT API endpoints
echo -e "${YELLOW}🔐 Step 3: JIT API Endpoints${NC}"

echo -e "${BLUE}Testing /api/jit/config...${NC}"
response=$(curl -s -w "\nHTTP_STATUS:%{http_code}" "http://localhost:3001/api/jit/config")
http_status=$(echo "$response" | grep "HTTP_STATUS:" | cut -d: -f2)
echo -e "Status: $http_status"

if [ "$http_status" = "404" ]; then
    echo -e "${RED}❌ JIT routes not mounted - this is the root cause!${NC}"
    echo -e "${YELLOW}🔧 FIX: JIT routes need to be added to server/index.js${NC}"
elif [ "$http_status" = "401" ] || [ "$http_status" = "403" ]; then
    echo -e "${GREEN}✅ JIT routes working (auth required)${NC}"
else
    echo -e "${YELLOW}⚠️  Unexpected status: $http_status${NC}"
fi

# Step 4: Check WebSocket setup
echo -e "${YELLOW}🔌 Step 4: WebSocket Setup${NC}"

if grep -q "setupJITWebSocket" server/index.js; then
    echo -e "${GREEN}✅ JIT WebSocket setup found in server/index.js${NC}"
else
    echo -e "${RED}❌ JIT WebSocket setup missing - this is the root cause!${NC}"
    echo -e "${YELLOW}🔧 FIX: WebSocket setup needs to be added${NC}"
fi

# Step 5: Check dependencies
echo -e "${YELLOW}📦 Step 5: Dependencies${NC}"

cd server
if npm list node-pty > /dev/null 2>&1; then
    echo -e "${GREEN}✅ node-pty installed${NC}"
else
    echo -e "${RED}❌ node-pty missing - this is the root cause!${NC}"
    echo -e "${YELLOW}🔧 FIX: npm install node-pty${NC}"
fi

if npm list ws > /dev/null 2>&1; then
    echo -e "${GREEN}✅ ws (WebSocket) installed${NC}"
else
    echo -e "${RED}❌ ws missing - this is the root cause!${NC}"
    echo -e "${YELLOW}🔧 FIX: npm install ws${NC}"
fi
cd ..

# Step 6: Check environment configuration
echo -e "${YELLOW}⚙️  Step 6: Environment Configuration${NC}"

if grep -q "JIT_ALLOW_PRODUCTION=true" .env* 2>/dev/null; then
    echo -e "${GREEN}✅ JIT allowed in production${NC}"
else
    echo -e "${YELLOW}⚠️  JIT may be disabled in production${NC}"
    echo -e "${BLUE}Current environment:${NC}"
    echo "NODE_ENV=$(grep NODE_ENV .env* 2>/dev/null | head -1 | cut -d= -f2 || echo 'not set')"
fi

# Step 7: Check frontend configuration
echo -e "${YELLOW}🎨 Step 7: Frontend Configuration${NC}"

if [ -f "front-end/.env.production" ]; then
    echo -e "${GREEN}✅ Frontend production environment exists${NC}"
    if grep -q "orthodoxmetrics.com" front-end/.env.production; then
        echo -e "${GREEN}✅ Frontend configured for production domain${NC}"
    else
        echo -e "${YELLOW}⚠️  Frontend may be using localhost URLs${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Frontend production environment missing${NC}"
fi

# Step 8: Check log directory
echo -e "${YELLOW}📁 Step 8: Log Directory${NC}"

if [ -d "/var/log/orthodoxmetrics" ]; then
    echo -e "${GREEN}✅ Log directory exists${NC}"
    if [ -w "/var/log/orthodoxmetrics" ]; then
        echo -e "${GREEN}✅ Log directory writable${NC}"
    else
        echo -e "${YELLOW}⚠️  Log directory not writable${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Log directory missing${NC}"
fi

# Step 9: Check browser console errors (user needs to check)
echo -e "${YELLOW}🌐 Step 9: Browser Console Check${NC}"
echo -e "${BLUE}Please check your browser console for these specific errors:${NC}"
echo "• WebSocket connection errors"
echo "• CORS errors"
echo "• API timeout errors"
echo "• 404 errors for JIT endpoints"

# Step 10: Provide targeted fix
echo -e "${YELLOW}🔧 Step 10: Targeted Fix Recommendation${NC}"

echo -e "${BLUE}Based on the diagnosis above, here's what needs to be fixed:${NC}"

if ! curl -s http://localhost:3001/ > /dev/null 2>&1; then
    echo -e "${RED}1. Server is down - restart it:${NC}"
    echo "   pm2 restart orthodox-backend"
elif ! grep -q "setupJITWebSocket" server/index.js; then
    echo -e "${RED}2. JIT WebSocket setup missing - add it to server/index.js${NC}"
elif ! grep -q "/api/jit" server/index.js; then
    echo -e "${RED}3. JIT routes not mounted - add them to server/index.js${NC}"
elif ! npm list node-pty > /dev/null 2>&1; then
    echo -e "${RED}4. Missing dependencies - install them:${NC}"
    echo "   cd server && npm install node-pty ws"
elif ! grep -q "JIT_ALLOW_PRODUCTION=true" .env* 2>/dev/null; then
    echo -e "${RED}5. JIT disabled in production - enable it:${NC}"
    echo "   echo 'JIT_ALLOW_PRODUCTION=true' >> .env.production"
else
    echo -e "${GREEN}✅ All backend issues resolved${NC}"
    echo -e "${YELLOW}The issue is likely in the frontend or browser configuration${NC}"
fi

echo ""
echo -e "${GREEN}🎯 Root Cause Analysis Complete!${NC}"
echo ""
echo -e "${BLUE}Next Steps:${NC}"
echo "1. Apply the targeted fix above"
echo "2. Restart the server if needed"
echo "3. Clear browser cache and refresh"
echo "4. Try the JIT terminal again"
echo ""
echo -e "${YELLOW}💡 Pro Tip: Focus on one issue at a time instead of creating multiple scripts!${NC}" 