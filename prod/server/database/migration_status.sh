#!/bin/bash

# OCR Migration Status Report
# Provides comprehensive status of the OCR database migration
# Date: July 19, 2025

echo "📊 OCR Migration Status Report"
echo "============================="
echo "📅 Generated: $(date)"
echo ""

# Check if migration files exist
echo "🔍 Checking Migration Files:"
echo "  📄 migrate_ocr_database.sh: $([ -f "./migrate_ocr_database.sh" ] && echo "✅ Present" || echo "❌ Missing")"
echo "  📄 create_ocr_database.sql: $([ -f "./create_ocr_database.sql" ] && echo "✅ Present" || echo "❌ Missing")"
echo "  📄 verify_ocr_migration.js: $([ -f "./verify_ocr_migration.js" ] && echo "✅ Present" || echo "❌ Missing")"
echo "  📄 complete_ocr_migration.sh: $([ -f "./complete_ocr_migration.sh" ] && echo "✅ Present" || echo "❌ Missing")"
echo ""

# Check environment configuration
echo "🔧 Environment Configuration:"
echo "  📁 .env file: $([ -f "../.env" ] && echo "✅ Present" || echo "❌ Missing")"
echo "  📋 .env.ocr.template: $([ -f "../.env.ocr.template" ] && echo "✅ Present" || echo "❌ Missing")"
echo ""

# Check OCR database configuration in environment
if [ -f "../.env" ]; then
    echo "📋 Environment Variables Status:"
    grep -q "OCR_DATABASE" ../.env && echo "  ✅ OCR_DATABASE configured" || echo "  ⚠️  OCR_DATABASE not found"
    grep -q "OCR_DB_USER" ../.env && echo "  ✅ OCR_DB_USER configured" || echo "  ⚠️  OCR_DB_USER not found"
    grep -q "OCR_DB_PASSWORD" ../.env && echo "  ✅ OCR_DB_PASSWORD configured" || echo "  ⚠️  OCR_DB_PASSWORD not found"
    echo ""
fi

# Check application file updates
echo "📝 Application Files Status:"
echo "  🔗 dbConnections.ts: $(grep -q "orthodoxmetrics_ocr_db" ../config/dbConnections.ts 2>/dev/null && echo "✅ Updated" || echo "⚠️  Needs update")"
echo "  🧪 OcrAdminTestController.js: $(grep -q "OCR_DATABASE" ../controllers/OcrAdminTestController.js 2>/dev/null && echo "✅ Updated" || echo "⚠️  Needs update")"
echo ""

# Check database status
echo "🗄️  Database Status:"
mysql -u orthodoxapps -p"Summerof1982@!" -e "SHOW DATABASES LIKE 'orthodoxmetrics_ocr_db';" 2>/dev/null | grep -q orthodoxmetrics_ocr_db

if [ $? -eq 0 ]; then
    echo "  ✅ orthodoxmetrics_ocr_db exists"
    
    # Check table structure
    TABLE_COUNT=$(mysql -u orthodoxapps -p"Summerof1982@!" orthodoxmetrics_ocr_db -e "SHOW TABLES;" 2>/dev/null | wc -l)
    echo "  📊 Tables found: $((TABLE_COUNT - 1))"
    
    # Check for specific OCR tables
    mysql -u orthodoxapps -p"Summerof1982@!" orthodoxmetrics_ocr_db -e "SHOW TABLES LIKE 'ocr_settings';" 2>/dev/null | grep -q ocr_settings && echo "  ✅ ocr_settings table exists" || echo "  ❌ ocr_settings table missing"
    mysql -u orthodoxapps -p"Summerof1982@!" orthodoxmetrics_ocr_db -e "SHOW TABLES LIKE 'ocr_jobs';" 2>/dev/null | grep -q ocr_jobs && echo "  ✅ ocr_jobs table exists" || echo "  ❌ ocr_jobs table missing"
    mysql -u orthodoxapps -p"Summerof1982@!" orthodoxmetrics_ocr_db -e "SHOW TABLES LIKE 'ocr_queue';" 2>/dev/null | grep -q ocr_queue && echo "  ✅ ocr_queue table exists" || echo "  ❌ ocr_queue table missing"
else
    echo "  ❌ orthodoxmetrics_ocr_db does not exist"
fi

echo ""

# Migration readiness assessment
echo "🚦 Migration Readiness Assessment:"

READY=true

# Check critical files
if [ ! -f "./migrate_ocr_database.sh" ]; then
    echo "  ❌ Migration script missing"
    READY=false
fi

if [ ! -f "./create_ocr_database.sql" ]; then
    echo "  ❌ SQL schema file missing"
    READY=false
fi

# Check environment
if [ ! -f "../.env" ]; then
    echo "  ❌ Environment file missing"
    READY=false
elif ! grep -q "OCR_DATABASE" ../.env; then
    echo "  ⚠️  OCR environment variables not configured"
fi

# Overall status
echo ""
if [ "$READY" = true ]; then
    echo "🎯 Status: READY FOR MIGRATION"
    echo ""
    echo "🚀 To proceed with migration:"
    echo "  1. Run: chmod +x ./complete_ocr_migration.sh"
    echo "  2. Run: ./complete_ocr_migration.sh"
    echo "  3. Run: node verify_ocr_migration.js"
else
    echo "⚠️  Status: NOT READY - Fix issues above first"
fi

echo ""
echo "📋 Migration Summary:"
echo "  🎯 Goal: Migrate OCR system from saints_peter_and_paul_orthodox_church to orthodoxmetrics_ocr_db"
echo "  📊 Database: orthodoxmetrics_ocr_db (centralized OCR processing)"
echo "  👤 User: orthodoxapps (existing database user)"
echo "  🏗️  Tables: ocr_settings, ocr_jobs, ocr_queue"
echo "  🔗 Connection: Uses environment variables for configuration"
echo ""
