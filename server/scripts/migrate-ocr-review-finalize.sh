#!/bin/bash
# Migration script to add Review & Finalize columns to all om_church_% databases
set -e

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
SQL_FILE="$SCRIPT_DIR/migrate-ocr-review-finalize.sql"

echo "=========================================="
echo "OCR Review & Finalize Migration"
echo "=========================================="

DATABASES=$(mysql -u "$DB_USER" -p"$DB_PASSWORD" -h "$DB_HOST" -N -e \
  "SELECT SCHEMA_NAME FROM information_schema.SCHEMATA WHERE SCHEMA_NAME REGEXP '^om_church_[0-9]+$' ORDER BY SCHEMA_NAME")

if [ -z "$DATABASES" ]; then
  echo "No om_church_* databases found"
  exit 0
fi

for DB in $DATABASES; do
  echo "[$DB] Applying migration..."
  mysql -u "$DB_USER" -p"$DB_PASSWORD" -h "$DB_HOST" "$DB" < "$SQL_FILE" 2>/dev/null || true
  echo "[$DB] Done"
done

echo ""
echo "Migration Complete"

