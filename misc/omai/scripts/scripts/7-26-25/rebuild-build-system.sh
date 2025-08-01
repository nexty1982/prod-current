#!/bin/bash

# OrthodoxMetrics Build System Rebuild Script
# This script rebuilds the frontend after implementing the new build system

set -e

echo "🔨 Starting OrthodoxMetrics Build System rebuild..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Navigate to front-end directory
print_status "Navigating to front-end directory..."
cd front-end

# Clean previous build artifacts
print_status "Cleaning previous build artifacts..."
rm -rf node_modules package-lock.json dist

# Install dependencies with legacy peer deps
print_status "Installing dependencies with --legacy-peer-deps..."
export NODE_OPTIONS="--max-old-space-size=4096"
npm install --legacy-peer-deps

# Build the application
print_status "Building application with increased memory..."
npm run build

# Check if build was successful
if [ $? -eq 0 ]; then
    print_success "Build completed successfully!"
    print_success "New Build System features implemented:"
    echo "  • Build configuration management"
    echo "  • CLI and Web UI build triggers"
    echo "  • Build history and logging"
    echo "  • Memory and dependency control"
    echo "  • Dry run mode support"
    echo "  • Real-time build status monitoring"
    echo ""
    print_success "Access the Build Console at: /admin/build"
    print_success "CLI usage: node scripts/build.js [--ui] [--help]"
else
    print_error "Build failed!"
    exit 1
fi

print_status "Build system rebuild completed successfully!" 