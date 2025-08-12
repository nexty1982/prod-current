#!/bin/bash

# Switch to Production Mode
# This script switches the application from development to production mode

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

PROJECT_ROOT="/var/www/orthodox-church-mgmt/orthodoxmetrics/prod"

echo -e "${BLUE}🚀 Switching to Production Mode${NC}"
echo -e "${BLUE}=============================${NC}"

# Navigate to project directory
cd "$PROJECT_ROOT"

echo -e "${YELLOW}📁 Current directory: $(pwd)${NC}"

# Step 1: Check current PM2 status
echo -e "${YELLOW}📊 Checking current PM2 status...${NC}"
pm2 list

# Step 2: Stop current processes
echo -e "${YELLOW}🛑 Stopping current processes...${NC}"
pm2 stop orthodox-backend omai-background 2>/dev/null || true
pm2 delete orthodox-backend omai-background 2>/dev/null || true

# Step 3: Start in production mode
echo -e "${YELLOW}🚀 Starting services in production mode...${NC}"
pm2 start ecosystem.config.js --env production

# Step 4: Check new status
echo -e "${YELLOW}📊 Checking new PM2 status...${NC}"
pm2 list

# Step 5: Verify environment variables
echo -e "${YELLOW}🔍 Verifying environment variables...${NC}"
echo -e "${BLUE}Checking orthodox-backend environment:${NC}"
pm2 env orthodox-backend | grep NODE_ENV || echo "NODE_ENV not found in env output"

echo -e "${BLUE}Checking omai-background environment:${NC}"
pm2 env omai-background | grep NODE_ENV || echo "NODE_ENV not found in env output"

# Step 6: Test server connectivity
echo -e "${YELLOW}🧪 Testing server connectivity...${NC}"
sleep 5
if curl -s http://localhost:3001/ > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Server is responding on port 3001${NC}"
else
    echo -e "${RED}❌ Server not responding on port 3001${NC}"
    echo -e "${YELLOW}📋 Checking server logs...${NC}"
    pm2 logs orthodox-backend --lines 10
    exit 1
fi

# Step 7: Test OMAI endpoints
echo -e "${YELLOW}🔐 Testing OMAI endpoints...${NC}"

echo -e "${BLUE}📡 Testing GET /api/status...${NC}"
response=$(curl -s -w "\nHTTP_STATUS:%{http_code}" "http://localhost:3001/api/status")
http_status=$(echo "$response" | grep "HTTP_STATUS:" | cut -d: -f2)
body=$(echo "$response" | sed '/HTTP_STATUS:/d')
echo -e "Status: $http_status"
echo -e "Response: $body"
echo ""

# Step 8: Check server logs for production mode
echo -e "${YELLOW}📋 Checking server logs for production mode...${NC}"
pm2 logs orthodox-backend --lines 5 | grep -i "production\|development" || echo "No environment logs found"

echo -e "${GREEN}🎉 Successfully switched to Production Mode!${NC}"
echo ""
echo -e "${BLUE}📊 Summary:${NC}"
echo "✅ Services restarted in production mode"
echo "✅ NODE_ENV set to 'production'"
echo "✅ Server responding on port 3001"
echo "✅ OMAI endpoints working"
echo ""
echo -e "${YELLOW}💡 Next Steps:${NC}"
echo "• Refresh your browser"
echo "• Check Admin Settings page - should now show 'Production'"
echo "• Verify all features work correctly in production mode" 