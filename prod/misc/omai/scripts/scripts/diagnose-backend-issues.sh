#!/bin/bash

# Backend Server Diagnostic Script
# Identifies and helps fix backend server issues

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

echo -e "${BLUE}🔍 Orthodox Metrics Backend Diagnostic${NC}"
echo "=========================================="
echo ""

# 1. Check PM2 installation
echo -e "${YELLOW}1. Checking PM2 installation...${NC}"
if command -v pm2 &> /dev/null; then
    echo -e "${GREEN}✅ PM2 is installed${NC}"
    pm2 --version
else
    echo -e "${RED}❌ PM2 is not installed${NC}"
    echo "   Install with: npm install -g pm2"
    exit 1
fi
echo ""

# 2. Check PM2 processes
echo -e "${YELLOW}2. Checking PM2 processes...${NC}"
pm2 list
echo ""

# 3. Check if orthodox-backend is running
echo -e "${YELLOW}3. Checking orthodox-backend status...${NC}"
if pm2 list | grep -q "orthodox-backend"; then
    if pm2 list | grep -q "orthodox-backend.*online"; then
        echo -e "${GREEN}✅ orthodox-backend is running${NC}"
    else
        echo -e "${RED}❌ orthodox-backend is not running properly${NC}"
        echo -e "${YELLOW}📋 Recent logs:${NC}"
        pm2 logs orthodox-backend --lines 10
    fi
else
    echo -e "${RED}❌ orthodox-backend process not found${NC}"
fi
echo ""

# 4. Check port availability
echo -e "${YELLOW}4. Checking port $BACKEND_PORT...${NC}"
if netstat -tuln | grep -q ":$BACKEND_PORT "; then
    echo -e "${GREEN}✅ Port $BACKEND_PORT is in use${NC}"
    netstat -tuln | grep ":$BACKEND_PORT "
else
    echo -e "${RED}❌ Port $BACKEND_PORT is not in use${NC}"
fi
echo ""

# 5. Check server files
echo -e "${YELLOW}5. Checking server files...${NC}"
if [ -d "$PROJECT_ROOT/server" ]; then
    echo -e "${GREEN}✅ Server directory exists${NC}"
    
    if [ -f "$PROJECT_ROOT/server/index.js" ]; then
        echo -e "${GREEN}✅ Main server file exists${NC}"
    else
        echo -e "${RED}❌ Main server file missing${NC}"
        echo -e "${YELLOW}🔍 Available server files:${NC}"
        find "$PROJECT_ROOT/server" -name "*.js" | head -10
    fi
else
    echo -e "${RED}❌ Server directory not found${NC}"
fi
echo ""

# 6. Check Node.js installation
echo -e "${YELLOW}6. Checking Node.js installation...${NC}"
if command -v node &> /dev/null; then
    echo -e "${GREEN}✅ Node.js is installed${NC}"
    node --version
else
    echo -e "${RED}❌ Node.js is not installed${NC}"
fi
echo ""

# 7. Check npm installation
echo -e "${YELLOW}7. Checking npm installation...${NC}"
if command -v npm &> /dev/null; then
    echo -e "${GREEN}✅ npm is installed${NC}"
    npm --version
else
    echo -e "${RED}❌ npm is not installed${NC}"
fi
echo ""

# 8. Check package.json and dependencies
echo -e "${YELLOW}8. Checking project dependencies...${NC}"
if [ -f "$PROJECT_ROOT/package.json" ]; then
    echo -e "${GREEN}✅ package.json exists${NC}"
    
    if [ -d "$PROJECT_ROOT/node_modules" ]; then
        echo -e "${GREEN}✅ node_modules exists${NC}"
    else
        echo -e "${RED}❌ node_modules missing - run: npm install${NC}"
    fi
else
    echo -e "${RED}❌ package.json not found${NC}"
fi
echo ""

# 9. Test server connectivity
echo -e "${YELLOW}9. Testing server connectivity...${NC}"
if curl -s http://localhost:$BACKEND_PORT/api/status > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Backend server is responding${NC}"
else
    echo -e "${RED}❌ Backend server is not responding${NC}"
    echo "   URL: http://localhost:$BACKEND_PORT/api/status"
fi
echo ""

# 10. Check for common issues
echo -e "${YELLOW}10. Checking for common issues...${NC}"

# Check if there are any error logs
if [ -f "$PROJECT_ROOT/logs/error.log" ]; then
    echo -e "${YELLOW}📋 Recent error logs:${NC}"
    tail -5 "$PROJECT_ROOT/logs/error.log" 2>/dev/null || echo "   No recent errors"
fi

# Check disk space
echo -e "${YELLOW}📊 Disk space:${NC}"
df -h "$PROJECT_ROOT" | tail -1

# Check memory usage
echo -e "${YELLOW}📊 Memory usage:${NC}"
free -h | grep -E "Mem|Swap"

echo ""

# 11. Provide solutions
echo -e "${BLUE}🔧 Recommended Solutions:${NC}"
echo ""

if ! pm2 list | grep -q "orthodox-backend.*online"; then
    echo -e "${YELLOW}1. Start the backend server:${NC}"
    echo "   ./scripts/restart-backend-server.sh"
    echo ""
fi

if [ ! -d "$PROJECT_ROOT/node_modules" ]; then
    echo -e "${YELLOW}2. Install dependencies:${NC}"
    echo "   cd $PROJECT_ROOT"
    echo "   npm install"
    echo ""
fi

if ! curl -s http://localhost:$BACKEND_PORT/api/status > /dev/null 2>&1; then
    echo -e "${YELLOW}3. Check server logs:${NC}"
    echo "   pm2 logs orthodox-backend"
    echo ""
fi

echo -e "${YELLOW}4. Manual restart commands:${NC}"
echo "   pm2 stop orthodox-backend"
echo "   pm2 delete orthodox-backend"
echo "   pm2 start server/index.js --name orthodox-backend --cwd $PROJECT_ROOT"
echo ""

echo -e "${GREEN}🎯 Diagnostic complete!${NC}" 