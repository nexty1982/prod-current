#!/bin/bash

# Quick OMAI Status Check Script
# Provides immediate feedback on OMAI service status

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔍 Quick OMAI Status Check${NC}"
echo -e "${BLUE}=========================${NC}"
echo -e "${CYAN}Timestamp: $(date)${NC}\n"

# 1. Check PM2 Status
echo -e "${YELLOW}⚙️  PM2 Process Status${NC}"
echo -e "${YELLOW}=====================${NC}"
pm2 list
echo ""

# 2. Check Recent OMAI Logs
echo -e "${YELLOW}📋 Recent OMAI Logs (Last 15 lines)${NC}"
echo -e "${YELLOW}====================================${NC}"
if pm2 logs omai-background --lines 15 --nostream 2>/dev/null; then
    echo -e "${GREEN}✅ Logs retrieved successfully${NC}"
else
    echo -e "${RED}❌ Could not retrieve OMAI logs${NC}"
fi
echo ""

# 3. Test API Endpoints
echo -e "${YELLOW}🌐 API Endpoint Tests${NC}"
echo -e "${YELLOW}=====================${NC}"

# Test main backend health first
echo -n "Main backend health: "
if curl -f -s --max-time 3 "http://localhost:3000/api/health" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Responding${NC}"
else
    echo -e "${RED}❌ Not responding${NC}"
fi

# Test OMAI health
echo -n "OMAI health endpoint: "
if curl -f -s --max-time 3 "http://localhost:3000/api/omai/health" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Responding${NC}"
    # Get the actual response
    echo -e "${CYAN}Response:${NC}"
    curl -s "http://localhost:3000/api/omai/health" | python3 -m json.tool 2>/dev/null || curl -s "http://localhost:3000/api/omai/health"
else
    echo -e "${RED}❌ Not responding${NC}"
fi

# Test OMAI stats
echo -n "OMAI stats endpoint: "
if curl -f -s --max-time 3 "http://localhost:3000/api/omai/stats" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Responding${NC}"
else
    echo -e "${RED}❌ Not responding${NC}"
fi

echo ""

# 4. Check for Error Logs
echo -e "${YELLOW}🚨 Error Analysis${NC}"
echo -e "${YELLOW}=================${NC}"

# Check if there are recent errors
LOG_DIR="/var/www/orthodox-church-mgmt/orthodoxmetrics/prod/logs"
if [ -f "$LOG_DIR/omai-err.log" ]; then
    ERROR_COUNT=$(wc -l < "$LOG_DIR/omai-err.log" 2>/dev/null || echo "0")
    if [ "$ERROR_COUNT" -gt 0 ]; then
        echo -e "${RED}⚠️  Found $ERROR_COUNT error entries in log${NC}"
        echo -e "${CYAN}Recent errors:${NC}"
        tail -5 "$LOG_DIR/omai-err.log"
    else
        echo -e "${GREEN}✅ No errors in OMAI error log${NC}"
    fi
else
    echo -e "${YELLOW}ℹ️  No OMAI error log found yet${NC}"
fi

echo ""

# 5. Memory and Process Info
echo -e "${YELLOW}💻 Process Information${NC}"
echo -e "${YELLOW}=====================${NC}"
pm2 show omai-background 2>/dev/null || echo -e "${RED}❌ Could not get detailed process info${NC}"

echo ""

# 6. Quick Recommendations
echo -e "${BLUE}💡 Quick Actions${NC}"
echo -e "${BLUE}===============${NC}"

if pm2 list | grep -q "omai-background.*online"; then
    echo -e "${GREEN}✅ OMAI background service is running${NC}"
    if curl -f -s --max-time 3 "http://localhost:3000/api/omai/health" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ OMAI is fully functional!${NC}"
        echo -e "${CYAN}Next: Test frontend integration via AI Lab${NC}"
    else
        echo -e "${YELLOW}⚠️  OMAI service running but API not responding${NC}"
        echo -e "${CYAN}Possible actions:${NC}"
        echo -e "  • Wait 30 more seconds for full initialization"
        echo -e "  • Check logs: pm2 logs omai-background"
        echo -e "  • Restart: pm2 restart omai-background"
    fi
else
    echo -e "${RED}❌ OMAI background service not running${NC}"
    echo -e "${CYAN}Actions: pm2 restart omai-background${NC}"
fi

echo -e "\n${GREEN}🎉 Status check completed!${NC}" 