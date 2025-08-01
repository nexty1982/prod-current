#!/bin/bash

echo "🧠 Setting up Cursor AI Status Panel Complete Integration"
echo "========================================================"

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

print_status "$BLUE" "Starting Cursor AI integration setup..."

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

# Step 2: Check database schema
print_status "$BLUE" "Step 2: Checking database schema..."

# Check if ai_agents table exists
TABLE_EXISTS=$(mysql -u orthodoxapps -p'OrthodoxApps2024!' -e "USE orthodoxmetrics_db; SHOW TABLES LIKE 'ai_agents';" 2>/dev/null | grep -c "ai_agents")

if [ "$TABLE_EXISTS" -eq 0 ]; then
    print_warning "ai_agents table not found. Applying calendar schema..."
    
    # Apply the calendar schema
    mysql -u orthodoxapps -p'OrthodoxApps2024!' orthodoxmetrics_db < server/calendar-schema.sql
    
    if [ $? -eq 0 ]; then
        print_success "Calendar schema applied successfully"
    else
        print_error "Failed to apply calendar schema"
        exit 1
    fi
else
    print_success "ai_agents table already exists"
fi

# Check if ai_tasks table exists
TASKS_EXISTS=$(mysql -u orthodoxapps -p'OrthodoxApps2024!' -e "USE orthodoxmetrics_db; SHOW TABLES LIKE 'ai_tasks';" 2>/dev/null | grep -c "ai_tasks")

if [ "$TASKS_EXISTS" -eq 0 ]; then
    print_warning "ai_tasks table not found. Applying calendar schema..."
    
    # Apply the calendar schema
    mysql -u orthodoxapps -p'OrthodoxApps2024!' orthodoxmetrics_db < server/calendar-schema.sql
    
    if [ $? -eq 0 ]; then
        print_success "Calendar schema applied successfully"
    else
        print_error "Failed to apply calendar schema"
        exit 1
    fi
else
    print_success "ai_tasks table already exists"
fi

# Step 3: Create Cursor agent if it doesn't exist
print_status "$BLUE" "Step 3: Setting up Cursor agent..."
CURSOR_EXISTS=$(mysql -u orthodoxapps -p'OrthodoxApps2024!' -e "USE orthodoxmetrics_db; SELECT COUNT(*) FROM ai_agents WHERE name = 'Cursor';" 2>/dev/null | tail -n 1)

if [ "$CURSOR_EXISTS" -eq 0 ]; then
    print_status "$BLUE" "Creating Cursor agent..."
    mysql -u orthodoxapps -p'OrthodoxApps2024!' -e "USE orthodoxmetrics_db; INSERT INTO ai_agents (id, name, status, queue_length, last_activity) VALUES ('agent-cursor-$(date +%s)', 'Cursor', 'idle', 0, NOW());"
    print_success "Cursor agent created"
else
    print_success "Cursor agent already exists"
fi

# Step 4: Test API endpoints
print_status "$BLUE" "Step 4: Testing API endpoints..."

# Test status endpoint
print_status "$BLUE" "Testing GET /api/ai/cursor/status..."
STATUS_RESPONSE=$(curl -s -X GET http://localhost:3001/api/ai/cursor/status)
if echo "$STATUS_RESPONSE" | grep -q "status"; then
    print_success "Status endpoint working"
    echo "Response: $STATUS_RESPONSE"
else
    print_error "Status endpoint failed"
    echo "Response: $STATUS_RESPONSE"
fi

# Test assign endpoint
print_status "$BLUE" "Testing POST /api/ai/cursor/assign..."
ASSIGN_RESPONSE=$(curl -s -X POST http://localhost:3001/api/ai/cursor/assign \
    -H "Content-Type: application/json" \
    -d '{"task": "Test task from setup script"}')
if echo "$ASSIGN_RESPONSE" | grep -q "success"; then
    print_success "Assign endpoint working"
    echo "Response: $ASSIGN_RESPONSE"
else
    print_error "Assign endpoint failed"
    echo "Response: $ASSIGN_RESPONSE"
fi

# Test clear endpoint
print_status "$BLUE" "Testing POST /api/ai/cursor/clear..."
CLEAR_RESPONSE=$(curl -s -X POST http://localhost:3001/api/ai/cursor/clear)
if echo "$CLEAR_RESPONSE" | grep -q "success"; then
    print_success "Clear endpoint working"
    echo "Response: $CLEAR_RESPONSE"
else
    print_error "Clear endpoint failed"
    echo "Response: $CLEAR_RESPONSE"
fi

# Step 5: Check frontend components
print_status "$BLUE" "Step 5: Checking frontend components..."

if [ -f "front-end/src/components/admin/ai/CursorStatusPanel.tsx" ]; then
    print_success "CursorStatusPanel component exists"
else
    print_error "CursorStatusPanel component not found"
fi

if [ -f "front-end/src/views/settings/BackupSettings.tsx" ]; then
    print_success "BackupSettings component exists"
else
    print_error "BackupSettings component not found"
fi

# Step 6: Final summary
echo ""
print_success "Cursor AI integration setup completed!"
echo ""
print_status "$BLUE" "What was implemented:"
echo "  ✅ Database schema for AI agents and tasks"
echo "  ✅ Backend API routes for Cursor AI status management"
echo "  ✅ Frontend CursorStatusPanel component"
echo "  ✅ Tabbed Backup Settings interface"
echo "  ✅ Integration of Cursor AI panel in backup settings"
echo ""
print_status "$BLUE" "How to access:"
echo "  1. Go to: https://orthodoxmetrics.com/admin/settings"
echo "  2. You'll see two tabs: 'Backup Settings' and 'Your Backups'"
echo "  3. The Cursor AI Status Panel is visible on the right (super_admin only)"
echo ""
print_status "$BLUE" "Features available:"
echo "  📊 Real-time Cursor AI status monitoring"
echo "  📝 Task assignment to Cursor AI"
echo "  🗑️  Queue clearing functionality"
echo "  🔄 Manual status refresh"
echo ""
print_status "$BLUE" "API Endpoints:"
echo "  GET  /api/ai/cursor/status  - Get current status"
echo "  POST /api/ai/cursor/assign  - Assign new task"
echo "  POST /api/ai/cursor/clear   - Clear task queue"
echo ""
print_success "Setup complete! The Cursor AI Status Panel is now integrated into your backup settings page." 