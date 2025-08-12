#!/bin/bash

# OMAI Service Diagnostic Script
# Comprehensive health check and troubleshooting for OMAI service

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="${PROJECT_ROOT:-$(dirname "$SCRIPT_DIR")}"
LOG_DIR="$PROJECT_ROOT/logs"

echo -e "${BLUE}🔍 OMAI Service Diagnostic${NC}"
echo -e "${BLUE}=========================${NC}"
echo -e "${CYAN}Timestamp: $(date)${NC}"
echo -e "${CYAN}Project Root: $PROJECT_ROOT${NC}\n"

# Function to check file existence and size
check_file() {
    local file="$1"
    local description="$2"
    
    if [ -f "$file" ]; then
        local size=$(stat -c%s "$file" 2>/dev/null || echo "unknown")
        echo -e "${GREEN}✅ $description exists ($size bytes)${NC}"
        return 0
    else
        echo -e "${RED}❌ $description missing${NC}"
        return 1
    fi
}

# Function to check directory existence
check_directory() {
    local dir="$1"
    local description="$2"
    
    if [ -d "$dir" ]; then
        local count=$(find "$dir" -type f 2>/dev/null | wc -l)
        echo -e "${GREEN}✅ $description exists ($count files)${NC}"
        return 0
    else
        echo -e "${RED}❌ $description missing${NC}"
        return 1
    fi
}

# Function to test HTTP endpoint
test_endpoint() {
    local url="$1"
    local description="$2"
    local timeout="${3:-5}"
    
    if curl -f -s --max-time "$timeout" "$url" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ $description responding${NC}"
        return 0
    else
        echo -e "${RED}❌ $description not responding${NC}"
        return 1
    fi
}

# 1. File System Checks
echo -e "${YELLOW}📁 File System Checks${NC}"
echo -e "${YELLOW}=====================${NC}"

check_file "$PROJECT_ROOT/package.json" "Package.json"
check_file "$PROJECT_ROOT/ecosystem.config.js" "PM2 ecosystem config"
check_file "$PROJECT_ROOT/server/index.js" "Main server file"
check_file "$PROJECT_ROOT/server/services/omaiBackgroundService.js" "OMAI background service"
check_file "$PROJECT_ROOT/server/routes/omai.js" "OMAI routes"

echo ""

# 2. OMAI Core Service Files
echo -e "${YELLOW}🧠 OMAI Core Service Files${NC}"
echo -e "${YELLOW}==========================${NC}"

check_directory "$PROJECT_ROOT/services/om-ai" "OMAI core service directory"
check_file "$PROJECT_ROOT/services/om-ai/index.ts" "OMAI main index (TypeScript)"
check_file "$PROJECT_ROOT/services/om-ai/index.js" "OMAI main index (JavaScript)"
check_file "$PROJECT_ROOT/services/om-ai/orchestrator.ts" "OMAI orchestrator (TypeScript)"
check_file "$PROJECT_ROOT/services/om-ai/orchestrator.js" "OMAI orchestrator (JavaScript)"
check_file "$PROJECT_ROOT/services/om-ai/config.ts" "OMAI configuration"

echo ""

# 3. OMAI Memory and Data Files
echo -e "${YELLOW}💾 OMAI Memory and Data Files${NC}"
echo -e "${YELLOW}=============================${NC}"

check_directory "$PROJECT_ROOT/services/om-ai/memory" "OMAI memory directory"
check_file "$PROJECT_ROOT/services/om-ai/memory/om-memory.json" "OMAI memory file"
check_directory "$PROJECT_ROOT/services/om-ai/embeddings" "OMAI embeddings directory"
check_file "$PROJECT_ROOT/services/om-ai/embeddings/embeddings.json" "OMAI embeddings file"
check_directory "$PROJECT_ROOT/services/om-ai/plugins" "OMAI plugins directory"

echo ""

# 4. Log Files Check
echo -e "${YELLOW}📋 Log Files Check${NC}"
echo -e "${YELLOW}==================${NC}"

check_directory "$LOG_DIR" "Main logs directory"
check_directory "$LOG_DIR/omai" "OMAI logs directory"

if [ -f "$LOG_DIR/omai-combined.log" ]; then
    local log_size=$(stat -c%s "$LOG_DIR/omai-combined.log")
    local log_lines=$(wc -l < "$LOG_DIR/omai-combined.log" 2>/dev/null || echo "0")
    echo -e "${GREEN}✅ OMAI combined log exists ($log_size bytes, $log_lines lines)${NC}"
else
    echo -e "${YELLOW}⚠️  OMAI combined log not found${NC}"
fi

echo ""

# 5. Process Status Check
echo -e "${YELLOW}⚙️  Process Status Check${NC}"
echo -e "${YELLOW}======================${NC}"

if command -v pm2 >/dev/null 2>&1; then
    echo -e "${GREEN}✅ PM2 is available${NC}"
    
    # Check PM2 processes
    echo -e "\n${CYAN}PM2 Process Status:${NC}"
    pm2 list
    
    # Check specific processes
    if pm2 list | grep -q "orthodox-backend.*online"; then
        echo -e "${GREEN}✅ Orthodox backend is online${NC}"
    else
        echo -e "${RED}❌ Orthodox backend is not online${NC}"
    fi
    
    if pm2 list | grep -q "omai-background.*online"; then
        echo -e "${GREEN}✅ OMAI background service is online${NC}"
    else
        echo -e "${RED}❌ OMAI background service is not online${NC}"
    fi
else
    echo -e "${RED}❌ PM2 not found${NC}"
fi

echo ""

# 6. Network and API Endpoint Tests
echo -e "${YELLOW}🌐 Network and API Endpoint Tests${NC}"
echo -e "${YELLOW}==================================${NC}"

# Test main backend health
test_endpoint "http://localhost:3000/api/health" "Main backend health"

# Test OMAI specific endpoints
test_endpoint "http://localhost:3000/api/omai/health" "OMAI health endpoint"
test_endpoint "http://localhost:3000/api/omai/stats" "OMAI stats endpoint"

echo ""

# 7. Frontend Integration Check
echo -e "${YELLOW}🎨 Frontend Integration Check${NC}"
echo -e "${YELLOW}=============================${NC}"

check_file "$PROJECT_ROOT/front-end/src/pages/sandbox/ai-lab.tsx" "AI Lab component"
check_file "$PROJECT_ROOT/front-end/src/components/ComponentInspector.tsx" "Component Inspector"
check_file "$PROJECT_ROOT/front-end/src/services/om-ai/editorBridge.ts" "OMAI Editor Bridge"
check_file "$PROJECT_ROOT/front-end/src/ai/autoFixEngine.ts" "Auto Fix Engine"

echo ""

# 8. Configuration Analysis
echo -e "${YELLOW}⚙️  Configuration Analysis${NC}"
echo -e "${YELLOW}=========================${NC}"

if [ -f "$PROJECT_ROOT/services/om-ai/config.ts" ]; then
    echo -e "${CYAN}OMAI Configuration:${NC}"
    grep -E "(model|backend|memoryPath|embeddingDBPath)" "$PROJECT_ROOT/services/om-ai/config.ts" | sed 's/^/  /'
fi

echo ""

# 9. Recent Log Analysis
echo -e "${YELLOW}📊 Recent Log Analysis${NC}"
echo -e "${YELLOW}=====================${NC}"

if [ -f "$LOG_DIR/omai-combined.log" ]; then
    echo -e "${CYAN}Last 10 OMAI log entries:${NC}"
    tail -10 "$LOG_DIR/omai-combined.log" | sed 's/^/  /' || echo -e "${YELLOW}No log entries found${NC}"
fi

if [ -f "$LOG_DIR/omai-err.log" ]; then
    local error_count=$(wc -l < "$LOG_DIR/omai-err.log" 2>/dev/null || echo "0")
    if [ "$error_count" -gt 0 ]; then
        echo -e "\n${MAGENTA}Last 5 OMAI errors:${NC}"
        tail -5 "$LOG_DIR/omai-err.log" | sed 's/^/  /'
    else
        echo -e "\n${GREEN}✅ No recent errors in OMAI error log${NC}"
    fi
fi

echo ""

# 10. Node.js Environment Check
echo -e "${YELLOW}🚀 Node.js Environment Check${NC}"
echo -e "${YELLOW}============================${NC}"

if command -v node >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Node.js version: $(node --version)${NC}"
else
    echo -e "${RED}❌ Node.js not found${NC}"
fi

if command -v npm >/dev/null 2>&1; then
    echo -e "${GREEN}✅ NPM version: $(npm --version)${NC}"
else
    echo -e "${RED}❌ NPM not found${NC}"
fi

echo ""

# 11. Port Usage Check
echo -e "${YELLOW}🔌 Port Usage Check${NC}"
echo -e "${YELLOW}==================${NC}"

if command -v netstat >/dev/null 2>&1; then
    if netstat -tlnp 2>/dev/null | grep -q ":3000 "; then
        echo -e "${GREEN}✅ Port 3000 is in use (backend likely running)${NC}"
    else
        echo -e "${RED}❌ Port 3000 is not in use${NC}"
    fi
elif command -v ss >/dev/null 2>&1; then
    if ss -tlnp 2>/dev/null | grep -q ":3000 "; then
        echo -e "${GREEN}✅ Port 3000 is in use (backend likely running)${NC}"
    else
        echo -e "${RED}❌ Port 3000 is not in use${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Cannot check port usage (netstat/ss not available)${NC}"
fi

echo ""

# 12. Summary and Recommendations
echo -e "${BLUE}📋 Summary and Recommendations${NC}"
echo -e "${BLUE}==============================${NC}"

echo -e "\n${CYAN}Quick Actions:${NC}"
echo -e "  • Start OMAI: ${PROJECT_ROOT}/scripts/start-omai-complete.sh"
echo -e "  • View logs: pm2 logs omai-background"
echo -e "  • Monitor: pm2 monit"
echo -e "  • Restart: pm2 restart omai-background"

echo -e "\n${CYAN}Frontend Testing:${NC}"
echo -e "  • AI Lab: Frontend -> Sandbox -> AI Lab"
echo -e "  • Component Inspector: Any React component -> Inspect -> OMAI Fix"
echo -e "  • Service Management: Settings -> Service Management"

echo -e "\n${CYAN}API Testing:${NC}"
echo -e "  • Health: curl http://localhost:3000/api/omai/health"
echo -e "  • Stats: curl http://localhost:3000/api/omai/stats"
echo -e "  • Ask: curl -X POST http://localhost:3000/api/omai/ask -H 'Content-Type: application/json' -d '{\"prompt\":\"test\"}'"

echo -e "\n${GREEN}🎉 Diagnostic completed!${NC}"
echo -e "${CYAN}If issues persist, check the log files and PM2 status.${NC}" 