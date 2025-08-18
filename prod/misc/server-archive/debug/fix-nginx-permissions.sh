#!/bin/bash

# Fix Nginx 403 Permissions Script
# This script fixes file ownership and permissions for nginx to serve the frontend

echo "🔧 Fixing nginx file permissions..."

# Set the correct paths
FRONTEND_DIST="/var/www/orthodox-church-mgmt/orthodoxmetrics/prod/front-end/dist"
PROJECT_ROOT="/var/www/orthodox-church-mgmt/orthodoxmetrics/prod"

echo "📁 Setting ownership to www-data for frontend files..."
sudo chown -R www-data:www-data "$FRONTEND_DIST"

echo "📁 Setting ownership to www-data for uploads and public directories..."
sudo chown -R www-data:www-data "$PROJECT_ROOT/uploads" 2>/dev/null || echo "⚠️  uploads directory not found"
sudo chown -R www-data:www-data "$PROJECT_ROOT/public" 2>/dev/null || echo "⚠️  public directory not found"

echo "🔐 Setting proper directory permissions (755)..."
sudo find "$FRONTEND_DIST" -type d -exec chmod 755 {} \;

echo "🔐 Setting proper file permissions (644)..."
sudo find "$FRONTEND_DIST" -type f -exec chmod 644 {} \;

echo "✅ Verifying file permissions..."
ls -la "$FRONTEND_DIST"

echo "🧪 Testing nginx configuration..."
if sudo nginx -t; then
    echo "✅ Nginx config is valid"
    
    echo "🔄 Restarting nginx..."
    sudo systemctl restart nginx
    
    echo "📊 Checking nginx status..."
    sudo systemctl status nginx --no-pager -l
    
    echo "✅ Permissions fixed! Your site should now load without 403 errors."
else
    echo "❌ Nginx configuration test failed!"
    echo "Please check your nginx config before restarting."
fi

echo ""
echo "🔍 If you still get 403 errors, check:"
echo "  1. Backend server is running on port 3001"
echo "  2. Nginx error logs: sudo tail -f /var/log/nginx/inner-orthodox.error.log"
echo "  3. Frontend build files exist in: $FRONTEND_DIST" 