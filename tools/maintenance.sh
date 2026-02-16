#!/bin/bash
# ========================================
# Orthodox Metrics Maintenance Mode Toggle
# ========================================
# Usage: sudo ./maintenance.sh [on|off|status]
# LAN users (192.168.x.x, 10.x.x.x) bypass maintenance mode

MAINTENANCE_FLAG="/var/www/orthodoxmetrics/maintenance.on"

# Check for sudo/root
if [ "$EUID" -ne 0 ]; then
    echo "❌ Error: This script must be run with sudo"
    echo "   Usage: sudo ./maintenance.sh [on|off|status]"
    exit 1
fi

# Check for argument
if [ -z "$1" ]; then
    echo "❌ Error: Missing argument"
    echo "   Usage: sudo ./maintenance.sh [on|off|status]"
    echo ""
    echo "   Commands:"
    echo "     on     - Enable maintenance mode (external users only)"
    echo "     off    - Disable maintenance mode"
    echo "     status - Check current maintenance mode status"
    exit 1
fi

case "$1" in
    on)
        touch "$MAINTENANCE_FLAG"
        if [ -f "$MAINTENANCE_FLAG" ]; then
            echo "✅ Maintenance mode ENABLED"
            echo "   Flag file created: $MAINTENANCE_FLAG"
            echo "   LAN users can still access the site"
            echo ""
            echo "   Reload nginx for changes to take effect:"
            echo "   sudo systemctl reload nginx"
        else
            echo "❌ Failed to create maintenance flag file"
            exit 1
        fi
        ;;
    off)
        rm -f "$MAINTENANCE_FLAG"
        if [ ! -f "$MAINTENANCE_FLAG" ]; then
            echo "✅ Maintenance mode DISABLED"
            echo "   Flag file removed: $MAINTENANCE_FLAG"
            echo ""
            echo "   Reload nginx for changes to take effect:"
            echo "   sudo systemctl reload nginx"
        else
            echo "❌ Failed to remove maintenance flag file"
            exit 1
        fi
        ;;
    status)
        if [ -f "$MAINTENANCE_FLAG" ]; then
            echo "🔧 Maintenance mode is currently: ENABLED"
            echo "   Flag file exists: $MAINTENANCE_FLAG"
            echo "   Created: $(stat -c %y "$MAINTENANCE_FLAG" 2>/dev/null || stat -f %Sm "$MAINTENANCE_FLAG" 2>/dev/null)"
            echo "   Note: LAN users bypass maintenance mode"
        else
            echo "🟢 Maintenance mode is currently: DISABLED"
            echo "   No flag file at: $MAINTENANCE_FLAG"
        fi
        ;;
    *)
        echo "❌ Error: Invalid argument '$1'"
        echo "   Usage: sudo ./maintenance.sh [on|off|status]"
        exit 1
        ;;
esac
