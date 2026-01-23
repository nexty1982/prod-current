#!/bin/bash
# Apply Zammad fixes - run as ROOT
set -e

cd /opt/zammad

echo "Backing up current docker-compose.yml..."
cp docker-compose.yml docker-compose.yml.backup.$(date +%Y%m%d_%H%M%S)

echo "Applying fixed docker-compose.yml..."
cp /tmp/docker-compose-fixed.yml docker-compose.yml

echo "Verifying compose file..."
docker compose config > /dev/null 2>&1 || {
    echo "ERROR: Fixed compose file is invalid!"
    docker compose config
    exit 1
}

echo "✓ Compose file is valid"
echo ""
echo "Now run: bash /tmp/fix-zammad-complete.sh"
