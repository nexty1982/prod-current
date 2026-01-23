#!/bin/bash
# Fix Zammad environment - ensure POSTGRES_PASSWORD is explicitly set - run as ROOT
set -e

cd /opt/zammad

echo "═══════════════════════════════════════════════════════════"
echo "  Fix Zammad Environment Password"
echo "═══════════════════════════════════════════════════════════"
echo ""

# Read password from .secrets.env
if [ -f .secrets.env ]; then
    ENV_FILE=".secrets.env"
elif [ -f .env ]; then
    ENV_FILE=".env"
else
    echo "ERROR: No .env file found"
    exit 1
fi

POSTGRES_PASSWORD=$(grep "^POSTGRES_PASSWORD=" "$ENV_FILE" | cut -d= -f2- | tr -d '"' | tr -d "'" | head -1)

if [ -z "$POSTGRES_PASSWORD" ]; then
    echo "ERROR: POSTGRES_PASSWORD not found in $ENV_FILE"
    exit 1
fi

echo "✓ Found password in $ENV_FILE (length: ${#POSTGRES_PASSWORD})"
echo ""

# Check if POSTGRES_PASSWORD is in environment block
echo "Checking docker-compose.yml..."
if grep -A 20 "zammad:" docker-compose.yml | grep -q "POSTGRES_PASSWORD:"; then
    echo "✓ POSTGRES_PASSWORD already in environment block"
else
    echo "⚠ POSTGRES_PASSWORD not in environment block, adding it..."
    
    # Backup
    cp docker-compose.yml docker-compose.yml.backup.$(date +%Y%m%d_%H%M%S)
    
    # Add POSTGRES_PASSWORD to environment block (after REDIS_URL)
    sed -i '/REDIS_URL: redis:\/\/redis:6379/a\      POSTGRES_PASSWORD: '"${POSTGRES_PASSWORD}" docker-compose.yml
    
    echo "✓ Added POSTGRES_PASSWORD to environment block"
fi
echo ""

# Verify compose file
echo "Validating compose file..."
if ! docker compose config > /dev/null 2>&1; then
    echo "✗ ERROR: Compose file validation failed"
    docker compose config
    exit 1
fi
echo "✓ Compose file is valid"
echo ""

# Update database password to match
echo "Updating database password..."
docker exec -e PGPASSWORD="$POSTGRES_PASSWORD" zammad-postgres \
    psql -U zammad -d postgres \
    -c "ALTER USER \"zammad\" WITH PASSWORD '$POSTGRES_PASSWORD';" > /dev/null 2>&1
echo "✓ Database password updated"
echo ""

# Restart Zammad
echo "Restarting Zammad..."
docker compose stop zammad
sleep 3
docker compose up -d zammad
echo "✓ Restarted"
echo ""

echo "Waiting 60 seconds for startup..."
sleep 60
echo ""

echo "Status:"
docker compose ps | grep zammad
echo ""

echo "Recent logs (checking for database errors):"
docker compose logs --tail=30 zammad 2>&1 | grep -E "database|error|Listening|started" | tail -10

echo ""
echo "Port check:"
ss -tlnp | grep 3030 || echo "Port 3030 not listening"

echo ""
echo "HTTP check:"
sleep 10
curl -I http://127.0.0.1:3030/ 2>&1 | head -5 || echo "HTTP failed"
