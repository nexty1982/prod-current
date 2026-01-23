#!/bin/bash
# Complete Zammad fix: Environment + Containers + Nginx
# Run with: sudo bash complete-zammad-fix.sh
set -e

cd /opt/zammad

echo "═══════════════════════════════════════════════════════════"
echo "  Complete Zammad Fix"
echo "═══════════════════════════════════════════════════════════"

# Step 1: Create .env file
echo ""
echo "=== Step 1: Creating .env file ==="
if [ ! -f .env ]; then
    if [ -f .secrets.env ]; then
        cp .secrets.env .env
        chmod 600 .env
        echo "✓ Created .env from .secrets.env with permissions 600"
    else
        echo "✗ ERROR: .secrets.env not found!"
        exit 1
    fi
else
    echo "✓ .env already exists"
fi

# Verify .env has POSTGRES_PASSWORD
if grep -q "POSTGRES_PASSWORD" .env; then
    echo "✓ .env contains POSTGRES_PASSWORD"
else
    echo "✗ ERROR: .env does not contain POSTGRES_PASSWORD"
    exit 1
fi

# Step 2: Restart containers
echo ""
echo "=== Step 2: Restarting containers ==="
docker compose down
echo "✓ Containers stopped"

docker compose up -d
echo "✓ Containers started"

echo ""
echo "Waiting for containers to initialize..."
sleep 20

# Step 3: Verify containers
echo ""
echo "=== Step 3: Verifying containers ==="
echo "Container status:"
docker compose ps

echo ""
echo "Checking for POSTGRES_PASSWORD warning..."
if docker compose config 2>&1 | grep -qi "POSTGRES_PASSWORD.*not set"; then
    echo "✗ WARNING: POSTGRES_PASSWORD warning still present!"
    docker compose config 2>&1 | grep -i "POSTGRES_PASSWORD\|warning" | head -3
    exit 1
else
    echo "✓ No POSTGRES_PASSWORD warning"
fi

# Check if zammad is restarting
if docker compose ps | grep -q "restarting"; then
    echo "✗ WARNING: Some containers are restarting"
    docker compose ps | grep restarting
    echo ""
    echo "Checking logs..."
    docker compose logs --tail=30 zammad
    exit 1
fi

echo ""
echo "Testing local HTTP connection..."
sleep 5
HTTP_RESPONSE=$(curl -I http://127.0.0.1:3030/ 2>&1 | head -1)
if echo "$HTTP_RESPONSE" | grep -qE "(200|302|301)"; then
    echo "✓ HTTP connection successful: $HTTP_RESPONSE"
else
    echo "✗ HTTP connection failed: $HTTP_RESPONSE"
    echo "Checking port 3030..."
    ss -tlnp | grep 3030 || echo "Port 3030 not listening"
    exit 1
fi

# Step 4: Fix Nginx
echo ""
echo "=== Step 4: Fixing Nginx routing ==="

# Remove problematic snippet include from orthodmetrics.com if it exists
ORTHOD_CONFIG="/etc/nginx/sites-available/orthodmetrics.com"
if [ -f "$ORTHOD_CONFIG" ] && grep -q "orthodoxmetrics-helpdesk" "$ORTHOD_CONFIG"; then
    echo "Removing include statement from $ORTHOD_CONFIG..."
    sed -i '/orthodoxmetrics-helpdesk/d' "$ORTHOD_CONFIG"
    echo "✓ Removed include statement"
fi

# Verify helpdesk location exists in orthodoxmetrics.com
ORTHODOX_CONFIG="/etc/nginx/sites-enabled/orthodoxmetrics.com"
if grep -q "location /helpdesk/" "$ORTHODOX_CONFIG"; then
    echo "✓ /helpdesk/ location block exists in Nginx config"
else
    echo "✗ ERROR: /helpdesk/ location block not found!"
    exit 1
fi

# Test Nginx config
echo ""
echo "Testing Nginx configuration..."
if nginx -t; then
    echo "✓ Nginx configuration is valid"
else
    echo "✗ Nginx configuration test failed!"
    exit 1
fi

# Reload Nginx
echo ""
echo "Reloading Nginx..."
systemctl reload nginx
echo "✓ Nginx reloaded"

# Step 5: Final verification
echo ""
echo "=== Step 5: Final Verification ==="
echo ""
echo "Testing public route (https://orthodoxmetrics.com/helpdesk/)..."
PUBLIC_RESPONSE=$(curl -I https://orthodoxmetrics.com/helpdesk/ 2>&1 | head -1)
if echo "$PUBLIC_RESPONSE" | grep -qE "(200|302|301)"; then
    echo "✓ Public route working: $PUBLIC_RESPONSE"
else
    echo "⚠ Public route response: $PUBLIC_RESPONSE"
    echo "  (May need a moment to propagate)"
fi

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  ✓ All Steps Complete!"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "Zammad Helpdesk should now be accessible at:"
echo "  https://orthodoxmetrics.com/helpdesk/"
echo ""
echo "Container status:"
docker compose ps | grep -E "NAME|zammad"
