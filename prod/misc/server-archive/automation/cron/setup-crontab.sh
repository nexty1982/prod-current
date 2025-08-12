#!/bin/bash
# Setup script for Orthodox Headlines aggregation crontab
# This script configures OS-level cron to run the headlines aggregation every 6 hours

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVER_DIR="$(dirname "$SCRIPT_DIR")"
NODE_PATH=$(which node)
CRON_USER="${CRON_USER:-$(whoami)}"
LOG_DIR="$SERVER_DIR/logs"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🗞️ Orthodox Headlines Crontab Setup${NC}"
echo "=================================================="
echo ""

# Verify Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed or not in PATH${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Node.js found:${NC} $NODE_PATH"

# Verify script exists
HEADLINES_SCRIPT="$SERVER_DIR/cron/fetch-headlines.js"
if [ ! -f "$HEADLINES_SCRIPT" ]; then
    echo -e "${RED}❌ Headlines script not found:${NC} $HEADLINES_SCRIPT"
    exit 1
fi

echo -e "${GREEN}✅ Headlines script found:${NC} $HEADLINES_SCRIPT"

# Create logs directory
mkdir -p "$LOG_DIR"
echo -e "${GREEN}✅ Log directory created:${NC} $LOG_DIR"

# Create the cron job entry
CRON_ENTRY="0 */6 * * * cd $SERVER_DIR && $NODE_PATH $HEADLINES_SCRIPT test >> $LOG_DIR/headlines-cron.log 2>&1"

echo ""
echo -e "${YELLOW}📋 Cron job configuration:${NC}"
echo "   Schedule: Every 6 hours (0 */6 * * *)"
echo "   Script: $HEADLINES_SCRIPT"
echo "   Log file: $LOG_DIR/headlines-cron.log"
echo "   User: $CRON_USER"
echo ""

# Check if cron job already exists
if crontab -l 2>/dev/null | grep -q "fetch-headlines.js"; then
    echo -e "${YELLOW}⚠️ Cron job already exists. Removing old version...${NC}"
    crontab -l 2>/dev/null | grep -v "fetch-headlines.js" | crontab -
fi

# Add the new cron job
echo -e "${BLUE}📅 Adding cron job...${NC}"
(crontab -l 2>/dev/null; echo "$CRON_ENTRY") | crontab -

# Verify cron job was added
if crontab -l 2>/dev/null | grep -q "fetch-headlines.js"; then
    echo -e "${GREEN}✅ Cron job added successfully!${NC}"
    echo ""
    echo -e "${BLUE}📊 Current crontab:${NC}"
    crontab -l | grep "fetch-headlines.js" | sed 's/^/   /'
else
    echo -e "${RED}❌ Failed to add cron job${NC}"
    exit 1
fi

# Test the headlines script
echo ""
echo -e "${BLUE}🧪 Testing headlines aggregation script...${NC}"
if cd "$SERVER_DIR" && timeout 60 "$NODE_PATH" "$HEADLINES_SCRIPT" test; then
    echo -e "${GREEN}✅ Test completed successfully${NC}"
else
    echo -e "${YELLOW}⚠️ Test had issues (timeout after 60s or error)${NC}"
    echo -e "${YELLOW}   Check the logs for details${NC}"
fi

# Display next run time
echo ""
echo -e "${BLUE}⏰ Cron Schedule Information:${NC}"
echo "   Pattern: 0 */6 * * * (every 6 hours)"
echo "   Next runs today:"

# Calculate next run times
current_hour=$(date +%H)
for hour in 0 6 12 18; do
    if [ $hour -gt $current_hour ]; then
        next_time=$(date -d "today $hour:00" '+%H:%M %Z')
        echo "   - $next_time"
    elif [ $hour -eq 0 ]; then
        next_time=$(date -d "tomorrow $hour:00" '+%H:%M %Z')
        echo "   - $next_time (tomorrow)"
    fi
done

echo ""
echo -e "${BLUE}📋 Management Commands:${NC}"
echo "   View crontab:     crontab -l"
echo "   Edit crontab:     crontab -e"
echo "   Remove cron job:  crontab -l | grep -v fetch-headlines.js | crontab -"
echo "   View logs:        tail -f $LOG_DIR/headlines-cron.log"
echo "   Test manually:    cd $SERVER_DIR && node cron/fetch-headlines.js test"

echo ""
echo -e "${BLUE}🔍 Monitoring:${NC}"
echo "   Log file: $LOG_DIR/headlines-cron.log"
echo "   Check status: ps aux | grep fetch-headlines"
echo "   Cron status: service cron status (or systemctl status cron)"

echo ""
echo -e "${GREEN}🎉 Setup completed successfully!${NC}"
echo -e "${GREEN}   Orthodox Headlines will be aggregated every 6 hours${NC}"
echo "" 