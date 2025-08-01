#!/bin/bash

# OMAI System Startup Script
# Initializes and starts the OMAI background service

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="${PROJECT_ROOT:-$(dirname "$SCRIPT_DIR")}"
LOG_DIR="$PROJECT_ROOT/logs"
OMAI_LOG_DIR="$LOG_DIR/omai"
PM2_CONFIG="$PROJECT_ROOT/ecosystem.config.js"

echo -e "${BLUE}🚀 Starting OMAI System...${NC}"

# Debug: Show paths
echo -e "${YELLOW}🔍 Debug Info:${NC}"
echo "  Script Directory: $SCRIPT_DIR"
echo "  Project Root: $PROJECT_ROOT"
echo "  PM2 Config: $PM2_CONFIG"

# Create log directories
echo -e "${YELLOW}📁 Creating log directories...${NC}"
mkdir -p "$LOG_DIR"
mkdir -p "$OMAI_LOG_DIR"

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo -e "${RED}❌ PM2 is not installed. Please install PM2 first:${NC}"
    echo "npm install -g pm2"
    exit 1
fi

# Check if the ecosystem config exists
if [ ! -f "$PM2_CONFIG" ]; then
    echo -e "${RED}❌ PM2 ecosystem config not found at: $PM2_CONFIG${NC}"
    exit 1
fi

# Stop existing OMAI processes if running
echo -e "${YELLOW}🛑 Stopping existing OMAI processes...${NC}"
pm2 stop omai-background 2>/dev/null || true
pm2 delete omai-background 2>/dev/null || true

# Start the OMAI background service
echo -e "${YELLOW}🚀 Starting OMAI background service...${NC}"
cd "$PROJECT_ROOT"
pm2 start ecosystem.config.js --only omai-background

# Wait a moment for the service to start
sleep 3

# Check if the service started successfully
if pm2 list | grep -q "omai-background.*online"; then
    echo -e "${GREEN}✅ OMAI background service started successfully${NC}"
else
    echo -e "${RED}❌ Failed to start OMAI background service${NC}"
    echo -e "${YELLOW}📋 Checking PM2 logs...${NC}"
    pm2 logs omai-background --lines 20
    exit 1
fi

# Show service status
echo -e "${BLUE}📊 OMAI System Status:${NC}"
pm2 list | grep omai-background

# Show log file locations
echo -e "${BLUE}📋 Log files:${NC}"
echo "  - OMAI Logs: $OMAI_LOG_DIR/omai.log"
echo "  - PM2 Logs: $LOG_DIR/omai-*.log"

# Test the OMAI API endpoints
echo -e "${YELLOW}🧪 Testing OMAI API endpoints...${NC}"

# Wait for the service to be ready
sleep 5

# Test health endpoint
if curl -s http://localhost:3001/api/omai/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ OMAI health endpoint is responding${NC}"
else
    echo -e "${YELLOW}⚠️  OMAI health endpoint not responding (service may still be starting)${NC}"
fi

# Test stats endpoint
if curl -s http://localhost:3001/api/omai/stats > /dev/null 2>&1; then
    echo -e "${GREEN}✅ OMAI stats endpoint is responding${NC}"
else
    echo -e "${YELLOW}⚠️  OMAI stats endpoint not responding${NC}"
fi

echo -e "${GREEN}🎉 OMAI System startup completed!${NC}"
echo -e "${BLUE}📖 Useful commands:${NC}"
echo "  - View logs: pm2 logs omai-background"
echo "  - Restart: pm2 restart omai-background"
echo "  - Stop: pm2 stop omai-background"
echo "  - Status: pm2 list | grep omai-background"

# Save PM2 configuration
pm2 save

echo -e "${GREEN}✅ PM2 configuration saved${NC}" 