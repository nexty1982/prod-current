#!/bin/bash
# Complete final fix for Zammad - run as root
# This fixes the PostgreSQL password issue
set -e

cd /opt/zammad

echo "═══════════════════════════════════════════════════════════"
echo "  Complete Zammad Final Fix"
echo "═══════════════════════════════════════════════════════════"

# Get password
if [ -f .env ]; then
    POSTGRES_PASSWORD=$(grep POSTGRES_PASSWORD .env | cut -d= -f2)
elif [ -f .secrets.env ]; then
    POSTGRES_PASSWORD=$(grep POSTGRES_PASSWORD .secrets.env | cut -d= -f2)
else
    echo "✗ ERROR: No .env or .secrets.env found"
    exit 1
fi

if [ -z "$POSTGRES_PASSWORD" ]; then
    echo "✗ ERROR: POSTGRES_PASSWORD not found"
    exit 1
fi

echo "✓ Password retrieved"

# Backup
cp docker-compose.yml docker-compose.yml.backup.$(date +%Y%m%d_%H%M%S)

# Add POSTGRES_PASSWORD to postgres service
if ! grep -A 10 "postgres:" docker-compose.yml | grep -q "POSTGRES_PASSWORD"; then
    sed -i '/POSTGRES_USER: zammad/a\      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}' docker-compose.yml
    echo "✓ Added POSTGRES_PASSWORD to postgres service"
fi

# Update password in running postgres (if container exists)
if docker ps | grep -q zammad-postgres; then
    echo ""
    echo "Updating password in Postgres..."
    docker exec zammad-postgres psql -U postgres -c "ALTER USER zammad WITH PASSWORD '$POSTGRES_PASSWORD';" 2>&1
    echo "✓ Password updated"
fi

# Restart
echo ""
echo "Restarting containers..."
docker compose down
docker compose up -d
echo "✓ Containers restarted"

echo ""
echo "Waiting 60 seconds for startup..."
sleep 60

echo ""
echo "Container status:"
docker compose ps

echo ""
echo "Zammad logs (last 50 lines):"
docker compose logs --tail=50 zammad 2>&1 | tail -30

# Check for database errors
if docker compose logs --tail=100 zammad 2>&1 | grep -q "issue connecting to your database"; then
    echo ""
    echo "⚠ Database error still present, waiting 30 more seconds..."
    sleep 30
    docker compose logs --tail=30 zammad 2>&1 | tail -20
fi

# Test HTTP
echo ""
echo "Testing HTTP..."
sleep 10
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3030/ 2>&1 || echo "000")
if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "302" ] || [ "$HTTP_CODE" = "301" ]; then
    echo "✓ HTTP SUCCESS: $HTTP_CODE"
    curl -I http://127.0.0.1:3030/ 2>&1 | head -5
else
    echo "⚠ HTTP status: $HTTP_CODE"
    echo "Checking port..."
    ss -tlnp | grep 3030 || echo "Port 3030 not listening"
fi

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  Complete"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "Access: https://orthodoxmetrics.com/helpdesk/"
echo "Watch logs: docker compose logs -f zammad"
