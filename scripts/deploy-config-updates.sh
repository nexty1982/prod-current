#!/bin/bash
# Deploy Centralized Config Updates
# Rebuilds backend and restarts PM2 service

set -euo pipefail

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  Deploying Centralized Config Updates${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo

# Navigate to server directory
cd /var/www/orthodoxmetrics/prod/server || {
  echo -e "${RED}✗ Failed to navigate to server directory${NC}"
  exit 1
}

echo -e "${YELLOW}1/4 Building backend...${NC}"
npm run build || {
  echo -e "${RED}✗ Build failed${NC}"
  exit 1
}
echo -e "${GREEN}✓ Build successful${NC}"
echo

echo -e "${YELLOW}2/4 Verifying compiled config files...${NC}"
if [ ! -f "dist/config/index.js" ]; then
  echo -e "${RED}✗ Config module not found in dist/config/${NC}"
  exit 1
fi
if [ ! -f "dist/config/schema.js" ]; then
  echo -e "${RED}✗ Schema module not found in dist/config/${NC}"
  exit 1
fi
if [ ! -f "dist/config/redact.js" ]; then
  echo -e "${RED}✗ Redact module not found in dist/config/${NC}"
  exit 1
fi
echo -e "${GREEN}✓ All config modules compiled successfully${NC}"
ls -lh dist/config/*.js | head -5
echo

echo -e "${YELLOW}3/4 Restarting backend service...${NC}"
pm2 restart orthodox-backend || {
  echo -e "${RED}✗ PM2 restart failed${NC}"
  exit 1
}
echo -e "${GREEN}✓ Backend restarted${NC}"
echo

echo -e "${YELLOW}4/4 Verifying configuration loaded...${NC}"
sleep 3  # Give PM2 time to start

# Check logs for config message
if pm2 logs orthodox-backend --lines 50 --nostream | grep -q "Loaded server configuration"; then
  echo -e "${GREEN}✓ Configuration loaded successfully${NC}"
else
  echo -e "${YELLOW}⚠ Configuration message not found in recent logs${NC}"
  echo -e "${YELLOW}  This may be normal if server restarted too quickly${NC}"
fi
echo

echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  Deployment Complete!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo
echo "Next steps:"
echo "1. Test health endpoint:  curl http://127.0.0.1:3001/api/system/health"
echo "2. Test config endpoint:  curl http://127.0.0.1:3001/api/system/config"
echo "3. Check logs:            pm2 logs orthodox-backend"
echo
echo "See docs/OPERATIONS/centralized-config-status.md for details."
echo
