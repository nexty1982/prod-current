#!/bin/bash

echo "Updating authentication database references..."

# Update all files to use orthodoxmetrics_auth_db.users instead of just users
find . -type f \( -name "*.js" -o -name "*.ts" \) ! -path "./node_modules/*" | while read -r file; do
    # Update direct table references
    sed -i 's/FROM users/FROM orthodoxmetrics_auth_db.users/g' "$file"
    sed -i 's/INTO users/INTO orthodoxmetrics_auth_db.users/g' "$file"
    sed -i 's/UPDATE users/UPDATE orthodoxmetrics_auth_db.users/g' "$file"
    sed -i 's/DELETE FROM orthodoxmetrics_auth_db.users/DELETE FROM orthodoxmetrics_auth_db.users/g' "$file"
    sed -i 's/JOIN users/JOIN orthodoxmetrics_auth_db.users/g' "$file"
    
    # Fix double replacements
    sed -i 's/orthodoxmetrics_auth_db.orthodoxmetrics_auth_db.users/orthodoxmetrics_auth_db.users/g' "$file"
done

echo "Authentication database references updated!"
