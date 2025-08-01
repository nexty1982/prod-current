#!/bin/bash

# OMAI Consume Mode Setup Script
echo "🧠 Setting up OMAI Consume Mode..."
echo "=================================="

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Step 1: Create the database table
echo -e "${CYAN}📊 Creating omai_memories database table...${NC}"

mysql -u root -p -e "USE orthodoxmetrics_db; $(cat server/database/create-omai-memories-table.sql)" 2>/dev/null

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Database table created successfully${NC}"
else
    echo -e "${YELLOW}⚠️  Table may already exist or there was an issue${NC}"
fi

# Step 2: Restart the backend to load new routes
echo -e "${CYAN}🔄 Restarting backend to load new OMAI routes...${NC}"
pm2 restart orthodox-backend

# Wait for restart
sleep 3

# Step 3: Test the new endpoints
echo -e "${CYAN}🧪 Testing OMAI Consume Mode endpoints...${NC}"

# Test consume endpoint
echo -e "${YELLOW}Testing /api/omai/consume endpoint...${NC}"
CONSUME_RESPONSE=$(curl -s -X POST "http://localhost:3001/api/omai/consume" \
  -H "Content-Type: application/json" \
  -d '{"text": "This is a test memory for OMAI consume mode setup", "priority": "medium"}')

echo "Response: $CONSUME_RESPONSE"

if echo "$CONSUME_RESPONSE" | grep -q '"success":true'; then
    echo -e "${GREEN}✅ Consume endpoint working${NC}"
else
    echo -e "${RED}❌ Consume endpoint failed${NC}"
fi

# Test memories retrieval endpoint
echo -e "${YELLOW}Testing /api/omai/memories endpoint...${NC}"
MEMORIES_RESPONSE=$(curl -s "http://localhost:3001/api/omai/memories?limit=5")

echo "Response: $MEMORIES_RESPONSE"

if echo "$MEMORIES_RESPONSE" | grep -q '"success":true'; then
    echo -e "${GREEN}✅ Memories endpoint working${NC}"
else
    echo -e "${RED}❌ Memories endpoint failed${NC}"
fi

# Step 4: Check PM2 status
echo -e "${CYAN}📊 PM2 Status:${NC}"
pm2 status

echo ""
echo -e "${GREEN}🎉 OMAI Consume Mode Setup Complete!${NC}"
echo ""
echo -e "${CYAN}📋 Next Steps:${NC}"
echo "  1. Rebuild frontend: cd front-end && NODE_OPTIONS=\"--max-old-space-size=4096\" npm run build --legacy-peer-deps"
echo "  2. Navigate to: AI Lab (🧠 AI Development > 🧪 AI Lab)"
echo "  3. Toggle between 'Answer' and 'Consume' modes"
echo "  4. Test consuming memories and viewing stored memories"
echo ""
echo -e "${YELLOW}📝 Available Endpoints:${NC}"
echo "  • POST /api/omai/consume - Store new memories"
echo "  • GET /api/omai/memories - Retrieve stored memories"
echo "  • DELETE /api/omai/memories/:id - Delete specific memory"
echo ""
echo -e "${CYAN}✨ Features Added:${NC}"
echo "  • 🧠 Consume Mode toggle in AI Lab"
echo "  • 💾 Long-term memory storage with auto-categorization"
echo "  • 👁️ Memory viewing and management interface"
echo "  • 🎨 Fixed response panel visibility for light/dark themes"
echo "  • 🏷️ Context type detection (infrastructure, metrics, theology, etc.)" 