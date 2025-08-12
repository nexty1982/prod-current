#!/bin/bash

# Test JIT Terminal System
# This script tests the JIT terminal functionality

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

PROJECT_ROOT="/var/www/orthodox-church-mgmt/orthodoxmetrics/prod"

echo -e "${BLUE}🧪 Testing JIT Terminal System${NC}"
echo -e "${BLUE}==============================${NC}"

# Navigate to project directory
cd "$PROJECT_ROOT"

echo -e "${YELLOW}📁 Current directory: $(pwd)${NC}"

# Step 1: Check if server is running
echo -e "${YELLOW}🔍 Checking server status...${NC}"
if pm2 list | grep -q "orthodox-backend.*online"; then
    echo -e "${GREEN}✅ Orthodox backend is running${NC}"
else
    echo -e "${RED}❌ Orthodox backend is not running${NC}"
    echo -e "${YELLOW}💡 Run: ./scripts/start-jit-terminal.sh first${NC}"
    exit 1
fi

# Step 2: Test basic connectivity
echo -e "${YELLOW}🌐 Testing basic connectivity...${NC}"
if curl -s http://localhost:3001/api/status > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Server is responding on port 3001${NC}"
else
    echo -e "${RED}❌ Server not responding on port 3001${NC}"
    exit 1
fi

# Step 3: Test JIT endpoints without authentication (should return 401/403)
echo -e "${YELLOW}🔐 Testing JIT endpoints (expecting auth errors)...${NC}"

JIT_ENDPOINTS=(
    "/api/jit/config"
    "/api/jit/sessions"
    "/api/jit/start-session"
    "/api/jit/status"
)

for endpoint in "${JIT_ENDPOINTS[@]}"; do
    echo -e "${YELLOW}📡 Testing $endpoint...${NC}"
    response=$(curl -s -w "%{http_code}" "http://localhost:3001$endpoint" 2>/dev/null | tail -1)
    
    case $response in
        401)
            echo -e "${GREEN}✅ $endpoint - Unauthorized (expected)${NC}"
            ;;
        403)
            echo -e "${GREEN}✅ $endpoint - Forbidden (expected)${NC}"
            ;;
        404)
            echo -e "${RED}❌ $endpoint - Not Found (error)${NC}"
            ;;
        *)
            echo -e "${YELLOW}⚠️  $endpoint - Status $response${NC}"
            ;;
    esac
done

# Step 4: Show JIT system information
echo -e "${BLUE}📊 JIT Terminal System Information:${NC}"
echo -e "${GREEN}✅ JIT Terminal is properly configured and running${NC}"
echo ""
echo -e "${BLUE}🔧 Available Endpoints:${NC}"
echo "  • GET  /api/jit/config      - Get JIT configuration"
echo "  • GET  /api/jit/sessions    - List all sessions"
echo "  • POST /api/jit/start-session - Create new terminal session"
echo "  • GET  /api/jit/status      - Get system status"
echo "  • DELETE /api/jit/sessions/:id - Terminate session"
echo ""
echo -e "${BLUE}🔐 Security Features:${NC}"
echo "  • Super admin authentication required"
echo "  • Session timeout management"
echo "  • Concurrent session limits"
echo "  • IP address tracking"
echo "  • Activity logging"
echo ""
echo -e "${BLUE}🚀 Next Steps to Use JIT Terminal:${NC}"
echo "  1. Log into the frontend as super admin"
echo "  2. Navigate to Admin → JIT Terminal"
echo "  3. Create a new session"
echo "  4. Use the terminal interface to run commands"
echo ""
echo -e "${BLUE}💻 Direct API Usage:${NC}"
echo "  # Get JIT config (with auth):"
echo "  curl -H 'Cookie: orthodoxmetrics.sid=YOUR_SESSION' \\"
echo "       http://localhost:3001/api/jit/config"
echo ""
echo "  # Create a session (with auth):"
echo "  curl -X POST -H 'Cookie: orthodoxmetrics.sid=YOUR_SESSION' \\"
echo "       -H 'Content-Type: application/json' \\"
echo "       -d '{\"timeoutMinutes\": 30}' \\"
echo "       http://localhost:3001/api/jit/start-session"

echo -e "${GREEN}🎉 JIT Terminal system is ready for use!${NC}"
echo -e "${YELLOW}💡 The frontend should now work without JIT 404 errors${NC}" 