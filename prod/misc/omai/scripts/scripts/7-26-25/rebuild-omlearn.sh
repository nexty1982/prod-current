#!/bin/bash

# OMLearn Module Rebuild Script
# Rebuilds the frontend after adding the OMLearn module

echo "🧠 Rebuilding Frontend for OMLearn Module"
echo "=========================================="

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_ok() { echo -e "${GREEN}✅ $1${NC}"; }
print_warn() { echo -e "${YELLOW}⚠️  $1${NC}"; }
print_error() { echo -e "${RED}❌ $1${NC}"; }
print_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }

# Check if we're in the right directory
if [ ! -f "front-end/package.json" ]; then
    print_error "Please run this script from the project root directory"
    exit 1
fi

print_info "Starting frontend rebuild process..."

# Navigate to frontend directory
cd front-end

# Clean node_modules and reinstall
print_info "Cleaning and reinstalling dependencies..."
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps

if [ $? -eq 0 ]; then
    print_ok "Dependencies installed successfully"
else
    print_error "Failed to install dependencies"
    exit 1
fi

# Build the frontend
print_info "Building frontend with OMLearn module..."
export NODE_OPTIONS="--max-old-space-size=4096"
npm run build

if [ $? -eq 0 ]; then
    print_ok "Frontend built successfully with OMLearn module"
else
    print_error "Frontend build failed"
    exit 1
fi

# Return to root directory
cd ..

print_ok "OMLearn Module Integration Complete!"
echo ""
print_info "Access your OMLearn module at:"
echo "   🌐 https://orthodoxmetrics.com/bigbook/omlearn"
echo ""
print_info "Features available:"
echo "   📊 Grade group selection (K-2, 3-5, 6-8, 9-12)"
echo "   📝 Dynamic survey questions"
echo "   💾 Progress tracking and session management"
echo "   🧠 Reasoning prompts and analysis"
echo "   📈 Progress visualization"
echo ""
print_info "Next steps:"
echo "   1. Restart your development server"
echo "   2. Navigate to the OMLearn URL"
echo "   3. Test survey functionality"
echo "   4. Check localStorage for data persistence"
echo ""
print_info "Future enhancements:"
echo "   🔗 Backend API integration"
echo "   🤖 OMAI analysis and insights"
echo "   📊 Advanced analytics dashboard"
echo "   🔄 Real-time sync with omai_memories" 