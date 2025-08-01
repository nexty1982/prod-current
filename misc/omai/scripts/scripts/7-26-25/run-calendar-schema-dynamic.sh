#!/bin/bash

# OrthodoxMetrics Calendar System Database Schema - Dynamic Username
echo "🔧 Running OrthodoxMetrics Calendar Database Schema (Dynamic Username)..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Check if schema file exists
if [ ! -f "server/calendar-schema.sql" ]; then
    print_error "Calendar schema file not found: server/calendar-schema.sql"
    exit 1
fi

print_status "Calendar schema file found. Creating database schema..."

# Get database credentials
read -p "Enter MySQL username (default: orthodoxapps): " DB_USER
DB_USER=${DB_USER:-orthodoxapps}

read -s -p "Enter MySQL password: " DB_PASS
echo ""

read -p "Enter MySQL host (default: localhost): " DB_HOST
DB_HOST=${DB_HOST:-localhost}

read -p "Enter database name (default: orthodoxmetrics_db): " DB_NAME
DB_NAME=${DB_NAME:-orthodoxmetrics_db}

print_status "Creating calendar database schema with dynamic username..."

# Create a temporary file with the correct username
TEMP_SCHEMA="/tmp/calendar_schema_dynamic.sql"

# Copy the schema and replace the username
cp server/calendar-schema.sql "$TEMP_SCHEMA"

# Replace the username in GRANT statements
sed -i "s/'orthodoxapps'@'%'/'${DB_USER}'@'%'/g" "$TEMP_SCHEMA"

# Run the schema
mysql -u "$DB_USER" -p"$DB_PASS" -h "$DB_HOST" < "$TEMP_SCHEMA"

if [ $? -eq 0 ]; then
    print_success "Database schema created successfully!"
    
    # Verify the tables were created
    print_status "Verifying tables..."
    mysql -u "$DB_USER" -p"$DB_PASS" -h "$DB_HOST" "$DB_NAME" -e "
    SHOW TABLES LIKE 'ai_%';
    SHOW TABLES LIKE 'task_%';
    SHOW TABLES LIKE 'kanban_%';
    SHOW TABLES LIKE 'calendar_%';
    SHOW TABLES LIKE 'chatgpt_%';
    " 2>/dev/null
    
    # Clean up temp file
    rm -f "$TEMP_SCHEMA"
    
    print_success "Calendar database schema setup completed!"
    echo ""
    echo "Next steps:"
    echo "1. Run the full setup: ./setup-calendar-system.sh"
    echo "2. Or start the system: ./start-calendar-system.sh (if it exists)"
else
    print_error "Failed to create database schema"
    rm -f "$TEMP_SCHEMA"
    exit 1
fi 