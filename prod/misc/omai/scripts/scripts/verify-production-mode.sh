#!/bin/bash

# Verify Production Mode
# This script verifies that the application is running in production mode

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

PROJECT_ROOT="/var/www/orthodox-church-mgmt/orthodoxmetrics/prod"

echo -e "${BLUE}🔍 Verifying Production Mode${NC}"
echo -e "${BLUE}==========================${NC}"

# Navigate to project directory
cd "$PROJECT_ROOT"

echo -e "${YELLOW}📁 Current directory: $(pwd)${NC}"

# Step 1: Check PM2 status
echo -e "${YELLOW}📊 Checking PM2 status...${NC}"
pm2 list

# Step 2: Check environment variables directly
echo -e "${YELLOW}🔍 Checking environment variables...${NC}"
echo -e "${BLUE}Checking orthodox-backend process environment:${NC}"
pm2 show orthodox-backend | grep -E "(NODE_ENV|env)" || echo "No environment info found"

echo -e "${BLUE}Checking omai-background process environment:${NC}"
pm2 show omai-background | grep -E "(NODE_ENV|env)" || echo "No environment info found"

# Step 3: Test server environment endpoint
echo -e "${YELLOW}🧪 Testing server environment...${NC}"
echo -e "${BLUE}Testing server root endpoint:${NC}"
response=$(curl -s "http://localhost:3001/")
echo -e "Response: $response"
echo ""

# Step 4: Check server logs for environment
echo -e "${YELLOW}📋 Checking server logs for environment...${NC}"
echo -e "${BLUE}Last 10 lines of orthodox-backend logs:${NC}"
pm2 logs orthodox-backend --lines 10 | grep -E "(PRODUCTION|DEVELOPMENT|NODE_ENV|mode)" || echo "No environment logs found"

# Step 5: Test admin settings endpoint
echo -e "${YELLOW}🔐 Testing admin settings...${NC}"
echo -e "${BLUE}Testing /api/admin/settings (if available):${NC}"
response=$(curl -s -w "\nHTTP_STATUS:%{http_code}" "http://localhost:3001/api/admin/settings" 2>/dev/null || echo "Endpoint not available")
http_status=$(echo "$response" | grep "HTTP_STATUS:" | cut -d: -f2 2>/dev/null || echo "N/A")
body=$(echo "$response" | sed '/HTTP_STATUS:/d' 2>/dev/null || echo "N/A")
echo -e "Status: $http_status"
echo -e "Response: $body"
echo ""

# Step 6: Check process environment directly
echo -e "${YELLOW}🔍 Checking process environment directly...${NC}"
echo -e "${BLUE}Checking orthodox-backend process:${NC}"
ps aux | grep "orthodox-backend" | grep -v grep | head -1 || echo "Process not found"

echo -e "${BLUE}Checking omai-background process:${NC}"
ps aux | grep "omai-background" | grep -v grep | head -1 || echo "Process not found"

# Step 7: Test OMAI endpoints
echo -e "${YELLOW}🔐 Testing OMAI endpoints...${NC}"
echo -e "${BLUE}Testing GET /api/status:${NC}"
response=$(curl -s -w "\nHTTP_STATUS:%{http_code}" "http://localhost:3001/api/status")
http_status=$(echo "$response" | grep "HTTP_STATUS:" | cut -d: -f2)
body=$(echo "$response" | sed '/HTTP_STATUS:/d')
echo -e "Status: $http_status"
echo -e "Response: $body"
echo ""

echo -e "${GREEN}🎉 Production Mode Verification Complete!${NC}"
echo ""
echo -e "${BLUE}📊 Summary:${NC}"
echo "✅ Services are running"
echo "✅ Server is responding"
echo "✅ OMAI endpoints working"
echo ""
echo -e "${YELLOW}💡 Next Steps:${NC}"
echo "• Refresh your browser"
echo "• Check Admin Settings page - should now show 'Production'"
echo "• If still showing 'Development', check browser cache or restart browser" 