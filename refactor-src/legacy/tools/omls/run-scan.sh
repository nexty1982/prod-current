#!/bin/bash

# OMLS Component Scanner Runner
# This script provides easy access to the component scanner tool

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

echo -e "${BLUE}🚀 OMLS Component Scanner${NC}"
echo -e "${BLUE}========================${NC}"
echo ""

# Check if we're in the right directory
if [[ ! -f "$SCRIPT_DIR/package.json" ]]; then
    echo -e "${RED}❌ Error: package.json not found in $SCRIPT_DIR${NC}"
    echo "Please run this script from the omls directory"
    exit 1
fi

# Check if dependencies are installed
if [[ ! -d "$SCRIPT_DIR/node_modules" ]]; then
    echo -e "${YELLOW}⚠️  Dependencies not installed. Installing now...${NC}"
    cd "$SCRIPT_DIR"
    npm install
    echo ""
fi

# Check if tsx is available
if ! command -v tsx &> /dev/null; then
    echo -e "${YELLOW}⚠️  tsx not found globally. Checking local installation...${NC}"
    
    # Check if tsx is installed locally
    if [[ -f "$SCRIPT_DIR/node_modules/.bin/tsx" ]]; then
        echo -e "${GREEN}✅ Found local tsx installation${NC}"
        TSX_CMD="$SCRIPT_DIR/node_modules/.bin/tsx"
    else
        echo -e "${RED}❌ tsx not found locally either. Installing dependencies...${NC}"
        cd "$SCRIPT_DIR"
        npm install
        echo ""
        
        if [[ -f "$SCRIPT_DIR/node_modules/.bin/tsx" ]]; then
            echo -e "${GREEN}✅ tsx installed successfully${NC}"
            TSX_CMD="$SCRIPT_DIR/node_modules/.bin/tsx"
        else
            echo -e "${RED}❌ Failed to install tsx. Please check your Node.js installation${NC}"
            exit 1
        fi
    fi
else
    TSX_CMD="tsx"
fi

# Function to show help
show_help() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --dry-run          Show what would be changed without making changes"
    echo "  --verbose          Show detailed output"
    echo "  --output=FILE      Specify output file for component list"
    echo "  --help, -h         Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                 # Run full scan"
    echo "  $0 --dry-run       # Preview changes"
    echo "  $0 --verbose       # Detailed output"
    echo "  $0 --output=components.json"
    echo ""
}

# Parse command line arguments
DRY_RUN=""
VERBOSE=""
OUTPUT_FILE=""

while [[ $# -gt 0 ]]; do
    case $1 in
        --dry-run)
            DRY_RUN="--dry-run"
            shift
            ;;
        --verbose)
            VERBOSE="--verbose"
            shift
            ;;
        --output=*)
            OUTPUT_FILE="--output=${1#*=}"
            shift
            ;;
        --help|-h)
            show_help
            exit 0
            ;;
        *)
            echo -e "${RED}❌ Unknown option: $1${NC}"
            show_help
            exit 1
            ;;
    esac
done

# Build command
CMD="$TSX_CMD generateRefactoredMenu.ts"
if [[ -n "$DRY_RUN" ]]; then
    CMD="$CMD $DRY_RUN"
fi
if [[ -n "$VERBOSE" ]]; then
    CMD="$CMD $VERBOSE"
fi
if [[ -n "$OUTPUT_FILE" ]]; then
    CMD="$CMD $OUTPUT_FILE"
fi

echo -e "${GREEN}📍 Project Root:${NC} $PROJECT_ROOT"
echo -e "${GREEN}🔧 Script Directory:${NC} $SCRIPT_DIR"
echo -e "${GREEN}⚡ Command:${NC} $CMD"
echo ""

# Change to script directory and run
cd "$SCRIPT_DIR"

echo -e "${BLUE}🔍 Starting component scan...${NC}"
echo ""

# Run the command
if eval "$CMD"; then
    echo ""
    echo -e "${GREEN}✅ Component scan completed successfully!${NC}"
    
    if [[ -n "$DRY_RUN" ]]; then
        echo -e "${YELLOW}🔍 This was a dry run. No files were modified.${NC}"
    else
        echo -e "${GREEN}📝 Files have been updated. Restart your application to see changes.${NC}"
    fi
    
    # Show generated files
    if [[ -f "component-list.json" ]]; then
        echo -e "${GREEN}💾 Component list saved to: component-list.json${NC}"
    fi
    
    if [[ -f "../../menuConfig.ts" ]]; then
        echo -e "${GREEN}📋 Menu configuration updated: ../../menuConfig.ts${NC}"
    fi
    
else
    echo ""
    echo -e "${RED}❌ Component scan failed!${NC}"
    echo "Check the error messages above for details."
    exit 1
fi
