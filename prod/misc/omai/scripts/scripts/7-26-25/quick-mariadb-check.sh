#!/bin/bash

# Quick MariaDB Startup Check
# Fast diagnostic for immediate MariaDB issues

echo "⚡ Quick MariaDB Startup Check"
echo "=============================="

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_ok() { echo -e "${GREEN}✅ $1${NC}"; }
print_warn() { echo -e "${YELLOW}⚠️  $1${NC}"; }
print_error() { echo -e "${RED}❌ $1${NC}"; }
print_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }

# Quick checks
echo ""

# 1. Check if service exists
print_info "1. Checking service availability..."
if systemctl list-unit-files | grep -q "^mariadb.service"; then
    print_ok "MariaDB service found"
    SERVICE_NAME="mariadb"
elif systemctl list-unit-files | grep -q "^mysql.service"; then
    print_ok "MySQL service found"
    SERVICE_NAME="mysql"
else
    print_error "Neither MariaDB nor MySQL service found"
    echo "   Install with: sudo apt-get install mariadb-server"
    exit 1
fi

# 2. Check service status
print_info "2. Checking service status..."
STATUS=$(systemctl is-active "$SERVICE_NAME" 2>/dev/null || echo "inactive")
if [ "$STATUS" = "active" ]; then
    print_ok "Service is running"
    exit 0
elif [ "$STATUS" = "inactive" ]; then
    print_warn "Service is stopped"
elif [ "$STATUS" = "failed" ]; then
    print_error "Service has failed"
else
    print_warn "Service status: $STATUS"
fi

# 3. Check if port is in use
print_info "3. Checking port 3306..."
if netstat -tlnp 2>/dev/null | grep -q ":3306 "; then
    print_warn "Port 3306 is in use"
    netstat -tlnp 2>/dev/null | grep ":3306 "
else
    print_ok "Port 3306 is free"
fi

# 4. Check disk space
print_info "4. Checking disk space..."
DISK_USAGE=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -gt 90 ]; then
    print_error "Disk usage is ${DISK_USAGE}% - critical!"
elif [ "$DISK_USAGE" -gt 80 ]; then
    print_warn "Disk usage is ${DISK_USAGE}% - high"
else
    print_ok "Disk usage is ${DISK_USAGE}% - OK"
fi

# 5. Check memory
print_info "5. Checking memory..."
MEMORY_USAGE=$(free | grep Mem | awk '{printf "%.0f", $3/$2 * 100.0}')
if [ "$MEMORY_USAGE" -gt 90 ]; then
    print_error "Memory usage is ${MEMORY_USAGE}% - critical!"
elif [ "$MEMORY_USAGE" -gt 80 ]; then
    print_warn "Memory usage is ${MEMORY_USAGE}% - high"
else
    print_ok "Memory usage is ${MEMORY_USAGE}% - OK"
fi

# 6. Check recent logs
print_info "6. Checking recent error logs..."
ERROR_LOG="/var/log/mysql/error.log"
if [ -f "$ERROR_LOG" ]; then
    RECENT_ERRORS=$(tail -10 "$ERROR_LOG" | grep -i "error\|fatal\|critical" | wc -l)
    if [ "$RECENT_ERRORS" -gt 0 ]; then
        print_warn "Found $RECENT_ERRORS recent errors in log"
        echo "   Recent errors:"
        tail -5 "$ERROR_LOG" | grep -i "error\|fatal\|critical" | head -3
    else
        print_ok "No recent errors in log"
    fi
else
    print_warn "Error log not found: $ERROR_LOG"
fi

# 7. Check permissions
print_info "7. Checking data directory permissions..."
DATA_DIR="/var/lib/mysql"
if [ -d "$DATA_DIR" ]; then
    OWNER=$(stat -c '%U:%G' "$DATA_DIR")
    if [ "$OWNER" = "mysql:mysql" ] || [ "$OWNER" = "mariadb:mariadb" ]; then
        print_ok "Data directory permissions OK: $OWNER"
    else
        print_error "Data directory has wrong owner: $OWNER"
        echo "   Fix with: sudo chown -R mysql:mysql $DATA_DIR"
    fi
else
    print_error "Data directory not found: $DATA_DIR"
fi

echo ""
print_info "Quick fixes to try:"
echo ""

if [ "$STATUS" = "inactive" ]; then
    echo "1. Start the service:"
    echo "   sudo systemctl start $SERVICE_NAME"
    echo ""
fi

if [ "$STATUS" = "failed" ]; then
    echo "1. Reset and restart:"
    echo "   sudo systemctl reset-failed $SERVICE_NAME"
    echo "   sudo systemctl start $SERVICE_NAME"
    echo ""
fi

echo "2. Check detailed status:"
echo "   sudo systemctl status $SERVICE_NAME"
echo ""

echo "3. View live logs:"
echo "   sudo journalctl -u $SERVICE_NAME -f"
echo ""

echo "4. For comprehensive troubleshooting, run:"
echo "   sudo ./troubleshoot-mariadb-startup.sh"
echo ""

print_info "Quick check complete!" 