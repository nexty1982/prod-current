#!/bin/bash

echo "🔍 Checking users table schema to find the correct password column..."

echo ""
echo "Run this on your Linux system to see all columns:"
echo "mysql -u root -p orthodoxmetrics_db -e \"DESCRIBE users;\""

echo ""
echo "Look for the password column - it might be named:"
echo "- password"
echo "- user_password" 
echo "- passwd"
echo "- pwd"
echo "- password_hash"

echo ""
echo "Also check current data to see what exists:"
echo "mysql -u root -p orthodoxmetrics_db -e \"SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_NAME = 'users' AND TABLE_SCHEMA = 'orthodoxmetrics_db' ORDER BY COLUMN_NAME;\"" 