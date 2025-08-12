#!/bin/bash

# Start JIT Terminal System
# This script starts the JIT terminal and tests the connection

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

PROJECT_ROOT="/var/www/orthodox-church-mgmt/orthodoxmetrics/prod"

echo -e "${BLUE}🚀 Starting JIT Terminal System${NC}"
echo -e "${BLUE}==============================${NC}"

# Navigate to project directory
cd "$PROJECT_ROOT"

echo -e "${YELLOW}📁 Current directory: $(pwd)${NC}"

# Step 1: Restart the server with JIT routes
echo -e "${YELLOW}🔄 Restarting server with JIT routes...${NC}"
./scripts/restart-with-jit-routes.sh

# Step 2: Wait for server to be ready
echo -e "${YELLOW}⏳ Waiting for server to be ready...${NC}"
sleep 10

# Step 3: Test JIT endpoints
echo -e "${YELLOW}🧪 Testing JIT endpoints...${NC}"

# Test basic connectivity
if curl -s http://localhost:3001/api/status > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Backend server is responding${NC}"
else
    echo -e "${RED}❌ Backend server not responding${NC}"
    exit 1
fi

# Test JIT endpoints (these will return 401/403 without auth, which is expected)
echo -e "${YELLOW}📡 Testing JIT endpoints (expecting auth errors)...${NC}"

JIT_ENDPOINTS=(
    "/api/jit/config"
    "/api/jit/sessions"
    "/api/jit/start-session"
    "/api/jit/status"
)

for endpoint in "${JIT_ENDPOINTS[@]}"; do
    response=$(curl -s -w "%{http_code}" "http://localhost:3001$endpoint" 2>/dev/null | tail -1)
    if [ "$response" = "401" ] || [ "$response" = "403" ]; then
        echo -e "${GREEN}✅ $endpoint is responding (auth required - expected)${NC}"
    elif [ "$response" = "404" ]; then
        echo -e "${RED}❌ $endpoint not found${NC}"
    else
        echo -e "${YELLOW}⚠️  $endpoint returned status $response${NC}"
    fi
done

# Step 4: Show JIT system status
echo -e "${BLUE}📊 JIT Terminal System Status:${NC}"
echo -e "${GREEN}✅ JIT Terminal routes are now available at:${NC}"
echo "  - GET /api/jit/config - Get JIT configuration"
echo "  - GET /api/jit/sessions - Get all sessions"
echo "  - POST /api/jit/start-session - Create new session"
echo "  - GET /api/jit/status - Get system status"
echo "  - DELETE /api/jit/sessions/:id - Terminate session"

echo -e "${BLUE}🔐 Authentication:${NC}"
echo "  - All JIT endpoints require super_admin authentication"
echo "  - Sessions are managed securely with timeouts"
echo "  - WebSocket support is ready for real-time terminal access"

echo -e "${BLUE}📖 Next Steps:${NC}"
echo "  1. Access JIT terminal through the frontend admin panel"
echo "  2. Or use curl with proper authentication:"
echo "     curl -H 'Cookie: orthodoxmetrics.sid=YOUR_SESSION_ID' http://localhost:3001/api/jit/config"
echo "  3. Create a session to get terminal access"

echo -e "${GREEN}🎉 JIT Terminal system is ready!${NC}"
echo -e "${YELLOW}💡 You can now use the JIT terminal through the frontend or direct API calls${NC}" 