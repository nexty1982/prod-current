#!/bin/bash
# Fix Zammad docker-compose.yml and Nginx configuration
# Run with: sudo bash scripts/fix-zammad.sh

set -e

echo "=== Fixing Zammad Configuration ==="

# Step 1: Fix docker-compose.yml
echo "1. Fixing docker-compose.yml..."
cd /opt/zammad

# Backup
cp docker-compose.yml docker-compose.yml.backup.$(date +%Y%m%d_%H%M%S)

# Remove version line
sed -i '/^version:/d' docker-compose.yml

# Replace DATABASE_URL with individual POSTGRES_* variables
sed -i 's|      DATABASE_URL: postgres://zammad:\${POSTGRES_PASSWORD}@postgres/zammad|      POSTGRES_HOST: postgres\n      POSTGRES_USER: zammad\n      POSTGRES_DB: zammad|' docker-compose.yml

echo "   ✓ docker-compose.yml fixed"

# Step 2: Restart containers
echo "2. Restarting containers..."
docker compose down
docker compose up -d

echo "   ✓ Containers restarted"

# Step 3: Wait for containers to start
echo "3. Waiting for containers to start..."
sleep 10

# Step 4: Check status
echo "4. Checking container status..."
docker compose ps

# Step 5: Fix Nginx configuration
echo "5. Fixing Nginx configuration..."

# Backup nginx config
cp /etc/nginx/sites-enabled/orthodoxmetrics.com /etc/nginx/sites-enabled/orthodoxmetrics.com.backup.$(date +%Y%m%d_%H%M%S)

# Add /helpdesk/ location block before /api/ block
HELPDESK_BLOCK='    # ---------- Zammad Helpdesk ----------
    location /helpdesk/ {
        proxy_pass         http://127.0.0.1:3030/;
        proxy_http_version 1.1;
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_set_header   X-Forwarded-Host $host;
        proxy_set_header   X-Forwarded-Port $server_port;
        proxy_buffering    off;
        proxy_redirect     off;
        proxy_connect_timeout 300s;
        proxy_send_timeout    300s;
        proxy_read_timeout    300s;
    }

    # ---------- Backend API ----------'

# Insert before "# ---------- Backend API ----------"
sed -i "/# ---------- Backend API ----------/i\\$HELPDESK_BLOCK" /etc/nginx/sites-enabled/orthodoxmetrics.com

echo "   ✓ Nginx config updated"

# Step 6: Test and reload Nginx
echo "6. Testing Nginx configuration..."
nginx -t

echo "7. Reloading Nginx..."
systemctl reload nginx

echo "   ✓ Nginx reloaded"

# Step 7: Verification
echo ""
echo "=== Verification ==="
echo "Container status:"
docker compose -f /opt/zammad/docker-compose.yml ps | grep zammad

echo ""
echo "Local port check:"
curl -I http://127.0.0.1:3030/ 2>&1 | head -3 || echo "Still starting..."

echo ""
echo "Public route check:"
curl -I https://orthodoxmetrics.com/helpdesk/ 2>&1 | head -3 || echo "Check after DNS/SSL propagation"

echo ""
echo "=== Fix Complete ==="
