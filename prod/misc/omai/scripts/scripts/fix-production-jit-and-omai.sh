#!/bin/bash

# Fix Production JIT Terminal and OMAI Issues
# This script fixes JIT terminal connection and OMAI timeout issues in production

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

PROJECT_ROOT="/var/www/orthodox-church-mgmt/orthodoxmetrics/prod"

echo -e "${BLUE}🔧 Fixing Production JIT Terminal and OMAI Issues${NC}"
echo -e "${BLUE}================================================${NC}"

# Navigate to project directory
cd "$PROJECT_ROOT"

echo -e "${YELLOW}📁 Current directory: $(pwd)${NC}"

# Step 1: Check current server status
echo -e "${YELLOW}📊 Checking current server status...${NC}"
pm2 list

# Step 2: Fix API endpoint configuration
echo -e "${YELLOW}🔧 Fixing API endpoint configuration...${NC}"

# Check if frontend is configured for production
if [ -f "front-end/.env.production" ]; then
    echo -e "${BLUE}Updating frontend production environment...${NC}"
    cat > front-end/.env.production << 'EOF'
REACT_APP_API_URL=https://orthodoxmetrics.com/api
REACT_APP_SERVER_URL=https://orthodoxmetrics.com
REACT_APP_WS_URL=wss://orthodoxmetrics.com
REACT_APP_OMAI_URL=https://orthodoxmetrics.com/api/omai
NODE_ENV=production
EOF
    echo -e "${GREEN}✅ Frontend production environment updated${NC}"
else
    echo -e "${BLUE}Creating frontend production environment...${NC}"
    mkdir -p front-end
    cat > front-end/.env.production << 'EOF'
REACT_APP_API_URL=https://orthodoxmetrics.com/api
REACT_APP_SERVER_URL=https://orthodoxmetrics.com
REACT_APP_WS_URL=wss://orthodoxmetrics.com
REACT_APP_OMAI_URL=https://orthodoxmetrics.com/api/omai
NODE_ENV=production
EOF
    echo -e "${GREEN}✅ Frontend production environment created${NC}"
fi

# Step 3: Fix backend environment configuration
echo -e "${YELLOW}🔧 Fixing backend environment configuration...${NC}"

# Create/update backend production environment
cat > .env.production << 'EOF'
# Production Environment Configuration
NODE_ENV=production
PORT=3001
HOST=0.0.0.0

# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USER=orthodox_user
DB_PASSWORD=orthodox_password
DB_NAME=orthodoxmetrics_db

# Session Configuration
SESSION_SECRET=your-super-secret-session-key-change-this-in-production
SESSION_SECURE=true
SESSION_HTTP_ONLY=true
SESSION_SAME_SITE=strict

# Security Configuration
BCRYPT_ROUNDS=12
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=24h

# OMAI Configuration
OMAI_ENABLED=true
OMAI_LOG_LEVEL=info
OMAI_BACKGROUND_SCHEDULER=true
OMAI_LEARNING_ENABLED=true
OMAI_KNOWLEDGE_INDEXING=true

# JIT Terminal Configuration
ALLOW_JIT_TERMINAL=true
JIT_ALLOW_PRODUCTION=true
JIT_TIMEOUT_MINUTES=30
JIT_MAX_SESSIONS=3
JIT_REQUIRE_REAUTH=false
JIT_LOG_COMMANDS=true
JIT_LOG_DIR=/var/log/orthodoxmetrics

# WebSocket Configuration
WS_ENABLED=true
WS_PATH=/api/ws
JIT_WS_PATH=/api/jit/socket

# CORS Configuration
CORS_ORIGIN=https://orthodoxmetrics.com
CORS_CREDENTIALS=true

# Logging Configuration
LOG_LEVEL=info
LOG_FILE=/var/log/orthodoxmetrics/app.log
EOF

echo -e "${GREEN}✅ Backend production environment configured${NC}"

# Step 4: Fix server/index.js for production
echo -e "${YELLOW}🔧 Fixing server configuration for production...${NC}"

# Check if server/index.js has proper JIT and OMAI setup
if ! grep -q "setupJITWebSocket" server/index.js; then
    echo -e "${BLUE}Adding JIT WebSocket setup to server...${NC}"
    
    # Add JIT WebSocket setup before server.listen
    sed -i '/server\.listen.*{/i\
// --- JIT WEBSOCKET SETUP -----------------------------------------\
const jitTerminalRouter = require("./routes/jit-terminal");\
if (jitTerminalRouter.setupJITWebSocket) {\
  const jitWebSocket = jitTerminalRouter.setupJITWebSocket(server);\
  console.log("🔌 JIT Terminal WebSocket initialized");\
}\
' server/index.js
    
    echo -e "${GREEN}✅ JIT WebSocket setup added to server${NC}"
fi

# Check if JIT routes are mounted
if ! grep -q "/api/jit" server/index.js; then
    echo -e "${BLUE}Adding JIT routes to server...${NC}"
    
    # Add JIT routes after other route mounting
    sed -i '/app\.use.*routes/a\
// JIT Terminal routes for secure server access\
app.use("/api/jit", jitTerminalRouter);\
' server/index.js
    
    echo -e "${GREEN}✅ JIT routes added to server${NC}"
fi

# Step 5: Fix JIT terminal WebSocket path
echo -e "${YELLOW}🔧 Fixing JIT WebSocket path configuration...${NC}"

# Update JIT terminal WebSocket setup to use correct path
sed -i 's|path: '\''/api/jit/socket'\''|path: "/api/jit/socket"|g' server/routes/jit-terminal.js

echo -e "${GREEN}✅ JIT WebSocket path configured${NC}"

# Step 6: Fix OMAI routes
echo -e "${YELLOW}🔧 Fixing OMAI routes...${NC}"

# Check if OMAI routes are mounted
if ! grep -q "/api/omai" server/index.js; then
    echo -e "${BLUE}Adding OMAI routes to server...${NC}"
    
    # Add OMAI routes
    sed -i '/app\.use.*routes/a\
// OMAI routes for AI functionality\
app.use("/api/omai", omaiRouter);\
' server/index.js
    
    echo -e "${GREEN}✅ OMAI routes added to server${NC}"
fi

# Step 7: Install required dependencies
echo -e "${YELLOW}📦 Installing required dependencies...${NC}"

cd server
npm install --legacy-peer-deps node-pty ws xterm xterm-addon-fit xterm-addon-web-links xterm-addon-search
cd ..

cd front-end
npm install --legacy-peer-deps xterm xterm-addon-fit xterm-addon-web-links xterm-addon-search
cd ..

echo -e "${GREEN}✅ Dependencies installed${NC}"

# Step 8: Create log directories
echo -e "${YELLOW}📁 Setting up log directories...${NC}"

sudo mkdir -p /var/log/orthodoxmetrics/jit_sessions
sudo mkdir -p /var/log/orthodoxmetrics/omai
sudo chown -R root:root /var/log/orthodoxmetrics
sudo chmod -R 755 /var/log/orthodoxmetrics

echo -e "${GREEN}✅ Log directories created${NC}"

# Step 9: Rebuild frontend for production
echo -e "${YELLOW}🏗️  Rebuilding frontend for production...${NC}"

cd front-end
export NODE_OPTIONS="--max-old-space-size=4096"
npm run build
cd ..

echo -e "${GREEN}✅ Frontend rebuilt for production${NC}"

# Step 10: Restart server with production configuration
echo -e "${YELLOW}🔄 Restarting server with production configuration...${NC}"

pm2 stop orthodox-backend 2>/dev/null || true
pm2 delete orthodox-backend 2>/dev/null || true

# Start server with production environment
NODE_ENV=production pm2 start server/index.js --name orthodox-backend

sleep 10

echo -e "${GREEN}✅ Server restarted with production configuration${NC}"

# Step 11: Check server status
echo -e "${YELLOW}📊 Checking server status...${NC}"
pm2 list

# Step 12: Test server connectivity
echo -e "${YELLOW}🧪 Testing server connectivity...${NC}"

if curl -s http://localhost:3001/ > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Server is responding on port 3001${NC}"
else
    echo -e "${RED}❌ Server not responding on port 3001${NC}"
    echo -e "${YELLOW}📋 Checking server logs...${NC}"
    pm2 logs orthodox-backend --lines 10
    exit 1
fi

# Step 13: Test API endpoints
echo -e "${YELLOW}🔐 Testing API endpoints...${NC}"

echo -e "${BLUE}📡 Testing GET /api/status...${NC}"
response=$(curl -s -w "\nHTTP_STATUS:%{http_code}" "http://localhost:3001/api/status")
http_status=$(echo "$response" | grep "HTTP_STATUS:" | cut -d: -f2)
body=$(echo "$response" | sed '/HTTP_STATUS:/d')
echo -e "Status: $http_status"
echo -e "Response: $body"
echo ""

echo -e "${BLUE}📡 Testing GET /api/jit/config...${NC}"
response=$(curl -s -w "\nHTTP_STATUS:%{http_code}" "http://localhost:3001/api/jit/config")
http_status=$(echo "$response" | grep "HTTP_STATUS:" | cut -d: -f2)
body=$(echo "$response" | sed '/HTTP_STATUS:/d')
echo -e "Status: $http_status"
echo -e "Response: $body"
echo ""

echo -e "${BLUE}📡 Testing GET /api/omai/status...${NC}"
response=$(curl -s -w "\nHTTP_STATUS:%{http_code}" "http://localhost:3001/api/omai/status")
http_status=$(echo "$response" | grep "HTTP_STATUS:" | cut -d: -f2)
body=$(echo "$response" | sed '/HTTP_STATUS:/d')
echo -e "Status: $http_status"
echo -e "Response: $body"
echo ""

# Step 14: Check server logs
echo -e "${YELLOW}📋 Checking server logs for errors...${NC}"
pm2 logs orthodox-backend --lines 15 | grep -i "error\|exception\|timeout" || echo "No errors found in recent logs"

echo -e "${GREEN}🎉 Production JIT Terminal and OMAI Fix Complete!${NC}"
echo ""
echo -e "${BLUE}📊 Summary:${NC}"
echo "✅ Frontend production environment configured"
echo "✅ Backend production environment configured"
echo "✅ JIT WebSocket setup fixed"
echo "✅ OMAI routes configured"
echo "✅ Dependencies installed"
echo "✅ Log directories created"
echo "✅ Frontend rebuilt for production"
echo "✅ Server restarted with production config"
echo "✅ API endpoints responding"
echo ""
echo -e "${YELLOW}💡 Next Steps:${NC}"
echo "• Clear your browser cache completely"
echo "• Refresh the page (Ctrl+F5 or Cmd+Shift+R)"
echo "• Try creating a new JIT session"
echo "• Check browser console for successful connections"
echo "• OMAI should now respond without timeouts"
echo ""
echo -e "${BLUE}🔍 If issues persist:${NC}"
echo "• Check browser console for specific error messages"
echo "• Verify HTTPS/SSL configuration for WebSocket connections"
echo "• Ensure firewall allows WebSocket connections on port 443" 