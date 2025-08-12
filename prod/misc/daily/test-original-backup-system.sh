#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🧪 Testing Original Backup System...${NC}"

# Test 1: Check if server is running
echo -e "${YELLOW}📡 Testing server connectivity...${NC}"
if curl -s http://localhost:3001/api/health > /dev/null; then
    echo -e "${GREEN}✅ Server is running${NC}"
else
    echo -e "${RED}❌ Server is not running${NC}"
    exit 1
fi

# Test 2: Test original backup settings endpoint
echo -e "${YELLOW}⚙️  Testing backup settings endpoint...${NC}"
if curl -s http://localhost:3001/api/backup/settings > /dev/null; then
    echo -e "${GREEN}✅ Backup settings endpoint is accessible${NC}"
else
    echo -e "${RED}❌ Backup settings endpoint failed${NC}"
fi

# Test 3: Test original backup files endpoint
echo -e "${YELLOW}📁 Testing backup files endpoint...${NC}"
if curl -s http://localhost:3001/api/backup/files > /dev/null; then
    echo -e "${GREEN}✅ Backup files endpoint is accessible${NC}"
else
    echo -e "${RED}❌ Backup files endpoint failed${NC}"
fi

# Test 4: Test original backup storage endpoint
echo -e "${YELLOW}💾 Testing backup storage endpoint...${NC}"
if curl -s http://localhost:3001/api/backup/storage > /dev/null; then
    echo -e "${GREEN}✅ Backup storage endpoint is accessible${NC}"
else
    echo -e "${RED}❌ Backup storage endpoint failed${NC}"
fi

# Test 5: Check backup directories
echo -e "${YELLOW}📁 Checking backup directories...${NC}"
if [ -d "/var/backups/orthodoxmetrics/system" ]; then
    echo -e "${GREEN}✅ System backup directory exists${NC}"
else
    echo -e "${RED}❌ System backup directory missing${NC}"
fi

if [ -d "/var/backups/orthodoxmetrics/prod" ]; then
    echo -e "${GREEN}✅ Production backup directory exists${NC}"
else
    echo -e "${RED}❌ Production backup directory missing${NC}"
fi

if [ -d "/var/backups/orthodoxmetrics/dev" ]; then
    echo -e "${GREEN}✅ Development backup directory exists${NC}"
else
    echo -e "${RED}❌ Development backup directory missing${NC}"
fi

echo -e "${BLUE}🎉 Original backup system test completed!${NC}"
echo -e "${YELLOW}💡 Both original backup system and SDLC backup system should now work${NC}" 