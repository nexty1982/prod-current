#!/bin/bash
# Fix Zammad docker-compose.yml to resolve POSTGRES_PASSWORD issue
# Run as root or user with write access to /opt/zammad/

cd /opt/zammad || exit 1

# Backup original
cp docker-compose.yml docker-compose.yml.backup.$(date +%Y%m%d_%H%M%S)

# Remove obsolete version line
sed -i '/^version:/d' docker-compose.yml

# Replace DATABASE_URL with individual POSTGRES_* variables
sed -i 's|      DATABASE_URL: postgres://zammad:\${POSTGRES_PASSWORD}@postgres/zammad|      POSTGRES_HOST: postgres\n      POSTGRES_USER: zammad\n      POSTGRES_DB: zammad|' docker-compose.yml

# Verify the change
echo "=== Verification ==="
grep -n 'POSTGRES_HOST\|DATABASE_URL' docker-compose.yml

echo ""
echo "=== Testing docker-compose config ==="
docker compose config 2>&1 | grep -i warning | head -3

echo ""
echo "=== Restarting containers ==="
docker compose down
docker compose up -d

echo ""
echo "=== Checking status ==="
sleep 5
docker compose ps
