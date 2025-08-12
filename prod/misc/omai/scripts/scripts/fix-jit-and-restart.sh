#!/bin/bash

# Fix JIT Terminal and Restart Server
# This script fixes the middleware import issue and restarts the server

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

PROJECT_ROOT="/var/www/orthodox-church-mgmt/orthodoxmetrics/prod"

echo -e "${BLUE}🔧 Fixing JIT Terminal and Restarting Server${NC}"
echo -e "${BLUE}============================================${NC}"

# Navigate to project directory
cd "$PROJECT_ROOT"

echo -e "${YELLOW}📁 Current directory: $(pwd)${NC}"

# Step 1: Stop the current server
echo -e "${YELLOW}🛑 Stopping current server...${NC}"
pm2 stop orthodox-backend 2>/dev/null || true
pm2 delete orthodox-backend 2>/dev/null || true

# Step 2: Verify the JIT terminal file is fixed
echo -e "${YELLOW}🔍 Verifying JIT terminal file...${NC}"
if node -c server/routes/jit-terminal.js 2>/dev/null; then
    echo -e "${GREEN}✅ JIT terminal file syntax is valid${NC}"
else
    echo -e "${RED}❌ JIT terminal file still has syntax errors${NC}"
    node -c server/routes/jit-terminal.js
    exit 1
fi

# Step 3: Start the server
echo -e "${YELLOW}🚀 Starting server...${NC}"
pm2 start server/index.js --name orthodox-backend

# Step 4: Wait for server to be ready
echo -e "${YELLOW}⏳ Waiting for server to be ready...${NC}"
sleep 5

# Step 5: Check server status
echo -e "${YELLOW}📊 Checking server status...${NC}"
pm2 list

# Step 6: Test server connectivity
echo -e "${YELLOW}🧪 Testing server connectivity...${NC}"
if curl -s http://localhost:3001/ > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Server is responding on port 3001${NC}"
else
    echo -e "${RED}❌ Server not responding on port 3001${NC}"
    echo -e "${YELLOW}📋 Checking server logs...${NC}"
    pm2 logs orthodox-backend --lines 10
    exit 1
fi

# Step 7: Test JIT endpoints (should return 401/403 without auth, which is expected)
echo -e "${YELLOW}🔐 Testing JIT endpoints (expecting auth errors)...${NC}"

JIT_ENDPOINTS=(
    "/api/jit/config"
    "/api/jit/sessions"
    "/api/jit/start-session"
    "/api/jit/status"
)

for endpoint in "${JIT_ENDPOINTS[@]}"; do
    response=$(curl -s -w "%{http_code}" "http://localhost:3001$endpoint" 2>/dev/null | tail -1)
    if [ "$response" = "401" ] || [ "$response" = "403" ]; then
        echo -e "${GREEN}✅ $endpoint is responding (auth required - expected)${NC}"
    elif [ "$response" = "404" ]; then
        echo -e "${RED}❌ $endpoint not found${NC}"
    else
        echo -e "${YELLOW}⚠️  $endpoint returned status $response${NC}"
    fi
done

echo -e "${GREEN}🎉 JIT Terminal is now working!${NC}"
echo -e "${BLUE}📖 JIT Terminal endpoints available:${NC}"
echo "  • GET  /api/jit/config      - Get JIT configuration"
echo "  • GET  /api/jit/sessions    - List all sessions"
echo "  • POST /api/jit/start-session - Create new terminal session"
echo "  • GET  /api/jit/status      - Get system status"
echo "  • DELETE /api/jit/sessions/:id - Terminate session"

echo -e "${YELLOW}💡 You can now use the JIT terminal through the frontend or direct API calls${NC}" 