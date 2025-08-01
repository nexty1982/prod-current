#!/bin/bash

# Fix Frontend Dependencies
echo "🔧 Fixing Frontend Dependencies..."

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
if [ ! -f "front-end/package.json" ]; then
    print_error "Please run this script from the OrthodoxMetrics project root directory"
    exit 1
fi

print_status "Fixing frontend dependencies..."
cd front-end

# Remove node_modules and package-lock.json
print_status "Removing existing node_modules..."
rm -rf node_modules package-lock.json

# Clear npm cache
print_status "Clearing npm cache..."
npm cache clean --force

# Reinstall dependencies with legacy peer deps
print_status "Reinstalling frontend dependencies..."
npm install --legacy-peer-deps

if [ $? -eq 0 ]; then
    print_success "Frontend dependencies fixed!"
else
    print_error "Failed to install frontend dependencies"
    exit 1
fi

cd ..

print_success "Frontend dependencies have been fixed!"
echo ""
echo "Next steps:"
echo "1. Try starting the system again: ./start-calendar-system.sh"
echo "" 