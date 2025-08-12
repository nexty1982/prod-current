#!/bin/bash

# OrthodoxMetrics Big Book System Setup Script
# Initializes the Big Book knowledge management system

set -e

echo "📚 OrthodoxMetrics Big Book System Setup"
echo "========================================="

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
BIGBOOK_ROOT="$PROJECT_ROOT/bigbook"
SCHEMA_FILE="$PROJECT_ROOT/server/database/omai-schema.sql"
DB_NAME="omai_db"

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
    print_error "Big Book schema file not found: $SCHEMA_FILE"
    exit 1
fi

print_success "Big Book schema file found"

# Step 3: Create Big Book directory structure
print_status "Creating Big Book directory structure..."

mkdir -p "$BIGBOOK_ROOT"/{storage/{documents/{scripts/{server/{setup,maintenance,deployment,testing,utilities},frontend/{build,dev,deployment},database/{migrations,seeds,maintenance}},docs/{architecture,api,deployment,troubleshooting,user-guides,development},sql/{schemas,migrations,procedures,views,data},config/{system,application,deployment,environment},other},backups,cache,uploads},index,config,logs,web/{static,templates,api}}

print_success "Directory structure created: $BIGBOOK_ROOT"

# Step 4: Set proper permissions
print_status "Setting file permissions..."

chmod 755 "$BIGBOOK_ROOT"
chmod 755 "$BIGBOOK_ROOT"/storage
chmod 755 "$BIGBOOK_ROOT"/index
chmod 755 "$BIGBOOK_ROOT"/config
chmod 755 "$BIGBOOK_ROOT"/logs
chmod 755 "$BIGBOOK_ROOT"/web

# Set ownership to www-data
chown -R www-data:www-data "$BIGBOOK_ROOT"

print_success "Permissions set correctly"

# Step 5: Create initial configuration files
print_status "Creating initial configuration files..."

# Create watchers.json
cat > "$BIGBOOK_ROOT/config/watchers.json" << 'EOF'
{
  "version": "1.0",
  "watchers": [
    {
      "id": "main_project",
      "path": "/var/www/orthodox-church-mgmt/orthodoxmetrics/prod",
      "patterns": ["**/*.md", "**/*.sql", "**/*.js", "**/*.ts", "**/*.sh", "**/*.ps1"],
      "exclude": ["**/node_modules/**", "**/.git/**", "**/logs/**", "**/temp/**", "**/bigbook/**"],
      "enabled": true,
      "scan_interval": 300
    },
    {
      "id": "server_scripts",
      "path": "/var/www/orthodox-church-mgmt/orthodoxmetrics/prod/server/scripts",
      "patterns": ["**/*.js", "**/*.sh", "**/*.sql"],
      "exclude": ["**/backups/**", "**/temp/**"],
      "enabled": true,
      "scan_interval": 300
    },
    {
      "id": "docs",
      "path": "/var/www/orthodox-church-mgmt/orthodoxmetrics/prod/docs",
      "patterns": ["**/*.md", "**/*.sql"],
      "exclude": ["**/archive/**"],
      "enabled": true,
      "scan_interval": 300
    }
  ]
}
EOF

# Create categories.json
cat > "$BIGBOOK_ROOT/config/categories.json" << 'EOF'
{
  "version": "1.0",
  "categories": [
    {
      "id": 1,
      "name": "Scripts",
      "description": "Automation and utility scripts",
      "color": "#28a745",
      "icon": "code",
      "sort_order": 1,
      "parent_id": null
    },
    {
      "id": 2,
      "name": "Documentation",
      "description": "System documentation and guides",
      "color": "#17a2b8",
      "icon": "book",
      "sort_order": 2,
      "parent_id": null
    },
    {
      "id": 3,
      "name": "Database",
      "description": "SQL scripts and database management",
      "color": "#ffc107",
      "icon": "database",
      "sort_order": 3,
      "parent_id": null
    },
    {
      "id": 4,
      "name": "Configuration",
      "description": "System configuration files",
      "color": "#6f42c1",
      "icon": "cog",
      "sort_order": 4,
      "parent_id": null
    },
    {
      "id": 5,
      "name": "Testing",
      "description": "Test scripts and validation tools",
      "color": "#fd7e14",
      "icon": "check-circle",
      "sort_order": 5,
      "parent_id": null
    },
    {
      "id": 6,
      "name": "Deployment",
      "description": "Deployment and setup scripts",
      "color": "#e83e8c",
      "icon": "rocket",
      "sort_order": 6,
      "parent_id": null
    },
    {
      "id": 7,
      "name": "Maintenance",
      "description": "System maintenance and cleanup",
      "color": "#6c757d",
      "icon": "tools",
      "sort_order": 7,
      "parent_id": null
    },
    {
      "id": 8,
      "name": "AI/ML",
      "description": "AI and machine learning components",
      "color": "#20c997",
      "icon": "brain",
      "sort_order": 8,
      "parent_id": null
    }
  ]
}
EOF

# Create tags.json
cat > "$BIGBOOK_ROOT/config/tags.json" << 'EOF'
{
  "version": "1.0",
  "tags": [
    {
      "id": 1,
      "name": "critical",
      "description": "Critical system components",
      "color": "#dc3545",
      "usage_count": 0
    },
    {
      "id": 2,
      "name": "deprecated",
      "description": "Deprecated or legacy code",
      "color": "#6c757d",
      "usage_count": 0
    },
    {
      "id": 3,
      "name": "experimental",
      "description": "Experimental features",
      "color": "#fd7e14",
      "usage_count": 0
    },
    {
      "id": 4,
      "name": "production",
      "description": "Production-ready code",
      "color": "#28a745",
      "usage_count": 0
    },
    {
      "id": 5,
      "name": "security",
      "description": "Security-related components",
      "color": "#dc3545",
      "usage_count": 0
    }
  ]
}
EOF

# Create ai-patterns.json
cat > "$BIGBOOK_ROOT/config/ai-patterns.json" << 'EOF'
{
  "version": "1.0",
  "patterns": []
}
EOF

print_success "Configuration files created"

# Step 6: Create initial index files
print_status "Creating initial index files..."

# Create search.json
cat > "$BIGBOOK_ROOT/index/search.json" << 'EOF'
{
  "version": "1.0",
  "last_updated": "2025-01-26T00:00:00Z",
  "documents": {},
  "keywords": {}
}
EOF

# Create metadata.json
cat > "$BIGBOOK_ROOT/index/metadata.json" << 'EOF'
{
  "version": "1.0",
  "last_updated": "2025-01-26T00:00:00Z",
  "statistics": {
    "total_documents": 0,
    "by_category": {},
    "by_file_type": {}
  },
  "recent_activity": []
}
EOF

# Create relationships.json
cat > "$BIGBOOK_ROOT/index/relationships.json" << 'EOF'
{
  "version": "1.0",
  "last_updated": "2025-01-26T00:00:00Z",
  "relationships": {},
  "graph_data": {
    "nodes": [],
    "edges": []
  }
}
EOF

# Create timeline.json
cat > "$BIGBOOK_ROOT/index/timeline.json" << 'EOF'
{
  "version": "1.0",
  "last_updated": "2025-01-26T00:00:00Z",
  "events": []
}
EOF

print_success "Index files created"

# Step 7: Create log files
print_status "Creating log files..."

touch "$BIGBOOK_ROOT/logs/indexing.log"
touch "$BIGBOOK_ROOT/logs/ai-learning.log"
touch "$BIGBOOK_ROOT/logs/search.log"
touch "$BIGBOOK_ROOT/logs/execution.log"

chmod 644 "$BIGBOOK_ROOT/logs"/*.log
chown www-data:www-data "$BIGBOOK_ROOT/logs"/*.log

print_success "Log files created"

# Step 8: Install database schema
print_status "Installing database schema..."

# Check if MySQL is available
if ! command -v mysql >/dev/null 2>&1; then
    print_error "MySQL client not found. Please install mysql-client"
    exit 1
fi

# Try to install schema (will prompt for password)
print_warning "You will be prompted for MySQL root password"
if mysql -u root -p "$DB_NAME" < "$SCHEMA_FILE"; then
    print_success "Database schema installed successfully"
else
    print_error "Failed to install database schema"
    print_warning "You may need to run the schema manually:"
    echo "mysql -u root -p $DB_NAME < $SCHEMA_FILE"
fi

# Step 9: Create management scripts
print_status "Creating management scripts..."

# Create Big Book status script
cat > "/usr/local/bin/bigbook-status" << 'EOF'
#!/bin/bash
# Big Book system status check
echo "📚 OrthodoxMetrics Big Book Status"
echo "=================================="
echo ""
echo "Storage Location: /var/www/orthodox-church-mgmt/orthodoxmetrics/prod/bigbook"
echo "Database: omai_db"
echo ""
echo "Directory Structure:"
ls -la /var/www/orthodox-church-mgmt/orthodoxmetrics/prod/bigbook/
echo ""
echo "Configuration Files:"
ls -la /var/www/orthodox-church-mgmt/orthodoxmetrics/prod/bigbook/config/
echo ""
echo "Index Files:"
ls -la /var/www/orthodox-church-mgmt/orthodoxmetrics/prod/bigbook/index/
echo ""
echo "Log Files:"
ls -la /var/www/orthodox-church-mgmt/orthodoxmetrics/prod/bigbook/logs/
EOF

chmod +x "/usr/local/bin/bigbook-status"

# Create Big Book backup script
cat > "/usr/local/bin/bigbook-backup" << 'EOF'
#!/bin/bash
# Big Book system backup
BIGBOOK_ROOT="/var/www/orthodox-church-mgmt/orthodoxmetrics/prod/bigbook"
BACKUP_DIR="/var/backups/orthodoxmetrics/bigbook"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

mkdir -p "$BACKUP_DIR"
cd "$BIGBOOK_ROOT"

tar -czf "$BACKUP_DIR/bigbook_backup_$TIMESTAMP.tar.gz" \
    --exclude='cache/*' \
    --exclude='uploads/*' \
    --exclude='*.log' \
    .

echo "Big Book backup created: bigbook_backup_$TIMESTAMP.tar.gz"
echo "Location: $BACKUP_DIR"
EOF

chmod +x "/usr/local/bin/bigbook-backup"

print_success "Management scripts created"

# Step 10: Create documentation
print_status "Creating documentation..."

cat > "$BIGBOOK_ROOT/README.md" << 'EOF'
# OrthodoxMetrics Big Book System

## Overview
The Big Book is a comprehensive knowledge management system for OrthodoxMetrics that indexes, organizes, and provides AI-powered insights for all scripts, documentation, and configuration files.

## Architecture
- **Storage**: `/var/www/orthodox-church-mgmt/orthodoxmetrics/prod/bigbook/`
- **Database**: `omai_db` (bigbook_* tables)
- **Web Interface**: Integrated with existing OrthodoxMetrics frontend

## Components

### 1. Storage Structure
- `storage/documents/` - Original files organized by type
- `index/` - Search indexes and metadata
- `config/` - System configuration files
- `logs/` - System operation logs
- `web/` - Web interface assets

### 2. Database Schema
- `bigbook_documents` - Main document storage
- `bigbook_relationships` - Document dependencies
- `bigbook_executions` - Script execution history
- `bigbook_ai_patterns` - AI learning patterns
- `bigbook_recommendations` - AI recommendations
- `bigbook_timeline` - Document change history

### 3. File Watchers
- Main project directory monitoring
- Server scripts monitoring
- Documentation monitoring
- Automatic indexing every 5 minutes

## Quick Commands
- `bigbook-status` - Check system status
- `bigbook-backup` - Create system backup

## Next Steps
1. Start the indexing service
2. Configure the web interface
3. Set up AI learning system
4. Migrate existing documents

## Support
See the main OrthodoxMetrics documentation for detailed information.
EOF

print_success "Documentation created"

# Step 11: Display summary
echo ""
echo "========================================="
print_success "Big Book System Setup Complete!"
echo "========================================="
echo ""
print_status "What was created:"
echo "✅ Directory structure: $BIGBOOK_ROOT"
echo "✅ Database schema: $SCHEMA_FILE"
echo "✅ Configuration files: $BIGBOOK_ROOT/config/"
echo "✅ Index files: $BIGBOOK_ROOT/index/"
echo "✅ Log files: $BIGBOOK_ROOT/logs/"
echo "✅ Management scripts: /usr/local/bin/bigbook-*"
echo "✅ Documentation: $BIGBOOK_ROOT/README.md"
echo ""
print_status "Storage Structure:"
echo "📁 Documents: $BIGBOOK_ROOT/storage/documents/"
echo "📁 Indexes: $BIGBOOK_ROOT/index/"
echo "📁 Config: $BIGBOOK_ROOT/config/"
echo "📁 Logs: $BIGBOOK_ROOT/logs/"
echo ""
print_status "Database Tables:"
echo "🗄️  bigbook_documents - Main document storage"
echo "🗄️  bigbook_relationships - Document dependencies"
echo "🗄️  bigbook_executions - Script execution history"
echo "🗄️  bigbook_ai_patterns - AI learning patterns"
echo "🗄️  bigbook_recommendations - AI recommendations"
echo "🗄️  bigbook_timeline - Document change history"
echo "🗄️  Database: omai_db (dedicated OMAI database)"
echo ""
print_status "Quick Commands:"
echo "📊 Check status: bigbook-status"
echo "💾 Create backup: bigbook-backup"
echo "📋 View logs: tail -f $BIGBOOK_ROOT/logs/indexing.log"
echo ""
print_warning "Next Steps:"
echo "1. Start the indexing service to scan existing files"
echo "2. Configure the web interface integration"
echo "3. Set up the AI learning system"
echo "4. Test the search and recommendation features"
echo ""
print_success "Big Book System is ready! 📚" 