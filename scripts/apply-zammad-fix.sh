#!/bin/bash
# Apply Zammad fixes: docker-compose.yml and Nginx configuration
# Run with: sudo bash scripts/apply-zammad-fix.sh

set -e

echo "=== Applying Zammad Fixes ==="

# Step 1: Fix docker-compose.yml
echo ""
echo "Step 1: Fixing docker-compose.yml..."
cd /opt/zammad

# Backup
BACKUP_SUFFIX=$(date +%Y%m%d_%H%M%S)
cp docker-compose.yml docker-compose.yml.backup.$BACKUP_SUFFIX
echo "   Backup created: docker-compose.yml.backup.$BACKUP_SUFFIX"

# Remove version line
sed -i '/^version:/d' docker-compose.yml

# Replace DATABASE_URL with individual POSTGRES_* variables
# Use a temporary file to handle multiline replacement
cat > /tmp/zammad-env-fix.sed << 'SEDSCRIPT'
s|      DATABASE_URL: postgres://zammad:\${POSTGRES_PASSWORD}@postgres/zammad|      POSTGRES_HOST: postgres\n      POSTGRES_USER: zammad\n      POSTGRES_DB: zammad|
SEDSCRIPT

# Apply the replacement
sed -i -f /tmp/zammad-env-fix.sed docker-compose.yml
rm /tmp/zammad-env-fix.sed

# Verify the change
if grep -q "POSTGRES_HOST: postgres" docker-compose.yml; then
    echo "   ✓ DATABASE_URL replaced with POSTGRES_* variables"
else
    echo "   ✗ ERROR: Replacement failed"
    exit 1
fi

if grep -q "DATABASE_URL.*POSTGRES_PASSWORD" docker-compose.yml; then
    echo "   ✗ ERROR: DATABASE_URL still contains POSTGRES_PASSWORD"
    exit 1
fi

# Step 2: Restart containers
echo ""
echo "Step 2: Restarting containers..."
docker compose down
docker compose up -d
echo "   ✓ Containers restarted"

# Step 3: Wait and check status
echo ""
echo "Step 3: Waiting for containers to start..."
sleep 15

echo "   Container status:"
docker compose ps | grep -E "NAME|zammad" || true

# Step 4: Fix Nginx configuration
echo ""
echo "Step 4: Fixing Nginx configuration..."

# Backup nginx config
cp /etc/nginx/sites-enabled/orthodoxmetrics.com /etc/nginx/sites-enabled/orthodoxmetrics.com.backup.$BACKUP_SUFFIX
echo "   Backup created: orthodoxmetrics.com.backup.$BACKUP_SUFFIX"

# Check if /helpdesk/ already exists
if grep -q "location /helpdesk/" /etc/nginx/sites-enabled/orthodoxmetrics.com; then
    echo "   ⚠  /helpdesk/ location already exists, skipping..."
else
    # Create the helpdesk location block
    HELPDESK_BLOCK="# ---------- Zammad Helpdesk ----------
    location /helpdesk/ {
        proxy_pass         http://127.0.0.1:3030/;
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

    # Insert before "# ---------- Backend API ----------"
    awk -v block="$HELPDESK_BLOCK" '/# ---------- Backend API ----------/ {print block; print ""} 1' \
        /etc/nginx/sites-enabled/orthodoxmetrics.com > /tmp/nginx-fixed.conf
    mv /tmp/nginx-fixed.conf /etc/nginx/sites-enabled/orthodoxmetrics.com
    
    echo "   ✓ /helpdesk/ location block added"
fi

# Step 5: Test and reload Nginx
echo ""
echo "Step 5: Testing Nginx configuration..."
if nginx -t; then
    echo "   ✓ Nginx configuration valid"
    echo ""
    echo "   Reloading Nginx..."
    systemctl reload nginx
    echo "   ✓ Nginx reloaded"
else
    echo "   ✗ ERROR: Nginx configuration test failed"
    exit 1
fi

# Step 6: Final verification
echo ""
echo "=== Verification ==="
echo ""
echo "Container status:"
docker compose ps

echo ""
echo "Local port check (http://127.0.0.1:3030/):"
curl -I http://127.0.0.1:3030/ 2>&1 | head -5 || echo "   ⚠  Still starting or connection refused"

echo ""
echo "Public route check (https://orthodoxmetrics.com/helpdesk/):"
curl -I https://orthodoxmetrics.com/helpdesk/ 2>&1 | head -5 || echo "   ⚠  Check after DNS/SSL propagation"

echo ""
echo "=== Fix Complete ==="
echo ""
echo "If containers are still restarting, check logs with:"
echo "  sudo docker compose -f /opt/zammad/docker-compose.yml logs --tail=200 zammad"
