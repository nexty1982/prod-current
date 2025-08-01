#!/bin/bash

# Restart Backend with OMAI Stubs Script
# Restarts the backend server with the new JavaScript stub modules

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

PROJECT_ROOT="/var/www/orthodox-church-mgmt/orthodoxmetrics/prod"

echo -e "${BLUE}🚀 Restarting Backend with OMAI Stubs...${NC}"

# Navigate to project directory
cd "$PROJECT_ROOT"

# Stop the backend server
echo -e "${YELLOW}🛑 Stopping orthodox-backend...${NC}"
pm2 stop orthodox-backend 2>/dev/null || true
pm2 delete orthodox-backend 2>/dev/null || true

# Wait a moment
sleep 2

# Start the backend server
echo -e "${YELLOW}🚀 Starting orthodox-backend...${NC}"
pm2 start server/index.js --name orthodox-backend --cwd "$PROJECT_ROOT"

# Wait for server to start
sleep 5

# Check if server started successfully
if pm2 list | grep -q "orthodox-backend.*online"; then
    echo -e "${GREEN}✅ Orthodox backend server started successfully${NC}"
else
    echo -e "${RED}❌ Failed to start orthodox backend server${NC}"
    echo -e "${YELLOW}📋 Checking PM2 logs...${NC}"
    pm2 logs orthodox-backend --lines 10
    exit 1
fi

# Test the server endpoints
echo -e "${YELLOW}🧪 Testing server endpoints...${NC}"
sleep 3

# Test basic health endpoint
if curl -s http://localhost:3001/api/status > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Backend server is responding on port 3001${NC}"
else
    echo -e "${YELLOW}⚠️  Backend server not responding on port 3001 (may still be starting)${NC}"
fi

# Test OMAI endpoints
if curl -s http://localhost:3001/api/omai/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ OMAI endpoints are responding${NC}"
    
    # Test OMAI health response
    echo -e "${YELLOW}📋 Testing OMAI health response:${NC}"
    curl -s http://localhost:3001/api/omai/health | head -20
else
    echo -e "${YELLOW}⚠️  OMAI endpoints not responding${NC}"
fi

# Show final status
echo -e "${BLUE}📊 Final PM2 Status:${NC}"
pm2 list

echo -e "${GREEN}🎉 Backend restarted with OMAI stubs!${NC}"
echo -e "${BLUE}📖 Useful commands:${NC}"
echo "  - View logs: pm2 logs orthodox-backend"
echo "  - Restart: pm2 restart orthodox-backend"
echo "  - Status: pm2 list"
echo "  - Test OMAI: curl http://localhost:3001/api/omai/health"

# Save PM2 configuration
pm2 save

echo -e "${GREEN}✅ PM2 configuration saved${NC}" 