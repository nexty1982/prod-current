#!/bin/bash

# OrthodoxMetrics Development Shutdown Script
echo "🛑 Stopping OrthodoxMetrics Development Environment..."

# Function to safely kill a process
safe_kill() {
    local pid=$1
    local name=$2
    
    if [ -n "$pid" ] && ps -p "$pid" > /dev/null 2>&1; then
        echo "🔄 Stopping $name (PID: $pid)..."
        kill "$pid" 2>/dev/null
        
        # Wait a moment for graceful shutdown
        sleep 2
        
        # Force kill if still running
        if ps -p "$pid" > /dev/null 2>&1; then
            echo "⚡ Force stopping $name..."
            kill -9 "$pid" 2>/dev/null
        fi
        
        echo "✅ $name stopped"
    else
        echo "ℹ️  $name was not running"
    fi
}

# Read PIDs from files if they exist
BACKEND_PID=""
FRONTEND_PID=""

if [ -f "logs/backend.pid" ]; then
    BACKEND_PID=$(cat logs/backend.pid)
    rm logs/backend.pid
fi

if [ -f "logs/frontend.pid" ]; then
    FRONTEND_PID=$(cat logs/frontend.pid)
    rm logs/frontend.pid
fi

# Stop backend server
if [ -n "$BACKEND_PID" ]; then
    safe_kill "$BACKEND_PID" "Backend Server"
else
    echo "⚠️  No backend PID file found, trying to find process..."
    # Try to find and kill backend process
    BACKEND_PID=$(pgrep -f "node.*index.js" | head -1)
    if [ -n "$BACKEND_PID" ]; then
        safe_kill "$BACKEND_PID" "Backend Server"
    fi
fi

# Stop frontend server
if [ -n "$FRONTEND_PID" ]; then
    safe_kill "$FRONTEND_PID" "Frontend Server"
else
    echo "⚠️  No frontend PID file found, trying to find process..."
    # Try to find and kill frontend process
    FRONTEND_PID=$(pgrep -f "npm run dev" | head -1)
    if [ -n "$FRONTEND_PID" ]; then
        safe_kill "$FRONTEND_PID" "Frontend Server"
    fi
fi

# Also try to stop any remaining npm/node processes related to the project
echo "🧹 Cleaning up any remaining processes..."

# Kill any remaining npm run dev processes
pkill -f "npm run dev" 2>/dev/null || true

# Kill any node processes in our project directory
PROJECT_DIR=$(pwd)
for pid in $(pgrep node); do
    if [ -n "$pid" ]; then
        PROC_DIR=$(pwdx "$pid" 2>/dev/null | cut -d: -f2 | xargs)
        if [[ "$PROC_DIR" == "$PROJECT_DIR"* ]]; then
            echo "🔄 Stopping project-related node process (PID: $pid)..."
            kill "$pid" 2>/dev/null || true
        fi
    fi
done

echo ""
echo "✅ OrthodoxMetrics development environment stopped"
echo "📝 Log files preserved in logs/ directory"
echo ""
echo "🚀 To start again, run: ./start-dev.sh"
echo "" 