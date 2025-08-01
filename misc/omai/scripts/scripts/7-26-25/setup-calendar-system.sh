#!/bin/bash

# OrthodoxMetrics AI Task Calendar System Setup Script
# This script automates the installation and configuration of the calendar system

set -e  # Exit on any error

echo "🚀 OrthodoxMetrics AI Task Calendar System Setup"
echo "================================================"

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

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   print_error "This script should not be run as root"
   exit 1
fi

# Check prerequisites
print_status "Checking prerequisites..."

# Check Node.js
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    print_error "Node.js version 18+ is required. Current version: $(node -v)"
    exit 1
fi

print_success "Node.js version: $(node -v)"

# Check npm
if ! command -v npm &> /dev/null; then
    print_error "npm is not installed"
    exit 1
fi

print_success "npm version: $(npm -v)"

# Check MySQL
if ! command -v mysql &> /dev/null; then
    print_warning "MySQL client not found. You may need to install it separately."
fi

# Check if we're in the right directory
if [ ! -f "server/index.js" ] || [ ! -f "front-end/package.json" ]; then
    print_error "Please run this script from the OrthodoxMetrics project root directory"
    exit 1
fi

print_success "Prerequisites check completed"

# Database setup
print_status "Setting up database schema..."

if [ -f "server/calendar-schema.sql" ]; then
    read -p "Enter MySQL username (default: orthodoxapps): " MYSQL_USER
    MYSQL_USER=${MYSQL_USER:-orthodoxapps}
    
    read -s -p "Enter MySQL password: " MYSQL_PASSWORD
    echo
    
    read -p "Enter MySQL host (default: localhost): " MYSQL_HOST
    MYSQL_HOST=${MYSQL_HOST:-localhost}
    
    read -p "Enter database name (default: orthodoxmetrics_db): " DB_NAME
    DB_NAME=${DB_NAME:-orthodoxmetrics_db}
    
    print_status "Creating calendar database schema..."
    
    if mysql -h "$MYSQL_HOST" -u "$MYSQL_USER" -p"$MYSQL_PASSWORD" "$DB_NAME" < server/calendar-schema.sql; then
        print_success "Database schema created successfully"
    else
        print_error "Failed to create database schema"
        exit 1
    fi
else
    print_error "Calendar schema file not found: server/calendar-schema.sql"
    exit 1
fi

# Backend dependencies
print_status "Installing backend dependencies..."

cd server

# Check if package.json exists
if [ ! -f "package.json" ]; then
    print_error "server/package.json not found"
    exit 1
fi

# Install dependencies
if npm install; then
    print_success "Backend dependencies installed"
else
    print_error "Failed to install backend dependencies"
    exit 1
fi

# Install calendar-specific dependencies
print_status "Installing calendar-specific backend dependencies..."
if npm install react-big-calendar date-fns uuid; then
    print_success "Calendar backend dependencies installed"
else
    print_warning "Some calendar dependencies may not be available"
fi

cd ..

# Frontend dependencies
print_status "Installing frontend dependencies..."

cd front-end

# Check if package.json exists
if [ ! -f "package.json" ]; then
    print_error "front-end/package.json not found"
    exit 1
fi

# Install dependencies with legacy peer deps
if npm install --legacy-peer-deps; then
    print_success "Frontend dependencies installed"
else
    print_error "Failed to install frontend dependencies"
    exit 1
fi

# Install calendar-specific dependencies
print_status "Installing calendar-specific frontend dependencies..."
if npm install --legacy-peer-deps react-big-calendar date-fns @tanstack/react-query; then
    print_success "Calendar frontend dependencies installed"
else
    print_warning "Some calendar dependencies may not be available"
fi

cd ..

# Environment configuration
print_status "Setting up environment configuration..."

# Create .env.example if it doesn't exist
if [ ! -f ".env.example" ]; then
    cat > .env.example << EOF
# OrthodoxMetrics Environment Configuration

# Database Configuration
DB_HOST=localhost
DB_USER=orthodoxapps
DB_PASSWORD=your_password_here
DB_NAME=orthodoxmetrics_db

# Calendar System Configuration
CALENDAR_REFRESH_INTERVAL=30000
CALENDAR_MAX_TASKS_PER_AGENT=10
CALENDAR_DEFAULT_VIEW=month
CALENDAR_ENABLE_REALTIME=true
CALENDAR_ENABLE_CHATGPT=true

# Redis Configuration (for sessions and caching)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT Configuration
JWT_SECRET=your_jwt_secret_here
JWT_EXPIRES_IN=24h

# Server Configuration
PORT=3000
NODE_ENV=development
EOF
    print_success "Created .env.example file"
fi

# Check if .env exists
if [ ! -f ".env" ]; then
    print_warning ".env file not found. Please copy .env.example to .env and configure it."
else
    print_success ".env file found"
fi

# Create calendar-specific directories
print_status "Creating calendar system directories..."

# Create data directories
mkdir -p data/calendar
mkdir -p data/calendar/tasks
mkdir -p data/calendar/reports
mkdir -p data/calendar/exports
mkdir -p data/calendar/uploads

# Create logs directory
mkdir -p logs/calendar

print_success "Calendar directories created"

# Set permissions
print_status "Setting permissions..."
chmod 755 data/calendar
chmod 755 data/calendar/tasks
chmod 755 data/calendar/reports
chmod 755 data/calendar/exports
chmod 755 data/calendar/uploads
chmod 755 logs/calendar

print_success "Permissions set"

# Verify installation
print_status "Verifying installation..."

# Check if calendar component exists
if [ -f "front-end/src/components/calendar/OMCalendar.tsx" ]; then
    print_success "Calendar component found"
else
    print_error "Calendar component not found: front-end/src/components/calendar/OMCalendar.tsx"
fi

# Check if calendar API exists
if [ -f "front-end/src/api/calendar.api.ts" ]; then
    print_success "Calendar API found"
else
    print_error "Calendar API not found: front-end/src/api/calendar.api.ts"
fi

# Check if calendar types exist
if [ -f "front-end/src/types/calendar.types.ts" ]; then
    print_success "Calendar types found"
else
    print_error "Calendar types not found: front-end/src/types/calendar.types.ts"
fi

# Check if calendar routes exist
if [ -f "server/routes/calendar.js" ]; then
    print_success "Calendar routes found"
else
    print_error "Calendar routes not found: server/routes/calendar.js"
fi

# Check if calendar schema exists
if [ -f "server/calendar-schema.sql" ]; then
    print_success "Calendar schema found"
else
    print_error "Calendar schema not found: server/calendar-schema.sql"
fi

# Test database connection
print_status "Testing database connection..."
if mysql -h "$MYSQL_HOST" -u "$MYSQL_USER" -p"$MYSQL_PASSWORD" "$DB_NAME" -e "SELECT COUNT(*) FROM ai_tasks;" &> /dev/null; then
    print_success "Database connection successful"
else
    print_warning "Database connection test failed. Please check your database configuration."
fi

# Create startup script
print_status "Creating startup script..."

cat > start-calendar-system.sh << 'EOF'
#!/bin/bash

# OrthodoxMetrics Calendar System Startup Script

echo "🚀 Starting OrthodoxMetrics Calendar System..."

# Start backend server
echo "Starting backend server..."
cd server
npm start &
BACKEND_PID=$!

# Wait a moment for backend to start
sleep 3

# Start frontend development server
echo "Starting frontend development server..."
cd ../front-end
npm start &
FRONTEND_PID=$!

echo "✅ Calendar system started!"
echo "Backend PID: $BACKEND_PID"
echo "Frontend PID: $FRONTEND_PID"
echo ""
echo "Access the calendar at: http://localhost:3000/calendar"
echo "Backend API at: http://localhost:3000/api/calendar"
echo ""
echo "Press Ctrl+C to stop both servers"

# Wait for user to stop
wait
EOF

chmod +x start-calendar-system.sh
print_success "Startup script created: start-calendar-system.sh"

# Create test script
print_status "Creating test script..."

cat > test-calendar-system.sh << 'EOF'
#!/bin/bash

# OrthodoxMetrics Calendar System Test Script

echo "🧪 Testing OrthodoxMetrics Calendar System..."

# Test backend API
echo "Testing backend API..."
if curl -s http://localhost:3000/api/calendar/tasks > /dev/null; then
    echo "✅ Backend API is responding"
else
    echo "❌ Backend API is not responding"
fi

# Test frontend
echo "Testing frontend..."
if curl -s http://localhost:3000 > /dev/null; then
    echo "✅ Frontend is responding"
else
    echo "❌ Frontend is not responding"
fi

# Test database
echo "Testing database..."
if mysql -u orthodoxapps -p -e "USE orthodoxmetrics_db; SELECT COUNT(*) FROM ai_tasks;" &> /dev/null; then
    echo "✅ Database is accessible"
else
    echo "❌ Database is not accessible"
fi

echo "🧪 Test completed!"
EOF

chmod +x test-calendar-system.sh
print_success "Test script created: test-calendar-system.sh"

# Final summary
echo ""
echo "🎉 OrthodoxMetrics AI Task Calendar System Setup Complete!"
echo "========================================================"
echo ""
echo "📁 Files Created:"
echo "  ✅ Database schema: server/calendar-schema.sql"
echo "  ✅ Calendar component: front-end/src/components/calendar/OMCalendar.tsx"
echo "  ✅ Calendar API: front-end/src/api/calendar.api.ts"
echo "  ✅ Calendar types: front-end/src/types/calendar.types.ts"
echo "  ✅ Calendar routes: server/routes/calendar.js"
echo "  ✅ Documentation: ORTHODOX_METRICS_CALENDAR_SYSTEM.md"
echo ""
echo "🚀 Next Steps:"
echo "  1. Configure your .env file with database credentials"
echo "  2. Start the system: ./start-calendar-system.sh"
echo "  3. Test the system: ./test-calendar-system.sh"
echo "  4. Access the calendar at: http://localhost:3000/calendar"
echo ""
echo "📚 Documentation:"
echo "  - Full documentation: ORTHODOX_METRICS_CALENDAR_SYSTEM.md"
echo "  - API endpoints: /api/calendar/*"
echo "  - Database schema: server/calendar-schema.sql"
echo ""
echo "🔧 Troubleshooting:"
echo "  - Check logs in logs/calendar/"
echo "  - Verify database connection"
echo "  - Ensure all dependencies are installed"
echo ""
print_success "Setup completed successfully!" 