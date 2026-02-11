#!/bin/bash
# Migration Execution Script: Normalize OCR Schema
# 
# This script runs the normalize_ocr_schema.sql migration for a specific church database.
# 
# Usage: ./run-ocr-migration.sh <church_id> [db_name]
# Example: ./run-ocr-migration.sh 46
# Example: ./run-ocr-migration.sh 46 om_church_46

set -e

CHURCH_ID=${1:-}
DB_NAME=${2:-}

if [ -z "$CHURCH_ID" ]; then
  echo "Usage: $0 <church_id> [db_name]"
  echo "Example: $0 46"
  exit 1
fi

# Load database credentials from environment or config
DB_HOST=${DB_HOST:-localhost}
DB_USER=${DB_USER:-orthodoxapps}
DB_PASSWORD=${DB_PASSWORD:-}
DB_PORT=${DB_PORT:-3306}

# Get database name if not provided
if [ -z "$DB_NAME" ]; then
  echo "Fetching database name for church $CHURCH_ID..."
  if [ -z "$DB_PASSWORD" ]; then
    DB_NAME=$(mysql -h"$DB_HOST" -u"$DB_USER" -P"$DB_PORT" orthodoxmetrics_db -se "SELECT database_name FROM churches WHERE id = $CHURCH_ID LIMIT 1" 2>/dev/null || echo "")
  else
    DB_NAME=$(mysql -h"$DB_HOST" -u"$DB_USER" -p"$DB_PASSWORD" -P"$DB_PORT" orthodoxmetrics_db -se "SELECT database_name FROM churches WHERE id = $CHURCH_ID LIMIT 1" 2>/dev/null || echo "")
  fi
  
  if [ -z "$DB_NAME" ]; then
    echo "Error: Could not find database for church $CHURCH_ID"
    echo "Hint: You can provide the database name directly: $0 $CHURCH_ID om_church_46"
    exit 1
  fi
fi

echo "=========================================="
echo "OCR Schema Normalization Migration"
echo "=========================================="
echo "Church ID: $CHURCH_ID"
echo "Database: $DB_NAME"
echo "Host: $DB_HOST:$DB_PORT"
echo ""

# Get migration file path
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MIGRATION_FILE="$SCRIPT_DIR/../database/migrations/normalize_ocr_schema.sql"

if [ ! -f "$MIGRATION_FILE" ]; then
  echo "Error: Migration file not found: $MIGRATION_FILE"
  exit 1
fi

echo "Running migration..."
echo ""

# Run migration
if [ -z "$DB_PASSWORD" ]; then
  mysql -h"$DB_HOST" -u"$DB_USER" -P"$DB_PORT" "$DB_NAME" < "$MIGRATION_FILE"
else
  mysql -h"$DB_HOST" -u"$DB_USER" -p"$DB_PASSWORD" -P"$DB_PORT" "$DB_NAME" < "$MIGRATION_FILE"
fi

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ Migration completed successfully for $DB_NAME"
  echo ""
  echo "Next steps:"
  echo "1. Verify canonical columns exist:"
  echo "   mysql -h$DB_HOST -u$DB_USER -p$DB_PASSWORD -P$DB_PORT $DB_NAME -e 'SHOW COLUMNS FROM ocr_jobs'"
  echo "2. Test OCR endpoints to ensure they work"
  echo "3. Remove bundle directory to verify DB-only operation"
else
  echo ""
  echo "❌ Migration failed. Check errors above."
  exit 1
fi
