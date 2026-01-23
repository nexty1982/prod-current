#!/bin/bash
# Apply Zammad fixes using sudo
# This script applies the fixes that were prepared in /tmp/

set -e

echo "=== Applying Zammad Fixes ==="

# Step 1: Copy fixed docker-compose.yml
echo ""
echo "Step 1: Applying docker-compose.yml fix..."
sudo cp /opt/zammad/docker-compose.yml /opt/zammad/docker-compose.yml.backup.$(date +%Y%m%d_%H%M%S)
sudo cp /tmp/docker-compose-fixed.yml /opt/zammad/docker-compose.yml
echo "   ✓ docker-compose.yml updated"

# Step 2: Restart containers
echo ""
echo "Step 2: Restarting containers..."
cd /opt/zammad
sudo docker compose down
sudo docker compose up -d
echo "   ✓ Containers restarted"

# Step 3: Wait for startup
echo ""
echo "Step 3: Waiting for containers to start..."
sleep 15

# Step 4: Check status
echo ""
echo "Step 4: Container status:"
sudo docker compose ps

# Step 5: Copy fixed Nginx config
echo ""
echo "Step 5: Applying Nginx fix..."
sudo cp /etc/nginx/sites-enabled/orthodoxmetrics.com /etc/nginx/sites-enabled/orthodoxmetrics.com.backup.$(date +%Y%m%d_%H%M%S)
sudo cp /tmp/nginx-fixed.conf /etc/nginx/sites-enabled/orthodoxmetrics.com
echo "   ✓ Nginx config updated"

# Step 6: Test and reload Nginx
echo ""
echo "Step 6: Testing Nginx configuration..."
sudo nginx -t
echo ""
echo "   Reloading Nginx..."
sudo systemctl reload nginx
echo "   ✓ Nginx reloaded"

# Step 7: Verification
echo ""
echo "=== Verification ==="
echo ""
echo "Container status:"
sudo docker compose ps | grep -E "NAME|zammad"

echo ""
echo "Local port check (http://127.0.0.1:3030/):"
curl -I http://127.0.0.1:3030/ 2>&1 | head -5 || echo "   Still starting..."

echo ""
echo "Public route check (https://orthodoxmetrics.com/helpdesk/):"
curl -I https://orthodoxmetrics.com/helpdesk/ 2>&1 | head -5 || echo "   Check after propagation"

echo ""
echo "=== Complete ==="
