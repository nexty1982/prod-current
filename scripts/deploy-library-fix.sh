#!/bin/bash
# Deploy OM-Library Index Format Fix
# Rebuilds backend and restarts to fix "No files in library yet" issue

set -euo pipefail

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  Deploying OM-Library Index Format Fix${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo

# Navigate to server directory
cd /var/www/orthodoxmetrics/prod/server || {
  echo -e "${RED}✗ Failed to navigate to server directory${NC}"
  exit 1
}

echo -e "${YELLOW}1/5 Building backend...${NC}"
npm run build || {
  echo -e "${RED}✗ Build failed${NC}"
  exit 1
}
echo -e "${GREEN}✓ Build successful${NC}"
echo

echo -e "${YELLOW}2/5 Verifying library route compiled...${NC}"
if [ ! -f "dist/routes/library.js" ]; then
  echo -e "${RED}✗ library.js not found in dist/routes/${NC}"
  exit 1
fi
echo -e "${GREEN}✓ library.js compiled successfully${NC}"
echo

echo -e "${YELLOW}3/5 Checking library index file...${NC}"
LIBRARY_INDEX="/var/www/orthodoxmetrics/prod/.analysis/library-index.json"
if [ ! -f "$LIBRARY_INDEX" ]; then
  echo -e "${RED}✗ Library index not found at $LIBRARY_INDEX${NC}"
  echo -e "${YELLOW}  This is expected if om-librarian hasn't run yet${NC}"
else
  # Count documents in index
  DOC_COUNT=$(grep -o '"id":' "$LIBRARY_INDEX" | wc -l)
  echo -e "${GREEN}✓ Library index found with ~$DOC_COUNT documents${NC}"
fi
echo

echo -e "${YELLOW}4/5 Restarting backend service...${NC}"
pm2 restart orthodox-backend || {
  echo -e "${RED}✗ PM2 restart failed${NC}"
  exit 1
}
echo -e "${GREEN}✓ Backend restarted${NC}"
echo

echo -e "${YELLOW}5/5 Testing library API...${NC}"
sleep 3  # Give server time to start

# Test library files endpoint
RESPONSE=$(curl -s http://127.0.0.1:3001/api/library/files 2>/dev/null || echo "FAILED")

if [ "$RESPONSE" != "FAILED" ]; then
  # Try to extract totalCount using jq (if available)
  if command -v jq &> /dev/null; then
    TOTAL_COUNT=$(echo "$RESPONSE" | jq -r '.totalCount' 2>/dev/null || echo "?")
    SUCCESS=$(echo "$RESPONSE" | jq -r '.success' 2>/dev/null || echo "false")
    
    if [ "$SUCCESS" = "true" ]; then
      echo -e "${GREEN}✓ Library API is working${NC}"
      echo -e "${BLUE}  Total files returned: $TOTAL_COUNT${NC}"
    else
      echo -e "${YELLOW}⚠ API returned success=false${NC}"
    fi
  else
    # No jq, just check if response contains "success"
    if echo "$RESPONSE" | grep -q '"success".*true'; then
      echo -e "${GREEN}✓ Library API appears to be working${NC}"
    else
      echo -e "${YELLOW}⚠ API response unclear (install jq for better diagnostics)${NC}"
    fi
  fi
else
  echo -e "${RED}✗ Failed to reach library API${NC}"
fi
echo

echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  Deployment Complete!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo
echo "Next steps:"
echo "1. Open frontend: https://orthodoxmetrics.com/church/om-spec"
echo "2. Check OM-Library - should now show files"
echo "3. Test search and file viewing"
echo
echo "If library still shows 'No files':"
echo "- Check: curl http://127.0.0.1:3001/api/library/files"
echo "- Check logs: pm2 logs orthodox-backend"
echo
echo "See OM_LIBRARY_FILES_FIX.md for details."
echo
