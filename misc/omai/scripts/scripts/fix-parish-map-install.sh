#!/bin/bash

# Fix Parish Map Auto-Install System
echo "🔧 Fixing Parish Map Auto-Install System..."
echo "============================================="

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Navigate to server directory
cd /var/www/orthodox-church-mgmt/orthodoxmetrics/prod/server

echo -e "${BLUE}1. Installing missing adm-zip dependency...${NC}"
npm install adm-zip@0.5.14
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ adm-zip installed successfully${NC}"
else
    echo -e "${RED}❌ Failed to install adm-zip${NC}"
fi

echo ""
echo -e "${BLUE}2. Checking BigBook routes structure...${NC}"

# Check if the bigbook routes file has syntax errors
node -c routes/bigbook.js
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ BigBook routes syntax is valid${NC}"
else
    echo -e "${RED}❌ BigBook routes has syntax errors${NC}"
fi

echo ""
echo -e "${BLUE}3. Checking if routes are registered in server index...${NC}"

# Check if bigbook routes are properly registered
if grep -q "app.use('/api/bigbook'" index.js; then
    echo -e "${GREEN}✅ BigBook routes are registered in server${NC}"
else
    echo -e "${RED}❌ BigBook routes are NOT registered in server${NC}"
fi

echo ""
echo -e "${BLUE}4. Creating necessary directories...${NC}"

# Create addon directories
mkdir -p /var/www/orthodoxmetrics/addons
mkdir -p /var/www/orthodox-church-mgmt/orthodoxmetrics/prod/configs
mkdir -p /var/www/orthodox-church-mgmt/orthodoxmetrics/prod/bigbook/logs

echo -e "${GREEN}✅ Directories created${NC}"

echo ""
echo -e "${YELLOW}🔄 To complete the fix:${NC}"
echo -e "${YELLOW}   1. Restart your server${NC}"
echo -e "${YELLOW}   2. Test the Parish Map upload in Big Book${NC}"
echo -e "${YELLOW}   3. Check server logs if issues persist${NC}"

echo ""
echo -e "${GREEN}🎯 Parish Map fix script completed!${NC}" 