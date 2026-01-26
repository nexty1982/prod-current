#!/bin/bash
set -Eeuo pipefail

#############################################################################
# migrate-ocr-result-column.sh
# 
# Idempotent migration script to add ocr_result column to all om_church_% 
# databases that have an ocr_jobs table but lack the ocr_result column.
#
# Usage:
#   ./scripts/migrate-ocr-result-column.sh
#
# Environment variables (optional, uses defaults if not set):
#   MYSQL_HOST     - MySQL host (default: localhost)
#   MYSQL_USER     - MySQL user (default: root)
#   MYSQL_PASSWORD - MySQL password (reads from .env if not set)
#   MYSQL_PORT     - MySQL port (default: 3306)
#
# Safe to run multiple times - checks for column existence before ALTER.
#############################################################################

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  OCR Result Column Migration Script                        ║${NC}"
echo -e "${BLUE}║  Adds ocr_result JSON column to om_church_% databases      ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Load .env file if it exists
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${SCRIPT_DIR}/../.env"
if [[ -f "$ENV_FILE" ]]; then
    echo -e "${BLUE}Loading environment from .env${NC}"
    set -a
    source "$ENV_FILE" 2>/dev/null || true
    set +a
fi

# Also try .env.production
ENV_PROD_FILE="${SCRIPT_DIR}/../.env.production"
if [[ -f "$ENV_PROD_FILE" ]]; then
    echo -e "${BLUE}Loading environment from .env.production${NC}"
    set -a
    source "$ENV_PROD_FILE" 2>/dev/null || true
    set +a
fi

# MySQL connection parameters
MYSQL_HOST="${MYSQL_HOST:-${DB_HOST:-localhost}}"
MYSQL_USER="${MYSQL_USER:-${DB_USER:-root}}"
MYSQL_PASSWORD="${MYSQL_PASSWORD:-${DB_PASSWORD:-}}"
MYSQL_PORT="${MYSQL_PORT:-${DB_PORT:-3306}}"

# Validate we have credentials
if [[ -z "$MYSQL_PASSWORD" ]]; then
    echo -e "${RED}Error: MYSQL_PASSWORD not set. Set via environment or .env file.${NC}"
    exit 1
fi

echo -e "${BLUE}Connecting to MySQL at ${MYSQL_HOST}:${MYSQL_PORT} as ${MYSQL_USER}${NC}"
echo ""

# MySQL command wrapper
mysql_cmd() {
    mysql -h "$MYSQL_HOST" -P "$MYSQL_PORT" -u "$MYSQL_USER" -p"$MYSQL_PASSWORD" -N -B "$@" 2>/dev/null
}

# Counters
SCANNED=0
ALTERED=0
SKIPPED_NO_TABLE=0
SKIPPED_HAS_COLUMN=0
declare -a ALTERED_DBS=()

# Get all om_church_* databases (pattern: om_church_<id>)
echo -e "${BLUE}Scanning for om_church_* databases...${NC}"
DATABASES=$(mysql_cmd -e "SELECT schema_name FROM information_schema.schemata WHERE schema_name REGEXP '^om_church_[0-9]+$' ORDER BY schema_name;")

if [[ -z "$DATABASES" ]]; then
    echo -e "${YELLOW}No om_church_% databases found.${NC}"
    exit 0
fi

# Process each database
while IFS= read -r DB; do
    [[ -z "$DB" ]] && continue
    ((SCANNED++))
    
    # Check if ocr_jobs table exists
    TABLE_EXISTS=$(mysql_cmd -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = '$DB' AND table_name = 'ocr_jobs';")
    
    if [[ "$TABLE_EXISTS" != "1" ]]; then
        echo -e "  ${YELLOW}[SKIP]${NC} $DB - ocr_jobs table does not exist"
        ((SKIPPED_NO_TABLE++))
        continue
    fi
    
    # Check if ocr_result column already exists
    COLUMN_EXISTS=$(mysql_cmd -e "SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = '$DB' AND table_name = 'ocr_jobs' AND column_name = 'ocr_result';")
    
    if [[ "$COLUMN_EXISTS" == "1" ]]; then
        echo -e "  ${GREEN}[OK]${NC}   $DB - ocr_result column already exists"
        ((SKIPPED_HAS_COLUMN++))
        continue
    fi
    
    # Add the column
    echo -e "  ${BLUE}[ALTER]${NC} $DB - Adding ocr_result column..."
    
    if mysql_cmd -e "ALTER TABLE \`$DB\`.ocr_jobs ADD COLUMN ocr_result JSON NULL;"; then
        echo -e "  ${GREEN}[DONE]${NC} $DB - ocr_result column added successfully"
        ((ALTERED++))
        ALTERED_DBS+=("$DB")
    else
        echo -e "  ${RED}[ERROR]${NC} $DB - Failed to add ocr_result column"
    fi
    
done <<< "$DATABASES"

# Summary
echo ""
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}                    MIGRATION SUMMARY                        ${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo -e "  Databases scanned:        ${SCANNED}"
echo -e "  Databases altered:        ${GREEN}${ALTERED}${NC}"
echo -e "  Skipped (no ocr_jobs):    ${YELLOW}${SKIPPED_NO_TABLE}${NC}"
echo -e "  Skipped (already has):    ${GREEN}${SKIPPED_HAS_COLUMN}${NC}"
echo ""

if [[ ${#ALTERED_DBS[@]} -gt 0 ]]; then
    echo -e "${GREEN}Altered databases:${NC}"
    for db in "${ALTERED_DBS[@]}"; do
        echo -e "  - $db"
    done
else
    echo -e "${GREEN}No databases required migration.${NC}"
fi

echo ""
echo -e "${GREEN}Migration complete.${NC}"

