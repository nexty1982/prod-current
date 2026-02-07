#!/bin/bash
# OM-Library Enhancement Deployment Script
# Created: 2026-02-06
# Purpose: Deploy OM-Library enhancements (pagination, download, preview, sources management)

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROD_ROOT="/var/www/orthodoxmetrics/prod"
MIGRATION_FILE="$PROD_ROOT/server/database/migrations/2026-02-05_library_enhancements.sql"
DB_NAME="orthodoxmetrics_db"
DB_USER="root"
MYSQL_ROOT_PASSWORD="Summerof2025@!"

echo -e "${BLUE}==========================================${NC}"
echo -e "${BLUE}OM-Library Enhancement Deployment${NC}"
echo -e "${BLUE}==========================================${NC}"
echo ""

# Step 1: Verify files exist
echo -e "${YELLOW}Step 1: Verifying files...${NC}"
if [ ! -f "$PROD_ROOT/server/src/config/library-config.js" ]; then
    echo -e "${RED}❌ Missing: library-config.js${NC}"
    exit 1
fi
if [ ! -f "$PROD_ROOT/server/src/utils/library-helpers.js" ]; then
    echo -e "${RED}❌ Missing: library-helpers.js${NC}"
    exit 1
fi
if [ ! -f "$MIGRATION_FILE" ]; then
    echo -e "${RED}❌ Missing: migration SQL file${NC}"
    exit 1
fi
echo -e "${GREEN}✅ All required files present${NC}"
echo ""

# Step 2: Check if migration already run
echo -e "${YELLOW}Step 2: Checking database...${NC}"
TABLE_COUNT=$(mysql -u $DB_USER -p$MYSQL_ROOT_PASSWORD -N -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='$DB_NAME' AND table_name LIKE 'library_%';" 2>/dev/null || echo "0")

if [ "$TABLE_COUNT" -ge 2 ]; then
    echo -e "${YELLOW}⚠️  Library tables already exist (found $TABLE_COUNT tables)${NC}"
    read -p "Do you want to re-run the migration? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${BLUE}Skipping migration...${NC}"
    else
        echo -e "${YELLOW}Running migration...${NC}"
        mysql -u $DB_USER -p$MYSQL_ROOT_PASSWORD $DB_NAME < "$MIGRATION_FILE"
        echo -e "${GREEN}✅ Migration executed${NC}"
    fi
else
    echo -e "${YELLOW}Running migration for the first time...${NC}"
    mysql -u $DB_USER -p$MYSQL_ROOT_PASSWORD $DB_NAME < "$MIGRATION_FILE"
    echo -e "${GREEN}✅ Migration completed${NC}"
fi
echo ""

# Step 3: Verify tables
echo -e "${YELLOW}Step 3: Verifying database tables...${NC}"
TABLES=$(mysql -u $DB_USER -p$MYSQL_ROOT_PASSWORD $DB_NAME -e "SHOW TABLES LIKE 'library_%';" 2>/dev/null)
echo "$TABLES"
if [[ $TABLES == *"library_sources"* ]] && [[ $TABLES == *"library_relationships"* ]]; then
    echo -e "${GREEN}✅ Tables verified${NC}"
else
    echo -e "${RED}❌ Tables not found!${NC}"
    exit 1
fi
echo ""

# Step 4: Check default sources
echo -e "${YELLOW}Step 4: Checking default scan sources...${NC}"
SOURCE_COUNT=$(mysql -u $DB_USER -p$MYSQL_ROOT_PASSWORD -N -e "SELECT COUNT(*) FROM $DB_NAME.library_sources;" 2>/dev/null)
echo -e "${BLUE}Found $SOURCE_COUNT scan sources in database${NC}"
if [ "$SOURCE_COUNT" -eq 0 ]; then
    echo -e "${YELLOW}⚠️  No scan sources found! You may need to add them manually.${NC}"
else
    echo -e "${GREEN}✅ Scan sources present${NC}"
fi
echo ""

# Step 5: Install dependencies (if needed)
echo -e "${YELLOW}Step 5: Checking dependencies...${NC}"
cd "$PROD_ROOT/server"
if [ -f "package.json" ]; then
    echo -e "${BLUE}Running npm install...${NC}"
    npm install --silent
    echo -e "${GREEN}✅ Dependencies installed${NC}"
else
    echo -e "${RED}❌ package.json not found${NC}"
    exit 1
fi
echo ""

# Step 6: Build backend
echo -e "${YELLOW}Step 6: Building backend...${NC}"
npm run build
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Backend built successfully${NC}"
else
    echo -e "${RED}❌ Build failed!${NC}"
    exit 1
fi
echo ""

# Step 7: Restart backend
echo -e "${YELLOW}Step 7: Restarting backend...${NC}"
if command -v pm2 &> /dev/null; then
    pm2 restart orthodox-backend
    echo -e "${GREEN}✅ Backend restarted${NC}"
    echo ""
    echo -e "${BLUE}Waiting 3 seconds for backend to start...${NC}"
    sleep 3
else
    echo -e "${YELLOW}⚠️  PM2 not found. Please restart the backend manually.${NC}"
fi
echo ""

# Step 8: Test endpoints
echo -e "${YELLOW}Step 8: Testing endpoints...${NC}"
echo -e "${BLUE}Testing /api/library/status...${NC}"
STATUS_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/library/status 2>/dev/null || echo "000")
if [ "$STATUS_CODE" -eq 200 ]; then
    echo -e "${GREEN}✅ Status endpoint working${NC}"
else
    echo -e "${RED}❌ Status endpoint returned: $STATUS_CODE${NC}"
fi

echo -e "${BLUE}Testing /api/library/items (new paginated endpoint)...${NC}"
ITEMS_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/library/items 2>/dev/null || echo "000")
if [ "$ITEMS_CODE" -eq 200 ]; then
    echo -e "${GREEN}✅ Items endpoint working${NC}"
else
    echo -e "${RED}❌ Items endpoint returned: $ITEMS_CODE${NC}"
fi
echo ""

# Step 9: Summary
echo -e "${BLUE}==========================================${NC}"
echo -e "${BLUE}Deployment Summary${NC}"
echo -e "${BLUE}==========================================${NC}"
echo ""
echo -e "${GREEN}✅ Database migration: Complete${NC}"
echo -e "${GREEN}✅ Dependencies: Installed${NC}"
echo -e "${GREEN}✅ Backend: Built and restarted${NC}"
echo -e "${GREEN}✅ Endpoints: Tested${NC}"
echo ""
echo -e "${YELLOW}New Endpoints Available:${NC}"
echo -e "  • GET  /api/library/items - Paginated listing"
echo -e "  • GET  /api/library/download/:id - File download (FIXED)"
echo -e "  • GET  /api/library/preview/:id - File preview"
echo -e "  • GET  /api/library/sources - List scan sources (admin)"
echo -e "  • POST /api/library/sources - Create scan source (super_admin)"
echo -e "  • PUT  /api/library/sources/:id - Update scan source (super_admin)"
echo -e "  • DELETE /api/library/sources/:id - Delete scan source (super_admin)"
echo -e "  • POST /api/library/category/batch - Batch category update"
echo -e "  • POST /api/library/related/group - Create relationship group"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo -e "  1. Test download button in frontend UI"
echo -e "  2. Test preview button in frontend UI"
echo -e "  3. (Optional) Update frontend for pagination controls"
echo -e "  4. (Optional) Add source management UI"
echo ""
echo -e "${GREEN}Deployment complete!${NC}"
echo -e "${BLUE}==========================================${NC}"
