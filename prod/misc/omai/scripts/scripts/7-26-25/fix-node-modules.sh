#!/bin/bash

# Fix Node.js Module Version Mismatch
echo "🔧 Fixing Node.js Module Version Mismatch..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "server/package.json" ] || [ ! -f "front-end/package.json" ]; then
    print_error "Please run this script from the OrthodoxMetrics project root directory"
    exit 1
fi

print_status "Current Node.js version: $(node --version)"
print_status "Current npm version: $(npm --version)"

# Fix backend dependencies
print_status "Fixing backend dependencies..."
cd server

# Remove node_modules and package-lock.json
print_status "Removing existing node_modules..."
rm -rf node_modules package-lock.json

# Clear npm cache
print_status "Clearing npm cache..."
npm cache clean --force

# Reinstall dependencies
print_status "Reinstalling backend dependencies..."
npm install

# Rebuild native modules
print_status "Rebuilding native modules..."
npm rebuild

# Check for canvas specifically
if [ -d "node_modules/canvas" ]; then
    print_status "Rebuilding canvas module..."
    cd node_modules/canvas
    npm rebuild
    cd ../..
fi

print_success "Backend dependencies fixed!"

# Fix frontend dependencies
print_status "Fixing frontend dependencies..."
cd ../front-end

# Remove node_modules and package-lock.json
print_status "Removing existing node_modules..."
rm -rf node_modules package-lock.json

# Clear npm cache
print_status "Clearing npm cache..."
npm cache clean --force

# Reinstall dependencies with legacy peer deps
print_status "Reinstalling frontend dependencies..."
npm install --legacy-peer-deps

print_success "Frontend dependencies fixed!"

cd ..

print_success "All dependencies have been fixed!"
echo ""
echo "Next steps:"
echo "1. Try starting the system again: ./start-calendar-system.sh"
echo "2. If issues persist, you may need to update Node.js to match the module versions"
echo ""
echo "Current Node.js version: $(node --version)"
echo "If you need to update Node.js, consider using nvm:"
echo "  nvm install 18"
echo "  nvm use 18" 