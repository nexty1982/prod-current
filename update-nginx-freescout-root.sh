#!/bin/bash
# Update Nginx for FreeScout - MUST run as ROOT
set -e

NGINX_CONFIG="/etc/nginx/sites-enabled/orthodoxmetrics.com"

echo "Updating Nginx for FreeScout..."
echo ""

# Backup
BACKUP="${NGINX_CONFIG}.backup.$(date +%Y%m%d_%H%M%S)"
cp "$NGINX_CONFIG" "$BACKUP"
echo "✓ Backed up to: $BACKUP"
echo ""

# Update proxy_pass from 3030 to 3080
sed -i 's|proxy_pass         http://127.0.0.1:3030/;|proxy_pass         http://127.0.0.1:3080/;|g' "$NGINX_CONFIG"

# Update comment
sed -i 's/# ---------- Zammad Helpdesk ----------/# ---------- FreeScout Helpdesk ----------/g' "$NGINX_CONFIG"

echo "✓ Updated proxy_pass from 3030 to 3080"
echo ""

# Show the change
echo "Updated /helpdesk/ location:"
grep -A 15 "location /helpdesk/" "$NGINX_CONFIG" | head -16
echo ""

# Test
echo "Testing Nginx config..."
if nginx -t 2>&1; then
    echo "✓ Nginx config valid"
    echo ""
    echo "Reloading Nginx..."
    systemctl reload nginx
    echo "✓ Nginx reloaded"
else
    echo "✗ ERROR: Nginx config test failed"
    echo "Restoring backup..."
    cp "$BACKUP" "$NGINX_CONFIG"
    exit 1
fi

echo ""
echo "Waiting 5 seconds..."
sleep 5

echo ""
echo "Verifying public route..."
HTTP_OUTPUT=$(curl -sS -I https://orthodoxmetrics.com/helpdesk/ 2>&1)
HTTP_STATUS=$(echo "$HTTP_OUTPUT" | grep -E "^HTTP" | head -1 || echo "NO_RESPONSE")
echo "$HTTP_OUTPUT" | head -10

if echo "$HTTP_STATUS" | grep -qE "HTTP.*(200|301|302)"; then
    echo ""
    echo "✓ SUCCESS: Public route working"
    echo "FreeScout is accessible at: https://orthodoxmetrics.com/helpdesk/"
else
    echo ""
    echo "⚠ Public route response: $HTTP_STATUS"
fi
