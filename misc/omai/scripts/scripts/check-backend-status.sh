#!/bin/bash

# Check Backend Status and Diagnose Issues
# This script checks the current state of the backend and identifies connection problems

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

PROJECT_ROOT="/var/www/orthodox-church-mgmt/orthodoxmetrics/prod"

echo -e "${BLUE}🔍 Backend Status Check${NC}"
echo -e "${BLUE}======================${NC}"

# Navigate to project directory
cd "$PROJECT_ROOT"

echo -e "${YELLOW}📁 Current directory: $(pwd)${NC}"

# Step 1: Check PM2 processes
echo -e "${YELLOW}📊 Checking PM2 processes...${NC}"
pm2 list

# Step 2: Check if orthodox-backend is actually listening on port 3001
echo -e "${YELLOW}🔍 Checking port 3001...${NC}"
if netstat -tlnp 2>/dev/null | grep -q ":3001 "; then
    echo -e "${GREEN}✅ Port 3001 is in use${NC}"
    netstat -tlnp 2>/dev/null | grep ":3001 "
else
    echo -e "${RED}❌ Port 3001 is not in use${NC}"
fi

# Step 3: Check backend logs for errors
echo -e "${YELLOW}📋 Checking backend logs...${NC}"
echo -e "${YELLOW}Last 20 lines of orthodox-backend logs:${NC}"
pm2 logs orthodox-backend --lines 20

# Step 4: Test backend connectivity
echo -e "${YELLOW}🧪 Testing backend connectivity...${NC}"

# Test basic connectivity
if curl -s --connect-timeout 5 http://localhost:3001/api/status > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Backend is responding on /api/status${NC}"
    echo -e "${YELLOW}Response:${NC}"
    curl -s http://localhost:3001/api/status | head -3
else
    echo -e "${RED}❌ Backend is not responding on /api/status${NC}"
fi

# Test OMAI health
if curl -s --connect-timeout 5 http://localhost:3001/api/omai/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ OMAI health endpoint is responding${NC}"
    echo -e "${YELLOW}Response:${NC}"
    curl -s http://localhost:3001/api/omai/health
else
    echo -e "${RED}❌ OMAI health endpoint is not responding${NC}"
fi

# Step 5: Check JIT terminal routes
echo -e "${YELLOW}🔍 Checking JIT terminal routes...${NC}"

# Check if JIT routes exist in the codebase
if grep -r "jit" server/routes/ 2>/dev/null | head -5; then
    echo -e "${GREEN}✅ JIT routes found in codebase${NC}"
else
    echo -e "${YELLOW}⚠️  No JIT routes found in server/routes/${NC}"
fi

# Test JIT endpoints
echo -e "${YELLOW}🧪 Testing JIT endpoints...${NC}"

JIT_ENDPOINTS=(
    "/api/jit/config"
    "/api/jit/sessions"
    "/api/jit/start-session"
)

for endpoint in "${JIT_ENDPOINTS[@]}"; do
    if curl -s --connect-timeout 5 "http://localhost:3001$endpoint" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ $endpoint is responding${NC}"
    else
        echo -e "${RED}❌ $endpoint is not responding (404)${NC}"
    fi
done

# Step 6: Check server file structure
echo -e "${YELLOW}📁 Checking server file structure...${NC}"
ls -la server/routes/ | head -10

# Step 7: Check if server is actually running
echo -e "${YELLOW}🔍 Checking if Node.js process is actually running...${NC}"
if pgrep -f "node.*server/index.js" > /dev/null; then
    echo -e "${GREEN}✅ Node.js server process is running${NC}"
    pgrep -f "node.*server/index.js" | xargs ps -p
else
    echo -e "${RED}❌ Node.js server process is not running${NC}"
fi

# Step 8: Check for any error logs
echo -e "${YELLOW}📋 Checking for recent errors...${NC}"
if [ -f "logs/error.log" ]; then
    echo -e "${YELLOW}Last 10 lines of error.log:${NC}"
    tail -10 logs/error.log 2>/dev/null || echo "No error.log found"
else
    echo -e "${YELLOW}No error.log found${NC}"
fi

echo -e "${BLUE}🎯 Diagnostic complete!${NC}"
echo -e "${BLUE}📖 Next steps:${NC}"
echo "  - If backend is not responding, run: ./scripts/final-backend-fix.sh"
echo "  - If JIT routes are missing, check server/routes/jit-terminal.js"
echo "  - View detailed logs: pm2 logs orthodox-backend" 