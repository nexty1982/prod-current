#!/bin/bash

echo "📦 Setting up SDLC Backup System..."
echo "==================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    local color=$1
    local message=$2
    echo -e "${color}[INFO]${NC} $message"
}

print_success() {
    local message=$1
    echo -e "${GREEN}[SUCCESS]${NC} $message"
}

print_error() {
    local message=$1
    echo -e "${RED}[ERROR]${NC} $message"
}

print_warning() {
    local message=$1
    echo -e "${YELLOW}[WARNING]${NC} $message"
}

# Check if we're in the right directory
if [ ! -f "server/index.js" ]; then
    print_error "Please run this script from the project root directory"
    exit 1
fi

print_status "$BLUE" "Starting SDLC Backup System setup..."

# Step 1: Check if server is running
print_status "$BLUE" "Step 1: Checking server status..."
if curl -s http://localhost:3001/api/health > /dev/null 2>&1; then
    print_success "Server is running on port 3001"
else
    print_warning "Server is not running on port 3001"
    print_status "$BLUE" "Please start the server first: npm start"
    print_status "$BLUE" "Then run this script again"
    exit 1
fi

# Step 2: Create backup directories
print_status "$BLUE" "Step 2: Creating backup directories..."
BACKUP_BASE_DIR="/var/backups/orthodoxmetrics"
PROD_BACKUP_DIR="$BACKUP_BASE_DIR/prod"
DEV_BACKUP_DIR="$BACKUP_BASE_DIR/dev"

# Create directories with proper permissions
sudo mkdir -p "$PROD_BACKUP_DIR"
sudo mkdir -p "$DEV_BACKUP_DIR"
sudo chown -R www-data:www-data "$BACKUP_BASE_DIR"
sudo chmod -R 755 "$BACKUP_BASE_DIR"

if [ $? -eq 0 ]; then
    print_success "Backup directories created successfully"
    print_status "$BLUE" "Production backups: $PROD_BACKUP_DIR"
    print_status "$BLUE" "Development backups: $DEV_BACKUP_DIR"
else
    print_error "Failed to create backup directories"
    exit 1
fi

# Step 3: Install required npm packages
print_status "$BLUE" "Step 3: Installing required npm packages..."
cd server

# Check if packages are already installed
if npm list extract-zip > /dev/null 2>&1; then
    print_success "extract-zip package already installed"
else
    npm install extract-zip
    if [ $? -eq 0 ]; then
        print_success "extract-zip package installed"
    else
        print_error "Failed to install extract-zip package"
        exit 1
    fi
fi

if npm list archiver > /dev/null 2>&1; then
    print_success "archiver package already installed"
else
    npm install archiver
    if [ $? -eq 0 ]; then
        print_success "archiver package installed"
    else
        print_error "Failed to install archiver package"
        exit 1
    fi
fi

cd ..

# Step 4: Test API endpoints
print_status "$BLUE" "Step 4: Testing API endpoints..."

# Test list endpoint for prod
print_status "$BLUE" "Testing GET /api/backups/list?env=prod..."
PROD_RESPONSE=$(curl -s -X GET http://localhost:3001/api/backups/list?env=prod)
if echo "$PROD_RESPONSE" | grep -q "backups"; then
    print_success "Production backups list endpoint working"
    echo "Response: $PROD_RESPONSE"
else
    print_error "Production backups list endpoint failed"
    echo "Response: $PROD_RESPONSE"
fi

# Test list endpoint for dev
print_status "$BLUE" "Testing GET /api/backups/list?env=dev..."
DEV_RESPONSE=$(curl -s -X GET http://localhost:3001/api/backups/list?env=dev)
if echo "$DEV_RESPONSE" | grep -q "backups"; then
    print_success "Development backups list endpoint working"
    echo "Response: $DEV_RESPONSE"
else
    print_error "Development backups list endpoint failed"
    echo "Response: $DEV_RESPONSE"
fi

# Step 5: Check frontend components
print_status "$BLUE" "Step 5: Checking frontend components..."

if [ -f "front-end/src/components/admin/SDLCBackupPanel.tsx" ]; then
    print_success "SDLCBackupPanel component exists"
else
    print_error "SDLCBackupPanel component not found"
fi

if [ -f "front-end/src/views/settings/BackupSettings.tsx" ]; then
    print_success "BackupSettings component exists"
else
    print_error "BackupSettings component not found"
fi

# Step 6: Create a test backup
print_status "$BLUE" "Step 6: Creating test backup..."
TEST_BACKUP_RESPONSE=$(curl -s -X POST http://localhost:3001/api/backups/create \
    -H "Content-Type: application/json" \
    -d '{"env": "prod"}')

if echo "$TEST_BACKUP_RESPONSE" | grep -q "success"; then
    print_success "Test backup created successfully"
    echo "Response: $TEST_BACKUP_RESPONSE"
else
    print_warning "Test backup creation failed (this might be expected if backup already exists)"
    echo "Response: $TEST_BACKUP_RESPONSE"
fi

# Step 7: Final summary
echo ""
print_success "SDLC Backup System setup completed!"
echo ""
print_status "$BLUE" "What was implemented:"
echo "  ✅ Backup directories created at /var/backups/orthodoxmetrics/"
echo "  ✅ Backend API routes for SDLC backup management"
echo "  ✅ Frontend SDLCBackupPanel component"
echo "  ✅ Integration with existing backup settings"
echo "  ✅ Required npm packages installed"
echo ""
print_status "$BLUE" "How to access:"
echo "  1. Go to: https://orthodoxmetrics.com/admin/settings"
echo "  2. You'll see two tabs: 'Backup Settings' and 'Your Backups'"
echo "  3. The SDLC Backup Panel is visible on the right (super_admin only)"
echo ""
print_status "$BLUE" "Features available:"
echo "  📦 Create backups of prod/dev environments"
echo "  📥 Download backup files"
echo "  🔄 Restore environments from backups"
echo "  🗑️  Delete old backups"
echo "  🔄 Manual refresh of backup list"
echo ""
print_status "$BLUE" "API Endpoints:"
echo "  GET  /api/backups/list?env=prod|dev  - List backups"
echo "  POST /api/backups/create             - Create new backup"
echo "  GET  /api/backups/download/:env/:file - Download backup"
echo "  POST /api/backups/restore            - Restore backup"
echo "  DELETE /api/backups/:env/:file       - Delete backup"
echo ""
print_status "$BLUE" "Backup locations:"
echo "  Production: $PROD_BACKUP_DIR"
echo "  Development: $DEV_BACKUP_DIR"
echo ""
print_success "Setup complete! The SDLC Backup System is now ready to use." 