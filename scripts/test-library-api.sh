#!/bin/bash

# Test OM-Library API Endpoints
# Verifies that the library API is working correctly

set -e

echo "🔍 Testing OM-Library API Endpoints"
echo "===================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

API_BASE="http://localhost:3001/api/library"

# Test 1: Status endpoint
echo -e "${BLUE}Test 1: GET /api/library/status${NC}"
STATUS_RESPONSE=$(curl -s "${API_BASE}/status")
echo "$STATUS_RESPONSE" | jq '.' 2>/dev/null || echo "$STATUS_RESPONSE"

if echo "$STATUS_RESPONSE" | jq -e '.running == true' > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Librarian status: ONLINE${NC}"
    
    TOTAL_FILES=$(echo "$STATUS_RESPONSE" | jq -r '.totalFiles')
    LAST_UPDATE=$(echo "$STATUS_RESPONSE" | jq -r '.lastIndexUpdate')
    
    echo "   Total files: $TOTAL_FILES"
    echo "   Last update: $LAST_UPDATE"
else
    echo -e "${RED}❌ Librarian status: OFFLINE${NC}"
fi

echo ""

# Test 2: Files endpoint
echo -e "${BLUE}Test 2: GET /api/library/files${NC}"
FILES_RESPONSE=$(curl -s "${API_BASE}/files")

if echo "$FILES_RESPONSE" | jq -e '.success == true' > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Files endpoint: SUCCESS${NC}"
    
    TOTAL_COUNT=$(echo "$FILES_RESPONSE" | jq -r '.totalCount')
    echo "   Total files: $TOTAL_COUNT"
    
    # Show first 3 files
    echo "   Sample files:"
    echo "$FILES_RESPONSE" | jq -r '.files[:3] | .[] | "     - \(.filename) (\(.category))"'
else
    echo -e "${RED}❌ Files endpoint: FAILED${NC}"
    echo "$FILES_RESPONSE" | jq '.' 2>/dev/null || echo "$FILES_RESPONSE"
fi

echo ""

# Test 3: Search endpoint
echo -e "${BLUE}Test 3: GET /api/library/search?q=deployment&mode=filename${NC}"
SEARCH_RESPONSE=$(curl -s "${API_BASE}/search?q=deployment&mode=filename")

if echo "$SEARCH_RESPONSE" | jq -e '.success == true' > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Search endpoint: SUCCESS${NC}"
    
    RESULT_COUNT=$(echo "$SEARCH_RESPONSE" | jq -r '.totalResults')
    echo "   Results for 'deployment': $RESULT_COUNT"
    
    if [ "$RESULT_COUNT" -gt 0 ]; then
        echo "   Matches:"
        echo "$SEARCH_RESPONSE" | jq -r '.results[:3] | .[] | "     - \(.filename)"'
    fi
else
    echo -e "${RED}❌ Search endpoint: FAILED${NC}"
    echo "$SEARCH_RESPONSE" | jq '.' 2>/dev/null || echo "$SEARCH_RESPONSE"
fi

echo ""

# Test 4: Check index file
echo -e "${BLUE}Test 4: Checking index file${NC}"
INDEX_FILE="/var/www/orthodoxmetrics/prod/.analysis/library-index.json"

if [ -f "$INDEX_FILE" ]; then
    echo -e "${GREEN}✅ Index file exists${NC}"
    
    FILE_SIZE=$(du -h "$INDEX_FILE" | cut -f1)
    FILE_COUNT=$(jq '.files | length' "$INDEX_FILE")
    LAST_MODIFIED=$(stat -c %y "$INDEX_FILE" 2>/dev/null || stat -f "%Sm" "$INDEX_FILE" 2>/dev/null)
    
    echo "   Location: $INDEX_FILE"
    echo "   Size: $FILE_SIZE"
    echo "   Files indexed: $FILE_COUNT"
    echo "   Last modified: $LAST_MODIFIED"
else
    echo -e "${RED}❌ Index file not found${NC}"
    echo "   Expected: $INDEX_FILE"
    echo "   om-librarian may not have run yet"
fi

echo ""

# Test 5: Check library directory
echo -e "${BLUE}Test 5: Checking library directory${NC}"
LIBRARY_DIR="/var/www/orthodoxmetrics/prod/front-end/public/docs/library"

if [ -d "$LIBRARY_DIR" ]; then
    echo -e "${GREEN}✅ Library directory exists${NC}"
    
    TECH_COUNT=$(find "$LIBRARY_DIR/technical" -name "*.md" 2>/dev/null | wc -l)
    OPS_COUNT=$(find "$LIBRARY_DIR/ops" -name "*.md" 2>/dev/null | wc -l)
    RECOVERY_COUNT=$(find "$LIBRARY_DIR/recovery" -name "*.md" 2>/dev/null | wc -l)
    TOTAL_MD=$(find "$LIBRARY_DIR" -name "*.md" 2>/dev/null | wc -l)
    
    echo "   Location: $LIBRARY_DIR"
    echo "   Technical docs: $TECH_COUNT"
    echo "   Ops docs: $OPS_COUNT"
    echo "   Recovery docs: $RECOVERY_COUNT"
    echo "   Total .md files: $TOTAL_MD"
else
    echo -e "${RED}❌ Library directory not found${NC}"
    echo "   Expected: $LIBRARY_DIR"
fi

echo ""

# Summary
echo "===================================="
echo -e "${BLUE}Summary:${NC}"
echo ""

# Check overall status
if echo "$STATUS_RESPONSE" | jq -e '.running == true' > /dev/null 2>&1 && \
   echo "$FILES_RESPONSE" | jq -e '.success == true' > /dev/null 2>&1; then
    echo -e "${GREEN}✅ OM-Library API is working correctly!${NC}"
    echo ""
    echo "Next steps:"
    echo "  1. Visit https://orthodoxmetrics.com/church/om-spec"
    echo "  2. Should show 'Librarian online' with green status"
    echo "  3. Browse and search documentation library"
else
    echo -e "${RED}❌ OM-Library API has issues${NC}"
    echo ""
    echo "Troubleshooting:"
    echo "  1. Check if backend is running: pm2 status orthodox-backend"
    echo "  2. Check backend logs: pm2 logs orthodox-backend --lines 50"
    echo "  3. Check librarian logs: pm2 logs om-librarian --lines 50"
    echo "  4. Restart services: pm2 restart all"
fi

echo ""
echo -e "${GREEN}Done!${NC}"
