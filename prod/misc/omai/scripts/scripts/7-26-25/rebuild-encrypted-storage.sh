#!/bin/bash

# OrthodoxMetrics Big Book Encrypted Storage Rebuild Script
# Rebuilds the frontend with encrypted storage integration

set -e

echo "🔐 OrthodoxMetrics Big Book Encrypted Storage Rebuild"
echo "===================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Configuration
PROJECT_ROOT="$(pwd)"
FRONTEND_DIR="$PROJECT_ROOT/front-end"

# Check if we're in the right directory
if [ ! -f "server/index.js" ] || [ ! -f "front-end/package.json" ]; then
    print_error "Please run this script from the project root directory"
    exit 1
fi

print_status "Current directory: $PROJECT_ROOT"

# Step 1: Navigate to frontend directory
print_status "Navigating to frontend directory..."
cd "$FRONTEND_DIR"

if [ ! -f "package.json" ]; then
    print_error "Frontend package.json not found"
    exit 1
fi

print_success "Found frontend directory: $FRONTEND_DIR"

# Step 2: Clean previous build
print_status "Cleaning previous build..."

# Remove node_modules and package-lock.json
if [ -d "node_modules" ]; then
    print_status "Removing node_modules..."
    rm -rf node_modules
fi

if [ -f "package-lock.json" ]; then
    print_status "Removing package-lock.json..."
    rm -f package-lock.json
fi

# Remove dist directory
if [ -d "dist" ]; then
    print_status "Removing dist directory..."
    rm -rf dist
fi

print_success "Cleanup completed"

# Step 3: Install dependencies
print_status "Installing dependencies with --legacy-peer-deps..."

# Set NODE_OPTIONS for increased memory
export NODE_OPTIONS="--max-old-space-size=4096"

# Install dependencies
if npm install --legacy-peer-deps; then
    print_success "Dependencies installed successfully"
else
    print_error "Failed to install dependencies"
    exit 1
fi

# Step 4: Build the project
print_status "Building frontend with encrypted storage integration..."

# Build with increased memory
if npm run build; then
    print_success "Frontend build completed successfully"
else
    print_error "Frontend build failed"
    exit 1
fi

# Step 5: Verify build output
print_status "Verifying build output..."

if [ -d "dist" ] && [ -f "dist/index.html" ]; then
    print_success "Build output verified"
    
    # Show build size
    BUILD_SIZE=$(du -sh dist | cut -f1)
    print_status "Build size: $BUILD_SIZE"
else
    print_error "Build output verification failed"
    exit 1
fi

# Step 6: Check for encrypted storage components
print_status "Verifying encrypted storage components..."

# Check if encrypted storage files exist
ENCRYPTED_STORAGE_FILES=(
    "src/components/admin/EncryptedStoragePanel.tsx"
    "src/components/admin/OMBigBook.tsx"
)

MISSING_FILES=()
for file in "${ENCRYPTED_STORAGE_FILES[@]}"; do
    if [ ! -f "$file" ]; then
        MISSING_FILES+=("$file")
    fi
done

if [ ${#MISSING_FILES[@]} -eq 0 ]; then
    print_success "All encrypted storage components found"
else
    print_warning "Missing encrypted storage components:"
    for file in "${MISSING_FILES[@]}"; do
        echo "  - $file"
    done
fi

# Step 7: Check backend encrypted storage files
print_status "Checking backend encrypted storage files..."

cd "$PROJECT_ROOT"

BACKEND_ENCRYPTED_FILES=(
    "server/utils/encryptedStorage.js"
    "server/utils/logger.js"
    "server/routes/bigbook.js"
)

MISSING_BACKEND_FILES=()
for file in "${BACKEND_ENCRYPTED_FILES[@]}"; do
    if [ ! -f "$file" ]; then
        MISSING_BACKEND_FILES+=("$file")
    fi
done

if [ ${#MISSING_BACKEND_FILES[@]} -eq 0 ]; then
    print_success "All backend encrypted storage files found"
else
    print_warning "Missing backend encrypted storage files:"
    for file in "${MISSING_BACKEND_FILES[@]}"; do
        echo "  - $file"
    done
fi

# Step 8: Summary
print_success "Big Book Encrypted Storage Rebuild Complete!"
echo ""
echo "🔐 Encrypted Storage Features:"
echo "  • AES-256 encryption via eCryptFS"
echo "  • Secure file storage at /mnt/bigbook_secure"
echo "  • Files only accessible via Big Book interface"
echo "  • Automatic encryption/decryption"
echo "  • Key rotation and management"
echo "  • Storage status monitoring"
echo ""
echo "📁 New Components:"
echo "  • EncryptedStoragePanel.tsx - Storage management UI"
echo "  • encryptedStorage.js - Backend encryption utilities"
echo "  • Enhanced OMBigBook.tsx - Encrypted file handling"
echo "  • New API endpoints for storage management"
echo ""
echo "🔧 Setup Required:"
echo "  • Run: sudo ./setup-encrypted-storage.sh"
echo "  • Install eCryptFS: sudo apt-get install ecryptfs-utils"
echo "  • Mount volume: sudo bigbook-mount"
echo ""
echo "📖 Management Commands:"
echo "  bigbook-mount          - Mount encrypted volume"
echo "  bigbook-unmount        - Unmount encrypted volume"
echo "  bigbook-storage-status - Check storage status"
echo ""
print_success "Frontend rebuilt successfully with encrypted storage integration!" 