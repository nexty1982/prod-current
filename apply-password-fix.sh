#!/bin/bash
# Apply POSTGRES_PASSWORD fix to compose file - run as ROOT
set -e

cd /opt/zammad

echo "Applying POSTGRES_PASSWORD fix..."
echo ""

# Backup
cp docker-compose.yml docker-compose.yml.backup.$(date +%Y%m%d_%H%M%S)

# Apply fixed compose
cp /tmp/docker-compose-with-password.yml docker-compose.yml

# Validate
docker compose config > /dev/null 2>&1 || {
    echo "ERROR: Compose validation failed"
    exit 1
}

echo "✓ Compose file updated with POSTGRES_PASSWORD in environment block"
echo ""

# Restart
echo "Restarting Zammad..."
docker compose stop zammad
sleep 3
docker compose up -d zammad

echo "✓ Restarted"
echo ""
echo "Waiting 60 seconds..."
sleep 60

echo ""
echo "Status:"
docker compose ps | grep zammad

echo ""
echo "Logs (last 20 lines):"
docker compose logs --tail=20 zammad 2>&1 | tail -20
