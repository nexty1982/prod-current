#!/bin/bash

# Restart Server with Fixed JIT Session Manager
# This script restarts the server with the fixed JIT session manager

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

PROJECT_ROOT="/var/www/orthodox-church-mgmt/orthodoxmetrics/prod"

echo -e "${BLUE}🔧 Restarting Server with Fixed JIT Session Manager${NC}"
echo -e "${BLUE}================================================${NC}"

# Navigate to project directory
cd "$PROJECT_ROOT"

echo -e "${YELLOW}📁 Current directory: $(pwd)${NC}"

# Step 1: Verify the JIT session manager file is fixed
echo -e "${YELLOW}🔍 Verifying JIT session manager file...${NC}"
if node -c server/services/jitSessionManager.js 2>/dev/null; then
    echo -e "${GREEN}✅ JIT session manager file syntax is valid${NC}"
else
    echo -e "${RED}❌ JIT session manager file has syntax errors${NC}"
    node -c server/services/jitSessionManager.js
    exit 1
fi

# Step 2: Stop the current server
echo -e "${YELLOW}🛑 Stopping current server...${NC}"
pm2 stop orthodox-backend 2>/dev/null || true
pm2 delete orthodox-backend 2>/dev/null || true

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

echo -e "${GREEN}🎉 Server restarted with fixed JIT session manager!${NC}"
echo -e "${BLUE}📖 What was fixed:${NC}"
echo "  • Date formatting issues resolved"
echo "  • Time remaining calculation added"
echo "  • ISO string format for all dates"
echo "  • Proper session data structure"

echo -e "${YELLOW}💡 The JIT terminal interface should now display:${NC}"
echo "  • Correct session start times"
echo "  • Proper time remaining countdown"
echo "  • Valid user information"
echo "  • Working session connection via eye icon" 