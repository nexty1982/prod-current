#!/bin/bash

# Test Cursor AI Status Panel
echo "🧠 Testing Cursor AI Status Panel..."
echo "====================================="

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

# Check if server is running
print_status "Checking if server is running..."
if curl -s http://localhost:3001/api/health > /dev/null 2>&1; then
    print_success "Server is running on port 3001"
else
    print_error "Server is not running on port 3001"
    print_status "Please start the server first: npm start (in server directory)"
    exit 1
fi

# Test Cursor AI status endpoint
print_status "Testing Cursor AI status endpoint..."
STATUS_RESPONSE=$(curl -s -X GET http://localhost:3001/api/ai/cursor/status)
if [ $? -eq 0 ]; then
    print_success "Status endpoint is accessible"
    echo "Response: $STATUS_RESPONSE"
else
    print_error "Failed to access status endpoint"
fi

# Test assigning a task
print_status "Testing task assignment..."
ASSIGN_RESPONSE=$(curl -s -X POST http://localhost:3001/api/ai/cursor/assign \
    -H "Content-Type: application/json" \
    -d '{"task": "Test task from script"}')
if [ $? -eq 0 ]; then
    print_success "Task assignment endpoint is accessible"
    echo "Response: $ASSIGN_RESPONSE"
else
    print_error "Failed to access task assignment endpoint"
fi

# Test clearing queue
print_status "Testing queue clearing..."
CLEAR_RESPONSE=$(curl -s -X POST http://localhost:3001/api/ai/cursor/clear)
if [ $? -eq 0 ]; then
    print_success "Queue clearing endpoint is accessible"
    echo "Response: $CLEAR_RESPONSE"
else
    print_error "Failed to access queue clearing endpoint"
fi

print_status "Test completed!"
print_status "To access the Cursor AI Status Panel:"
print_status "1. Go to Settings > Backup Settings"
print_status "2. Look for the Cursor AI Status panel (super admin only)"
print_status "3. Or access directly: http://localhost:3000/settings/backup" 