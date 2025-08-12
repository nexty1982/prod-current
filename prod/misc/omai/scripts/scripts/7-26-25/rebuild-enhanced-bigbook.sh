#!/bin/bash

# Enhanced Big Book Console Rebuild Script
# Rebuilds the frontend with new file console, settings panel, and OMAI integration features

echo "🚀 Starting Enhanced Big Book Console rebuild..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Navigate to front-end directory
cd front-end || {
    echo -e "${RED}❌ Error: front-end directory not found${NC}"
    exit 1
}

echo -e "${BLUE}📁 Working directory: $(pwd)${NC}"

# Clean previous build artifacts
echo -e "${YELLOW}🧹 Cleaning previous build artifacts...${NC}"
rm -rf node_modules package-lock.json dist

# Install dependencies with legacy peer deps
echo -e "${YELLOW}📦 Installing dependencies...${NC}"
npm install --legacy-peer-deps

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Error: npm install failed${NC}"
    exit 1
fi

# Build with increased memory allocation
echo -e "${YELLOW}🔨 Building enhanced Big Book console...${NC}"
NODE_OPTIONS="--max-old-space-size=4096" npm run build

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Enhanced Big Book Console build completed successfully!${NC}"
    echo -e "${BLUE}🎉 New features available:${NC}"
    echo -e "   • 📁 Interactive file explorer with search"
    echo -e "   • 👁️  Enhanced file preview with syntax highlighting"
    echo -e "   • ⚙️  Comprehensive settings panel"
    echo -e "   • 🧠 OMAI integration settings"
    echo -e "   • 🎨 Dark/light mode console"
    echo -e "   • 📊 File size limits and preview modes"
    echo -e "   • 🔧 Execution preferences and dry-run mode"
else
    echo -e "${RED}❌ Build failed! Check the error messages above.${NC}"
    exit 1
fi

echo -e "${GREEN}🎯 Ready to test the enhanced Big Book Console!${NC}" 