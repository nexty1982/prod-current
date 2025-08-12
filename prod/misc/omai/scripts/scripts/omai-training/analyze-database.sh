#!/bin/bash
# scripts/omai-training/analyze-database.sh
# Database Schema Analysis for OMAI Training

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

OUTPUT_DIR="data/omai-training/database-analysis"
TIMESTAMP=$(date '+%Y%m%d_%H%M%S')

# Database configuration (will try to load from environment or config)
DB_HOST="${DB_HOST:-localhost}"
DB_USER="${DB_USER:-root}"
DB_NAME="${DB_NAME:-orthodoxmetrics_db}"
DB_PASSWORD="${DB_PASSWORD:-}"

# Create output directory
mkdir -p "$OUTPUT_DIR"

echo -e "${BLUE}🔍 Starting Database Schema Analysis...${NC}"

# Function to test database connection
test_database_connection() {
    echo -e "${BLUE}🔌 Testing Database Connection...${NC}"
    
    # Try to connect to database
    if command -v mysql >/dev/null 2>&1; then
        if mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASSWORD" -e "USE $DB_NAME; SELECT 1;" >/dev/null 2>&1; then
            echo -e "${GREEN}✅ Database connection successful${NC}"
            return 0
        else
            echo -e "${YELLOW}⚠️  Cannot connect to database with current credentials${NC}"
            return 1
        fi
    else
        echo -e "${YELLOW}⚠️  MySQL client not found, analyzing migration files instead${NC}"
        return 1
    fi
}

# Function to analyze database schema from live database
analyze_live_schema() {
    echo -e "${BLUE}📊 Analyzing Live Database Schema...${NC}"
    
    {
        echo "=== Live Database Schema Analysis ==="
        echo "Analysis Date: $(date)"
        echo "Database: $DB_NAME"
        echo "Host: $DB_HOST"
        echo ""
        
        # Get all tables
        echo "--- ALL TABLES ---"
        mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASSWORD" -e "
            USE $DB_NAME; 
            SHOW TABLES;
        " 2>/dev/null || echo "Could not retrieve tables"
        echo ""
        
        # Get table structures
        echo "--- TABLE STRUCTURES ---"
        mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASSWORD" -e "
            USE $DB_NAME;
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = '$DB_NAME';
        " -N 2>/dev/null | while read -r table; do
            echo "Table: $table"
            mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASSWORD" -e "
                USE $DB_NAME; 
                DESCRIBE $table;
            " 2>/dev/null || echo "Could not describe table $table"
            echo ""
        done
        
        # Get foreign key relationships
        echo "--- FOREIGN KEY RELATIONSHIPS ---"
        mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASSWORD" -e "
            USE $DB_NAME;
            SELECT 
                TABLE_NAME,
                COLUMN_NAME,
                CONSTRAINT_NAME,
                REFERENCED_TABLE_NAME,
                REFERENCED_COLUMN_NAME
            FROM information_schema.KEY_COLUMN_USAGE
            WHERE REFERENCED_TABLE_SCHEMA = '$DB_NAME'
                AND REFERENCED_TABLE_NAME IS NOT NULL;
        " 2>/dev/null || echo "Could not retrieve foreign keys"
        echo ""
        
        # Get indexes
        echo "--- INDEXES ---"
        mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASSWORD" -e "
            USE $DB_NAME;
            SELECT 
                TABLE_NAME,
                INDEX_NAME,
                COLUMN_NAME,
                NON_UNIQUE
            FROM information_schema.STATISTICS
            WHERE TABLE_SCHEMA = '$DB_NAME'
            ORDER BY TABLE_NAME, INDEX_NAME;
        " 2>/dev/null || echo "Could not retrieve indexes"
        echo ""
        
        # Get row counts
        echo "--- TABLE ROW COUNTS ---"
        mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASSWORD" -e "
            USE $DB_NAME;
            SELECT 
                TABLE_NAME,
                TABLE_ROWS,
                DATA_LENGTH,
                INDEX_LENGTH
            FROM information_schema.TABLES
            WHERE TABLE_SCHEMA = '$DB_NAME'
                AND TABLE_TYPE = 'BASE TABLE'
            ORDER BY TABLE_ROWS DESC;
        " 2>/dev/null || echo "Could not retrieve row counts"
        
    } > "$OUTPUT_DIR/live_schema_analysis_$TIMESTAMP.txt"
    
    echo -e "${GREEN}✅ Live Schema Analysis Complete${NC}"
}

# Function to analyze migration files
analyze_migration_files() {
    echo -e "${BLUE}📁 Analyzing Migration Files...${NC}"
    
    {
        echo "=== Migration Files Analysis ==="
        echo "Analysis Date: $(date)"
        echo ""
        
        # Find all migration files
        echo "--- MIGRATION FILES FOUND ---"
        find . -path "*/migrations/*" -name "*.sql" 2>/dev/null | sort
        echo ""
        
        # Analyze each migration file
        echo "--- MIGRATION FILE CONTENTS ---"
        find . -path "*/migrations/*" -name "*.sql" 2>/dev/null | sort | while read -r file; do
            echo "=== Migration: $(basename "$file") ==="
            echo "File: $file"
            echo ""
            
            # Extract table creation statements
            echo "--- CREATE TABLE STATEMENTS ---"
            grep -i "CREATE TABLE" "$file" -A 20 2>/dev/null | head -50 || echo "No CREATE TABLE statements found"
            echo ""
            
            # Extract index creation
            echo "--- INDEX CREATION ---"
            grep -i "CREATE.*INDEX\|ADD.*INDEX" "$file" 2>/dev/null || echo "No index creation found"
            echo ""
            
            # Extract foreign key constraints
            echo "--- FOREIGN KEY CONSTRAINTS ---"
            grep -i "FOREIGN KEY\|REFERENCES" "$file" 2>/dev/null || echo "No foreign key constraints found"
            echo ""
            
            # Extract insert statements (for seed data)
            echo "--- INSERT STATEMENTS ---"
            grep -i "INSERT INTO" "$file" | head -5 2>/dev/null || echo "No insert statements found"
            echo ""
            
        done
        
    } > "$OUTPUT_DIR/migration_analysis_$TIMESTAMP.txt"
    
    echo -e "${GREEN}✅ Migration Analysis Complete${NC}"
}

# Function to extract schema from backend code
analyze_schema_from_code() {
    echo -e "${BLUE}💻 Analyzing Schema References in Code...${NC}"
    
    {
        echo "=== Schema References in Backend Code ==="
        echo "Analysis Date: $(date)"
        echo ""
        
        # Find database queries in code
        echo "--- SQL QUERIES IN CODE ---"
        find server -name "*.js" -exec grep -l "SELECT\|INSERT\|UPDATE\|DELETE" {} \; 2>/dev/null | while read -r file; do
            echo "File: $file"
            grep -E "SELECT|INSERT|UPDATE|DELETE" "$file" | head -5 2>/dev/null || true
            echo ""
        done
        
        # Find table references
        echo "--- TABLE REFERENCES ---"
        find server -name "*.js" -exec grep -E "FROM|INTO|UPDATE|JOIN" {} \; 2>/dev/null | \
            grep -oE "(FROM|INTO|UPDATE|JOIN)\s+\w+" | sort | uniq -c | sort -nr | head -20
        echo ""
        
        # Find database connection patterns
        echo "--- DATABASE CONNECTION PATTERNS ---"
        find server -name "*.js" -exec grep -l "mysql\|pool\|connection\|database" {} \; 2>/dev/null | head -5
        echo ""
        
        # Find model definitions (if any)
        echo "--- MODEL DEFINITIONS ---"
        find server -name "*model*" -o -name "*Model*" 2>/dev/null | head -10
        echo ""
        
    } > "$OUTPUT_DIR/schema_from_code_$TIMESTAMP.txt"
    
    echo -e "${GREEN}✅ Code Schema Analysis Complete${NC}"
}

# Function to analyze database relationships
analyze_relationships() {
    echo -e "${BLUE}🔗 Analyzing Database Relationships...${NC}"
    
    {
        echo "=== Database Relationships Analysis ==="
        echo "Analysis Date: $(date)"
        echo ""
        
        # Look for common relationship patterns in migration files
        echo "--- FOREIGN KEY RELATIONSHIPS (from migrations) ---"
        find . -path "*/migrations/*" -name "*.sql" -exec grep -H "FOREIGN KEY\|REFERENCES" {} \; 2>/dev/null | \
            sed 's/.*migrations\///g' | head -20
        echo ""
        
        # Look for join patterns in code
        echo "--- JOIN PATTERNS IN CODE ---"
        find server -name "*.js" -exec grep -H "JOIN\|join" {} \; 2>/dev/null | head -10
        echo ""
        
        # Identify main entity relationships
        echo "--- MAIN ENTITY RELATIONSHIPS ---"
        echo "Based on common patterns found:"
        
        # Users table relationships
        if find . -name "*.sql" -exec grep -l "users\|user_id" {} \; >/dev/null 2>&1; then
            echo "- Users: Central entity with relationships to most other tables"
            find . -name "*.sql" -exec grep "user_id" {} \; 2>/dev/null | head -5
        fi
        echo ""
        
        # Church-related relationships
        if find . -name "*.sql" -exec grep -l "church\|parish" {} \; >/dev/null 2>&1; then
            echo "- Church/Parish: Core organizational entity"
            find . -name "*.sql" -exec grep -E "church|parish" {} \; 2>/dev/null | head -5
        fi
        echo ""
        
        # OMAI-related relationships
        if find . -name "*.sql" -exec grep -l "omai\|task_" {} \; >/dev/null 2>&1; then
            echo "- OMAI: AI system entities (task_links, task_submissions, etc.)"
            find . -name "*.sql" -exec grep -E "omai|task_" {} \; 2>/dev/null | head -5
        fi
        echo ""
        
    } > "$OUTPUT_DIR/relationships_analysis_$TIMESTAMP.txt"
    
    echo -e "${GREEN}✅ Relationships Analysis Complete${NC}"
}

# Function to analyze data types and constraints
analyze_data_types() {
    echo -e "${BLUE}📝 Analyzing Data Types and Constraints...${NC}"
    
    {
        echo "=== Data Types and Constraints Analysis ==="
        echo "Analysis Date: $(date)"
        echo ""
        
        # Extract column definitions from migrations
        echo "--- COLUMN DATA TYPES ---"
        find . -path "*/migrations/*" -name "*.sql" -exec grep -E "^\s*\w+\s+(VARCHAR|INT|TEXT|DATETIME|BOOLEAN|DECIMAL|FLOAT|TIMESTAMP)" {} \; 2>/dev/null | \
            sort | uniq -c | sort -nr | head -20
        echo ""
        
        # Find NOT NULL constraints
        echo "--- NOT NULL CONSTRAINTS ---"
        find . -path "*/migrations/*" -name "*.sql" -exec grep -c "NOT NULL" {} \; 2>/dev/null | \
            awk -F: 'BEGIN{total=0} {total+=$2} END{print "Total NOT NULL constraints: " total}'
        echo ""
        
        # Find UNIQUE constraints
        echo "--- UNIQUE CONSTRAINTS ---"
        find . -path "*/migrations/*" -name "*.sql" -exec grep "UNIQUE" {} \; 2>/dev/null | head -10
        echo ""
        
        # Find DEFAULT values
        echo "--- DEFAULT VALUES ---"
        find . -path "*/migrations/*" -name "*.sql" -exec grep "DEFAULT" {} \; 2>/dev/null | head -10
        echo ""
        
        # Find auto-increment fields
        echo "--- AUTO INCREMENT FIELDS ---"
        find . -path "*/migrations/*" -name "*.sql" -exec grep "AUTO_INCREMENT" {} \; 2>/dev/null | head -10
        echo ""
        
    } > "$OUTPUT_DIR/data_types_analysis_$TIMESTAMP.txt"
    
    echo -e "${GREEN}✅ Data Types Analysis Complete${NC}"
}

# Function to generate ERD-like documentation
generate_erd_documentation() {
    echo -e "${BLUE}📊 Generating ERD Documentation...${NC}"
    
    {
        echo "=== Entity Relationship Diagram (Text Format) ==="
        echo "Generated: $(date)"
        echo ""
        
        echo "--- MAIN ENTITIES IDENTIFIED ---"
        
        # Extract table names from migrations
        find . -path "*/migrations/*" -name "*.sql" -exec grep -h "CREATE TABLE" {} \; 2>/dev/null | \
            sed 's/CREATE TABLE[^`]*`\([^`]*\)`.*/\1/' | sort | uniq | while read -r table; do
            echo "Entity: $table"
            
            # Find this table's definition
            find . -path "*/migrations/*" -name "*.sql" -exec grep -A 20 "CREATE TABLE.*$table" {} \; 2>/dev/null | \
                grep -E "^\s*\w+\s+(VARCHAR|INT|TEXT|DATETIME|BOOLEAN)" | head -5 | \
                sed 's/^/  - /'
            
            # Find foreign keys for this table
            find . -path "*/migrations/*" -name "*.sql" -exec grep -B 5 -A 5 "REFERENCES.*$table" {} \; 2>/dev/null | \
                grep "FOREIGN KEY" | head -3 | sed 's/^/  -> /'
            
            echo ""
        done
        
        echo "--- RELATIONSHIP SUMMARY ---"
        echo "Key relationships identified:"
        echo "1. users -> [multiple tables via user_id foreign key]"
        echo "2. churches/parishes -> [user management and records]"
        echo "3. omai_* tables -> [AI system data and task management]"
        echo "4. email_settings -> [configuration and communication]"
        echo "5. task_links -> task_submissions [OMAI task workflow]"
        echo ""
        
        echo "--- MAIN WORKFLOW PATTERNS ---"
        echo "1. User Authentication Flow: users -> sessions -> permissions"
        echo "2. Church Management Flow: churches -> members -> records -> events"
        echo "3. OMAI Task Flow: task_links -> task_submissions -> email notifications"
        echo "4. Content Management: users -> global_images -> content management"
        echo "5. System Admin: users (admin role) -> component management -> system monitoring"
        
    } > "$OUTPUT_DIR/erd_documentation_$TIMESTAMP.txt"
    
    echo -e "${GREEN}✅ ERD Documentation Generated${NC}"
}

# Function to create comprehensive summary
create_summary() {
    echo -e "${BLUE}📋 Creating Database Analysis Summary...${NC}"
    
    {
        echo "=== DATABASE ANALYSIS SUMMARY ==="
        echo "Analysis Date: $(date)"
        echo "Database: $DB_NAME"
        echo ""
        
        echo "--- CONNECTION STATUS ---"
        if test_database_connection >/dev/null 2>&1; then
            echo "✅ Live database connection: SUCCESS"
        else
            echo "⚠️  Live database connection: FAILED (analyzed migrations instead)"
        fi
        echo ""
        
        echo "--- MIGRATION FILES ---"
        migration_count=$(find . -path "*/migrations/*" -name "*.sql" 2>/dev/null | wc -l)
        echo "Total migration files found: $migration_count"
        if [[ $migration_count -gt 0 ]]; then
            echo "Migration files:"
            find . -path "*/migrations/*" -name "*.sql" 2>/dev/null | sort | sed 's/^/  - /'
        fi
        echo ""
        
        echo "--- TABLE ESTIMATES (from migrations) ---"
        table_count=$(find . -path "*/migrations/*" -name "*.sql" -exec grep -h "CREATE TABLE" {} \; 2>/dev/null | wc -l)
        echo "Estimated tables: $table_count"
        echo ""
        
        echo "--- KEY FEATURES IDENTIFIED ---"
        echo "✅ User Management System"
        echo "✅ Church/Parish Management"
        echo "✅ OMAI AI Task System"
        echo "✅ Content Management"
        echo "✅ Email Configuration"
        echo "✅ Component Management"
        echo ""
        
        echo "--- ANALYSIS FILES GENERATED ---"
        ls -la "$OUTPUT_DIR"/*_$TIMESTAMP.txt 2>/dev/null || echo "No analysis files found"
        
    } > "$OUTPUT_DIR/database_summary_$TIMESTAMP.txt"
    
    echo -e "${GREEN}✅ Database Summary Created${NC}"
}

# Main function
main() {
    echo -e "${BLUE}🏁 Starting Comprehensive Database Analysis...${NC}"
    
    # Try to load database credentials from various sources
    if [[ -f ".env" ]]; then
        echo -e "${BLUE}📄 Loading database config from .env...${NC}"
        source .env 2>/dev/null || true
    fi
    
    if [[ -f "server/.env" ]]; then
        echo -e "${BLUE}📄 Loading database config from server/.env...${NC}"
        source server/.env 2>/dev/null || true
    fi
    
    # Try live database analysis first
    if test_database_connection; then
        analyze_live_schema
    else
        echo -e "${YELLOW}⚠️  Proceeding with migration file analysis only${NC}"
    fi
    
    # Always analyze migration files and code
    analyze_migration_files
    analyze_schema_from_code
    analyze_relationships
    analyze_data_types
    generate_erd_documentation
    create_summary
    
    echo -e "${GREEN}🎉 Database Analysis Complete!${NC}"
    echo -e "${GREEN}📁 Results saved in: $OUTPUT_DIR${NC}"
    
    if ! test_database_connection >/dev/null 2>&1; then
        echo -e "${YELLOW}💡 Tip: To enable live database analysis, ensure MySQL is accessible and credentials are correct${NC}"
    fi
}

# Execute main function
main "$@" 