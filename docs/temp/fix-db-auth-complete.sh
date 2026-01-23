#!/bin/bash
# Complete fix for Zammad database authentication
# Run with: sudo bash fix-db-auth-complete.sh (or as root)
set -e

cd /opt/zammad

echo "═══════════════════════════════════════════════════════════"
echo "  Fixing Database Authentication"
echo "═══════════════════════════════════════════════════════════"

# Get password (try .env first, then .secrets.env)
if [ -f .env ]; then
    POSTGRES_PASSWORD=$(grep POSTGRES_PASSWORD .env | cut -d= -f2)
elif [ -f .secrets.env ]; then
    POSTGRES_PASSWORD=$(grep POSTGRES_PASSWORD .secrets.env | cut -d= -f2)
else
    echo "✗ ERROR: Neither .env nor .secrets.env found"
    exit 1
fi

if [ -z "$POSTGRES_PASSWORD" ]; then
    echo "✗ ERROR: POSTGRES_PASSWORD not found"
    exit 1
fi

echo "✓ Password found"

# Update postgres password
echo ""
echo "Updating postgres user password..."
docker exec zammad-postgres psql -U postgres << EOF
ALTER USER zammad WITH PASSWORD '$POSTGRES_PASSWORD';
\q
EOF

echo "✓ Password updated"

# Add POSTGRES_PASSWORD to postgres service if missing
if ! grep -A 8 "postgres:" docker-compose.yml | grep -q "POSTGRES_PASSWORD"; then
    echo ""
    echo "Adding POSTGRES_PASSWORD to postgres environment..."
    sed -i '/POSTGRES_USER: zammad/a\      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}' docker-compose.yml
    echo "✓ Added to docker-compose.yml"
fi

# Restart zammad
echo ""
echo "Restarting Zammad..."
docker compose restart zammad

echo ""
echo "Waiting 30 seconds..."
sleep 30

# Check logs
echo ""
echo "Recent logs:"
docker compose logs --tail=50 zammad 2>&1 | tail -25

# Check if database error is gone
if docker compose logs --tail=100 zammad 2>&1 | grep -q "issue connecting to your database"; then
    echo ""
    echo "⚠ Database connection issue still present"
    echo "Checking postgres logs..."
    docker compose logs --tail=30 postgres 2>&1 | tail -15
else
    echo ""
    echo "✓ No database connection errors in recent logs"
fi

# Test HTTP
echo ""
echo "Testing HTTP..."
sleep 10
curl -I http://127.0.0.1:3030/ 2>&1 | head -5 || echo "Still starting..."

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  Complete"
echo "═══════════════════════════════════════════════════════════"
