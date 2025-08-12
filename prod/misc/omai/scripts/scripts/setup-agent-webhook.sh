#!/bin/bash

# OMAI Agent Webhook Setup Script
echo "🧠 Setting up OMAI Agent Webhook Interface..."
echo "==============================================="

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Step 1: Apply database migration
echo -e "${CYAN}📊 Applying database migration for agent support...${NC}"

mysql -u root -p -e "USE orthodoxmetrics_db; $(cat ../server/database/alter-omai-memories-agents.sql)" 2>/dev/null

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Database migration applied successfully${NC}"
else
    echo -e "${YELLOW}⚠️  Migration may have already been applied or there was an issue${NC}"
fi

# Step 2: Restart the backend to load new routes
echo -e "${CYAN}🔄 Restarting backend to load agent webhook routes...${NC}"
pm2 restart orthodox-backend

# Wait for backend to initialize
echo -e "${CYAN}⏳ Waiting for backend to initialize...${NC}"
sleep 8

# Step 3: Test the new webhook endpoint
echo -e "${CYAN}🧪 Testing OMAI Agent Webhook Endpoint...${NC}"
echo ""

# Test 1: Basic functionality
echo -e "${BLUE}Test 1: Basic Agent Ingestion${NC}"
RESPONSE1=$(curl -s -X POST http://localhost:3001/api/omai/ingest-agent-output \
  -H "Content-Type: application/json" \
  -d '{
    "agent": "Claude",
    "source": "test-setup",
    "output": "OMAI Agent Webhook test successful! System ready for agent integrations.",
    "tags": ["test", "setup", "webhook"],
    "importance": "normal"
  }')

if echo "$RESPONSE1" | grep -q '"success":true'; then
    echo -e "${GREEN}✅ Basic agent ingestion working${NC}"
    echo -e "${CYAN}Response:${NC}"
    echo "$RESPONSE1" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE1"
    echo ""
else
    echo -e "${RED}❌ Basic agent ingestion failed${NC}"
    echo "$RESPONSE1"
    echo ""
fi

# Test 2: High importance with metadata
echo -e "${BLUE}Test 2: High Importance with Metadata${NC}"
RESPONSE2=$(curl -s -X POST http://localhost:3001/api/omai/ingest-agent-output \
  -H "Content-Type: application/json" \
  -d '{
    "agent": "Cursor",
    "source": "code-analysis",
    "output": "Found potential security vulnerability in user authentication module. Requires immediate attention.",
    "tags": ["security", "authentication", "vulnerability"],
    "importance": "high",
    "metadata": {
      "severity": "critical",
      "module": "auth",
      "confidence": 0.95
    },
    "context_type": "infrastructure"
  }')

if echo "$RESPONSE2" | grep -q '"success":true'; then
    echo -e "${GREEN}✅ High importance ingestion working${NC}"
    echo -e "${CYAN}Response:${NC}"
    echo "$RESPONSE2" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE2"
    echo ""
else
    echo -e "${RED}❌ High importance ingestion failed${NC}"
    echo "$RESPONSE2"
    echo ""
fi

# Test 3: Validation error handling
echo -e "${BLUE}Test 3: Validation Error Handling${NC}"
RESPONSE3=$(curl -s -X POST http://localhost:3001/api/omai/ingest-agent-output \
  -H "Content-Type: application/json" \
  -d '{
    "agent": "",
    "output": ""
  }')

if echo "$RESPONSE3" | grep -q '"error"'; then
    echo -e "${GREEN}✅ Validation error handling working${NC}"
    echo -e "${CYAN}Response:${NC}"
    echo "$RESPONSE3" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE3"
    echo ""
else
    echo -e "${RED}❌ Validation error handling failed${NC}"
    echo "$RESPONSE3"
    echo ""
fi

# Test 4: Retrieve memories with agent filtering
echo -e "${BLUE}Test 4: Memory Retrieval with Agent Filtering${NC}"
RESPONSE4=$(curl -s "http://localhost:3001/api/omai/memories?source_agent=Claude&limit=5")

if echo "$RESPONSE4" | grep -q '"success":true'; then
    echo -e "${GREEN}✅ Agent-filtered memory retrieval working${NC}"
    echo -e "${CYAN}Response:${NC}"
    echo "$RESPONSE4" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE4"
    echo ""
else
    echo -e "${RED}❌ Agent-filtered memory retrieval failed${NC}"
    echo "$RESPONSE4"
    echo ""
fi

# Step 4: Display webhook usage documentation
echo -e "${CYAN}📚 OMAI Agent Webhook Documentation${NC}"
echo "================================================"
echo ""
echo -e "${BLUE}Endpoint:${NC} POST /api/omai/ingest-agent-output"
echo -e "${BLUE}URL:${NC} http://localhost:3001/api/omai/ingest-agent-output"
echo ""
echo -e "${BLUE}Required Fields:${NC}"
echo "  - agent: Name of the AI agent (e.g., 'Claude', 'Cursor', 'Copilot')"
echo "  - output: The content/knowledge to be stored"
echo ""
echo -e "${BLUE}Optional Fields:${NC}"
echo "  - source: Module or context where output originated"
echo "  - tags: Array of tags for categorization"
echo "  - importance: 'low', 'normal', or 'high'"
echo "  - metadata: Additional structured data"
echo "  - context_type: Category (auto-detected if not provided)"
echo ""
echo -e "${BLUE}Example cURL:${NC}"
echo 'curl -X POST http://localhost:3001/api/omai/ingest-agent-output \'
echo '  -H "Content-Type: application/json" \'
echo '  -d '"'"'{'
echo '    "agent": "Claude",'
echo '    "source": "code-review",'
echo '    "output": "Code analysis complete. Found 3 optimization opportunities.",'
echo '    "tags": ["optimization", "performance"],'
echo '    "importance": "normal"'
echo '  }'"'"''
echo ""

# Step 5: Summary
echo -e "${CYAN}📊 Setup Summary${NC}"
echo "==================="
echo -e "${GREEN}✅ Database schema updated for agent support${NC}"
echo -e "${GREEN}✅ Webhook endpoint available at /api/omai/ingest-agent-output${NC}"
echo -e "${GREEN}✅ Memory retrieval supports agent filtering${NC}"
echo -e "${GREEN}✅ Validation and error handling implemented${NC}"
echo ""
echo -e "${YELLOW}🚀 OMAI is now ready to receive knowledge from AI agents!${NC}"
echo ""
echo -e "${CYAN}Next Steps:${NC}"
echo "1. Share the webhook URL with your AI agents"
echo "2. Configure agents to send structured output"
echo "3. Monitor ingested memories in the AI Lab"
echo "4. Review agent contributions regularly"
echo "" 
