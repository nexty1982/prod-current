#!/bin/bash
# Migration script to add ocr_fused_drafts table to all om_church_% databases
# Usage: bash migrate-ocr-fused-drafts.sh

set -e

# Load environment variables
if [ -f "$(dirname "$0")/../.env" ]; then
  source "$(dirname "$0")/../.env"
fi

DB_USER="${DB_USER:-orthodoxapps}"
DB_PASSWORD="${DB_PASSWORD:-}"
DB_HOST="${DB_HOST:-localhost}"

if [ -z "$DB_PASSWORD" ]; then
  echo "Error: DB_PASSWORD not set"
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SQL_FILE="$SCRIPT_DIR/migrate-ocr-fused-drafts.sql"

if [ ! -f "$SQL_FILE" ]; then
  echo "Error: SQL file not found: $SQL_FILE"
  exit 1
fi

echo "=========================================="
echo "OCR Fused Drafts Migration"
echo "=========================================="

# Get all om_church_* databases
DATABASES=$(mysql -u "$DB_USER" -p"$DB_PASSWORD" -h "$DB_HOST" -N -e \
  "SELECT SCHEMA_NAME FROM information_schema.SCHEMATA WHERE SCHEMA_NAME REGEXP '^om_church_[0-9]+$' ORDER BY SCHEMA_NAME")

if [ -z "$DATABASES" ]; then
  echo "No om_church_* databases found"
  exit 0
fi

TOTAL=0
CREATED=0
SKIPPED=0

for DB in $DATABASES; do
  TOTAL=$((TOTAL + 1))
  
  # Check if table already exists
  EXISTS=$(mysql -u "$DB_USER" -p"$DB_PASSWORD" -h "$DB_HOST" -N -e \
    "SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA='$DB' AND TABLE_NAME='ocr_fused_drafts'" 2>/dev/null)
  
  if [ "$EXISTS" -gt 0 ]; then
    echo "[$DB] Table already exists - skipping"
    SKIPPED=$((SKIPPED + 1))
  else
    echo "[$DB] Creating ocr_fused_drafts table..."
    mysql -u "$DB_USER" -p"$DB_PASSWORD" -h "$DB_HOST" "$DB" < "$SQL_FILE"
    CREATED=$((CREATED + 1))
    echo "[$DB] Done"
  fi
done

echo ""
echo "=========================================="
echo "Migration Complete"
echo "Total databases: $TOTAL"
echo "Tables created: $CREATED"
echo "Skipped (already exist): $SKIPPED"
echo "=========================================="

