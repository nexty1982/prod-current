#!/bin/bash

# OMAI Basic Functionality Test Script
# Created: 2025-07-27
# Purpose: Test basic OMAI functionality and diagnose issues

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔍 OMAI Basic Functionality Test${NC}"
echo -e "${BLUE}=================================${NC}"
echo ""

# Set project root
PROJECT_ROOT="/var/www/orthodox-church-mgmt/orthodoxmetrics/prod"
cd "$PROJECT_ROOT"

echo -e "${YELLOW}📁 Current Directory: $(pwd)${NC}"
echo ""

# Test 1: Check if Node.js is available
echo -e "${YELLOW}1. Testing Node.js availability${NC}"
echo -e "${YELLOW}===============================${NC}"
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo -e "${GREEN}✅ Node.js is available: $NODE_VERSION${NC}"
else
    echo -e "${RED}❌ Node.js is not available in PATH${NC}"
    exit 1
fi
echo ""

# Test 2: Check OMAI service structure
echo -e "${YELLOW}2. Checking OMAI Service Structure${NC}"
echo -e "${YELLOW}===================================${NC}"
if [ -f "services/om-ai/index.js" ]; then
    echo -e "${GREEN}✅ Main OMAI service found: services/om-ai/index.js${NC}"
else
    echo -e "${RED}❌ Main OMAI service not found${NC}"
fi

if [ -f "services/om-ai/orchestrator.js" ]; then
    echo -e "${GREEN}✅ OMAI orchestrator found: services/om-ai/orchestrator.js${NC}"
else
    echo -e "${RED}❌ OMAI orchestrator not found${NC}"
fi

if [ -f "services/om-ai/agentOrchestrator.js" ]; then
    echo -e "${GREEN}✅ Agent orchestrator found: services/om-ai/agentOrchestrator.js${NC}"
else
    echo -e "${RED}❌ Agent orchestrator not found${NC}"
fi

if [ -f "services/om-ai/fallbackResponder.js" ]; then
    echo -e "${GREEN}✅ Fallback responder found: services/om-ai/fallbackResponder.js${NC}"
else
    echo -e "${RED}❌ Fallback responder not found${NC}"
fi
echo ""

# Test 3: Test OMAI service import
echo -e "${YELLOW}3. Testing OMAI Service Import${NC}"
echo -e "${YELLOW}==============================${NC}"
if node -e "
try { 
    const omai = require('./services/om-ai'); 
    console.log('✅ OMAI service imports successfully');
    console.log('Available methods:', Object.keys(omai));
} catch(e) { 
    console.log('❌ Import error:', e.message); 
    process.exit(1); 
}" 2>/dev/null; then
    echo -e "${GREEN}✅ OMAI service imports work${NC}"
else
    echo -e "${RED}❌ OMAI service has import errors${NC}"
fi
echo ""

# Test 4: Test specific OMAI functions
echo -e "${YELLOW}4. Testing OMAI Functions${NC}"
echo -e "${YELLOW}=========================${NC}"
echo -e "${BLUE}Testing askOMAI function:${NC}"
if node -e "
const { askOMAI } = require('./services/om-ai');
askOMAI('test message').then(response => {
    console.log('✅ askOMAI test successful');
    console.log('Response:', response.substring(0, 100) + '...');
}).catch(e => {
    console.log('❌ askOMAI error:', e.message);
    process.exit(1);
});
" 2>/dev/null; then
    echo -e "${GREEN}✅ askOMAI function works${NC}"
else
    echo -e "${RED}❌ askOMAI function has errors${NC}"
fi
echo ""

# Test 5: Test OMAI health check
echo -e "${YELLOW}5. Testing OMAI Health Check${NC}"
echo -e "${YELLOW}============================${NC}"
if node -e "
const { getOMAIHealth } = require('./services/om-ai');
getOMAIHealth().then(health => {
    console.log('✅ Health check successful');
    console.log('Status:', health.status);
}).catch(e => {
    console.log('❌ Health check error:', e.message);
    process.exit(1);
});
" 2>/dev/null; then
    echo -e "${GREEN}✅ OMAI health check works${NC}"
else
    echo -e "${RED}❌ OMAI health check has errors${NC}"
fi
echo ""

# Test 6: Test intelligence engine components
echo -e "${YELLOW}6. Testing Intelligence Engine Components${NC}"
echo -e "${YELLOW}=========================================${NC}"
echo -e "${BLUE}Testing intent router:${NC}"
if node -e "
const { IntentRouter } = require('./services/om-ai/agentOrchestrator');
const router = new IntentRouter();
const intent = router.routePrompt('what is today\\'s date');
console.log('✅ Intent classification successful');
console.log('Intent:', intent);
" 2>/dev/null; then
    echo -e "${GREEN}✅ Intent router works${NC}"
else
    echo -e "${RED}❌ Intent router has errors${NC}"
fi

echo -e "${BLUE}Testing fallback responder:${NC}"
if node -e "
const { FallbackResponder } = require('./services/om-ai/fallbackResponder');
const responder = new FallbackResponder();
const response = responder.generateFallback('hello world');
console.log('✅ Fallback responder successful');
console.log('Response:', response.substring(0, 50) + '...');
" 2>/dev/null; then
    echo -e "${GREEN}✅ Fallback responder works${NC}"
else
    echo -e "${RED}❌ Fallback responder has errors${NC}"
fi
echo ""

# Test 7: Test API endpoints (if server is running)
echo -e "${YELLOW}7. Testing OMAI API Endpoints${NC}"
echo -e "${YELLOW}=============================${NC}"
if curl -f -s --max-time 3 "http://localhost:3000/api/omai/health" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ OMAI API health endpoint accessible${NC}"
    
    # Test intelligence endpoint
    if curl -f -s --max-time 5 -X POST -H "Content-Type: application/json" \
       -d "{\"prompt\":\"what is today's date\"}" \
       "http://localhost:3000/api/omai/ask" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ OMAI ask endpoint works${NC}"
    else
        echo -e "${YELLOW}⚠️  OMAI ask endpoint may have issues${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  OMAI API not accessible (server may not be running)${NC}"
fi
echo ""

# Summary
echo -e "${BLUE}📋 Test Summary${NC}"
echo -e "${BLUE}===============${NC}"
echo -e "${CYAN}Basic OMAI functionality test completed.${NC}"
echo -e "${CYAN}If you see mostly green checkmarks, OMAI is working correctly.${NC}"
echo -e "${CYAN}If you see red X marks, there are issues that need to be addressed.${NC}"
echo ""

echo -e "${GREEN}🎉 OMAI Basic Test Completed!${NC}" 