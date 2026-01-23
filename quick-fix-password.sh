#!/bin/bash
# Quick fix - sync password from .secrets.env to database - run as ROOT
set -e

cd /opt/zammad

echo "Quick Password Sync Fix"
echo "======================="
echo ""

# Read password from .secrets.env (what Zammad uses)
if [ -f .secrets.env ]; then
    ENV_FILE=".secrets.env"
elif [ -f .env ]; then
    ENV_FILE=".env"
else
    echo "ERROR: No .env file found"
    exit 1
fi

POSTGRES_PASSWORD=$(grep "^POSTGRES_PASSWORD=" "$ENV_FILE" | cut -d= -f2- | tr -d '"' | tr -d "'" | head -1)
POSTGRES_USER="zammad"

echo "Updating database password to match $ENV_FILE..."

# Update password using zammad user (which is superuser in postgres:15)
docker exec -e PGPASSWORD="$POSTGRES_PASSWORD" zammad-postgres \
    psql -U "$POSTGRES_USER" -d postgres \
    -c "ALTER USER \"$POSTGRES_USER\" WITH PASSWORD '$POSTGRES_PASSWORD';" 2>&1 | grep -v "password" || true

echo "✓ Password updated"
echo ""

# Restart Zammad
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
echo "Port check:"
ss -tlnp | grep 3030 || echo "Port 3030 not listening"

echo ""
echo "HTTP check:"
curl -I http://127.0.0.1:3030/ 2>&1 | head -5 || echo "HTTP failed"
