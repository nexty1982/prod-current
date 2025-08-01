#!/bin/bash

# Check Server Status and Restart if Needed
# This script checks if the server is running and restarts it if needed

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

PROJECT_ROOT="/var/www/orthodox-church-mgmt/orthodoxmetrics/prod"

echo -e "${BLUE}🔍 Checking Server Status${NC}"
echo -e "${BLUE}======================${NC}"

# Navigate to project directory
cd "$PROJECT_ROOT"

echo -e "${YELLOW}📁 Current directory: $(pwd)${NC}"

# Step 1: Check PM2 status
echo -e "${YELLOW}📊 Checking PM2 status...${NC}"
pm2 list

# Step 2: Check if server is responding
echo -e "${YELLOW}🌐 Testing server connectivity...${NC}"
if curl -s --connect-timeout 5 http://localhost:3001/ > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Server is responding on port 3001${NC}"
else
    echo -e "${RED}❌ Server not responding on port 3001${NC}"
    echo -e "${YELLOW}🔄 Restarting server...${NC}"
    
    # Stop and delete existing processes
    pm2 stop orthodox-backend 2>/dev/null || true
    pm2 delete orthodox-backend 2>/dev/null || true
    
    # Start server
    pm2 start server/index.js --name orthodox-backend
    
    # Wait for server to be ready
    echo -e "${YELLOW}⏳ Waiting for server to be ready...${NC}"
    sleep 10
    
    # Test again
    if curl -s --connect-timeout 5 http://localhost:3001/ > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Server is now responding on port 3001${NC}"
    else
        echo -e "${RED}❌ Server still not responding${NC}"
        echo -e "${YELLOW}📋 Checking server logs...${NC}"
        pm2 logs orthodox-backend --lines 20
        exit 1
    fi
fi

# Step 3: Test JIT endpoints
echo -e "${YELLOW}🔐 Testing JIT endpoints...${NC}"
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

echo -e "${GREEN}🎉 Server status check complete!${NC}" 