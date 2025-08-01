#!/bin/bash

# OrthodoxMetrics AI Task Calendar System Startup Script

echo "🚀 Starting OrthodoxMetrics AI Task Calendar System..."
echo "=================================================="

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

# Check if database schema exists
if [ ! -f "server/calendar-schema.sql" ]; then
    print_error "Calendar schema not found. Please run the setup script first."
    exit 1
fi

print_status "Starting backend server..."
cd server

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    print_warning "Backend dependencies not installed. Installing now..."
    npm install
fi

# Start backend server
npm start &
BACKEND_PID=$!

# Wait a moment for backend to start
sleep 3

# Check if backend started successfully
if ! kill -0 $BACKEND_PID 2>/dev/null; then
    print_error "Backend server failed to start"
    exit 1
fi

print_success "Backend server started (PID: $BACKEND_PID)"

# Start frontend development server
print_status "Starting frontend development server..."
cd ../front-end

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    print_warning "Frontend dependencies not installed. Installing now..."
    npm install --legacy-peer-deps
fi

# Start frontend server
npm start &
FRONTEND_PID=$!

# Wait a moment for frontend to start
sleep 5

# Check if frontend started successfully
if ! kill -0 $FRONTEND_PID 2>/dev/null; then
    print_error "Frontend server failed to start"
    kill $BACKEND_PID 2>/dev/null
    exit 1
fi

print_success "Frontend server started (PID: $FRONTEND_PID)"

echo ""
echo "🎉 OrthodoxMetrics AI Task Calendar System is running!"
echo "=================================================="
echo ""
echo "📱 Access Points:"
echo "  • Calendar Interface: http://localhost:3000/calendar"
echo "  • Backend API: http://localhost:3000/api/calendar"
echo "  • Main Application: http://localhost:3000"
echo ""
echo "🔧 Process Information:"
echo "  • Backend PID: $BACKEND_PID"
echo "  • Frontend PID: $FRONTEND_PID"
echo ""
echo "📋 Available Features:"
echo "  • Interactive Calendar with AI Task Management"
echo "  • Kanban Board Integration"
echo "  • Real-time Task Updates"
echo "  • AI Agent Coordination"
echo "  • ChatGPT Integration"
echo ""
echo "🛑 To stop the system, press Ctrl+C"
echo ""

# Function to cleanup on exit
cleanup() {
    echo ""
    print_status "Shutting down OrthodoxMetrics Calendar System..."
    
    if kill -0 $BACKEND_PID 2>/dev/null; then
        print_status "Stopping backend server..."
        kill $BACKEND_PID
    fi
    
    if kill -0 $FRONTEND_PID 2>/dev/null; then
        print_status "Stopping frontend server..."
        kill $FRONTEND_PID
    fi
    
    print_success "System shutdown complete!"
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Wait for user to stop
wait 