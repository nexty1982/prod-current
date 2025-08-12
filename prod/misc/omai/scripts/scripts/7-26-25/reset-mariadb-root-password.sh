#!/bin/bash

# Reset MariaDB Root Password Script
# Use this when socket access is disabled and you can't login

echo "🔑 MariaDB Root Password Reset"
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

echo ""

# Check if running as root
if [[ $EUID -ne 0 ]]; then
    print_error "This script must be run as root (use sudo)"
    exit 1
fi

print_warn "IMPORTANT: This will reset your MariaDB root password!"
print_info "Make sure to save the new password securely."
echo ""

# Prompt for new password
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

# Step 1: Stop MariaDB service
print_info "1. Stopping MariaDB service..."
if systemctl stop mariadb; then
    print_ok "MariaDB service stopped"
else
    print_warn "Service stop failed, attempting to kill processes..."
    pkill -f mysqld
    sleep 2
fi

echo ""

# Step 2: Start MariaDB in safe mode
print_info "2. Starting MariaDB in safe mode (skip-grant-tables)..."
print_warn "This temporarily disables authentication for security purposes."

# Create a temporary configuration file
TEMP_CNF=$(mktemp)
cat > "$TEMP_CNF" << EOF
[mysqld]
skip-grant-tables
skip-networking
user=mysql
datadir=/var/lib/mysql
socket=/var/run/mysqld/mysqld.sock
EOF

# Start MariaDB with skip-grant-tables
print_info "Starting MariaDB with skip-grant-tables..."
mysqld --defaults-file="$TEMP_CNF" --user=mysql &
MYSQLD_PID=$!

# Wait for MariaDB to start
print_info "Waiting for MariaDB to start..."
sleep 10

# Check if MariaDB is running
if ! ps -p $MYSQLD_PID > /dev/null; then
    print_error "MariaDB failed to start in safe mode"
    rm -f "$TEMP_CNF"
    exit 1
fi

print_ok "MariaDB started in safe mode"

echo ""

# Step 3: Reset the root password
print_info "3. Resetting root password..."

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
if mysql < "$TEMP_SQL"; then
    print_ok "Root password updated successfully"
else
    print_error "Failed to update root password"
    rm -f "$TEMP_CNF" "$TEMP_SQL"
    kill $MYSQLD_PID 2>/dev/null
    exit 1
fi

echo ""

# Step 4: Stop MariaDB safe mode
print_info "4. Stopping MariaDB safe mode..."
kill $MYSQLD_PID
sleep 5

# Make sure it's stopped
pkill -f mysqld
sleep 2

print_ok "MariaDB safe mode stopped"

echo ""

# Step 5: Start MariaDB normally
print_info "5. Starting MariaDB service normally..."
if systemctl start mariadb; then
    print_ok "MariaDB service started successfully"
else
    print_error "Failed to start MariaDB service"
    rm -f "$TEMP_CNF" "$TEMP_SQL"
    exit 1
fi

echo ""

# Step 6: Test the new password
print_info "6. Testing new root password..."
sleep 3

if mysql -u root -p"$NEW_PASSWORD" -e "SELECT 'Password reset successful!' as status;" 2>/dev/null; then
    print_ok "Password reset successful! You can now login with:"
    echo ""
    echo "  mysql -u root -p"
    echo ""
    print_info "Enter the password when prompted: $NEW_PASSWORD"
else
    print_error "Password test failed. You may need to try again."
    rm -f "$TEMP_CNF" "$TEMP_SQL"
    exit 1
fi

echo ""

# Cleanup
rm -f "$TEMP_CNF" "$TEMP_SQL"

print_ok "MariaDB root password reset complete!"
print_info "Remember to save your new password securely."
echo ""
print_info "Next steps:"
echo "  1. Test your applications with the new password"
echo "  2. Update any configuration files that use the old password"
echo "  3. Consider creating application-specific users for security" 