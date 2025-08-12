#!/bin/bash

# Test Parish Map API endpoint directly
echo "🔍 Testing Parish Map API Endpoint..."
echo "===================================="

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Test the addons endpoint first
echo -e "${BLUE}1. Testing GET /api/bigbook/addons endpoint...${NC}"
curl -i -X GET "http://localhost:3001/api/bigbook/addons" \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  --cookie-jar /tmp/test-cookies.txt \
  --cookie /tmp/test-cookies.txt

echo ""
echo ""

# Test if the upload endpoint exists
echo -e "${BLUE}2. Testing POST /api/bigbook/upload-parish-map endpoint (without file)...${NC}"
curl -i -X POST "http://localhost:3001/api/bigbook/upload-parish-map" \
  -H "Accept: application/json" \
  --cookie-jar /tmp/test-cookies.txt \
  --cookie /tmp/test-cookies.txt

echo ""
echo ""

# Check if bigbook routes are registered
echo -e "${BLUE}3. Testing basic bigbook route...${NC}"
curl -i -X GET "http://localhost:3001/api/bigbook/files" \
  -H "Accept: application/json" \
  --cookie-jar /tmp/test-cookies.txt \
  --cookie /tmp/test-cookies.txt

echo ""
echo ""

echo -e "${YELLOW}📋 Analysis:${NC}"
echo -e "${YELLOW}   - If you see HTML responses, the routes aren't registered properly${NC}"
echo -e "${YELLOW}   - If you see 404 errors, the specific route is missing${NC}"
echo -e "${YELLOW}   - If you see 401/403, it's an authentication issue${NC}"
echo -e "${YELLOW}   - If you see JSON responses, the API is working${NC}" 