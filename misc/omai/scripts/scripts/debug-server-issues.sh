#!/bin/bash

# Debug Server Issues
# This script helps identify why the server is restarting and not responding

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

PROJECT_ROOT="/var/www/orthodox-church-mgmt/orthodoxmetrics/prod"

echo -e "${BLUE}🔍 Debugging Server Issues${NC}"
echo -e "${BLUE}==========================${NC}"

# Navigate to project directory
cd "$PROJECT_ROOT"

echo -e "${YELLOW}📁 Current directory: $(pwd)${NC}"

# Step 1: Check PM2 status and logs
echo -e "${YELLOW}📊 Checking PM2 status...${NC}"
pm2 list

echo -e "${YELLOW}📋 Checking backend logs...${NC}"
pm2 logs orthodox-backend --lines 20

# Step 2: Check if port 3001 is actually listening
echo -e "${YELLOW}🔌 Checking if port 3001 is listening...${NC}"
if netstat -tlnp | grep -q ":3001"; then
    echo -e "${GREEN}✅ Port 3001 is listening${NC}"
    netstat -tlnp | grep ":3001"
else
    echo -e "${RED}❌ Port 3001 is not listening${NC}"
fi

# Step 3: Check server process
echo -e "${YELLOW}🔍 Checking server process...${NC}"
if pgrep -f "node.*index.js" > /dev/null; then
    echo -e "${GREEN}✅ Node.js server process is running${NC}"
    ps aux | grep "node.*index.js" | grep -v grep
else
    echo -e "${RED}❌ Node.js server process not found${NC}"
fi

# Step 4: Test direct connection
echo -e "${YELLOW}🌐 Testing direct connection to localhost:3001...${NC}"
if curl -s --connect-timeout 5 http://localhost:3001/ > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Direct connection to localhost:3001 works${NC}"
else
    echo -e "${RED}❌ Direct connection to localhost:3001 failed${NC}"
fi

# Step 5: Check for common issues
echo -e "${YELLOW}🔧 Checking for common issues...${NC}"

# Check if required files exist
echo -e "${YELLOW}📁 Checking required files...${NC}"
required_files=(
    "server/index.js"
    "server/routes/jit-terminal.js"
    "server/services/jitSessionManager.js"
    "server/config/db.js"
    "server/config/session.js"
)

for file in "${required_files[@]}"; do
    if [ -f "$file" ]; then
        echo -e "${GREEN}✅ $file exists${NC}"
    else
        echo -e "${RED}❌ $file missing${NC}"
    fi
done

# Check for syntax errors in main files
echo -e "${YELLOW}🔍 Checking for syntax errors...${NC}"
if node -c server/index.js 2>/dev/null; then
    echo -e "${GREEN}✅ server/index.js syntax is valid${NC}"
else
    echo -e "${RED}❌ server/index.js has syntax errors${NC}"
    node -c server/index.js
fi

if node -c server/routes/jit-terminal.js 2>/dev/null; then
    echo -e "${GREEN}✅ server/routes/jit-terminal.js syntax is valid${NC}"
else
    echo -e "${RED}❌ server/routes/jit-terminal.js has syntax errors${NC}"
    node -c server/routes/jit-terminal.js
fi

# Step 6: Check environment and dependencies
echo -e "${YELLOW}📦 Checking dependencies...${NC}"
if [ -f "server/package.json" ]; then
    echo -e "${GREEN}✅ server/package.json exists${NC}"
    if [ -d "server/node_modules" ]; then
        echo -e "${GREEN}✅ node_modules exists${NC}"
    else
        echo -e "${RED}❌ node_modules missing - run npm install${NC}"
    fi
else
    echo -e "${RED}❌ server/package.json missing${NC}"
fi

# Step 7: Check environment variables
echo -e "${YELLOW}🔧 Checking environment...${NC}"
if [ -f ".env" ]; then
    echo -e "${GREEN}✅ .env file exists${NC}"
else
    echo -e "${YELLOW}⚠️  .env file not found${NC}"
fi

# Step 8: Try manual server start
echo -e "${YELLOW}🚀 Attempting manual server start for debugging...${NC}"
cd server
timeout 10s node index.js || echo -e "${RED}❌ Manual start failed or timed out${NC}"

echo -e "${BLUE}📋 Debug Summary:${NC}"
echo "1. Check the logs above for specific error messages"
echo "2. Verify all required files exist"
echo "3. Check if port 3001 is actually listening"
echo "4. Look for syntax errors in the code"
echo "5. Verify dependencies are installed"

echo -e "${YELLOW}💡 Next steps:${NC}"
echo "- If you see specific errors in the logs, fix those first"
echo "- If port 3001 isn't listening, the server isn't starting properly"
echo "- If there are syntax errors, fix them before restarting" 