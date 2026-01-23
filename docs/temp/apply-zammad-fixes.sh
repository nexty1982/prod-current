#!/bin/bash
# Apply Zammad fixes - run with: sudo bash apply-zammad-fixes.sh
set -e

BACKUP_SUFFIX=$(date +%Y%m%d_%H%M%S)

echo "=== Applying docker-compose.yml fix ==="
cd /opt/zammad
sudo cp docker-compose.yml docker-compose.yml.backup.$BACKUP_SUFFIX
sudo cp /tmp/docker-compose-fixed.yml docker-compose.yml
echo "✓ docker-compose.yml updated"

echo ""
echo "=== Restarting containers ==="
sudo docker compose down
sudo docker compose up -d
echo "✓ Containers restarted"
sleep 15
sudo docker compose ps

echo ""
echo "=== Applying Nginx fix ==="
# Remove problematic snippet file (location directives not allowed in snippets)
if [ -f /etc/nginx/snippets/orthodoxmetrics-helpdesk.conf ]; then
    sudo rm /etc/nginx/snippets/orthodoxmetrics-helpdesk.conf
    echo "✓ Removed problematic snippet file"
fi
sudo cp /etc/nginx/sites-enabled/orthodoxmetrics.com /etc/nginx/sites-enabled/orthodoxmetrics.com.backup.$BACKUP_SUFFIX
sudo cp /tmp/nginx-fixed.conf /etc/nginx/sites-enabled/orthodoxmetrics.com
echo "✓ Nginx config updated"

echo ""
echo "=== Testing and reloading Nginx ==="
sudo nginx -t
sudo systemctl reload nginx
echo "✓ Nginx reloaded"

echo ""
echo "=== Verification ==="
echo "Container status:"
sudo docker compose ps | grep -E "NAME|zammad"

echo ""
echo "Local port check (http://127.0.0.1:3030/):"
curl -I http://127.0.0.1:3030/ 2>&1 | head -5 || echo "Still starting..."

echo ""
echo "Public route check (https://orthodoxmetrics.com/helpdesk/):"
curl -I https://orthodoxmetrics.com/helpdesk/ 2>&1 | head -5 || echo "Check after propagation"

echo ""
echo "=== Complete ==="
