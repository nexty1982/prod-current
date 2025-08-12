#!/bin/bash

# 📁 server/scrapers/fix-database-permissions.sh
# Fix database permissions for orthodoxapps user

echo "🔧 Fixing Database Permissions for Orthodox Church Scrapers"
echo "=========================================================="
echo

# Database configuration
DB_USER="orthodoxapps"
DB_PASSWORD="Summerof1982@!"
DB_NAME="orthodoxmetrics"

echo "🗄️  Database: $DB_NAME"
echo "👤 User: $DB_USER"
echo

# Function to run SQL commands as root
run_sql_as_root() {
    local sql="$1"
    echo "Running: $sql"
    mysql -u root -p -e "$sql"
}

# Check if we can connect as orthodoxapps first
echo "🔍 Testing current connection..."
if mysql -u "$DB_USER" -p"$DB_PASSWORD" -e "USE $DB_NAME; SELECT 1;" 2>/dev/null; then
    echo "✅ Database connection already works!"
    echo "Your scraper should be functioning. Try running:"
    echo "   ./test-scrapers.sh"
    exit 0
fi

echo "❌ Cannot connect as $DB_USER. Fixing permissions..."
echo

# Create the database and user with proper permissions
echo "🔧 Setting up database and permissions..."
echo "Please enter MySQL root password when prompted:"
echo

cat << EOF | mysql -u root -p
-- Create database if it doesn't exist
CREATE DATABASE IF NOT EXISTS $DB_NAME CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create user if it doesn't exist
CREATE USER IF NOT EXISTS '$DB_USER'@'localhost' IDENTIFIED BY '$DB_PASSWORD';

-- Grant all privileges on the orthodoxmetrics database
GRANT ALL PRIVILEGES ON $DB_NAME.* TO '$DB_USER'@'localhost';

-- Also grant privileges to create temporary tables and execute
GRANT CREATE TEMPORARY TABLES ON $DB_NAME.* TO '$DB_USER'@'localhost';
GRANT EXECUTE ON $DB_NAME.* TO '$DB_USER'@'localhost';

-- Flush privileges to apply changes
FLUSH PRIVILEGES;

-- Show current grants
SHOW GRANTS FOR '$DB_USER'@'localhost';

-- Test connection
USE $DB_NAME;
SELECT 'Database access test successful' as result;
EOF

if [ $? -eq 0 ]; then
    echo
    echo "✅ Database permissions fixed successfully!"
    echo
    echo "🧪 Testing connection..."
    if mysql -u "$DB_USER" -p"$DB_PASSWORD" -e "USE $DB_NAME; SELECT 'Connection test successful' as result;" 2>/dev/null; then
        echo "✅ Connection test passed!"
        echo
        echo "🚀 Next steps:"
        echo "1. Run the scraper test: ./test-scrapers.sh"
        echo "2. Or run a quick test: ./test-scrapers.sh scrapers"
        echo "3. Or setup the database schema: ./test-scrapers.sh setup"
    else
        echo "❌ Connection test failed. Please check the error above."
    fi
else
    echo
    echo "❌ Failed to fix database permissions."
    echo
    echo "💡 Manual fix steps:"
    echo "1. Connect to MySQL as root: mysql -u root -p"
    echo "2. Run these commands:"
    echo "   CREATE DATABASE IF NOT EXISTS $DB_NAME;"
    echo "   CREATE USER IF NOT EXISTS '$DB_USER'@'localhost' IDENTIFIED BY '$DB_PASSWORD';"
    echo "   GRANT ALL PRIVILEGES ON $DB_NAME.* TO '$DB_USER'@'localhost';"
    echo "   FLUSH PRIVILEGES;"
fi 