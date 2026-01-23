#!/bin/bash
#
# Comprehensive script to stop the backend completely
# Stops PM2, kills processes, disables auto-start
#

set -e

echo "═══════════════════════════════════════════════════════════"
echo "🛑 Stopping Backend Completely"
echo "═══════════════════════════════════════════════════════════"
echo ""

# Step 1: Stop PM2 processes
echo "1️⃣  Stopping PM2 processes..."
if command -v pm2 >/dev/null 2>&1; then
    pm2 stop orthodox-backend 2>/dev/null || echo "   (PM2 process not running)"
    pm2 delete orthodox-backend 2>/dev/null || echo "   (PM2 process not found)"
    echo "   ✅ PM2 processes stopped"
else
    echo "   ⚠️  PM2 not found"
fi
echo ""

# Step 2: Disable PM2 startup
echo "2️⃣  Disabling PM2 startup..."
if command -v pm2 >/dev/null 2>&1; then
    pm2 unstartup 2>/dev/null || echo "   (PM2 startup not configured)"
    echo "   ✅ PM2 startup disabled"
else
    echo "   ⚠️  PM2 not found"
fi
echo ""

# Step 3: Kill all Node processes on port 3001
echo "3️⃣  Killing processes on port 3001..."
if command -v lsof >/dev/null 2>&1; then
    PIDS=$(lsof -ti :3001 2>/dev/null || true)
    if [ -n "$PIDS" ]; then
        echo "   Found PIDs: $PIDS"
        echo "$PIDS" | xargs sudo kill -9 2>/dev/null || echo "$PIDS" | xargs kill -9 2>/dev/null || true
        echo "   ✅ Killed processes on port 3001"
    else
        echo "   ✅ No processes found on port 3001"
    fi
elif command -v ss >/dev/null 2>&1; then
    # Alternative using ss and fuser
    if ss -tlnp | grep -q ":3001"; then
        echo "   Port 3001 is in use, attempting to kill..."
        sudo fuser -k 3001/tcp 2>/dev/null || echo "   (Could not kill, may need manual intervention)"
    else
        echo "   ✅ No processes found on port 3001"
    fi
else
    echo "   ⚠️  Cannot check (lsof/ss not available)"
fi
echo ""

# Step 4: Kill any node processes running dist/index.js
echo "4️⃣  Killing any node processes running backend..."
BACKEND_PIDS=$(ps aux | grep "[n]ode.*dist/index.js" | awk '{print $2}' || true)
if [ -n "$BACKEND_PIDS" ]; then
    echo "   Found backend PIDs: $BACKEND_PIDS"
    echo "$BACKEND_PIDS" | xargs sudo kill -9 2>/dev/null || echo "$BACKEND_PIDS" | xargs kill -9 2>/dev/null || true
    echo "   ✅ Killed backend processes"
else
    echo "   ✅ No backend processes found"
fi
echo ""

# Step 5: Check for systemd services
echo "5️⃣  Checking systemd services..."
if systemctl list-units --type=service --all 2>/dev/null | grep -qi "orthodox\|pm2"; then
    echo "   ⚠️  Found potential systemd services:"
    systemctl list-units --type=service --all 2>/dev/null | grep -i "orthodox\|pm2" | while read line; do
        SERVICE_NAME=$(echo "$line" | awk '{print $1}')
        if [ -n "$SERVICE_NAME" ] && [ "$SERVICE_NAME" != "UNIT" ]; then
            echo "      Stopping: $SERVICE_NAME"
            sudo systemctl stop "$SERVICE_NAME" 2>/dev/null || true
            sudo systemctl disable "$SERVICE_NAME" 2>/dev/null || true
        fi
    done
    echo "   ✅ Systemd services stopped and disabled"
else
    echo "   ✅ No systemd services found"
fi
echo ""

# Step 6: Verify port is free
echo "6️⃣  Verifying port 3001 is free..."
sleep 2
if command -v lsof >/dev/null 2>&1; then
    if lsof -i :3001 >/dev/null 2>&1; then
        echo "   ⚠️  WARNING: Port 3001 is still in use!"
        echo "   Run: sudo lsof -i :3001"
        echo "   Then kill the process manually"
    else
        echo "   ✅ Port 3001 is free"
    fi
elif command -v ss >/dev/null 2>&1; then
    if ss -tlnp | grep -q ":3001"; then
        echo "   ⚠️  WARNING: Port 3001 is still in use!"
        echo "   Run: sudo ss -tlnp | grep :3001"
        echo "   Then kill the process manually"
    else
        echo "   ✅ Port 3001 is free"
    fi
fi
echo ""

echo "═══════════════════════════════════════════════════════════"
echo "✅ Backend Stop Complete"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "If the backend keeps restarting, run:"
echo "  ./scripts/diagnose-backend-autostart.sh"
echo ""
echo "To start backend properly with PM2:"
echo "  cd /var/www/orthodoxmetrics/prod"
echo "  pm2 start ecosystem.config.cjs --only orthodox-backend"
echo ""
