#!/bin/bash

echo "🔄 Big Book Server Restart Script"
echo "=================================="
echo "This script will help restart the server to load new Big Book endpoints."
echo ""

# Function to log with timestamp
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

log "Starting server restart process..."

echo ""
log "=== CHECKING CURRENT SERVER STATUS ==="

# Check if server is currently running
if command -v ps >/dev/null 2>&1; then
    echo "Current Node.js processes:"
    ps aux | grep node | grep -v grep || echo "No Node.js processes found"
    echo ""
fi

# Check port 3001 usage
if command -v netstat >/dev/null 2>&1; then
    echo "Current processes on port 3001:"
    netstat -tlnp 2>/dev/null | grep ":3001" || echo "No process found on port 3001"
elif command -v ss >/dev/null 2>&1; then
    echo "Current processes on port 3001:"
    ss -tlnp | grep ":3001" || echo "No process found on port 3001"
fi

echo ""
log "=== STOPPING EXISTING SERVER ==="

# Try to find and stop existing server processes
if command -v pkill >/dev/null 2>&1; then
    echo "Attempting to stop Node.js server processes..."
    pkill -f "node.*server" && echo "✅ Server processes stopped" || echo "ℹ️  No server processes to stop"
else
    echo "pkill not available - you may need to manually stop the server"
fi

# Wait a moment for processes to stop
sleep 2

echo ""
log "=== VERIFYING BIG BOOK ROUTES ==="

# Verify the new endpoints exist in the route file
if [ -f "server/routes/bigbook.js" ]; then
    echo "Checking for new Big Book endpoints in route file..."
    
    if grep -q "install-bigbook-component" "server/routes/bigbook.js"; then
        echo "✅ install-bigbook-component endpoint found"
    else
        echo "❌ install-bigbook-component endpoint missing"
    fi
    
    if grep -q "custom-components-registry" "server/routes/bigbook.js"; then
        echo "✅ custom-components-registry endpoint found"
    else
        echo "❌ custom-components-registry endpoint missing"
    fi
    
    if grep -q "installBigBookCustomComponent" "server/routes/bigbook.js"; then
        echo "✅ installBigBookCustomComponent function found"
    else
        echo "❌ installBigBookCustomComponent function missing"
    fi
else
    echo "❌ bigbook.js route file not found"
    exit 1
fi

echo ""
log "=== STARTING SERVER ==="

# Navigate to server directory and start
if [ -d "server" ]; then
    echo "Starting server from server directory..."
    cd server
    
    # Check if package.json exists
    if [ -f "package.json" ]; then
        echo "Found package.json, starting with npm..."
        echo ""
        echo "🚀 Starting server..."
        echo "   You should see startup messages below."
        echo "   Look for 'Server listening on port 3001' or similar."
        echo "   Press Ctrl+C to stop the server when needed."
        echo ""
        echo "----------------------------------------"
        
        # Start the server (this will run in foreground)
        npm start
        
    elif [ -f "index.js" ]; then
        echo "Starting server with node index.js..."
        echo ""
        echo "🚀 Starting server..."
        echo "   You should see startup messages below."
        echo "   Look for 'Server listening on port 3001' or similar."
        echo "   Press Ctrl+C to stop the server when needed."
        echo ""
        echo "----------------------------------------"
        
        # Start the server (this will run in foreground)
        node index.js
        
    else
        echo "❌ No package.json or index.js found in server directory"
        exit 1
    fi
else
    echo "❌ Server directory not found"
    echo "Make sure you're running this from the project root directory"
    exit 1
fi 