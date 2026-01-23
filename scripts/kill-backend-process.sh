#!/bin/bash
#
# Kill all backend processes on port 3001 and verify
#

set -e

echo "═══════════════════════════════════════════════════════════"
echo "🔪 Killing Backend Processes on Port 3001"
echo "═══════════════════════════════════════════════════════════"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "❌ This script must be run as root (use sudo)" >&2
    exit 1
fi

# Method 1: Using lsof
echo "1️⃣  Finding processes on port 3001..."
if command -v lsof >/dev/null 2>&1; then
    PIDS=$(lsof -ti :3001 2>/dev/null || true)
    if [ -n "$PIDS" ]; then
        echo "   Found PIDs: $PIDS"
        echo "   Process details:"
        lsof -i :3001 | grep -v COMMAND | while read line; do
            echo "      $line"
        done
        echo ""
        echo "   Killing processes..."
        echo "$PIDS" | xargs kill -9 2>/dev/null || true
        sleep 1
        echo "   ✅ Processes killed"
    else
        echo "   ✅ No processes found"
    fi
else
    echo "   ⚠️  lsof not available"
fi
echo ""

# Method 2: Using ss and fuser (alternative)
echo "2️⃣  Checking with ss..."
if command -v ss >/dev/null 2>&1; then
    if ss -tlnp | grep -q ":3001"; then
        echo "   Port 3001 is still in use, attempting to kill with fuser..."
        fuser -k 3001/tcp 2>/dev/null || true
        sleep 1
    else
        echo "   ✅ Port 3001 is free"
    fi
fi
echo ""

# Method 3: Kill any node processes running dist/index.js
echo "3️⃣  Checking for node processes running backend..."
BACKEND_PIDS=$(ps aux | grep "[n]ode.*dist/index.js" | awk '{print $2}' || true)
if [ -n "$BACKEND_PIDS" ]; then
    echo "   Found backend PIDs: $BACKEND_PIDS"
    echo "$BACKEND_PIDS" | xargs kill -9 2>/dev/null || true
    sleep 1
    echo "   ✅ Backend processes killed"
else
    echo "   ✅ No backend processes found"
fi
echo ""

# Method 4: Kill any node processes on port 3001 by user
echo "4️⃣  Checking for processes by user 'next'..."
NEXT_USER_PIDS=$(ps aux | grep "^next" | grep "[n]ode" | awk '{print $2}' || true)
if [ -n "$NEXT_USER_PIDS" ]; then
    echo "   Found 'next' user node processes: $NEXT_USER_PIDS"
    echo "   (Not killing - may be other services)"
else
    echo "   ✅ No 'next' user node processes found"
fi
echo ""

# Final verification
echo "5️⃣  Final verification..."
sleep 2

if command -v lsof >/dev/null 2>&1; then
    REMAINING=$(lsof -ti :3001 2>/dev/null || true)
    if [ -n "$REMAINING" ]; then
        echo "   ⚠️  WARNING: Port 3001 is still in use!"
        echo "   Remaining PIDs: $REMAINING"
        echo ""
        echo "   Process details:"
        lsof -i :3001
        echo ""
        echo "   Attempting force kill..."
        echo "$REMAINING" | xargs kill -9 2>/dev/null || true
        sleep 2
        
        # Check again
        STILL_RUNNING=$(lsof -ti :3001 2>/dev/null || true)
        if [ -n "$STILL_RUNNING" ]; then
            echo "   ❌ FAILED: Process is still running"
            echo "   You may need to investigate manually:"
            echo "     sudo lsof -i :3001"
            echo "     sudo kill -9 <PID>"
        else
            echo "   ✅ Successfully killed remaining processes"
        fi
    else
        echo "   ✅ Port 3001 is free"
    fi
elif command -v ss >/dev/null 2>&1; then
    if ss -tlnp | grep -q ":3001"; then
        echo "   ⚠️  WARNING: Port 3001 is still in use!"
        ss -tlnp | grep ":3001"
    else
        echo "   ✅ Port 3001 is free"
    fi
fi

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "✅ Process Kill Complete"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "Monitor for a few minutes to ensure it doesn't restart:"
echo "  watch -n 2 'sudo lsof -i :3001'"
echo ""
