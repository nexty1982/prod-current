#!/bin/bash
set -Eeuo pipefail

echo "╔════════════════════════════════════════════════════════════╗"
echo "║ OCR Mappings Table Migration Script                        ║"
echo "║ Creates ocr_mappings table in all om_church_% databases    ║"
echo "╚════════════════════════════════════════════════════════════╝"

# Load environment variables
if [[ -f .env.production ]]; then
    echo "Loading environment from .env.production"
    export $(grep -v '^#' .env.production | xargs)
elif [[ -f .env ]]; then
    echo "Loading environment from .env"
    export $(grep -v '^#' .env | xargs)
fi

MYSQL_HOST="${DB_HOST:-localhost}"
MYSQL_USER="${DB_USER:-orthodoxapps}"
MYSQL_PASSWORD="${DB_PASSWORD:-}"
MYSQL_PORT="${DB_PORT:-3306}"

echo "Connecting to MySQL at $MYSQL_HOST:$MYSQL_PORT as $MYSQL_USER"

# Get list of church databases
echo "Scanning for om_church_N databases..."
DB_LIST=$(mysql -h"$MYSQL_HOST" -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" -sN -e "SELECT schema_name FROM information_schema.schemata WHERE schema_name REGEXP '^om_church_[0-9]+$'")

if [[ -z "$DB_LIST" ]]; then
    echo "No om_church_N databases found."
    exit 0
fi

CREATED=0
SKIPPED=0
FAILED=0
ALTERED_DBS=""

for DB in $DB_LIST; do
    echo ""
    echo "Processing database: $DB"
    
    # Check if ocr_mappings table exists
    TABLE_EXISTS=$(mysql -h"$MYSQL_HOST" -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" -sN -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='$DB' AND table_name='ocr_mappings'")
    
    if [[ "$TABLE_EXISTS" -gt 0 ]]; then
        echo "  ✓ ocr_mappings table already exists in $DB"
        ((SKIPPED++))
    else
        echo "  → Creating ocr_mappings table in $DB..."
        if mysql -h"$MYSQL_HOST" -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" "$DB" <<EOF
CREATE TABLE IF NOT EXISTS ocr_mappings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ocr_job_id INT NOT NULL,
  church_id INT NOT NULL,
  record_type ENUM('baptism', 'marriage', 'funeral') NOT NULL,
  mapping_json JSON NOT NULL,
  bbox_links JSON NULL,
  status ENUM('draft', 'reviewed', 'approved', 'rejected') DEFAULT 'draft',
  created_by INT NULL,
  reviewed_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_ocr_job (ocr_job_id),
  INDEX idx_church (church_id),
  INDEX idx_status (status),
  INDEX idx_record_type (record_type),
  UNIQUE KEY unique_job_mapping (ocr_job_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
EOF
        then
            echo "  ✓ Created ocr_mappings table in $DB"
            ((CREATED++))
            ALTERED_DBS="$ALTERED_DBS $DB"
        else
            echo "  ✗ Failed to create ocr_mappings table in $DB"
            ((FAILED++))
        fi
    fi
    
    # Also add ocr_result_json column to ocr_jobs if it doesn't exist
    COLUMN_EXISTS=$(mysql -h"$MYSQL_HOST" -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" -sN -e "SELECT COUNT(*) FROM information_schema.columns WHERE table_schema='$DB' AND table_name='ocr_jobs' AND column_name='ocr_result_json'")
    
    if [[ "$COLUMN_EXISTS" -eq 0 ]]; then
        # Check if ocr_jobs table exists first
        TABLE_EXISTS=$(mysql -h"$MYSQL_HOST" -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" -sN -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='$DB' AND table_name='ocr_jobs'")
        if [[ "$TABLE_EXISTS" -gt 0 ]]; then
            echo "  → Adding ocr_result_json column to ocr_jobs in $DB..."
            mysql -h"$MYSQL_HOST" -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" "$DB" -e "ALTER TABLE ocr_jobs ADD COLUMN ocr_result_json JSON NULL AFTER ocr_text" 2>/dev/null || true
        fi
    fi
done

echo ""
echo "════════════════════════════════════════════════════════════"
echo "Migration Summary:"
echo "  Tables created: $CREATED"
echo "  Tables skipped (already exist): $SKIPPED"
echo "  Failed: $FAILED"
if [[ -n "$ALTERED_DBS" ]]; then
    echo "  Altered databases:$ALTERED_DBS"
fi
echo "════════════════════════════════════════════════════════════"

