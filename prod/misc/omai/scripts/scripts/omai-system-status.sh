#!/bin/bash

# OMAI System Status Monitor
# Checks the health and status of all OMAI components

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BASE_URL="http://localhost:3001"
API_BASE="$BASE_URL/api/omai"
LOG_DIR="logs/omai"

echo -e "${BLUE}📊 OMAI System Status Report${NC}"
echo "=================================="
echo ""

# Check if backend is running
echo -e "${YELLOW}🔍 Checking backend service...${NC}"
if curl -s "$BASE_URL/api/omai/health" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Backend service is running${NC}"
else
    echo -e "${RED}❌ Backend service is not responding${NC}"
    exit 1
fi

# Check OMAI health
echo -e "${YELLOW}🔍 Checking OMAI health...${NC}"
health_response=$(curl -s "$API_BASE/health" 2>/dev/null || echo '{"status":"unhealthy"}')
omai_status=$(echo "$health_response" | grep -o '"status":"[^"]*"' | cut -d'"' -f4 || echo "unknown")

if [ "$omai_status" = "healthy" ]; then
    echo -e "${GREEN}✅ OMAI system is healthy${NC}"
elif [ "$omai_status" = "degraded" ]; then
    echo -e "${YELLOW}⚠️  OMAI system is degraded${NC}"
else
    echo -e "${RED}❌ OMAI system is unhealthy${NC}"
fi

# Check PM2 processes
echo -e "${YELLOW}🔍 Checking PM2 processes...${NC}"
if command -v pm2 &> /dev/null; then
    omai_process=$(pm2 list | grep omai-background || echo "")
    if [ -n "$omai_process" ]; then
        if echo "$omai_process" | grep -q "online"; then
            echo -e "${GREEN}✅ OMAI background service is running${NC}"
        else
            echo -e "${RED}❌ OMAI background service is not running${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️  OMAI background service not found in PM2${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  PM2 not installed${NC}"
fi

# Check log files
echo -e "${YELLOW}🔍 Checking log files...${NC}"
if [ -d "$LOG_DIR" ]; then
    echo -e "${GREEN}✅ Log directory exists: $LOG_DIR${NC}"
    
    # Check recent log activity
    if [ -f "$LOG_DIR/omai.log" ]; then
        log_size=$(stat -c%s "$LOG_DIR/omai.log" 2>/dev/null || echo "0")
        if [ "$log_size" -gt 0 ]; then
            echo -e "${GREEN}✅ OMAI log file has content (${log_size} bytes)${NC}"
        else
            echo -e "${YELLOW}⚠️  OMAI log file is empty${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️  OMAI log file not found${NC}"
    fi
    
    # List log files
    echo "   Log files:"
    ls -la "$LOG_DIR"/*.log 2>/dev/null | while read line; do
        echo "     $line"
    done || echo "     No log files found"
else
    echo -e "${RED}❌ Log directory not found: $LOG_DIR${NC}"
fi

# Check API endpoints
echo -e "${YELLOW}🔍 Testing API endpoints...${NC}"
endpoints=(
    "/health"
    "/stats"
    "/control/agents"
    "/control/orchestrator-status"
)

for endpoint in "${endpoints[@]}"; do
    if curl -s "$API_BASE$endpoint" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ $endpoint${NC}"
    else
        echo -e "${RED}❌ $endpoint${NC}"
    fi
done

# Get system statistics
echo -e "${YELLOW}🔍 Getting system statistics...${NC}"
stats_response=$(curl -s "$API_BASE/stats" 2>/dev/null || echo '{}')
total_requests=$(echo "$stats_response" | grep -o '"totalRequests":[0-9]*' | cut -d':' -f2 || echo "0")
avg_response_time=$(echo "$stats_response" | grep -o '"averageResponseTime":[0-9.]*' | cut -d':' -f2 || echo "0")

echo "   Total requests: $total_requests"
echo "   Average response time: ${avg_response_time}ms"

# Check orchestrator status
echo -e "${YELLOW}🔍 Checking orchestrator status...${NC}"
orchestrator_response=$(curl -s "$API_BASE/control/orchestrator-status" 2>/dev/null || echo '{}')
is_running=$(echo "$orchestrator_response" | grep -o '"isRunning":[^,]*' | cut -d':' -f2 || echo "false")
registered_agents=$(echo "$orchestrator_response" | grep -o '"registeredAgents":[0-9]*' | cut -d':' -f2 || echo "0")

if [ "$is_running" = "true" ]; then
    echo -e "${GREEN}✅ Orchestrator is running${NC}"
else
    echo -e "${RED}❌ Orchestrator is not running${NC}"
fi
echo "   Registered agents: $registered_agents"

# Check agent metrics
echo -e "${YELLOW}🔍 Checking agent metrics...${NC}"
agent_metrics=$(curl -s "$API_BASE/agent-metrics" 2>/dev/null || echo '{"metrics":[]}')
agent_count=$(echo "$agent_metrics" | grep -o '"id":"[^"]*"' | wc -l)
echo "   Active agents: $agent_count"

echo ""
echo -e "${BLUE}📋 Summary${NC}"
echo "=========="

# Overall status
if [ "$omai_status" = "healthy" ] && [ "$is_running" = "true" ]; then
    echo -e "${GREEN}🎉 OMAI System is fully operational${NC}"
elif [ "$omai_status" = "degraded" ] || [ "$is_running" = "false" ]; then
    echo -e "${YELLOW}⚠️  OMAI System has issues - check logs${NC}"
else
    echo -e "${RED}❌ OMAI System is not operational${NC}"
fi

echo ""
echo -e "${BLUE}📖 Troubleshooting Commands${NC}"
echo "================================"
echo "  View OMAI logs: tail -f $LOG_DIR/omai.log"
echo "  Restart OMAI: pm2 restart omai-background"
echo "  Check PM2 status: pm2 list | grep omai"
echo "  Test endpoints: ./scripts/test-omai-endpoints.sh"
echo "  Start system: ./scripts/start-omai-system.sh" 