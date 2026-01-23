#!/bin/bash
# Complete Zammad setup - run this as root or with sudo
# This script applies all fixes and gets Zammad running
set -e

cd /opt/zammad

echo "═══════════════════════════════════════════════════════════"
echo "  Complete Zammad Setup"
echo "═══════════════════════════════════════════════════════════"

# Backup
if [ -f docker-compose.yml ]; then
    cp docker-compose.yml docker-compose.yml.backup.$(date +%Y%m%d_%H%M%S)
fi

# Copy complete docker-compose.yml
cp /tmp/zammad-complete-docker-compose.yml docker-compose.yml
chmod 644 docker-compose.yml
echo "✓ Updated docker-compose.yml"

# Ensure .env exists
if [ ! -f .env ]; then
    cp .secrets.env .env
    chmod 600 .env
    echo "✓ Created .env"
fi

# Stop and start
echo ""
echo "Stopping containers..."
docker compose down 2>&1 | tail -3

echo ""
echo "Starting containers..."
docker compose up -d
echo "✓ Containers started"

echo ""
echo "Waiting for initialization (60 seconds)..."
sleep 60

echo ""
echo "Container status:"
docker compose ps

echo ""
echo "Zammad logs (last 50 lines):"
docker compose logs --tail=50 zammad 2>&1 | tail -30

echo ""
echo "Testing HTTP..."
sleep 5
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3030/ 2>&1 || echo "000")
if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "302" ] || [ "$HTTP_CODE" = "301" ]; then
    echo "✓ HTTP responding: $HTTP_CODE"
else
    echo "⚠ HTTP status: $HTTP_CODE"
    echo "Checking logs for errors..."
    docker compose logs --tail=100 zammad 2>&1 | grep -iE "error|fatal|exception" | tail -10 || echo "No obvious errors"
fi

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  Setup complete!"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "Access: https://orthodoxmetrics.com/helpdesk/"
echo "Local: http://127.0.0.1:3030/"
echo ""
echo "To watch logs: docker compose logs -f zammad"
