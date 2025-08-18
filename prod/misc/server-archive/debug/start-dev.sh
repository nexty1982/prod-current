#!/bin/bash

# OrthodoxMetrics Development Startup Script
echo "🏛️ Starting OrthodoxMetrics Development Environment..."

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -d "server" ] || [ ! -d "front-end" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check for required tools
echo "🔍 Checking for required tools..."

if ! command_exists node; then
    echo "❌ Node.js is not installed or not in PATH"
    exit 1
fi

if ! command_exists npm; then
    echo "❌ npm is not installed or not in PATH"
    exit 1
fi

echo "✅ Node.js and npm are available"

# Start backend server
echo "🚀 Starting backend server..."
cd server || exit 1
if [ ! -f "index.js" ]; then
    echo "❌ Backend server file not found"
    exit 1
fi

# Start backend in background
nohup node index.js > ../logs/backend.log 2>&1 &
BACKEND_PID=$!
echo "✅ Backend server started (PID: $BACKEND_PID)"

# Go back to project root
cd ..

# Start frontend server
echo "🎨 Starting frontend server..."
cd front-end || exit 1

if [ ! -f "package.json" ]; then
    echo "❌ Frontend package.json not found"
    exit 1
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    npm install
fi

# Start frontend in background
echo "✅ Starting frontend development server..."
nohup npm run dev > ../logs/frontend.log 2>&1 &
FRONTEND_PID=$!
echo "✅ Frontend server started (PID: $FRONTEND_PID)"

# Go back to project root
cd ..

# Create logs directory if it doesn't exist
mkdir -p logs

# Save PIDs for later cleanup
echo $BACKEND_PID > logs/backend.pid
echo $FRONTEND_PID > logs/frontend.pid

echo ""
echo "🎉 OrthodoxMetrics development environment is starting up!"
echo "📊 Backend:  http://localhost:3001"
echo "🌐 Frontend: http://localhost:5173"
echo ""
echo "📝 Logs are being saved to:"
echo "   Backend:  logs/backend.log"
echo "   Frontend: logs/frontend.log"
echo ""
echo "🛑 To stop the servers, run: ./stop-dev.sh"
echo ""
echo "⏳ Please wait a moment for the servers to fully start..."

# Wait a bit and then check if servers are running
sleep 5

# Check if backend is responding
if curl -s http://localhost:3001/api/health > /dev/null 2>&1; then
    echo "✅ Backend server is responding"
else
    echo "⚠️  Backend server may still be starting..."
fi

# Check if frontend is responding
if curl -s http://localhost:5173 > /dev/null 2>&1; then
    echo "✅ Frontend server is responding"
else
    echo "⚠️  Frontend server may still be starting..."
fi

echo ""
echo "🔧 Service Management is now available in Admin Settings!"
echo "   Navigate to: Admin → Settings → Services tab"
echo "" 