#!/bin/bash
echo "🔧 Fixing Church Database References"
echo "===================================="
echo ""
echo "📋 Database Architecture:"
echo "   • orthodoxmetrics_db     - System data (churches, users)"
echo "   • ssppoc_records_db      - Parish records (baptism, marriage, funeral)"
echo "   • orthodoxmetrics_ocr_db - OCR processing (jobs, settings, queue)"
echo ""
echo "🎯 Updating church.database_name to point to RECORDS database..."

mysql -u orthodoxapps -p'Summerof1982@!' orthodoxmetrics_db << 'EOF'
-- Fix church database reference to point to records DB
UPDATE churches 
SET database_name = 'ssppoc_records_db' 
WHERE database_name = 'saints_peter_and_paul_orthodox_church_db';

-- Verify the update
SELECT id, name, database_name FROM churches WHERE is_active = 1;
EOF

echo ""
echo "✅ Church database reference updated!"
echo "   • Church records will be accessed from: ssppoc_records_db"
echo "   • OCR operations will use: orthodoxmetrics_ocr_db (handled by service)"
