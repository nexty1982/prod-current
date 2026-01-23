#!/bin/bash
# Fix FreeScout MySQL healthcheck - run as ROOT
set -e

cd /opt/freescout

echo "Fixing MySQL healthcheck..."
echo ""

# Stop containers
echo "Stopping containers..."
docker compose down
echo ""

# Update compose file
echo "Updating docker-compose.yml..."
cp /tmp/freescout-docker-compose.yml docker-compose.yml
echo "✓ Updated"
echo ""

# Validate
echo "Validating..."
docker compose config > /dev/null 2>&1 || {
    echo "ERROR: Compose validation failed"
    exit 1
}
echo "✓ Valid"
echo ""

# Start
echo "Starting containers..."
docker compose up -d
echo "✓ Started"
echo ""

echo "Waiting 90 seconds for MySQL to initialize..."
sleep 90
echo ""

echo "Status:"
docker compose ps
echo ""

echo "MySQL logs (last 20 lines):"
docker compose logs --tail=20 mysql 2>&1 | tail -20
echo ""

echo "FreeScout logs (last 20 lines):"
docker compose logs --tail=20 freescout 2>&1 | tail -20
