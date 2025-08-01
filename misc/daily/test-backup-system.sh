#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🧪 Testing SDLC Backup System...${NC}"

# Test 1: Check if server is running
echo -e "${YELLOW}📡 Testing server connectivity...${NC}"
if curl -s http://localhost:3001/api/health > /dev/null; then
    echo -e "${GREEN}✅ Server is running${NC}"
else
    echo -e "${RED}❌ Server is not running${NC}"
    exit 1
fi

# Test 2: Test backup listing
echo -e "${YELLOW}📋 Testing backup listing...${NC}"
if curl -s http://localhost:3001/api/backups/list?env=prod > /dev/null; then
    echo -e "${GREEN}✅ Backup listing endpoint is accessible${NC}"
else
    echo -e "${RED}❌ Backup listing endpoint failed${NC}"
fi

# Test 3: Check backup directories
echo -e "${YELLOW}📁 Checking backup directories...${NC}"
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

# Test 4: Check zip command availability
echo -e "${YELLOW}🗜️  Checking zip command...${NC}"
if command -v zip > /dev/null; then
    echo -e "${GREEN}✅ Zip command is available${NC}"
else
    echo -e "${RED}❌ Zip command not found${NC}"
fi

# Test 5: Check Node.js dependencies
echo -e "${YELLOW}📦 Checking Node.js dependencies...${NC}"
if [ -f "package.json" ] && grep -q "extract-zip" package.json; then
    echo -e "${GREEN}✅ extract-zip dependency found${NC}"
else
    echo -e "${RED}❌ extract-zip dependency missing${NC}"
fi

echo -e "${BLUE}🎉 Backup system test completed!${NC}"
echo -e "${YELLOW}💡 You can now try creating a backup through the web interface${NC}" 