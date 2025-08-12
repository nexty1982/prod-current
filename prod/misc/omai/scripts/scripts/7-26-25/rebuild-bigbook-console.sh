#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔄 Rebuilding Big Book Console Frontend...${NC}"

# Navigate to front-end directory
cd front-end

echo -e "${YELLOW}📁 Current directory: $(pwd)${NC}"

# Check if package.json exists
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ package.json not found. Please run this script from the project root.${NC}"
    exit 1
fi

echo -e "${YELLOW}🧹 Cleaning previous build artifacts...${NC}"

# Remove node_modules if it exists
if [ -d "node_modules" ]; then
    echo "Removing node_modules..."
    rm -rf node_modules
    echo -e "${GREEN}✅ node_modules removed${NC}"
fi

# Remove package-lock.json if it exists
if [ -f "package-lock.json" ]; then
    echo "Removing package-lock.json..."
    rm -f package-lock.json
    echo -e "${GREEN}✅ package-lock.json removed${NC}"
fi

# Remove dist directory if it exists
if [ -d "dist" ]; then
    echo "Removing dist directory..."
    rm -rf dist
    echo -e "${GREEN}✅ dist directory removed${NC}"
fi

echo -e "${YELLOW}📦 Installing dependencies...${NC}"
echo "Running npm install with legacy peer deps..."

if npm install --legacy-peer-deps; then
    echo -e "${GREEN}✅ Dependencies installed successfully${NC}"
else
    echo -e "${RED}❌ Failed to install dependencies${NC}"
    exit 1
fi

echo -e "${YELLOW}🏗️ Building Big Book Console...${NC}"
echo "Setting NODE_OPTIONS for increased memory..."

# Set environment variable for increased memory
export NODE_OPTIONS="--max-old-space-size=4096"

echo "Running npm run build..."

if npm run build; then
    echo -e "${GREEN}✅ Build completed successfully!${NC}"
    
    echo -e "${BLUE}📊 Build Summary:${NC}"
    echo -e "${GREEN}🎉 Big Book Console has been rebuilt and is ready for deployment${NC}"
    echo -e "${GREEN}📚 New dual-panel layout with file list and preview pane${NC}"
    echo -e "${GREEN}🔍 File search and filtering capabilities${NC}"
    echo -e "${GREEN}📖 Markdown, JSON, and code syntax highlighting${NC}"
    echo -e "${GREEN}⚡ Collapsible console output${NC}"
    
    # Check if dist directory was created
    if [ -d "dist" ]; then
        dist_size=$(du -sh dist | cut -f1)
        echo -e "${GREEN}📁 Build output size: ${dist_size}${NC}"
    fi
    
    echo -e "${GREEN}"
    echo "=================================================="
    echo "🎉 Big Book Console rebuild completed successfully!"
    echo "=================================================="
    echo -e "${NC}"
    
else
    echo -e "${RED}❌ Build failed!${NC}"
    exit 1
fi 