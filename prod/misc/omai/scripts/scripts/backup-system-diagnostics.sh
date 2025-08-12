#!/bin/bash

# Backup System Diagnostics
# This script checks the complete backup system health

echo "🩺 OrthodoxMetrics Backup System Diagnostics"
echo "============================================="

# Check backup directories
echo "📁 Checking backup directories..."
echo ""

BACKUP_DIRS=(
    "/var/backups/orthodoxmetrics/prod"
    "/var/backups/orthodoxmetrics/dev"
    "/var/backups/orthodoxmetrics/system"
    "$(pwd)/backups"
)

for dir in "${BACKUP_DIRS[@]}"; do
    if [ -d "$dir" ]; then
        echo "✅ $dir exists"
        echo "   Files: $(ls -la "$dir" 2>/dev/null | grep -E '\.(zip|sql)$' | wc -l)"
        echo "   Size: $(du -sh "$dir" 2>/dev/null | cut -f1)"
    else
        echo "❌ $dir does not exist"
    fi
done

echo ""
echo "🔌 Checking API endpoints..."

# Test different backup endpoints
ENDPOINTS=(
    "/api/backups/list?env=prod"
    "/api/backups/list?env=dev"
    "/api/backup/files"
    "/api/backup/settings"
    "/api/backup/storage"
)

for endpoint in "${ENDPOINTS[@]}"; do
    echo "Testing: $endpoint"
    status=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:3001$endpoint" 2>/dev/null)
    if [ "$status" = "200" ]; then
        echo "✅ $endpoint - Status: $status"
    else
        echo "❌ $endpoint - Status: $status"
    fi
done

echo ""
echo "📊 Checking server logs for backup errors..."
echo "Last 10 backup-related log entries:"

# Check for backup-related errors in logs
if [ -f "server.log" ]; then
    grep -i "backup\|failed to load backups" server.log | tail -10
elif [ -f "logs/server.log" ]; then
    grep -i "backup\|failed to load backups" logs/server.log | tail -10
else
    echo "⚠️  No log file found. Check your logging configuration."
fi

echo ""
echo "🔧 System Requirements Check..."

# Check required tools
TOOLS=("curl" "jq" "zip" "mysqldump")

for tool in "${TOOLS[@]}"; do
    if command -v "$tool" &> /dev/null; then
        echo "✅ $tool is available"
    else
        echo "❌ $tool is not installed"
    fi
done

echo ""
echo "💾 Database backup test..."

# Test mysqldump
if command -v mysqldump &> /dev/null; then
    if mysqldump --version &> /dev/null; then
        echo "✅ mysqldump is working"
    else
        echo "❌ mysqldump has issues"
    fi
else
    echo "❌ mysqldump not found"
fi

echo ""
echo "🌐 Frontend Build Check..."

# Check if frontend is built with the fix
if [ -f "front-end/build/static/js/main.*.js" ]; then
    echo "✅ Frontend is built"
    echo "⚠️  You may need to rebuild the frontend to apply the backup fix:"
    echo "   cd front-end && npm run build"
else
    echo "❌ Frontend not built - run: cd front-end && npm run build"
fi

echo ""
echo "📋 Summary & Recommendations:"
echo "=============================="

# Provide recommendations
echo "1. If you see backup API errors, check that all backup directories exist"
echo "2. Ensure the frontend is rebuilt after the backup fix"
echo "3. Test the backup functionality in the admin settings panel"
echo "4. Monitor server logs for any new backup-related errors"

echo ""
echo "🏁 Diagnostics complete!" 