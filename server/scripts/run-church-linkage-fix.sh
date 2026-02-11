#!/bin/bash

# ================================================================================
# ORTHODOX METRICS CHURCH LINKAGE FIX RUNNER
# ================================================================================
# Purpose: Safely execute the church database linkage migration
# Author: Orthodox Metrics Development Team
# Date: 2025-01-24
# ================================================================================

set -e  # Exit on error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default configuration
DB_HOST=${DB_HOST:-"localhost"}
DB_USER=${DB_USER:-"root"}
DB_PASSWORD=${DB_PASSWORD:-"Summerof2025@!"}
BACKUP_DIR="./backups/church-linkage-fix-$(date +%Y%m%d_%H%M%S)"
DRY_RUN=${DRY_RUN:-"true"}

# Print colored output
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

# Print header
print_header() {
    echo "================================================================================"
    echo "🏛️  ORTHODOX METRICS CHURCH LINKAGE FIX"
    echo "================================================================================"
    echo "Purpose: Fix linkage between orthodoxmetrics_db.churches and church databases"
    echo "Date: $(date)"
    echo "Mode: $([ "$DRY_RUN" = "true" ] && echo "DRY RUN (audit only)" || echo "LIVE MIGRATION")"
    echo "================================================================================"
}

# Check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    # Check if mysql command is available
    if ! command -v mysql &> /dev/null; then
        print_error "mysql command not found. Please install MySQL client."
        exit 1
    fi
    
    # Check if we can connect to database
    if ! mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASSWORD" -e "SELECT 1;" &> /dev/null; then
        print_error "Cannot connect to MySQL database. Please check credentials."
        exit 1
    fi
    
    # Check if orthodoxmetrics_db exists
    if ! mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASSWORD" -e "USE orthodoxmetrics_db; SELECT 1;" &> /dev/null; then
        print_error "orthodoxmetrics_db database not found."
        exit 1
    fi
    
    print_success "Prerequisites check passed"
}

# Create backup directory
create_backup_dir() {
    print_status "Creating backup directory: $BACKUP_DIR"
    mkdir -p "$BACKUP_DIR"
    print_success "Backup directory created"
}

# Backup critical databases
backup_databases() {
    print_status "Creating database backups..."
    
    # Backup orthodoxmetrics_db
    print_status "Backing up orthodoxmetrics_db..."
    mysqldump -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASSWORD" \
        --single-transaction --routines --triggers \
        orthodoxmetrics_db > "$BACKUP_DIR/orthodoxmetrics_db_backup.sql"
    
    # Find and backup church databases
    mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASSWORD" \
        -e "SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA 
            WHERE SCHEMA_NAME LIKE '%church%' 
               OR SCHEMA_NAME LIKE '%orthodox%' 
               OR SCHEMA_NAME LIKE '%ssppoc%' 
               OR SCHEMA_NAME LIKE '%saints%'
               AND SCHEMA_NAME != 'orthodoxmetrics_db'
               AND SCHEMA_NAME NOT IN ('information_schema', 'performance_schema', 'mysql', 'sys');" \
        --skip-column-names | while read db_name; do
        
        if [ ! -z "$db_name" ]; then
            print_status "Backing up $db_name..."
            mysqldump -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASSWORD" \
                --single-transaction --routines --triggers \
                "$db_name" > "$BACKUP_DIR/${db_name}_backup.sql"
        fi
    done
    
    print_success "Database backups completed"
}

# Run the audit phase
run_audit() {
    print_status "Running church database audit..."
    
    # Create temporary SQL file for audit only
    cat > "$BACKUP_DIR/audit_only.sql" << 'EOF'
-- Audit-only version of the church linkage fix script
SET SESSION FOREIGN_KEY_CHECKS = 0;
SET SESSION SQL_SAFE_UPDATES = 0;

USE orthodoxmetrics_db;

-- Create audit table
DROP TABLE IF EXISTS temp_church_audit;
CREATE TABLE temp_church_audit (
    id INT AUTO_INCREMENT PRIMARY KEY,
    database_name VARCHAR(100),
    table_name VARCHAR(100),
    has_church_id BOOLEAN DEFAULT FALSE,
    church_id_type VARCHAR(50),
    has_foreign_key BOOLEAN DEFAULT FALSE,
    foreign_key_target VARCHAR(100),
    record_count INT DEFAULT 0,
    missing_church_id_count INT DEFAULT 0,
    needs_migration BOOLEAN DEFAULT TRUE,
    audit_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Audit procedure (simplified for standalone execution)
DELIMITER $$
DROP PROCEDURE IF EXISTS AuditChurchDatabase$$
CREATE PROCEDURE AuditChurchDatabase(IN db_name VARCHAR(100))
BEGIN
    DECLARE done INT DEFAULT FALSE;
    DECLARE table_name VARCHAR(100);
    
    DECLARE table_cursor CURSOR FOR
        SELECT TABLE_NAME 
        FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_SCHEMA = db_name 
        AND TABLE_NAME IN ('baptism_records', 'marriage_records', 'funeral_records');
    
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
    
    OPEN table_cursor;
    
    table_loop: LOOP
        FETCH table_cursor INTO table_name;
        IF done THEN
            LEAVE table_loop;
        END IF;
        
        SET @has_church_id = 0;
        SET @church_id_type = '';
        SET @has_fk = 0;
        SET @fk_target = '';
        SET @record_count = 0;
        SET @missing_church_id = 0;
        
        -- Check if church_id column exists
        SELECT COUNT(*), IFNULL(COLUMN_TYPE, '')
        INTO @has_church_id, @church_id_type
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = db_name
        AND TABLE_NAME = table_name
        AND COLUMN_NAME = 'church_id';
        
        -- Check for foreign key constraints
        SELECT COUNT(*), IFNULL(REFERENCED_TABLE_NAME, '')
        INTO @has_fk, @fk_target
        FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
        WHERE TABLE_SCHEMA = db_name
        AND TABLE_NAME = table_name
        AND COLUMN_NAME = 'church_id'
        AND REFERENCED_TABLE_NAME IS NOT NULL;
        
        -- Insert audit record
        INSERT INTO temp_church_audit (
            database_name, table_name, has_church_id, church_id_type,
            has_foreign_key, foreign_key_target, record_count, missing_church_id_count
        ) VALUES (
            db_name, table_name, @has_church_id > 0, @church_id_type,
            @has_fk > 0, @fk_target, @record_count, @missing_church_id
        );
        
    END LOOP;
    
    CLOSE table_cursor;
END$$
DELIMITER ;

-- Run audits for known databases
CALL AuditChurchDatabase('ssppoc_records_db');
CALL AuditChurchDatabase('saints_peter_and_paul_orthodox_church_db');

-- Display results
SELECT 
    database_name,
    table_name,
    has_church_id,
    church_id_type,
    has_foreign_key,
    foreign_key_target,
    record_count,
    missing_church_id_count,
    CASE 
        WHEN NOT has_church_id THEN 'ADD church_id column'
        WHEN missing_church_id_count > 0 THEN 'BACKFILL church_id values'
        WHEN has_foreign_key AND foreign_key_target != 'churches' THEN 'FIX foreign key'
        ELSE 'OK'
    END as required_action
FROM temp_church_audit
ORDER BY database_name, table_name;

-- Re-enable safety checks
SET SESSION FOREIGN_KEY_CHECKS = 1;
SET SESSION SQL_SAFE_UPDATES = 1;
EOF

    # Run the audit
    mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASSWORD" < "$BACKUP_DIR/audit_only.sql" > "$BACKUP_DIR/audit_results.txt"
    
    print_success "Audit completed. Results saved to $BACKUP_DIR/audit_results.txt"
    
    # Display key findings
    print_status "Audit Summary:"
    mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASSWORD" orthodoxmetrics_db \
        -e "SELECT COUNT(DISTINCT database_name) as databases_found, 
                   COUNT(*) as tables_audited,
                   SUM(CASE WHEN NOT has_church_id THEN 1 ELSE 0 END) as missing_church_id_columns,
                   SUM(CASE WHEN missing_church_id_count > 0 THEN 1 ELSE 0 END) as tables_needing_backfill
            FROM temp_church_audit;" 2>/dev/null || true
}

# Run the full migration
run_migration() {
    print_warning "Running LIVE MIGRATION - this will modify your databases!"
    print_status "Executing church linkage fix script..."
    
    # Run the full migration script
    mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASSWORD" < "$(dirname "$0")/../database/fix-church-linkage.sql" \
        > "$BACKUP_DIR/migration_results.txt" 2>&1
    
    if [ $? -eq 0 ]; then
        print_success "Migration completed successfully!"
        print_status "Results saved to $BACKUP_DIR/migration_results.txt"
    else
        print_error "Migration failed! Check $BACKUP_DIR/migration_results.txt for details"
        print_warning "You can restore from backups in $BACKUP_DIR"
        exit 1
    fi
}

# Validate the migration results
validate_results() {
    print_status "Validating migration results..."
    
    # Check if the validation view exists and run it
    mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASSWORD" orthodoxmetrics_db \
        -e "SELECT * FROM v_church_record_summary;" > "$BACKUP_DIR/validation_results.txt" 2>/dev/null || true
    
    print_success "Validation completed. Results in $BACKUP_DIR/validation_results.txt"
}

# Cleanup temporary data
cleanup() {
    print_status "Cleaning up temporary data..."
    
    mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASSWORD" orthodoxmetrics_db \
        -e "DROP TABLE IF EXISTS temp_church_audit;" 2>/dev/null || true
    
    print_success "Cleanup completed"
}

# Main execution function
main() {
    print_header
    
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --live)
                DRY_RUN="false"
                shift
                ;;
            --host)
                DB_HOST="$2"
                shift 2
                ;;
            --user)
                DB_USER="$2"
                shift 2
                ;;
            --password)
                DB_PASSWORD="$2"
                shift 2
                ;;
            --help)
                echo "Usage: $0 [OPTIONS]"
                echo "Options:"
                echo "  --live         Run actual migration (default: dry run)"
                echo "  --host HOST    Database host (default: localhost)"
                echo "  --user USER    Database user (default: orthodoxapp)"
                echo "  --password PWD Database password"
                echo "  --help         Show this help"
                exit 0
                ;;
            *)
                print_error "Unknown option: $1"
                exit 1
                ;;
        esac
    done
    
    # Confirm if running live migration
    if [ "$DRY_RUN" = "false" ]; then
        print_warning "You are about to run a LIVE MIGRATION that will modify your databases!"
        print_warning "This will:"
        print_warning "- Add church_id columns to record tables"
        print_warning "- Remove local church_info tables"
        print_warning "- Update foreign key constraints"
        echo ""
        read -p "Are you sure you want to continue? (yes/no): " confirm
        if [ "$confirm" != "yes" ]; then
            print_status "Migration cancelled by user"
            exit 0
        fi
    fi
    
    # Execute the migration steps
    check_prerequisites
    create_backup_dir
    backup_databases
    run_audit
    
    if [ "$DRY_RUN" = "false" ]; then
        run_migration
        validate_results
        cleanup
        
        print_success "🎉 Church linkage migration completed successfully!"
        print_status "Backups are available in: $BACKUP_DIR"
        print_status "Please test your application and verify the results."
    else
        print_success "🔍 Audit completed (dry run mode)"
        print_status "Review the audit results in: $BACKUP_DIR/audit_results.txt"
        print_status "To run the actual migration, use: $0 --live"
    fi
}

# Run the script
main "$@" 
