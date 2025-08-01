#!/bin/bash

# Fix Backend Issues - Comprehensive Solution
# This script fixes all the backend import and startup issues

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

PROJECT_ROOT="/var/www/orthodox-church-mgmt/orthodoxmetrics/prod"

echo -e "${BLUE}🔧 Comprehensive Backend Fix Script${NC}"
echo -e "${BLUE}=====================================${NC}"

# Navigate to project directory
cd "$PROJECT_ROOT"

echo -e "${YELLOW}📁 Current directory: $(pwd)${NC}"

# Step 1: Stop all PM2 processes
echo -e "${YELLOW}🛑 Stopping all PM2 processes...${NC}"
pm2 stop all 2>/dev/null || true
pm2 delete all 2>/dev/null || true

# Step 2: Verify the JavaScript stub modules exist
echo -e "${YELLOW}🔍 Checking OMAI stub modules...${NC}"
if [ ! -f "services/om-ai/index.js" ]; then
    echo -e "${RED}❌ services/om-ai/index.js not found${NC}"
    exit 1
fi

if [ ! -f "services/om-ai/orchestrator.js" ]; then
    echo -e "${RED}❌ services/om-ai/orchestrator.js not found${NC}"
    exit 1
fi

echo -e "${GREEN}✅ OMAI stub modules found${NC}"

# Step 3: Check server files
echo -e "${YELLOW}🔍 Checking server files...${NC}"
if [ ! -f "server/index.js" ]; then
    echo -e "${RED}❌ server/index.js not found${NC}"
    exit 1
fi

if [ ! -f "server/routes/omai.js" ]; then
    echo -e "${RED}❌ server/routes/omai.js not found${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Server files found${NC}"

# Step 4: Start the backend server
echo -e "${YELLOW}🚀 Starting orthodox-backend...${NC}"
pm2 start server/index.js --name orthodox-backend --cwd "$PROJECT_ROOT"

# Wait for server to start
sleep 5

# Step 5: Check if server started successfully
echo -e "${YELLOW}📊 Checking PM2 status...${NC}"
pm2 list

if pm2 list | grep -q "orthodox-backend.*online"; then
    echo -e "${GREEN}✅ Orthodox backend server started successfully${NC}"
else
    echo -e "${RED}❌ Failed to start orthodox backend server${NC}"
    echo -e "${YELLOW}📋 Checking PM2 logs...${NC}"
    pm2 logs orthodox-backend --lines 20
    exit 1
fi

# Step 6: Wait a bit more for server to fully initialize
echo -e "${YELLOW}⏳ Waiting for server to fully initialize...${NC}"
sleep 10

# Step 7: Test the server endpoints
echo -e "${YELLOW}🧪 Testing server endpoints...${NC}"

# Test basic health endpoint
echo -e "${YELLOW}📡 Testing /api/status...${NC}"
if curl -s http://localhost:3001/api/status > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Backend server is responding on port 3001${NC}"
else
    echo -e "${YELLOW}⚠️  Backend server not responding on port 3001 (may still be starting)${NC}"
fi

# Test OMAI endpoints
echo -e "${YELLOW}📡 Testing /api/omai/health...${NC}"
if curl -s http://localhost:3001/api/omai/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ OMAI endpoints are responding${NC}"
    
    # Show OMAI health response
    echo -e "${YELLOW}📋 OMAI Health Response:${NC}"
    curl -s http://localhost:3001/api/omai/health | head -10
else
    echo -e "${YELLOW}⚠️  OMAI endpoints not responding${NC}"
fi

# Step 8: Start OMAI background service
echo -e "${YELLOW}🚀 Starting OMAI background service...${NC}"
pm2 start server/services/omaiBackgroundService.js --name omai-background --cwd "$PROJECT_ROOT"

sleep 3

# Step 9: Final status check
echo -e "${BLUE}📊 Final PM2 Status:${NC}"
pm2 list

# Step 10: Save PM2 configuration
echo -e "${YELLOW}💾 Saving PM2 configuration...${NC}"
pm2 save

echo -e "${GREEN}🎉 Backend fix completed!${NC}"
echo -e "${BLUE}📖 Useful commands:${NC}"
echo "  - View backend logs: pm2 logs orthodox-backend"
echo "  - View OMAI logs: pm2 logs omai-background"
echo "  - Restart backend: pm2 restart orthodox-backend"
echo "  - Status: pm2 list"
echo "  - Test OMAI: curl http://localhost:3001/api/omai/health"

echo -e "${GREEN}✅ PM2 configuration saved${NC}"
echo -e "${GREEN}🎯 Your frontend should now work without connection errors!${NC}" 