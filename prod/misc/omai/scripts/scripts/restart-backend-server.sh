#!/bin/bash

# Backend Server Restart Script
# Restarts the main Orthodox Metrics backend server

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ROOT="/var/www/orthodox-church-mgmt/orthodoxmetrics/prod"
BACKEND_PORT=3001

echo -e "${BLUE}🔄 Restarting Orthodox Metrics Backend Server...${NC}"

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo -e "${RED}❌ PM2 is not installed. Please install PM2 first:${NC}"
    echo "npm install -g pm2"
    exit 1
fi

# Check current PM2 status
echo -e "${YELLOW}📊 Current PM2 Status:${NC}"
pm2 list

# Stop the main backend server if running
echo -e "${YELLOW}🛑 Stopping orthodox-backend...${NC}"
pm2 stop orthodox-backend 2>/dev/null || true
pm2 delete orthodox-backend 2>/dev/null || true

# Navigate to project directory
cd "$PROJECT_ROOT"

# Check if server directory exists
if [ ! -d "server" ]; then
    echo -e "${RED}❌ Server directory not found at $PROJECT_ROOT/server${NC}"
    exit 1
fi

# Check if main server file exists
if [ ! -f "server/index.js" ]; then
    echo -e "${RED}❌ Main server file not found at server/index.js${NC}"
    echo -e "${YELLOW}🔍 Looking for server files...${NC}"
    find server -name "*.js" | head -10
    exit 1
fi

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
    pm2 logs orthodox-backend --lines 20
    exit 1
fi

# Test the server endpoints
echo -e "${YELLOW}🧪 Testing server endpoints...${NC}"
sleep 3

# Test basic health endpoint
if curl -s http://localhost:$BACKEND_PORT/api/status > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Backend server is responding on port $BACKEND_PORT${NC}"
else
    echo -e "${YELLOW}⚠️  Backend server not responding on port $BACKEND_PORT (may still be starting)${NC}"
fi

# Test OMAI endpoints
if curl -s http://localhost:$BACKEND_PORT/api/omai/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ OMAI endpoints are responding${NC}"
else
    echo -e "${YELLOW}⚠️  OMAI endpoints not responding${NC}"
fi

# Show final status
echo -e "${BLUE}📊 Final PM2 Status:${NC}"
pm2 list

echo -e "${GREEN}🎉 Backend server restart completed!${NC}"
echo -e "${BLUE}📖 Useful commands:${NC}"
echo "  - View logs: pm2 logs orthodox-backend"
echo "  - Restart: pm2 restart orthodox-backend"
echo "  - Stop: pm2 stop orthodox-backend"
echo "  - Status: pm2 list"

# Save PM2 configuration
pm2 save

echo -e "${GREEN}✅ PM2 configuration saved${NC}" 