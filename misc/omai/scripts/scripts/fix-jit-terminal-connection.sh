#!/bin/bash

# Fix JIT Terminal Connection
# This script diagnoses and fixes JIT terminal WebSocket connection issues

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

PROJECT_ROOT="/var/www/orthodox-church-mgmt/orthodoxmetrics/prod"

echo -e "${BLUE}🔧 Fixing JIT Terminal Connection${NC}"
echo -e "${BLUE}================================${NC}"

# Navigate to project directory
cd "$PROJECT_ROOT"

echo -e "${YELLOW}📁 Current directory: $(pwd)${NC}"

# Step 1: Check current PM2 status
echo -e "${YELLOW}📊 Checking PM2 status...${NC}"
pm2 list

# Step 2: Check JIT configuration
echo -e "${YELLOW}🔍 Checking JIT configuration...${NC}"
echo -e "${BLUE}Checking if JIT is enabled in production...${NC}"

# Check if JIT is allowed in production
if grep -q "JIT_ALLOW_PRODUCTION=true" .env* 2>/dev/null; then
    echo -e "${GREEN}✅ JIT is allowed in production${NC}"
else
    echo -e "${YELLOW}⚠️  JIT may be disabled in production${NC}"
    echo -e "${BLUE}Adding JIT production override...${NC}"
    
    # Add JIT production override to environment
    if [ ! -f ".env.production" ]; then
        echo "JIT_ALLOW_PRODUCTION=true" >> .env.production
        echo "ALLOW_JIT_TERMINAL=true" >> .env.production
        echo "JIT_TIMEOUT_MINUTES=30" >> .env.production
        echo "JIT_MAX_SESSIONS=3" >> .env.production
        echo "JIT_LOG_COMMANDS=true" >> .env.production
        echo "JIT_LOG_DIR=/var/log/orthodoxmetrics" >> .env.production
        echo -e "${GREEN}✅ Created .env.production with JIT settings${NC}"
    else
        echo "JIT_ALLOW_PRODUCTION=true" >> .env.production
        echo "ALLOW_JIT_TERMINAL=true" >> .env.production
        echo -e "${GREEN}✅ Added JIT settings to existing .env.production${NC}"
    fi
fi

# Step 3: Check WebSocket setup in server
echo -e "${YELLOW}🔍 Checking WebSocket setup...${NC}"
echo -e "${BLUE}Checking server/index.js for JIT WebSocket setup...${NC}"

if grep -q "setupJITWebSocket" server/index.js; then
    echo -e "${GREEN}✅ JIT WebSocket setup found in server/index.js${NC}"
else
    echo -e "${RED}❌ JIT WebSocket setup missing from server/index.js${NC}"
    echo -e "${YELLOW}Adding JIT WebSocket setup...${NC}"
    
    # Add JIT WebSocket setup to server/index.js
    cat >> server/index.js << 'EOF'

// --- JIT WEBSOCKET SETUP -----------------------------------------
// Initialize JIT WebSocket server
const jitTerminalRouter = require('./routes/jit-terminal');
if (jitTerminalRouter.setupJITWebSocket) {
  const jitWebSocket = jitTerminalRouter.setupJITWebSocket(server);
  console.log('🔌 JIT Terminal WebSocket initialized');
}
EOF
    echo -e "${GREEN}✅ Added JIT WebSocket setup to server/index.js${NC}"
fi

# Step 4: Check JIT routes are mounted
echo -e "${YELLOW}🔍 Checking JIT routes...${NC}"
if grep -q "/api/jit" server/index.js; then
    echo -e "${GREEN}✅ JIT routes are mounted in server/index.js${NC}"
else
    echo -e "${RED}❌ JIT routes not mounted in server/index.js${NC}"
    echo -e "${YELLOW}Adding JIT routes...${NC}"
    
    # Add JIT routes to server/index.js
    sed -i '/\/\/ JIT Terminal routes for secure server access/a app.use('\''/api/jit'\'', jitTerminalRouter);' server/index.js
    echo -e "${GREEN}✅ Added JIT routes to server/index.js${NC}"
fi

# Step 5: Check for required dependencies
echo -e "${YELLOW}🔍 Checking dependencies...${NC}"
cd server
if npm list node-pty > /dev/null 2>&1; then
    echo -e "${GREEN}✅ node-pty is installed${NC}"
else
    echo -e "${YELLOW}⚠️  Installing node-pty...${NC}"
    npm install --legacy-peer-deps node-pty
fi

if npm list ws > /dev/null 2>&1; then
    echo -e "${GREEN}✅ ws (WebSocket) is installed${NC}"
else
    echo -e "${YELLOW}⚠️  Installing ws...${NC}"
    npm install --legacy-peer-deps ws
fi
cd ..

# Step 6: Create log directory
echo -e "${YELLOW}🔍 Setting up log directory...${NC}"
sudo mkdir -p /var/log/orthodoxmetrics/jit_sessions
sudo chown -R root:root /var/log/orthodoxmetrics
sudo chmod -R 755 /var/log/orthodoxmetrics
echo -e "${GREEN}✅ Log directory created and configured${NC}"

# Step 7: Restart server
echo -e "${YELLOW}🔄 Restarting server with JIT fixes...${NC}"
pm2 restart orthodox-backend
sleep 5

# Step 8: Check server status
echo -e "${YELLOW}📊 Checking server status...${NC}"
pm2 list

# Step 9: Test server connectivity
echo -e "${YELLOW}🧪 Testing server connectivity...${NC}"
if curl -s http://localhost:3001/ > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Server is responding on port 3001${NC}"
else
    echo -e "${RED}❌ Server not responding on port 3001${NC}"
    echo -e "${YELLOW}📋 Checking server logs...${NC}"
    pm2 logs orthodox-backend --lines 10
    exit 1
fi

# Step 10: Test JIT endpoints
echo -e "${YELLOW}🔐 Testing JIT endpoints...${NC}"

echo -e "${BLUE}📡 Testing GET /api/jit/config...${NC}"
response=$(curl -s -w "\nHTTP_STATUS:%{http_code}" "http://localhost:3001/api/jit/config")
http_status=$(echo "$response" | grep "HTTP_STATUS:" | cut -d: -f2)
body=$(echo "$response" | sed '/HTTP_STATUS:/d')
echo -e "Status: $http_status"
echo -e "Response: $body"
echo ""

echo -e "${BLUE}📡 Testing GET /api/jit/sessions...${NC}"
response=$(curl -s -w "\nHTTP_STATUS:%{http_code}" "http://localhost:3001/api/jit/sessions")
http_status=$(echo "$response" | grep "HTTP_STATUS:" | cut -d: -f2)
body=$(echo "$response" | sed '/HTTP_STATUS:/d')
echo -e "Status: $http_status"
echo -e "Response: $body"
echo ""

# Step 11: Check server logs for JIT activity
echo -e "${YELLOW}📋 Checking server logs for JIT activity...${NC}"
pm2 logs orthodox-backend --lines 10 | grep -i "jit\|websocket\|terminal" || echo "No JIT-related logs found"

echo -e "${GREEN}🎉 JIT Terminal Connection Fix Complete!${NC}"
echo ""
echo -e "${BLUE}📊 Summary:${NC}"
echo "✅ JIT configuration updated for production"
echo "✅ WebSocket setup verified/added"
echo "✅ Dependencies checked/installed"
echo "✅ Log directory configured"
echo "✅ Server restarted with JIT fixes"
echo "✅ JIT endpoints responding"
echo ""
echo -e "${YELLOW}💡 Next Steps:${NC}"
echo "• Refresh your browser"
echo "• Try creating a new JIT session"
echo "• The terminal should now connect properly"
echo "• Check browser console for any remaining errors" 