#!/bin/bash
#
# Stop and disable systemd services managing OrthodoxMetrics backend
#

set -e

echo "═══════════════════════════════════════════════════════════"
echo "🛑 Stopping OrthodoxMetrics Systemd Services"
echo "═══════════════════════════════════════════════════════════"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "❌ This script must be run as root (use sudo)" >&2
    exit 1
fi

# Services to stop and disable
SERVICES=(
    "orthodoxmetrics-backend.service"
    "om-stop-watcher.service"
)

echo "Found services:"
for service in "${SERVICES[@]}"; do
    if systemctl list-units --type=service --all | grep -q "$service"; then
        echo "  - $service"
    fi
done
echo ""

# Stop services
echo "1️⃣  Stopping services..."
for service in "${SERVICES[@]}"; do
    if systemctl is-active --quiet "$service" 2>/dev/null; then
        echo "   Stopping: $service"
        systemctl stop "$service" || echo "   ⚠️  Failed to stop $service"
    else
        echo "   $service is not running"
    fi
done
echo ""

# Disable services (prevent auto-start)
echo "2️⃣  Disabling services (preventing auto-start)..."
for service in "${SERVICES[@]}"; do
    if systemctl is-enabled --quiet "$service" 2>/dev/null; then
        echo "   Disabling: $service"
        systemctl disable "$service" || echo "   ⚠️  Failed to disable $service"
    else
        echo "   $service is already disabled"
    fi
done
echo ""

# Show service status
echo "3️⃣  Service status:"
for service in "${SERVICES[@]}"; do
    echo "   $service:"
    systemctl status "$service" --no-pager -l | head -5 | sed 's/^/      /'
    echo ""
done

# Kill any remaining processes on port 3001
echo "4️⃣  Killing any remaining processes on port 3001..."
if command -v lsof >/dev/null 2>&1; then
    PIDS=$(lsof -ti :3001 2>/dev/null || true)
    if [ -n "$PIDS" ]; then
        echo "   Found PIDs: $PIDS"
        echo "$PIDS" | xargs kill -9 2>/dev/null || true
        echo "   ✅ Killed processes"
    else
        echo "   ✅ No processes found"
    fi
else
    echo "   ⚠️  lsof not available"
fi
echo ""

# Verify
echo "5️⃣  Verification:"
sleep 2
if command -v lsof >/dev/null 2>&1; then
    if lsof -i :3001 >/dev/null 2>&1; then
        echo "   ⚠️  WARNING: Port 3001 is still in use!"
        echo "   Run: sudo lsof -i :3001"
    else
        echo "   ✅ Port 3001 is free"
    fi
fi

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "✅ Systemd Services Stopped and Disabled"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "To view service files:"
echo "  sudo systemctl cat orthodoxmetrics-backend.service"
echo "  sudo systemctl cat om-stop-watcher.service"
echo ""
echo "To start backend with PM2 instead:"
echo "  cd /var/www/orthodoxmetrics/prod"
echo "  pm2 start ecosystem.config.cjs --only orthodox-backend"
echo ""
echo "To re-enable systemd services (if needed):"
echo "  sudo systemctl enable orthodoxmetrics-backend.service"
echo "  sudo systemctl start orthodoxmetrics-backend.service"
echo ""
