#!/bin/bash

# Cleanup JIT Terminal Scripts
# Remove excessive scripts and keep only essential ones

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

PROJECT_ROOT="/var/www/orthodox-church-mgmt/orthodoxmetrics/prod"

echo -e "${BLUE}🧹 Cleaning Up JIT Terminal Scripts${NC}"
echo -e "${BLUE}==================================${NC}"

# Navigate to project directory
cd "$PROJECT_ROOT"

echo -e "${YELLOW}📁 Current directory: $(pwd)${NC}"

# List all JIT-related scripts
echo -e "${YELLOW}📋 Current JIT-related scripts:${NC}"
ls -la scripts/*jit* 2>/dev/null || echo "No JIT scripts found"

# Define scripts to keep (essential ones)
KEEP_SCRIPTS=(
    "diagnose-jit-terminal-root-cause.sh"
    "cleanup-jit-scripts.sh"
)

# Define scripts to remove (excessive ones)
REMOVE_SCRIPTS=(
    "check-backend-logs.sh"
    "check-backend-status.sh"
    "check-server-status.sh"
    "debug-server-crash.sh"
    "debug-server-issues.sh"
    "diagnose-backend-issues.sh"
    "final-backend-fix.sh"
    "fix-backend-now.sh"
    "fix-jit-and-restart.sh"
    "fix-jit-routes.sh"
    "fix-jit-terminal-connection.sh"
    "fix-jit-terminal-menu-duplication.sh"
    "fix-omai-import.sh"
    "fix-omai-imports.sh"
    "fix-production-jit-and-omai.sh"
    "restart-after-fix.sh"
    "restart-backend-server.sh"
    "restart-backend-with-stubs.sh"
    "restart-with-fixed-jit.sh"
    "restart-with-jit-routes.sh"
    "start-jit-terminal.sh"
    "switch-to-production.sh"
    "test-jit-terminal.sh"
    "test-jit-terminal-working.sh"
    "test-omai-endpoints.sh"
    "test-omai-final.sh"
    "test-omai-frontend.sh"
    "verify-production-mode.sh"
)

echo -e "${YELLOW}🗑️  Scripts to remove (excessive):${NC}"
for script in "${REMOVE_SCRIPTS[@]}"; do
    if [ -f "scripts/$script" ]; then
        echo -e "${RED}  - $script${NC}"
    fi
done

echo -e "${YELLOW}💾 Scripts to keep (essential):${NC}"
for script in "${KEEP_SCRIPTS[@]}"; do
    if [ -f "scripts/$script" ]; then
        echo -e "${GREEN}  + $script${NC}"
    fi
done

# Ask for confirmation
echo ""
echo -e "${YELLOW}⚠️  This will remove ${#REMOVE_SCRIPTS[@]} excessive scripts${NC}"
echo -e "${YELLOW}💾 Keep ${#KEEP_SCRIPTS[@]} essential scripts${NC}"
echo ""
read -p "Do you want to proceed with cleanup? (y/N): " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}🗑️  Removing excessive scripts...${NC}"
    
    for script in "${REMOVE_SCRIPTS[@]}"; do
        if [ -f "scripts/$script" ]; then
            rm "scripts/$script"
            echo -e "${RED}  Removed: $script${NC}"
        fi
    done
    
    echo -e "${GREEN}✅ Cleanup complete!${NC}"
    echo ""
    echo -e "${BLUE}📋 Remaining scripts:${NC}"
    ls -la scripts/*jit* 2>/dev/null || echo "No JIT scripts remaining"
    echo ""
    echo -e "${YELLOW}💡 Now you have a clean, focused approach:${NC}"
    echo "• Use 'diagnose-jit-terminal-root-cause.sh' to identify issues"
    echo "• Apply targeted fixes based on the diagnosis"
    echo "• No more script confusion!"
else
    echo -e "${YELLOW}❌ Cleanup cancelled${NC}"
fi

echo ""
echo -e "${GREEN}🎯 Script Management Complete!${NC}" 