#!/bin/bash
# Verify Centralized Config is Loaded
# Checks if the backend successfully loaded the centralized configuration

set -euo pipefail

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  Verifying Centralized Config Loading${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo

# Check 1: Verify compiled files exist
echo -e "${YELLOW}1/4 Checking compiled config files...${NC}"
if [ -f "server/dist/config/index.js" ]; then
  echo -e "${GREEN}✓ dist/config/index.js exists${NC}"
else
  echo -e "${RED}✗ dist/config/index.js NOT FOUND${NC}"
  exit 1
fi

if [ -f "server/dist/config/schema.js" ]; then
  echo -e "${GREEN}✓ dist/config/schema.js exists${NC}"
else
  echo -e "${RED}✗ dist/config/schema.js NOT FOUND${NC}"
  exit 1
fi

if [ -f "server/dist/config/redact.js" ]; then
  echo -e "${GREEN}✓ dist/config/redact.js exists${NC}"
else
  echo -e "${RED}✗ dist/config/redact.js NOT FOUND${NC}"
  exit 1
fi
echo

# Check 2: Check PM2 status
echo -e "${YELLOW}2/4 Checking PM2 service status...${NC}"
if pm2 status | grep -q "orthodox-backend.*online"; then
  echo -e "${GREEN}✓ Backend service is running${NC}"
else
  echo -e "${RED}✗ Backend service is NOT running${NC}"
  exit 1
fi
echo

# Check 3: Check recent logs for config message
echo -e "${YELLOW}3/4 Checking logs for config loading message...${NC}"
if pm2 logs orthodox-backend --lines 200 --nostream | grep -q "Loaded server configuration"; then
  echo -e "${GREEN}✓ Found 'Loaded server configuration' in logs${NC}"
  echo
  echo -e "${BLUE}Recent config log:${NC}"
  pm2 logs orthodox-backend --lines 200 --nostream | grep -A 5 "Loaded server configuration" | tail -10
else
  echo -e "${YELLOW}⚠ 'Loaded server configuration' not found in recent logs${NC}"
  echo -e "${YELLOW}  This might indicate config is not loading from centralized module${NC}"
  echo
  echo -e "${BLUE}Recent startup logs:${NC}"
  pm2 logs orthodox-backend --lines 50 --nostream | tail -20
fi
echo

# Check 4: Test health endpoint
echo -e "${YELLOW}4/4 Testing /api/system/health endpoint...${NC}"
HEALTH_RESPONSE=$(curl -s http://127.0.0.1:3001/api/system/health 2>/dev/null || echo "FAILED")

if [ "$HEALTH_RESPONSE" != "FAILED" ]; then
  # Check if response has enhanced fields
  if echo "$HEALTH_RESPONSE" | grep -q '"uptime"' && \
     echo "$HEALTH_RESPONSE" | grep -q '"memory"'; then
    echo -e "${GREEN}✓ Health endpoint has enhanced fields (uptime, memory)${NC}"
  else
    echo -e "${YELLOW}⚠ Health endpoint missing enhanced fields${NC}"
    echo -e "${YELLOW}  This might indicate old code is still running${NC}"
  fi
  
  echo
  echo -e "${BLUE}Health response:${NC}"
  echo "$HEALTH_RESPONSE" | jq '.' 2>/dev/null || echo "$HEALTH_RESPONSE"
else
  echo -e "${RED}✗ Failed to reach health endpoint${NC}"
fi
echo

echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  Verification Complete${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo

# Summary
echo "Summary:"
echo "--------"
if pm2 logs orthodox-backend --lines 200 --nostream | grep -q "Loaded server configuration"; then
  echo -e "${GREEN}✓ Centralized config is loading${NC}"
else
  echo -e "${YELLOW}⚠ Centralized config may not be loading${NC}"
  echo "  Run: pm2 restart orthodox-backend"
  echo "  Then check: pm2 logs orthodox-backend"
fi
echo
