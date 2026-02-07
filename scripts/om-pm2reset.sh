#!/bin/bash
# OM PM2 Reset Script
# Purpose: Safely reset PM2 and restart all services from ecosystem.config.js
# Created: 2026-02-06

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
PROD_ROOT="/var/www/orthodoxmetrics/prod"
ECOSYSTEM_FILE="$PROD_ROOT/ecosystem.config.js"

echo -e "${BLUE}==========================================${NC}"
echo -e "${BLUE}OM PM2 Reset Script${NC}"
echo -e "${BLUE}==========================================${NC}"
echo ""

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo -e "${RED}❌ PM2 is not installed!${NC}"
    echo -e "${YELLOW}Install PM2 with: npm install -g pm2${NC}"
    exit 1
fi

# Check if ecosystem.config.js exists
if [ ! -f "$ECOSYSTEM_FILE" ]; then
    echo -e "${RED}❌ Ecosystem file not found: $ECOSYSTEM_FILE${NC}"
    exit 1
fi

echo -e "${GREEN}✅ PM2 is installed${NC}"
echo -e "${GREEN}✅ Ecosystem file found${NC}"
echo ""

# Step 1: Check current PM2 status
echo -e "${YELLOW}Step 1: Checking current PM2 status...${NC}"
echo ""

# Get list of running processes (exclude modules)
PM2_LIST=$(pm2 jlist 2>/dev/null || echo "[]")

# Count actual app processes (exclude empty array and filter out modules)
if [ "$PM2_LIST" = "[]" ]; then
    PROCESS_COUNT=0
else
    # Filter out PM2 modules (pm2-logrotate, pm2-server-monit, etc.)
    PROCESS_COUNT=$(echo "$PM2_LIST" | jq '[.[] | select(.name | startswith("pm2-") | not)] | length' 2>/dev/null || echo "0")
fi

# Show current status
pm2 list
echo ""

if [ "$PROCESS_COUNT" -eq 0 ]; then
    echo -e "${YELLOW}⚠️  No PM2 application processes running (modules excluded)${NC}"
    echo -e "${BLUE}Will start fresh with ecosystem.config.js${NC}"
    echo ""
else
    echo -e "${CYAN}Found $PROCESS_COUNT PM2 application process(es) running (excluding modules)${NC}"
    echo ""
    
    # Step 2: Stop all processes (but not modules)
    echo -e "${YELLOW}Step 2: Stopping all PM2 application processes...${NC}"
    
    # Get list of app names (excluding pm2-* modules)
    APP_NAMES=$(echo "$PM2_LIST" | jq -r '[.[] | select(.name | startswith("pm2-") | not)] | .[].name' 2>/dev/null)
    
    if [ -n "$APP_NAMES" ]; then
        while IFS= read -r app_name; do
            if [ -n "$app_name" ]; then
                echo -e "${CYAN}  Stopping: $app_name${NC}"
                pm2 stop "$app_name" 2>/dev/null || true
            fi
        done <<< "$APP_NAMES"
        echo -e "${GREEN}✅ All application processes stopped${NC}"
    else
        echo -e "${YELLOW}⚠️  No application processes to stop${NC}"
    fi
    echo ""
    
    # Step 3: Delete all processes (but not modules)
    echo -e "${YELLOW}Step 3: Deleting all PM2 application processes...${NC}"
    
    if [ -n "$APP_NAMES" ]; then
        while IFS= read -r app_name; do
            if [ -n "$app_name" ]; then
                echo -e "${CYAN}  Deleting: $app_name${NC}"
                pm2 delete "$app_name" 2>/dev/null || true
            fi
        done <<< "$APP_NAMES"
        echo -e "${GREEN}✅ All application processes deleted${NC}"
    else
        echo -e "${YELLOW}⚠️  No application processes to delete${NC}"
    fi
    echo ""
fi

# Step 4: Kill PM2 daemon and cleanup
echo -e "${YELLOW}Step 4: Performing PM2 cleanup...${NC}"

# Kill PM2 daemon
echo -e "${CYAN}Killing PM2 daemon...${NC}"
pm2 kill

# Clear PM2 logs
echo -e "${CYAN}Clearing PM2 logs...${NC}"
pm2 flush

# Clear PM2 dump file
echo -e "${CYAN}Clearing PM2 dump file...${NC}"
if [ -d "$HOME/.pm2" ]; then
    rm -f "$HOME/.pm2/dump.pm2"
fi

echo -e "${GREEN}✅ PM2 cleanup complete${NC}"
echo ""

# Wait a moment for PM2 daemon to fully shut down
echo -e "${CYAN}Waiting 2 seconds for PM2 to fully reset...${NC}"
sleep 2
echo ""

# Step 5: Pre-flight checks before starting services
echo -e "${YELLOW}Step 5: Pre-flight checks...${NC}"
cd "$PROD_ROOT"

# Check if backend is built
BACKEND_SCRIPT="$PROD_ROOT/server/dist/index.js"
BACKEND_NEEDS_BUILD=false

if [ ! -f "$BACKEND_SCRIPT" ]; then
    echo -e "${YELLOW}⚠️  Backend not built: $BACKEND_SCRIPT not found${NC}"
    BACKEND_NEEDS_BUILD=true
else
    echo -e "${GREEN}✅ Backend is built${NC}"
fi

# Check if om-librarian script exists
LIBRARIAN_SCRIPT="$PROD_ROOT/server/src/agents/omLibrarian.js"
if [ ! -f "$LIBRARIAN_SCRIPT" ]; then
    echo -e "${RED}❌ OM-Librarian script not found: $LIBRARIAN_SCRIPT${NC}"
else
    echo -e "${GREEN}✅ OM-Librarian script found${NC}"
fi
echo ""

# If backend needs building, offer to build it
if [ "$BACKEND_NEEDS_BUILD" = true ]; then
    echo -e "${YELLOW}Backend needs to be built before it can start.${NC}"
    echo -e "${CYAN}Build command: cd server && npm run build${NC}"
    echo ""
    read -p "Would you like to build the backend now? (y/N) " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}Building backend...${NC}"
        cd "$PROD_ROOT/server"
        
        # Check if node_modules exists
        if [ ! -d "node_modules" ]; then
            echo -e "${YELLOW}Installing dependencies first...${NC}"
            npm install
        fi
        
        npm run build
        
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✅ Backend built successfully${NC}"
            BACKEND_NEEDS_BUILD=false
        else
            echo -e "${RED}❌ Backend build failed!${NC}"
            echo -e "${YELLOW}You'll need to build it manually before the backend can start.${NC}"
        fi
        echo ""
        cd "$PROD_ROOT"
    else
        echo -e "${YELLOW}Skipping backend build. Backend will not start.${NC}"
        echo ""
    fi
fi

# Step 6: Start services from ecosystem.config.js
echo -e "${YELLOW}Step 6: Starting services from ecosystem.config.js...${NC}"

pm2 start "$ECOSYSTEM_FILE"
PM2_EXIT_CODE=$?

echo ""

# Check which services actually started
if [ "$PM2_EXIT_CODE" -eq 0 ]; then
    echo -e "${GREEN}✅ PM2 start command completed${NC}"
    
    # Check individual service status
    sleep 2
    
    BACKEND_STATUS=$(pm2 jlist 2>/dev/null | jq -r '.[] | select(.name=="orthodox-backend") | .pm2_env.status' 2>/dev/null || echo "not_found")
    LIBRARIAN_STATUS=$(pm2 jlist 2>/dev/null | jq -r '.[] | select(.name=="om-librarian") | .pm2_env.status' 2>/dev/null || echo "not_found")
    
    echo ""
    echo -e "${CYAN}Service Status:${NC}"
    
    if [ "$BACKEND_STATUS" = "online" ]; then
        echo -e "  ${GREEN}✅ orthodox-backend: online${NC}"
    elif [ "$BACKEND_STATUS" = "errored" ] || [ "$BACKEND_STATUS" = "stopped" ]; then
        echo -e "  ${RED}❌ orthodox-backend: $BACKEND_STATUS${NC}"
        if [ "$BACKEND_NEEDS_BUILD" = true ]; then
            echo -e "     ${YELLOW}Reason: Backend not built. Run: cd server && npm run build${NC}"
        fi
    else
        echo -e "  ${YELLOW}⚠️  orthodox-backend: $BACKEND_STATUS${NC}"
    fi
    
    if [ "$LIBRARIAN_STATUS" = "online" ]; then
        echo -e "  ${GREEN}✅ om-librarian: online${NC}"
    elif [ "$LIBRARIAN_STATUS" = "errored" ] || [ "$LIBRARIAN_STATUS" = "stopped" ]; then
        echo -e "  ${RED}❌ om-librarian: $LIBRARIAN_STATUS${NC}"
    else
        echo -e "  ${YELLOW}⚠️  om-librarian: $LIBRARIAN_STATUS${NC}"
    fi
else
    echo -e "${RED}❌ Failed to start services!${NC}"
    echo -e "${YELLOW}Check the errors above for details.${NC}"
fi
echo ""

# Wait for services to initialize
echo -e "${CYAN}Waiting 3 seconds for services to initialize...${NC}"
sleep 3
echo ""

# Step 7: Save PM2 configuration
echo -e "${YELLOW}Step 7: Saving PM2 configuration...${NC}"
pm2 save --force

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ PM2 configuration saved${NC}"
else
    echo -e "${YELLOW}⚠️  Warning: Failed to save PM2 configuration${NC}"
fi
echo ""

# Step 8: Enable PM2 startup on boot
echo -e "${YELLOW}Step 8: Configuring PM2 startup on boot...${NC}"

# Detect init system
if command -v systemctl &> /dev/null; then
    STARTUP_TYPE="systemd"
elif command -v initctl &> /dev/null; then
    STARTUP_TYPE="upstart"
else
    STARTUP_TYPE="systemv"
fi

echo -e "${CYAN}Detected init system: $STARTUP_TYPE${NC}"

# Generate startup script
STARTUP_OUTPUT=$(pm2 startup $STARTUP_TYPE -u $USER --hp $HOME 2>&1)

# Check if it asks us to run a command
if echo "$STARTUP_OUTPUT" | grep -q "sudo env"; then
    echo -e "${YELLOW}PM2 startup requires running a command with sudo:${NC}"
    echo ""
    echo "$STARTUP_OUTPUT" | grep "sudo env"
    echo ""
    echo -e "${CYAN}Attempting to execute the command...${NC}"
    
    # Extract and execute the sudo command
    SUDO_CMD=$(echo "$STARTUP_OUTPUT" | grep "sudo env" | sed 's/\[PM2\] //')
    
    if [ -n "$SUDO_CMD" ]; then
        eval "$SUDO_CMD"
        
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✅ PM2 startup configured successfully${NC}"
        else
            echo -e "${YELLOW}⚠️  Warning: Manual sudo command execution may be required${NC}"
            echo -e "${YELLOW}Run this command manually:${NC}"
            echo "$SUDO_CMD"
        fi
    fi
else
    echo -e "${GREEN}✅ PM2 startup already configured or updated${NC}"
fi
echo ""

# Step 9: Display final status
echo -e "${YELLOW}Step 9: Final PM2 status:${NC}"
echo ""
pm2 list
echo ""

# Show logs location for applications (not modules)
echo -e "${CYAN}Application Logs:${NC}"
APP_LIST=$(pm2 jlist 2>/dev/null | jq -r '[.[] | select(.name | startswith("pm2-") | not)] | .[].name' 2>/dev/null)

if [ -n "$APP_LIST" ]; then
    while IFS= read -r app_name; do
        if [ -n "$app_name" ]; then
            LOG_PATH=$(pm2 show "$app_name" 2>/dev/null | grep "out log path" | awk '{print $NF}')
            if [ -n "$LOG_PATH" ]; then
                echo -e "  ${BLUE}$app_name${NC}: $LOG_PATH"
            fi
        fi
    done <<< "$APP_LIST"
else
    echo -e "  ${YELLOW}(No application logs - no apps running)${NC}"
fi
echo ""

echo -e "${CYAN}Note: PM2 modules (pm2-logrotate, pm2-server-monit) are preserved and continue running${NC}"
echo ""

# Summary
echo -e "${BLUE}==========================================${NC}"
echo -e "${BLUE}PM2 Reset Complete!${NC}"
echo -e "${BLUE}==========================================${NC}"
echo ""
echo -e "${GREEN}✅ All PM2 application processes stopped and deleted${NC}"
echo -e "${GREEN}✅ PM2 modules preserved (pm2-logrotate, pm2-server-monit)${NC}"
echo -e "${GREEN}✅ PM2 daemon cleaned and restarted${NC}"
echo -e "${GREEN}✅ Services started from ecosystem.config.js${NC}"
echo -e "${GREEN}✅ PM2 configuration saved${NC}"
echo -e "${GREEN}✅ PM2 startup on boot configured${NC}"
echo ""
echo -e "${YELLOW}Useful Commands:${NC}"
echo -e "  ${CYAN}pm2 list${NC}           - List all processes"
echo -e "  ${CYAN}pm2 logs${NC}           - View all logs"
echo -e "  ${CYAN}pm2 logs <app>${NC}     - View specific app logs"
echo -e "  ${CYAN}pm2 restart all${NC}    - Restart all processes"
echo -e "  ${CYAN}pm2 reload all${NC}     - Zero-downtime reload"
echo -e "  ${CYAN}pm2 stop all${NC}       - Stop all processes"
echo ""

# Check if any services failed and provide help
FAILED_SERVICES=$(pm2 jlist 2>/dev/null | jq -r '[.[] | select(.name | startswith("pm2-") | not) | select(.pm2_env.status != "online")] | length' 2>/dev/null || echo "0")

if [ "$FAILED_SERVICES" -gt 0 ]; then
    echo -e "${YELLOW}⚠️  Some services are not online. Common fixes:${NC}"
    echo ""
    echo -e "${YELLOW}If orthodox-backend failed to start:${NC}"
    echo -e "  1. Build the backend:"
    echo -e "     ${CYAN}cd /var/www/orthodoxmetrics/prod/server${NC}"
    echo -e "     ${CYAN}npm install${NC}"
    echo -e "     ${CYAN}npm run build${NC}"
    echo -e "  2. Then restart it:"
    echo -e "     ${CYAN}pm2 restart orthodox-backend${NC}"
    echo ""
    echo -e "${YELLOW}If om-librarian failed to start:${NC}"
    echo -e "  - Check logs: ${CYAN}pm2 logs om-librarian${NC}"
    echo -e "  - Restart it: ${CYAN}pm2 restart om-librarian${NC}"
    echo ""
else
    echo -e "${GREEN}All services are now running!${NC}"
fi

echo -e "${BLUE}==========================================${NC}"
