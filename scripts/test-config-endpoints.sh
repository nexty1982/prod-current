#!/bin/bash
# Test Centralized Config Endpoints
# Verifies that /api/system/health and /api/system/config work correctly

set -euo pipefail

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

BASE_URL="${1:-http://127.0.0.1:3001}"

echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  Testing Centralized Config Endpoints${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo
echo -e "Base URL: ${BLUE}${BASE_URL}${NC}"
echo

# Test 1: System Health
echo -e "${YELLOW}1/2 Testing /api/system/health...${NC}"
echo -e "${BLUE}GET ${BASE_URL}/api/system/health${NC}"
echo

HEALTH_RESPONSE=$(curl -s "${BASE_URL}/api/system/health")
echo "$HEALTH_RESPONSE" | jq '.' 2>/dev/null || echo "$HEALTH_RESPONSE"
echo

# Check if response contains required fields
if echo "$HEALTH_RESPONSE" | grep -q '"status"' && \
   echo "$HEALTH_RESPONSE" | grep -q '"uptime"' && \
   echo "$HEALTH_RESPONSE" | grep -q '"memory"'; then
  echo -e "${GREEN}✓ Health endpoint working with enhanced fields${NC}"
else
  echo -e "${RED}✗ Health endpoint missing required fields${NC}"
fi
echo

# Test 2: System Config
echo -e "${YELLOW}2/2 Testing /api/system/config...${NC}"
echo -e "${BLUE}GET ${BASE_URL}/api/system/config${NC}"
echo

CONFIG_RESPONSE=$(curl -s "${BASE_URL}/api/system/config")
echo "$CONFIG_RESPONSE" | jq '.' 2>/dev/null || echo "$CONFIG_RESPONSE"
echo

# Check response
if echo "$CONFIG_RESPONSE" | grep -q '"success".*true'; then
  echo -e "${GREEN}✓ Config endpoint accessible${NC}"
  
  # Verify secrets are redacted
  if echo "$CONFIG_RESPONSE" | grep -q '\*\*\*'; then
    echo -e "${GREEN}✓ Secrets are properly redacted${NC}"
  else
    echo -e "${YELLOW}⚠ No redacted fields found (might not have secrets set)${NC}"
  fi
  
  # Check for required config sections
  if echo "$CONFIG_RESPONSE" | grep -q '"server"' && \
     echo "$CONFIG_RESPONSE" | grep -q '"db"' && \
     echo "$CONFIG_RESPONSE" | grep -q '"session"'; then
    echo -e "${GREEN}✓ All config sections present${NC}"
  else
    echo -e "${YELLOW}⚠ Some config sections missing${NC}"
  fi
elif echo "$CONFIG_RESPONSE" | grep -q '"success".*false'; then
  echo -e "${YELLOW}✓ Config endpoint requires authentication (expected)${NC}"
  echo -e "${YELLOW}  Response: ${CONFIG_RESPONSE}${NC}"
else
  echo -e "${RED}✗ Config endpoint returned unexpected response${NC}"
fi
echo

echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  Testing Complete${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo
echo "See docs/OPERATIONS/centralized-config-status.md for more information."
echo
