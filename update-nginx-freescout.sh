#!/bin/bash
# Update Nginx to route /helpdesk/ to FreeScout - run as ROOT
set -e

NGINX_CONFIG="/etc/nginx/sites-enabled/orthodoxmetrics.com"

echo "═══════════════════════════════════════════════════════════"
echo "  Update Nginx for FreeScout"
echo "═══════════════════════════════════════════════════════════"
echo ""

# Backup
echo "=== Step 1: Backing Up ==="
cp "$NGINX_CONFIG" "${NGINX_CONFIG}.backup.$(date +%Y%m%d_%H%M%S)"
echo "✓ Backup created"
echo ""

# Check if helpdesk location exists
echo "=== Step 2: Checking Current Config ==="
if grep -q "location /helpdesk/" "$NGINX_CONFIG"; then
    echo "⚠ Found existing /helpdesk/ location block"
    echo "Current config:"
    grep -A 15 "location /helpdesk/" "$NGINX_CONFIG" | head -20
    echo ""
    echo "Will replace with FreeScout proxy"
else
    echo "✓ No existing /helpdesk/ location found"
fi
echo ""

# Step 3: Update or add FreeScout location
echo "=== Step 3: Updating Nginx Config ==="

# Create the new FreeScout block
FREESCOUT_BLOCK="# ---------- FreeScout Helpdesk ----------
    location /helpdesk/ {
        proxy_pass         http://127.0.0.1:3080/;
        proxy_http_version 1.1;
        proxy_set_header   Host \$host;
        proxy_set_header   X-Real-IP \$remote_addr;
        proxy_set_header   X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto \$scheme;
        proxy_set_header   X-Forwarded-Host \$host;
        proxy_set_header   X-Forwarded-Port \$server_port;
        proxy_buffering    off;
        proxy_redirect     off;
        proxy_connect_timeout 300s;
        proxy_send_timeout    300s;
        proxy_read_timeout    300s;
    }"

# Replace existing /helpdesk/ block
if grep -q "location /helpdesk/" "$NGINX_CONFIG"; then
    # Use Python to do the replacement (more reliable than sed for multi-line)
    python3 << PYTHON_SCRIPT
import re

with open("$NGINX_CONFIG", 'r') as f:
    content = f.read()

# Pattern to match location /helpdesk/ block (including any comment before it)
pattern = r'(?:#.*\n)?[ ]*location /helpdesk/ \{[^}]*\{[^}]*\}[^}]*\}'

# Replace with FreeScout block
new_content = re.sub(pattern, "$FREESCOUT_BLOCK", content, flags=re.MULTILINE | re.DOTALL)

with open("$NGINX_CONFIG", 'w') as f:
    f.write(new_content)
PYTHON_SCRIPT
    
    echo "✓ Replaced existing /helpdesk/ block with FreeScout"
else
    # Add before the Backend API section
    if grep -q "# ---------- Backend API ----------" "$NGINX_CONFIG"; then
        sed -i '/# ---------- Backend API ----------/i\
'"$FREESCOUT_BLOCK"'
' "$NGINX_CONFIG"
        echo "✓ Added FreeScout /helpdesk/ location block"
    else
        echo "⚠ Could not find insertion point, manual edit may be needed"
    fi
fi
echo ""

# Step 4: Test config
echo "=== Step 4: Testing Nginx Config ==="
if nginx -t 2>&1; then
    echo "✓ Nginx configuration is valid"
else
    echo "✗ ERROR: Nginx configuration test failed"
    echo "Restoring backup..."
    cp "${NGINX_CONFIG}.backup.$(date +%Y%m%d_%H%M%S)" "$NGINX_CONFIG" 2>/dev/null || true
    exit 1
fi
echo ""

# Step 5: Reload Nginx
echo "=== Step 5: Reloading Nginx ==="
systemctl reload nginx
echo "✓ Nginx reloaded"
echo ""

# Step 6: Verify
echo "=== Step 6: Verification ==="
sleep 5
HTTP_OUTPUT=$(curl -sS -I https://orthodoxmetrics.com/helpdesk/ 2>&1)
HTTP_STATUS=$(echo "$HTTP_OUTPUT" | grep -E "^HTTP" | head -1 || echo "NO_RESPONSE")
echo "$HTTP_OUTPUT" | head -10

if echo "$HTTP_STATUS" | grep -qE "HTTP.*(200|301|302)"; then
    echo "✓ Public route SUCCESS: $HTTP_STATUS"
else
    echo "⚠ Public route response: $HTTP_STATUS"
    echo "Check FreeScout is running: docker compose -f /opt/freescout/docker-compose.yml ps"
fi

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  Complete"
echo "═══════════════════════════════════════════════════════════"
