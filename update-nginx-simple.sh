#!/bin/bash
# Simple Nginx update for FreeScout - run as ROOT
set -e

NGINX_CONFIG="/etc/nginx/sites-enabled/orthodoxmetrics.com"

echo "Updating Nginx for FreeScout..."
echo ""

# Backup
cp "$NGINX_CONFIG" "${NGINX_CONFIG}.backup.$(date +%Y%m%d_%H%M%S)"

# Simple replacement: change port 3030 to 3080
sed -i 's|proxy_pass         http://127.0.0.1:3030/;|proxy_pass         http://127.0.0.1:3080/;|g' "$NGINX_CONFIG"

# Update comment if it exists
sed -i 's/# ---------- Zammad Helpdesk ----------/# ---------- FreeScout Helpdesk ----------/g' "$NGINX_CONFIG"

echo "✓ Updated proxy_pass from 3030 to 3080"
echo ""

# Test
if nginx -t 2>&1; then
    echo "✓ Nginx config valid"
    systemctl reload nginx
    echo "✓ Nginx reloaded"
else
    echo "✗ ERROR: Nginx config test failed"
    exit 1
fi

echo ""
echo "Verifying..."
sleep 3
curl -I https://orthodoxmetrics.com/helpdesk/ 2>&1 | head -5
