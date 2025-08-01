#!/bin/bash

# OMAI Debug Test Script
# Tests basic backend and identifies OMAI route issues

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔍 OMAI Debug Test${NC}"
echo -e "${BLUE}==================${NC}"
echo -e "${CYAN}Timestamp: $(date)${NC}\n"

# Test 1: Basic backend health
echo -e "${YELLOW}🌐 Testing Basic Backend Health${NC}"
echo -e "${YELLOW}===============================${NC}"

echo -n "Main backend port 3001: "
if curl -f -s --max-time 3 "http://localhost:3001" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Responding${NC}"
elif curl -f -s --max-time 3 "http://localhost:3001/api" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ API responding${NC}"
else
    echo -e "${RED}❌ Not responding${NC}"
    echo -e "${YELLOW}Checking if server is actually listening on port 3001...${NC}"
    netstat -tlnp 2>/dev/null | grep ":3001 " || echo -e "${RED}❌ Nothing listening on port 3001${NC}"
fi

# Test 2: Check specific backend endpoints
echo -e "\n${YELLOW}🔍 Testing Known Backend Endpoints${NC}"
echo -e "${YELLOW}==================================${NC}"

# Test a simple endpoint that should work
echo -n "Basic API test: "
if curl -f -s --max-time 3 "http://localhost:3001/api/health" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ /api/health responding${NC}"
elif curl -f -s --max-time 3 "http://localhost:3001/api" > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  /api responding but not /api/health${NC}"
else
    echo -e "${RED}❌ No API endpoints responding${NC}"
fi

# Test 3: Check OMAI route registration
echo -e "\n${YELLOW}🤖 OMAI Route Registration Test${NC}"
echo -e "${YELLOW}===============================${NC}"

# Test if OMAI routes are even registered
echo -n "OMAI route registration: "
if curl -f -s --max-time 3 "http://localhost:3001/api/omai" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ /api/omai route registered${NC}"
else
    echo -e "${RED}❌ /api/omai route not found${NC}"
    echo -e "${YELLOW}This indicates the OMAI routes are not being registered${NC}"
fi

# Test each OMAI endpoint individually
OMAI_ENDPOINTS=("health" "stats" "status")

for endpoint in "${OMAI_ENDPOINTS[@]}"; do
    echo -n "  /api/omai/$endpoint: "
    if curl -f -s --max-time 3 "http://localhost:3001/api/omai/$endpoint" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Responding${NC}"
    else
        echo -e "${RED}❌ Not responding${NC}"
    fi
done

# Test 4: Check recent backend logs for errors
echo -e "\n${YELLOW}📋 Backend Error Analysis${NC}"
echo -e "${YELLOW}========================${NC}"

echo -e "${CYAN}Recent backend logs (last 10 lines):${NC}"
if pm2 logs orthodox-backend --lines 10 --nostream 2>/dev/null; then
    echo -e "${GREEN}✅ Logs retrieved${NC}"
else
    echo -e "${RED}❌ Could not retrieve logs${NC}"
fi

echo ""

# Test 5: Check OMAI file structure
echo -e "${YELLOW}📁 OMAI File Structure Check${NC}"
echo -e "${YELLOW}===========================${NC}"

PROJECT_ROOT="/var/www/orthodox-church-mgmt/orthodoxmetrics/prod"

echo -n "OMAI routes file: "
if [ -f "$PROJECT_ROOT/server/routes/omai.js" ]; then
    echo -e "${GREEN}✅ Exists${NC}"
else
    echo -e "${RED}❌ Missing${NC}"
fi

echo -n "OMAI service file: "
if [ -f "$PROJECT_ROOT/services/om-ai/index.js" ]; then
    echo -e "${GREEN}✅ Exists${NC}"
else
    echo -e "${RED}❌ Missing${NC}"
fi

echo -n "OMAI orchestrator file: "
if [ -f "$PROJECT_ROOT/services/om-ai/orchestrator.js" ]; then
    echo -e "${GREEN}✅ Exists${NC}"
else
    echo -e "${RED}❌ Missing${NC}"
fi

# Test 6: Check for import errors
echo -e "\n${YELLOW}🔍 Import Error Detection${NC}"
echo -e "${YELLOW}=========================${NC}"

echo -e "${CYAN}Testing OMAI service import:${NC}"
cd "$PROJECT_ROOT"
if node -e "try { require('./services/om-ai'); console.log('✅ OMAI service imports successfully'); } catch(e) { console.log('❌ Import error:', e.message); process.exit(1); }" 2>/dev/null; then
    echo -e "${GREEN}✅ OMAI service imports work${NC}"
else
    echo -e "${RED}❌ OMAI service has import errors${NC}"
fi

echo -e "${CYAN}Testing OMAI orchestrator import:${NC}"
if node -e "try { require('./services/om-ai/orchestrator'); console.log('✅ OMAI orchestrator imports successfully'); } catch(e) { console.log('❌ Import error:', e.message); process.exit(1); }" 2>/dev/null; then
    echo -e "${GREEN}✅ OMAI orchestrator imports work${NC}"
else
    echo -e "${RED}❌ OMAI orchestrator has import errors${NC}"
fi

# Test 7: Manual OMAI function test
echo -e "\n${YELLOW}🧪 Manual OMAI Function Test${NC}"
echo -e "${YELLOW}============================${NC}"

echo -e "${CYAN}Testing OMAI functions directly:${NC}"
if node -e "
const omai = require('./services/om-ai');
console.log('Available functions:', Object.keys(omai));
omai.getOMAIHealth().then(result => console.log('Health test result:', result.status)).catch(e => console.log('Error:', e.message));
" 2>/dev/null; then
    echo -e "${GREEN}✅ OMAI functions work directly${NC}"
else
    echo -e "${RED}❌ OMAI functions have errors${NC}"
fi

# Summary and recommendations
echo -e "\n${BLUE}📋 Diagnostic Summary${NC}"
echo -e "${BLUE}=====================${NC}"

echo -e "\n${CYAN}Next Steps Based on Results:${NC}"
echo -e "1. If basic backend isn't responding: Check server startup errors"
echo -e "2. If OMAI routes not registered: Check server/index.js OMAI route mounting"
echo -e "3. If import errors found: Fix the specific import issues"
echo -e "4. If functions work directly: Issue is in route registration or middleware"

echo -e "\n${CYAN}Quick Fixes to Try:${NC}"
echo -e "• Check server/index.js for: app.use('/api/omai', omaiRouter);"
echo -e "• Verify no syntax errors in OMAI files"
echo -e "• Check if all required modules are installed"

echo -e "\n${GREEN}🎉 Debug test completed!${NC}" 