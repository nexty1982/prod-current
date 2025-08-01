#!/bin/bash

# Check Backend Logs Script
# Shows the latest logs to diagnose startup issues

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

PROJECT_ROOT="/var/www/orthodox-church-mgmt/orthodoxmetrics/prod"

echo -e "${BLUE}📋 Checking Backend Logs...${NC}"

# Navigate to project directory
cd "$PROJECT_ROOT"

# Check PM2 status first
echo -e "${YELLOW}📊 Current PM2 Status:${NC}"
pm2 list

echo ""
echo -e "${YELLOW}📋 Latest Backend Logs (last 30 lines):${NC}"
pm2 logs orthodox-backend --lines 30

echo ""
echo -e "${YELLOW}🔍 Checking for specific error patterns:${NC}"

# Check for common error patterns
if pm2 logs orthodox-backend --lines 50 | grep -q "MODULE_NOT_FOUND"; then
    echo -e "${RED}❌ Found MODULE_NOT_FOUND errors${NC}"
    pm2 logs orthodox-backend --lines 50 | grep "MODULE_NOT_FOUND"
fi

if pm2 logs orthodox-backend --lines 50 | grep -q "Error:"; then
    echo -e "${RED}❌ Found Error messages:${NC}"
    pm2 logs orthodox-backend --lines 50 | grep "Error:"
fi

if pm2 logs orthodox-backend --lines 50 | grep -q "Cannot find module"; then
    echo -e "${RED}❌ Found 'Cannot find module' errors:${NC}"
    pm2 logs orthodox-backend --lines 50 | grep "Cannot find module"
fi

echo ""
echo -e "${BLUE}🔧 Quick Fix Commands:${NC}"
echo "  - Restart backend: pm2 restart orthodox-backend"
echo "  - View real-time logs: pm2 logs orthodox-backend --lines 0"
echo "  - Check process details: pm2 show orthodox-backend"
echo "  - Kill and restart: pm2 delete orthodox-backend && pm2 start server/index.js --name orthodox-backend" 