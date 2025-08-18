#!/bin/bash

echo "🔍 Checking users table structure..."

# You need to run this on your Linux system where the database is
echo "Run this command on your Linux system to check the users table:"
echo ""
echo "mysql -u root -p orthodoxmetrics_db -e \"DESCRIBE users;\""
echo ""
echo "Look for the 'is_active' column in the output."
echo "If it doesn't exist, we need to add it with:"
echo ""
echo "mysql -u root -p orthodoxmetrics_db -e \"ALTER TABLE users ADD COLUMN is_active TINYINT(1) DEFAULT 1;\""
echo ""
echo "Also check what columns currently exist:"
echo "mysql -u root -p orthodoxmetrics_db -e \"SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_NAME = 'users' AND TABLE_SCHEMA = 'orthodoxmetrics_db';\"" 