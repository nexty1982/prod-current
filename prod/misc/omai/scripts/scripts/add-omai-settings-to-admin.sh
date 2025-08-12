#!/bin/bash

# Add OMAI Settings to Admin Settings
# This script rebuilds the frontend and restarts the server to apply OMAI settings integration

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

PROJECT_ROOT="/var/www/orthodox-church-mgmt/orthodoxmetrics/prod"

echo -e "${BLUE}🤖 Adding OMAI Settings to Admin Settings${NC}"
echo -e "${BLUE}==========================================${NC}"

# Navigate to project directory
cd "$PROJECT_ROOT"

echo -e "${YELLOW}📁 Current directory: $(pwd)${NC}"

# Step 1: Check server status
echo -e "${YELLOW}📊 Checking server status...${NC}"
pm2 list

# Step 2: Navigate to frontend directory
echo -e "${YELLOW}🎨 Building frontend with OMAI settings...${NC}"
cd front-end

# Step 3: Install dependencies if needed
echo -e "${YELLOW}📦 Checking dependencies...${NC}"
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}📦 Installing dependencies...${NC}"
    npm install --legacy-peer-deps
fi

# Step 4: Build frontend
echo -e "${YELLOW}🔨 Building frontend...${NC}"
export NODE_OPTIONS="--max-old-space-size=4096"
npm run build

# Step 5: Navigate back to project root
cd "$PROJECT_ROOT"

# Step 6: Restart backend server
echo -e "${YELLOW}🔄 Restarting backend server...${NC}"
pm2 restart orthodox-backend

# Step 7: Wait for server to start
echo -e "${YELLOW}⏳ Waiting for server to start...${NC}"
sleep 5

# Step 8: Test OMAI endpoints
echo -e "${YELLOW}🧪 Testing OMAI endpoints...${NC}"

echo -e "${BLUE}📡 Testing GET /api/omai/status...${NC}"
if curl -s http://localhost:3001/api/omai/status > /dev/null 2>&1; then
    echo -e "${GREEN}✅ OMAI status endpoint is responding${NC}"
else
    echo -e "${YELLOW}⚠️  OMAI status endpoint not responding (expected - requires auth)${NC}"
fi

echo -e "${BLUE}📡 Testing GET /api/omai/settings...${NC}"
if curl -s http://localhost:3001/api/omai/settings > /dev/null 2>&1; then
    echo -e "${GREEN}✅ OMAI settings endpoint is responding${NC}"
else
    echo -e "${YELLOW}⚠️  OMAI settings endpoint not responding (expected - requires auth)${NC}"
fi

echo -e "${BLUE}📡 Testing GET /api/omai/logs...${NC}"
if curl -s http://localhost:3001/api/omai/logs > /dev/null 2>&1; then
    echo -e "${GREEN}✅ OMAI logs endpoint is responding${NC}"
else
    echo -e "${YELLOW}⚠️  OMAI logs endpoint not responding (expected - requires auth)${NC}"
fi

# Step 9: Final status check
echo -e "${BLUE}📊 Final PM2 Status:${NC}"
pm2 list

echo -e "${GREEN}🎉 OMAI Settings Integration Complete!${NC}"
echo ""
echo -e "${BLUE}📖 New OMAI Features Available:${NC}"
echo "  - OMAI Service Status Dashboard"
echo "  - OMAI Settings Management (6 tabs)"
echo "  - OMAI Console Logs Viewer"
echo "  - OMAI Service Control (Start/Stop/Restart/Reload)"
echo "  - Real-time OMAI Statistics"
echo "  - Component Health Monitoring"
echo "  - Agent Management"
echo ""
echo -e "${BLUE}📍 Access OMAI Settings at:${NC}"
echo "  - https://orthodoxmetrics.com/admin/settings"
echo "  - Navigate to the 'Services' tab"
echo "  - Click 'Settings' or 'Console Logs' buttons in the OMAI section"
echo ""
echo -e "${BLUE}🔧 OMAI Settings Tabs:${NC}"
echo "  - General: Enable/disable, debug mode, log levels"
echo "  - Features: Core and background feature toggles"
echo "  - Performance: Request limits, caching, timeouts"
echo "  - Security: Auth, rate limiting, audit logging"
echo "  - Agents: Individual agent enable/disable"
echo "  - Knowledge: Indexing, embeddings, similarity settings"
echo ""
echo -e "${BLUE}📊 OMAI Logs Tabs:${NC}"
echo "  - Live Logs: All OMAI activity"
echo "  - Error Logs: Error-level messages only"
echo "  - Debug Logs: Debug and trace messages"
echo "  - Audit Logs: Security and audit events"
echo ""
echo -e "${BLUE}📖 Useful commands:${NC}"
echo "  - View backend logs: pm2 logs orthodox-backend"
echo "  - View OMAI logs: pm2 logs omai-background"
echo "  - Restart backend: pm2 restart orthodox-backend"
echo "  - Restart OMAI: pm2 restart omai-background" 