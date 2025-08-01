#!/bin/bash

# Fix MariaDB Lock Issue Script
# Resolves the "Can't lock aria control file" error

echo "🔧 Fixing MariaDB Lock Issue"
echo "============================"

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

echo ""

# Step 1: Check for existing MariaDB processes
print_info "1. Checking for existing MariaDB processes..."
MYSQLD_PROCESSES=$(ps aux | grep mysqld | grep -v grep | grep -v "troubleshoot\|fix-mariadb")

if [ -n "$MYSQLD_PROCESSES" ]; then
    print_warn "Found existing mysqld processes:"
    echo "$MYSQLD_PROCESSES"
    echo ""
    
    # Extract PIDS
    PIDS=$(echo "$MYSQLD_PROCESSES" | awk '{print $2}')
    
    print_info "2. Stopping existing processes..."
    for pid in $PIDS; do
        print_info "Attempting graceful shutdown of PID $pid..."
        if kill $pid 2>/dev/null; then
            print_ok "Sent SIGTERM to PID $pid"
        else
            print_error "Failed to send SIGTERM to PID $pid"
        fi
    done
    
    # Wait a moment for graceful shutdown
    sleep 3
    
    # Check if processes are still running
    REMAINING_PIDS=$(ps aux | grep mysqld | grep -v grep | grep -v "troubleshoot\|fix-mariadb" | awk '{print $2}')
    
    if [ -n "$REMAINING_PIDS" ]; then
        print_warn "Some processes still running, forcing shutdown..."
        for pid in $REMAINING_PIDS; do
            print_info "Force killing PID $pid..."
            if kill -9 $pid 2>/dev/null; then
                print_ok "Force killed PID $pid"
            else
                print_error "Failed to kill PID $pid"
            fi
        done
    fi
else
    print_ok "No existing mysqld processes found"
fi

echo ""

# Step 3: Check port usage
print_info "3. Checking port 3306 usage..."
if netstat -tlnp 2>/dev/null | grep -q ":3306 "; then
    print_warn "Port 3306 is still in use:"
    netstat -tlnp 2>/dev/null | grep ":3306 "
    echo ""
    print_info "Waiting for port to be released..."
    sleep 5
else
    print_ok "Port 3306 is free"
fi

echo ""

# Step 4: Clean up socket files
print_info "4. Cleaning up socket files..."
SOCKET_DIR="/var/run/mysqld"
if [ -d "$SOCKET_DIR" ]; then
    if [ -S "$SOCKET_DIR/mysqld.sock" ]; then
        print_warn "Removing existing socket file..."
        rm -f "$SOCKET_DIR/mysqld.sock"
        print_ok "Socket file removed"
    fi
else
    print_info "Creating socket directory..."
    mkdir -p "$SOCKET_DIR"
    chown mysql:mysql "$SOCKET_DIR"
    chmod 755 "$SOCKET_DIR"
    print_ok "Socket directory created"
fi

echo ""

# Step 5: Reset systemd service
print_info "5. Resetting MariaDB service..."
if systemctl reset-failed mariadb 2>/dev/null; then
    print_ok "Service reset successful"
else
    print_warn "Service reset failed (may not have been failed)"
fi

echo ""

# Step 6: Start MariaDB service
print_info "6. Starting MariaDB service..."
if systemctl start mariadb; then
    print_ok "MariaDB service started successfully"
else
    print_error "Failed to start MariaDB service"
    echo ""
    print_info "Checking service status..."
    systemctl status mariadb --no-pager
    exit 1
fi

echo ""

# Step 7: Verify service is running
print_info "7. Verifying service status..."
sleep 2
if systemctl is-active mariadb >/dev/null 2>&1; then
    print_ok "MariaDB service is running"
    
    # Check if we can connect
    print_info "8. Testing database connection..."
    if mysql -u root -e "SELECT 'Connection successful' as test;" 2>/dev/null; then
        print_ok "Database connection successful"
    else
        print_warn "Database connection failed (may need password)"
        print_info "Try: mysql -u root -p"
    fi
else
    print_error "MariaDB service is not running"
    systemctl status mariadb --no-pager
    exit 1
fi

echo ""
print_ok "MariaDB lock issue resolved!"
print_info "Service is now running properly through systemd"
echo ""
print_info "Useful commands:"
echo "  sudo systemctl status mariadb    # Check service status"
echo "  sudo systemctl stop mariadb      # Stop service"
echo "  sudo systemctl restart mariadb   # Restart service"
echo "  mysql -u root -p                 # Connect to database" 