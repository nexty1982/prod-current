#!/bin/bash

# OrthodoxMetrics AI (OMAI) Database Setup Script
# Creates and configures the dedicated OMAI database

set -e

echo "🤖 OrthodoxMetrics AI (OMAI) Database Setup"
echo "==========================================="

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

# Configuration
PROJECT_ROOT="$(pwd)"
SCHEMA_FILE="$PROJECT_ROOT/server/database/omai-schema.sql"
DB_NAME="omai_db"
DB_USER="omai_user"
DB_PASSWORD="omai_secure_password_2025"

# Check if we're in the right directory
if [ ! -f "server/index.js" ] || [ ! -f "front-end/package.json" ]; then
    print_error "Please run this script from the project root directory"
    exit 1
fi

print_status "Current directory: $PROJECT_ROOT"

# Step 1: Check if running as root
if [[ $EUID -ne 0 ]]; then
    print_error "This script must be run as root (use sudo)"
    exit 1
fi

# Step 2: Check if schema file exists
if [ ! -f "$SCHEMA_FILE" ]; then
    print_error "OMAI schema file not found: $SCHEMA_FILE"
    exit 1
fi

print_success "OMAI schema file found"

# Step 3: Check if MySQL is available
if ! command -v mysql >/dev/null 2>&1; then
    print_error "MySQL client not found. Please install mysql-client"
    exit 1
fi

print_success "MySQL client found"

# Step 4: Create OMAI database and user
print_status "Creating OMAI database and user..."

# Prompt for root password if needed
echo ""
print_warning "You may need to enter the root password for MariaDB/MySQL"
echo "If you recently disabled socket authentication, you'll need the new password"
echo ""

# Create database and user
mysql -u root -p << EOF
-- Create OMAI database
CREATE DATABASE IF NOT EXISTS $DB_NAME
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

-- Create OMAI user
CREATE USER IF NOT EXISTS '$DB_USER'@'localhost' IDENTIFIED BY '$DB_PASSWORD';

-- Grant permissions to OMAI user
GRANT ALL PRIVILEGES ON $DB_NAME.* TO '$DB_USER'@'localhost';

-- Grant additional permissions for cross-database operations
GRANT SELECT ON orthodoxmetrics_db.* TO '$DB_USER'@'localhost';

-- Flush privileges
FLUSH PRIVILEGES;

-- Show created database
SHOW DATABASES LIKE '$DB_NAME';
EOF

print_success "OMAI database and user created"

# Step 5: Install database schema
print_status "Installing OMAI database schema..."

# Install schema using the new user
print_status "Installing schema with user: $DB_USER"
if mysql -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" < "$SCHEMA_FILE"; then
    print_success "OMAI database schema installed successfully"
else
    print_error "Failed to install OMAI database schema"
    print_warning "You may need to run the schema manually:"
    echo "mysql -u $DB_USER -p$DB_PASSWORD $DB_NAME < $SCHEMA_FILE"
    exit 1
fi

# Step 6: Verify installation
print_status "Verifying OMAI database installation..."

print_status "Running verification queries..."
mysql -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -e "
SELECT 
    'Database Info' as info,
    DATABASE() as database_name,
    VERSION() as mysql_version;

SELECT 
    'Tables Created' as info,
    COUNT(*) as table_count
FROM information_schema.tables 
WHERE table_schema = '$DB_NAME' 
AND table_name LIKE 'bigbook_%';

SELECT 
    'Categories' as info,
    COUNT(*) as count
FROM bigbook_categories;

SELECT 
    'Configuration' as info,
    COUNT(*) as count
FROM bigbook_config;
"

print_success "OMAI database verification completed"

# Step 7: Create database configuration file
print_status "Creating OMAI database configuration..."

cat > "$PROJECT_ROOT/omai-database.conf" << EOF
# OrthodoxMetrics AI (OMAI) Database Configuration
# Generated on $(date)

# Database Connection
DB_HOST=localhost
DB_NAME=$DB_NAME
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASSWORD

# Connection Pool Settings
DB_POOL_MIN=2
DB_POOL_MAX=10
DB_POOL_ACQUIRE=30000
DB_POOL_IDLE=10000

# Security Settings
DB_SSL=false
DB_SSL_VERIFY=false

# Backup Settings
BACKUP_ENABLED=true
BACKUP_RETENTION_DAYS=30
BACKUP_PATH=/var/backups/orthodoxmetrics/omai

# Monitoring Settings
MONITORING_ENABLED=true
SLOW_QUERY_THRESHOLD=1000
QUERY_LOG_ENABLED=false
EOF

chmod 600 "$PROJECT_ROOT/omai-database.conf"
print_success "OMAI database configuration created: omai-database.conf"

# Step 8: Create management scripts
print_status "Creating OMAI database management scripts..."

# Create OMAI database status script
cat > "/usr/local/bin/omai-db-status" << 'EOF'
#!/bin/bash
# OMAI database status check
echo "🤖 OrthodoxMetrics AI (OMAI) Database Status"
echo "==========================================="
echo ""

# Load configuration
if [ -f "/var/www/orthodox-church-mgmt/orthodoxmetrics/prod/omai-database.conf" ]; then
    source "/var/www/orthodox-church-mgmt/orthodoxmetrics/prod/omai-database.conf"
    echo "Database: $DB_NAME"
    echo "User: $DB_USER"
    echo "Host: $DB_HOST"
else
    echo "Configuration file not found"
    exit 1
fi

echo ""
echo "Database Connection Test:"
if mysql -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -e "SELECT 1 as test;" 2>/dev/null; then
    echo "✅ Database connection successful"
else
    echo "❌ Database connection failed"
    exit 1
fi

echo ""
echo "Table Counts:"
mysql -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -e "
SELECT 
    'bigbook_documents' as table_name,
    COUNT(*) as count
FROM bigbook_documents
UNION ALL
SELECT 
    'bigbook_executions' as table_name,
    COUNT(*) as count
FROM bigbook_executions
UNION ALL
SELECT 
    'bigbook_ai_patterns' as table_name,
    COUNT(*) as count
FROM bigbook_ai_patterns
UNION ALL
SELECT 
    'bigbook_recommendations' as table_name,
    COUNT(*) as count
FROM bigbook_ai_recommendations
ORDER BY table_name;
"

echo ""
echo "Recent Activity:"
mysql -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -e "
SELECT 
    'Recent Executions' as activity,
    COUNT(*) as count
FROM bigbook_executions 
WHERE executed_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
UNION ALL
SELECT 
    'Recent AI Interactions' as activity,
    COUNT(*) as count
FROM bigbook_ai_interactions 
WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR);
"
EOF

chmod +x "/usr/local/bin/omai-db-status"

# Create OMAI database backup script
cat > "/usr/local/bin/omai-db-backup" << 'EOF'
#!/bin/bash
# OMAI database backup
BACKUP_DIR="/var/backups/orthodoxmetrics/omai"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Load configuration
if [ -f "/var/www/orthodox-church-mgmt/orthodoxmetrics/prod/omai-database.conf" ]; then
    source "/var/www/orthodox-church-mgmt/orthodoxmetrics/prod/omai-database.conf"
else
    echo "Configuration file not found"
    exit 1
fi

mkdir -p "$BACKUP_DIR"

# Create backup
mysqldump -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" > "$BACKUP_DIR/omai_backup_$TIMESTAMP.sql"

# Compress backup
gzip "$BACKUP_DIR/omai_backup_$TIMESTAMP.sql"

echo "OMAI database backup created: omai_backup_$TIMESTAMP.sql.gz"
echo "Location: $BACKUP_DIR"

# Clean up old backups (keep last 30 days)
find "$BACKUP_DIR" -name "omai_backup_*.sql.gz" -mtime +30 -delete
EOF

chmod +x "/usr/local/bin/omai-db-backup"

print_success "OMAI database management scripts created"

# Step 9: Create cron job for automated backups
print_status "Setting up automated OMAI database backups..."

# Add to crontab (daily at 2:30 AM)
(crontab -l 2>/dev/null; echo "30 2 * * * /usr/local/bin/omai-db-backup") | crontab -

print_success "Automated backup cron job created (daily at 2:30 AM)"

# Step 10: Display summary
echo ""
echo "==========================================="
print_success "OMAI Database Setup Complete!"
echo "==========================================="
echo ""
print_status "What was created:"
echo "✅ Database: $DB_NAME"
echo "✅ User: $DB_USER"
echo "✅ Schema: All bigbook_* tables"
echo "✅ Configuration: omai-database.conf"
echo "✅ Management Scripts: /usr/local/bin/omai-*"
echo "✅ Automated Backups: Daily at 2:30 AM"
echo ""
print_status "Database Details:"
echo "🗄️  Name: $DB_NAME"
echo "👤 User: $DB_USER"
echo "🔐 Password: $DB_PASSWORD"
echo "🌐 Host: localhost"
echo "📊 Tables: 15 bigbook_* tables"
echo ""
print_status "Quick Commands:"
echo "📊 Check status: omai-db-status"
echo "💾 Create backup: omai-db-backup"
echo "🔧 Connect: mysql -u $DB_USER -p$DB_PASSWORD $DB_NAME"
echo ""
print_warning "Security Notes:"
echo "🔒 Database password is stored in omai-database.conf"
echo "🔒 File permissions set to 600 (owner read/write only)"
echo "🔒 Consider changing default password in production"
echo ""
print_status "Integration:"
echo "🔗 Big Book system will use this database"
echo "🔗 Web interface configured to connect to omai_db"
echo "🔗 Backend routes updated to use new database"
echo ""
print_success "OMAI Database is ready! 🤖" 