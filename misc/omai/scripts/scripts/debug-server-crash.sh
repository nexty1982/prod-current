#!/bin/bash

# Debug Server Crash
# This script helps identify what's causing the server to crash

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

PROJECT_ROOT="/var/www/orthodox-church-mgmt/orthodoxmetrics/prod"

echo -e "${BLUE}🔍 Debugging Server Crash${NC}"
echo -e "${BLUE}========================${NC}"

# Navigate to project directory
cd "$PROJECT_ROOT"

echo -e "${YELLOW}📁 Current directory: $(pwd)${NC}"

# Step 1: Check if server is running
echo -e "${YELLOW}📊 Checking PM2 status...${NC}"
pm2 list

# Step 2: Get detailed error logs
echo -e "${YELLOW}📋 Getting detailed error logs...${NC}"
echo -e "${BLUE}=== Last 20 lines of error log ===${NC}"
pm2 logs orthodox-backend --err --lines 20

echo -e "${BLUE}=== Last 20 lines of output log ===${NC}"
pm2 logs orthodox-backend --out --lines 20

# Step 3: Try to start server manually to see immediate errors
echo -e "${YELLOW}🧪 Testing server startup manually...${NC}"
echo -e "${BLUE}=== Manual server test ===${NC}"
timeout 10s node server/index.js 2>&1 || echo "Server startup test completed"

# Step 4: Check for syntax errors in key files
echo -e "${YELLOW}🔍 Checking syntax of key files...${NC}"

echo -e "${BLUE}Checking server/index.js...${NC}"
if node -c server/index.js 2>/dev/null; then
    echo -e "${GREEN}✅ server/index.js syntax OK${NC}"
else
    echo -e "${RED}❌ server/index.js has syntax errors${NC}"
    node -c server/index.js
fi

echo -e "${BLUE}Checking server/routes/jit-terminal.js...${NC}"
if node -c server/routes/jit-terminal.js 2>/dev/null; then
    echo -e "${GREEN}✅ server/routes/jit-terminal.js syntax OK${NC}"
else
    echo -e "${RED}❌ server/routes/jit-terminal.js has syntax errors${NC}"
    node -c server/routes/jit-terminal.js
fi

echo -e "${BLUE}Checking server/services/jitSessionManager.js...${NC}"
if node -c server/services/jitSessionManager.js 2>/dev/null; then
    echo -e "${GREEN}✅ server/services/jitSessionManager.js syntax OK${NC}"
else
    echo -e "${RED}❌ server/services/jitSessionManager.js has syntax errors${NC}"
    node -c server/services/jitSessionManager.js
fi

# Step 5: Check for missing dependencies
echo -e "${YELLOW}🔍 Checking for missing dependencies...${NC}"
if [ -f "server/package.json" ]; then
    echo -e "${BLUE}Checking server dependencies...${NC}"
    cd server && npm list --depth=0 2>&1 | grep -E "(missing|UNMET)" || echo "No missing dependencies found"
    cd ..
else
    echo -e "${BLUE}Checking root dependencies...${NC}"
    npm list --depth=0 2>&1 | grep -E "(missing|UNMET)" || echo "No missing dependencies found"
fi

# Step 6: Check if required files exist
echo -e "${YELLOW}🔍 Checking if required files exist...${NC}"
required_files=(
    "server/index.js"
    "server/routes/jit-terminal.js"
    "server/services/jitSessionManager.js"
    "server/middleware/auth.js"
    "server/config/session.js"
    "server/config/db.js"
)

for file in "${required_files[@]}"; do
    if [ -f "$file" ]; then
        echo -e "${GREEN}✅ $file exists${NC}"
    else
        echo -e "${RED}❌ $file missing${NC}"
    fi
done

# Step 7: Check for any recent changes that might cause issues
echo -e "${YELLOW}🔍 Checking for potential issues...${NC}"

# Check if there are any circular dependencies
echo -e "${BLUE}Checking for circular dependencies in JIT files...${NC}"
if grep -r "require.*jit" server/routes/jit-terminal.js 2>/dev/null; then
    echo -e "${RED}⚠️  Potential circular dependency detected${NC}"
else
    echo -e "${GREEN}✅ No obvious circular dependencies${NC}"
fi

# Check if setupJITWebSocket is properly exported
echo -e "${BLUE}Checking JIT WebSocket export...${NC}"
if grep -q "module.exports.setupJITWebSocket" server/routes/jit-terminal.js; then
    echo -e "${GREEN}✅ setupJITWebSocket is properly exported${NC}"
else
    echo -e "${RED}❌ setupJITWebSocket export missing${NC}"
fi

echo -e "${GREEN}🎉 Debug complete! Check the output above for issues.${NC}" 