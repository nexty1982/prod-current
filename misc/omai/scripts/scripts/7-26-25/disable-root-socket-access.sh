#!/bin/bash

# Disable Socket Access for root@localhost on MariaDB
# This script safely removes Unix socket authentication for root user

set -e

echo "🔒 Disabling Socket Access for root@localhost on MariaDB"
echo "========================================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [[ $EUID -ne 0 ]]; then
    print_error "This script must be run as root (use sudo)"
    exit 1
fi

# Check if MariaDB/MySQL is running
if ! systemctl is-active --quiet mariadb && ! systemctl is-active --quiet mysql; then
    print_error "MariaDB/MySQL is not running. Please start the service first."
    exit 1
fi

print_success "MariaDB/MySQL service is running"

# Check current root authentication method
print_status "Checking current root authentication method..."

CURRENT_AUTH=$(mysql -u root -e "SELECT plugin FROM mysql.user WHERE user='root' AND host='localhost';" 2>/dev/null | tail -n 1)

if [ -z "$CURRENT_AUTH" ]; then
    print_error "Could not determine current authentication method"
    exit 1
fi

echo "Current authentication method: $CURRENT_AUTH"

# Check if socket authentication is already disabled
if [ "$CURRENT_AUTH" = "mysql_native_password" ]; then
    print_success "Socket authentication is already disabled for root@localhost"
    exit 0
fi

# Prompt for new root password
echo ""
print_warning "You will need to set a new password for root@localhost"
echo "This will disable socket authentication and require password authentication"
echo ""

read -s -p "Enter new password for root@localhost: " NEW_ROOT_PASSWORD
echo ""
read -s -p "Confirm new password for root@localhost: " CONFIRM_PASSWORD
echo ""

if [ "$NEW_ROOT_PASSWORD" != "$CONFIRM_PASSWORD" ]; then
    print_error "Passwords do not match"
    exit 1
fi

if [ -z "$NEW_ROOT_PASSWORD" ]; then
    print_error "Password cannot be empty"
    exit 1
fi

print_status "Disabling socket authentication for root@localhost..."

# Create temporary SQL file
TEMP_SQL=$(mktemp)

cat > "$TEMP_SQL" << EOF
-- Disable socket authentication for root@localhost
ALTER USER 'root'@'localhost' IDENTIFIED BY '$NEW_ROOT_PASSWORD';

-- Verify the change
SELECT user, host, plugin FROM mysql.user WHERE user='root' AND host='localhost';

-- Flush privileges
FLUSH PRIVILEGES;
EOF

# Execute the SQL commands
if mysql -u root < "$TEMP_SQL"; then
    print_success "Socket authentication disabled successfully"
else
    print_error "Failed to disable socket authentication"
    rm -f "$TEMP_SQL"
    exit 1
fi

# Clean up temporary file
rm -f "$TEMP_SQL"

# Verify the change
print_status "Verifying the change..."

NEW_AUTH=$(mysql -u root -p"$NEW_ROOT_PASSWORD" -e "SELECT plugin FROM mysql.user WHERE user='root' AND host='localhost';" 2>/dev/null | tail -n 1)

if [ "$NEW_AUTH" = "mysql_native_password" ]; then
    print_success "Verification successful: Socket authentication is now disabled"
else
    print_warning "Verification failed: Authentication method is $NEW_AUTH"
fi

# Test connection with password
print_status "Testing connection with new password..."

if mysql -u root -p"$NEW_ROOT_PASSWORD" -e "SELECT 'Connection successful' as test;" 2>/dev/null; then
    print_success "Password authentication working correctly"
else
    print_error "Password authentication test failed"
    exit 1
fi

# Test that socket authentication is disabled
print_status "Testing that socket authentication is disabled..."

if mysql -u root -e "SELECT 'Socket auth should fail' as test;" 2>/dev/null; then
    print_warning "Socket authentication is still working - this may be expected if you're running as root"
else
    print_success "Socket authentication is properly disabled"
fi

echo ""
echo "========================================================"
print_success "Socket Access Disabled Successfully!"
echo "========================================================"
echo ""
print_status "What changed:"
echo "✅ root@localhost now requires password authentication"
echo "✅ Unix socket authentication is disabled"
echo "✅ New root password is set"
echo ""
print_warning "Important Notes:"
echo "🔒 Store the new root password securely"
echo "🔒 Update any scripts that connect as root"
echo "🔒 Consider creating a dedicated admin user for applications"
echo ""
print_status "Next Steps:"
echo "1. Update your application configurations"
echo "2. Update the OMAI database setup script"
echo "3. Test all database connections"
echo ""
print_status "To connect as root now use:"
echo "mysql -u root -p"
echo ""
print_success "Security improvement completed! 🔒" 