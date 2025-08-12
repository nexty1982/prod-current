#!/bin/bash

# Complete OMAI Service Startup Script
# Handles Linux-on-Windows environment and ensures full OMAI functionality

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="${PROJECT_ROOT:-$(dirname "$SCRIPT_DIR")}"
LOG_DIR="$PROJECT_ROOT/logs"
OMAI_LOG_DIR="$LOG_DIR/omai"

echo -e "${BLUE}🚀 OMAI Complete Service Startup${NC}"
echo -e "${BLUE}=================================${NC}"
echo -e "${CYAN}Project Root: $PROJECT_ROOT${NC}"
echo -e "${CYAN}Environment: Linux-on-Windows mapped drive${NC}"

# Step 1: Pre-flight checks
echo -e "\n${YELLOW}🔍 Pre-flight Checks${NC}"

# Check if we're in the right directory
if [ ! -f "$PROJECT_ROOT/package.json" ]; then
    echo -e "${RED}❌ Not in project root directory${NC}"
    exit 1
fi

# Check for required directories
REQUIRED_DIRS=(
    "services/om-ai"
    "server/services"
    "server/routes"
    "front-end/src"
)

for dir in "${REQUIRED_DIRS[@]}"; do
    if [ ! -d "$PROJECT_ROOT/$dir" ]; then
        echo -e "${RED}❌ Missing directory: $dir${NC}"
        exit 1
    else
        echo -e "${GREEN}✅ Found: $dir${NC}"
    fi
done

# Step 2: Create necessary directories
echo -e "\n${YELLOW}📁 Setting up directories${NC}"
mkdir -p "$LOG_DIR"
mkdir -p "$OMAI_LOG_DIR"
mkdir -p "$PROJECT_ROOT/services/om-ai/memory"
mkdir -p "$PROJECT_ROOT/services/om-ai/embeddings"
mkdir -p "$PROJECT_ROOT/services/om-ai/plugins"
echo -e "${GREEN}✅ Directories created${NC}"

# Step 3: Check Node.js and dependencies
echo -e "\n${YELLOW}📦 Checking Node.js environment${NC}"
if command -v node >/dev/null 2>&1; then
    NODE_VERSION=$(node --version)
    echo -e "${GREEN}✅ Node.js: $NODE_VERSION${NC}"
else
    echo -e "${RED}❌ Node.js not found. Please ensure Node.js is installed.${NC}"
    exit 1
fi

# Step 4: Initialize OMAI memory and embeddings if they don't exist
echo -e "\n${YELLOW}🧠 Initializing OMAI memory system${NC}"

# Create default memory file if it doesn't exist
MEMORY_FILE="$PROJECT_ROOT/services/om-ai/memory/om-memory.json"
if [ ! -f "$MEMORY_FILE" ]; then
    echo '{"memories": [], "metadata": {"created": "'$(date -u +"%Y-%m-%dT%H:%M:%SZ")'", "version": "1.0"}}' > "$MEMORY_FILE"
    echo -e "${GREEN}✅ Created default memory file${NC}"
fi

# Create default embeddings file if it doesn't exist
EMBEDDINGS_FILE="$PROJECT_ROOT/services/om-ai/embeddings/embeddings.json"
if [ ! -f "$EMBEDDINGS_FILE" ]; then
    echo '{"embeddings": [], "metadata": {"created": "'$(date -u +"%Y-%m-%dT%H:%M:%SZ")'", "version": "1.0"}}' > "$EMBEDDINGS_FILE"
    echo -e "${GREEN}✅ Created default embeddings file${NC}"
fi

# Step 5: Check PM2 and clean up existing processes
echo -e "\n${YELLOW}🔄 Managing PM2 processes${NC}"
if command -v pm2 >/dev/null 2>&1; then
    echo -e "${GREEN}✅ PM2 found${NC}"
    
    # Stop existing OMAI processes
    echo -e "${YELLOW}🛑 Stopping existing OMAI processes...${NC}"
    pm2 stop omai-background 2>/dev/null || echo -e "${YELLOW}ℹ️  No existing omai-background process${NC}"
    pm2 delete omai-background 2>/dev/null || echo -e "${YELLOW}ℹ️  No existing omai-background process to delete${NC}"
    
    # Ensure main backend is running
    if pm2 list | grep -q "orthodox-backend.*online"; then
        echo -e "${GREEN}✅ Orthodox backend is running${NC}"
    else
        echo -e "${YELLOW}⚠️  Orthodox backend not running. Starting...${NC}"
        cd "$PROJECT_ROOT"
        pm2 start server/index.js --name orthodox-backend
        sleep 5
    fi
else
    echo -e "${RED}❌ PM2 not found. Install with: npm install -g pm2${NC}"
    exit 1
fi

# Step 6: Start OMAI background service
echo -e "\n${YELLOW}🚀 Starting OMAI background service${NC}"
cd "$PROJECT_ROOT"

# Check if ecosystem config exists
if [ -f "ecosystem.config.js" ]; then
    pm2 start ecosystem.config.js --only omai-background
    echo -e "${GREEN}✅ OMAI background service started via ecosystem config${NC}"
else
    # Fallback to direct start
    pm2 start server/services/omaiBackgroundService.js --name omai-background \
        --log ./logs/omai-combined.log \
        --error ./logs/omai-err.log \
        --out ./logs/omai-out.log
    echo -e "${GREEN}✅ OMAI background service started directly${NC}"
fi

# Step 7: Wait for services to initialize
echo -e "\n${YELLOW}⏳ Waiting for services to initialize...${NC}"
sleep 8

# Step 8: Verify OMAI service status
echo -e "\n${YELLOW}🔍 Verifying OMAI service status${NC}"

# Check PM2 status
PM2_STATUS=$(pm2 list | grep omai-background || echo "not found")
if echo "$PM2_STATUS" | grep -q "online"; then
    echo -e "${GREEN}✅ OMAI background service is online${NC}"
else
    echo -e "${RED}❌ OMAI background service failed to start${NC}"
    echo -e "${YELLOW}📋 PM2 logs:${NC}"
    pm2 logs omai-background --lines 10
    exit 1
fi

# Step 9: Test OMAI API endpoints
echo -e "\n${YELLOW}🧪 Testing OMAI API endpoints${NC}"

# Wait for backend to be ready
sleep 5

# Test health endpoint
if curl -f -s "http://localhost:3000/api/omai/health" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ OMAI health endpoint responding${NC}"
else
    echo -e "${YELLOW}⚠️  OMAI health endpoint not responding (service may still be initializing)${NC}"
fi

# Test stats endpoint
if curl -f -s "http://localhost:3000/api/omai/stats" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ OMAI stats endpoint responding${NC}"
else
    echo -e "${YELLOW}⚠️  OMAI stats endpoint not responding${NC}"
fi

# Step 10: Final status report
echo -e "\n${BLUE}📊 Final Status Report${NC}"
echo -e "${BLUE}=====================${NC}"

echo -e "\n${CYAN}PM2 Processes:${NC}"
pm2 list

echo -e "\n${CYAN}OMAI Log Files:${NC}"
echo -e "  Main log: $LOG_DIR/omai-combined.log"
echo -e "  Error log: $LOG_DIR/omai-err.log"
echo -e "  Output log: $LOG_DIR/omai-out.log"

echo -e "\n${CYAN}OMAI Service Endpoints:${NC}"
echo -e "  Health: http://localhost:3000/api/omai/health"
echo -e "  Stats: http://localhost:3000/api/omai/stats"
echo -e "  Ask: POST http://localhost:3000/api/omai/ask"
echo -e "  AI Lab: Frontend -> Sandbox -> AI Lab"

echo -e "\n${CYAN}Next Steps:${NC}"
echo -e "  1. Test frontend connectivity via AI Lab"
echo -e "  2. Verify Component Inspector OMAI integration"
echo -e "  3. Check Service Management dashboard"
echo -e "  4. Monitor logs for any issues"

echo -e "\n${GREEN}🎉 OMAI Complete Service Startup finished!${NC}"
echo -e "${CYAN}To monitor: pm2 monit${NC}"
echo -e "${CYAN}To view logs: pm2 logs omai-background${NC}"
echo -e "${CYAN}To restart: pm2 restart omai-background${NC}" 