#!/bin/bash

# Reset MariaDB Root Password - Skip Grant Tables Mode
# Use this when MariaDB is already running with --skip-grant-tables

echo "🔑 MariaDB Root Password Reset (Skip Grant Tables Mode)"
echo "======================================================"

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

# Check if running as root
if [[ $EUID -ne 0 ]]; then
    print_error "This script must be run as root (use sudo)"
    exit 1
fi

# Check if MariaDB is running with skip-grant-tables
print_info "1. Checking MariaDB status..."
MYSQLD_PROCESSES=$(ps aux | grep mysqld | grep -v grep | grep -v "reset-password\|troubleshoot")

if [ -z "$MYSQLD_PROCESSES" ]; then
    print_error "No mysqld processes found. MariaDB may not be running."
    exit 1
fi

print_ok "Found mysqld processes:"
echo "$MYSQLD_PROCESSES"
echo ""

# Check if skip-grant-tables is active
if echo "$MYSQLD_PROCESSES" | grep -q "skip-grant-tables"; then
    print_ok "MariaDB is running with skip-grant-tables"
else
    print_warn "MariaDB is running but may not be in skip-grant-tables mode"
    print_info "Attempting to connect anyway..."
fi

echo ""

# Prompt for new password
print_warn "IMPORTANT: This will reset your MariaDB root password!"
print_info "Make sure to save the new password securely."
echo ""

read -s -p "Enter new password for root@localhost: " NEW_PASSWORD
echo ""
read -s -p "Confirm new password: " CONFIRM_PASSWORD
echo ""

if [ "$NEW_PASSWORD" != "$CONFIRM_PASSWORD" ]; then
    print_error "Passwords do not match!"
    exit 1
fi

if [ -z "$NEW_PASSWORD" ]; then
    print_error "Password cannot be empty!"
    exit 1
fi

echo ""

# Step 2: Reset the root password
print_info "2. Resetting root password..."

# Create SQL commands
TEMP_SQL=$(mktemp)
cat > "$TEMP_SQL" << EOF
USE mysql;

-- For MariaDB 10.4+
ALTER USER 'root'@'localhost' IDENTIFIED BY '$NEW_PASSWORD';

-- Flush privileges to apply changes
FLUSH PRIVILEGES;

-- Verify the change
SELECT user, host, plugin FROM user WHERE user='root' AND host='localhost';
EOF

# Execute the SQL commands
print_info "Executing password reset commands..."
if mysql < "$TEMP_SQL"; then
    print_ok "Root password updated successfully"
else
    print_error "Failed to update root password"
    print_info "Trying alternative method..."
    
    # Try alternative method for older MariaDB versions
    cat > "$TEMP_SQL" << EOF
USE mysql;

-- Alternative method for older versions
UPDATE user SET authentication_string = PASSWORD('$NEW_PASSWORD') WHERE user='root' AND host='localhost';

-- Flush privileges
FLUSH PRIVILEGES;

-- Verify the change
SELECT user, host, plugin FROM user WHERE user='root' AND host='localhost';
EOF

    if mysql < "$TEMP_SQL"; then
        print_ok "Root password updated successfully (alternative method)"
    else
        print_error "Both methods failed to update password"
        rm -f "$TEMP_SQL"
        exit 1
    fi
fi

echo ""

# Step 3: Stop MariaDB skip-grant-tables mode
print_info "3. Stopping MariaDB skip-grant-tables mode..."

# Find and kill the mysqld process
MYSQLD_PIDS=$(ps aux | grep mysqld | grep -v grep | grep -v "reset-password\|troubleshoot" | awk '{print $2}')

if [ -n "$MYSQLD_PIDS" ]; then
    print_info "Stopping mysqld processes: $MYSQLD_PIDS"
    for pid in $MYSQLD_PIDS; do
        if kill $pid 2>/dev/null; then
            print_ok "Sent SIGTERM to PID $pid"
        else
            print_warn "Failed to send SIGTERM to PID $pid, trying force kill..."
            kill -9 $pid 2>/dev/null
        fi
    done
    
    # Wait for processes to stop
    sleep 5
    
    # Make sure all processes are stopped
    pkill -f mysqld
    sleep 2
    
    print_ok "MariaDB skip-grant-tables mode stopped"
else
    print_warn "No mysqld processes found to stop"
fi

echo ""

# Step 4: Start MariaDB normally
print_info "4. Starting MariaDB service normally..."
if systemctl start mariadb; then
    print_ok "MariaDB service started successfully"
else
    print_error "Failed to start MariaDB service"
    print_info "Checking service status..."
    systemctl status mariadb --no-pager
    rm -f "$TEMP_SQL"
    exit 1
fi

echo ""

# Step 5: Test the new password
print_info "5. Testing new root password..."
sleep 3

if mysql -u root -p"$NEW_PASSWORD" -e "SELECT 'Password reset successful!' as status;" 2>/dev/null; then
    print_ok "Password reset successful! You can now login with:"
    echo ""
    echo "  mysql -u root -p"
    echo ""
    print_info "Enter the password when prompted: $NEW_PASSWORD"
else
    print_error "Password test failed. You may need to try again."
    print_info "Checking if MariaDB is running..."
    systemctl status mariadb --no-pager
    rm -f "$TEMP_SQL"
    exit 1
fi

echo ""

# Cleanup
rm -f "$TEMP_SQL"

print_ok "MariaDB root password reset complete!"
print_info "Remember to save your new password securely."
echo ""
print_info "Next steps:"
echo "  1. Test your applications with the new password"
echo "  2. Update any configuration files that use the old password"
echo "  3. Consider creating application-specific users for security"
echo ""
print_info "Useful commands:"
echo "  sudo systemctl status mariadb    # Check service status"
echo "  mysql -u root -p                 # Connect to database"
echo "  sudo systemctl restart mariadb   # Restart service" 