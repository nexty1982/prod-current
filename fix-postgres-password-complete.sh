#!/bin/bash
# Complete fix: Add POSTGRES_PASSWORD to postgres service and update password
# Run as root: bash fix-postgres-password-complete.sh
set -e

cd /opt/zammad

echo "═══════════════════════════════════════════════════════════"
echo "  Fixing PostgreSQL Password Configuration"
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

echo "✓ Password retrieved from .env/.secrets.env"

# Step 1: Add POSTGRES_PASSWORD to postgres service environment
echo ""
echo "=== Step 1: Updating docker-compose.yml ==="
if ! grep -A 10 "postgres:" docker-compose.yml | grep -q "POSTGRES_PASSWORD"; then
    # Add POSTGRES_PASSWORD after POSTGRES_USER
    sed -i '/POSTGRES_USER: zammad/a\      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}' docker-compose.yml
    echo "✓ Added POSTGRES_PASSWORD to postgres service environment"
else
    echo "✓ POSTGRES_PASSWORD already in postgres environment"
fi

# Step 2: Update password in running postgres container
echo ""
echo "=== Step 2: Updating Postgres User Password ==="
if docker ps | grep -q zammad-postgres; then
    echo "Updating password for user 'zammad'..."
    docker exec zammad-postgres psql -U postgres << EOF
ALTER USER zammad WITH PASSWORD '$POSTGRES_PASSWORD';
\q
EOF
    
    if [ $? -eq 0 ]; then
        echo "✓ Password updated in Postgres database"
    else
        echo "⚠ Failed to update password (may need container restart)"
    fi
else
    echo "⚠ Postgres container not running, password will be set on next start"
fi

# Step 3: Restart containers to apply changes
echo ""
echo "=== Step 3: Restarting Containers ==="
echo "Stopping containers..."
docker compose down 2>&1 | tail -3

echo ""
echo "Starting containers..."
docker compose up -d
echo "✓ Containers started"

# Step 4: Wait and monitor
echo ""
echo "=== Step 4: Waiting for Startup ==="
echo "Waiting 60 seconds for containers to initialize..."
sleep 60

# Step 5: Check status
echo ""
echo "=== Step 5: Container Status ==="
docker compose ps

# Step 6: Check logs
echo ""
echo "=== Step 6: Zammad Logs (checking for database errors) ==="
RECENT_LOGS=$(docker compose logs --tail=100 zammad 2>&1 | tail -50)
echo "$RECENT_LOGS"

if echo "$RECENT_LOGS" | grep -q "issue connecting to your database"; then
    echo ""
    echo "⚠ Database connection issue still present"
    echo "Waiting additional 30 seconds..."
    sleep 30
    docker compose logs --tail=50 zammad 2>&1 | tail -25
fi

# Step 7: Test HTTP
echo ""
echo "=== Step 7: Testing HTTP ==="
sleep 10
HTTP_OUTPUT=$(curl -v http://127.0.0.1:3030/ 2>&1)
HTTP_STATUS=$(echo "$HTTP_OUTPUT" | grep -E "^< HTTP" | head -1 || echo "NO_RESPONSE")

if echo "$HTTP_STATUS" | grep -qE "HTTP.*(200|302|301)"; then
    echo "✓ HTTP SUCCESS: $HTTP_STATUS"
    echo ""
    echo "Response headers:"
    echo "$HTTP_OUTPUT" | grep -E "^< HTTP|^< Server|^< Content" | head -5
else
    echo "⚠ HTTP response: $HTTP_STATUS"
    echo "Full output:"
    echo "$HTTP_OUTPUT" | head -25
    
    # Check port
    echo ""
    echo "Checking port 3030..."
    if ss -tlnp 2>/dev/null | grep -q ":3030 "; then
        echo "✓ Port 3030 is listening"
        ss -tlnp | grep ":3030 "
    else
        echo "✗ Port 3030 is not listening"
        echo ""
        echo "Container status:"
        docker compose ps | grep zammad
    fi
fi

# Step 8: Test public route
echo ""
echo "=== Step 8: Testing Public Route ==="
PUBLIC_RESPONSE=$(curl -I https://orthodoxmetrics.com/helpdesk/ 2>&1 | head -8)
if echo "$PUBLIC_RESPONSE" | grep -qE "(200|302|301)"; then
    echo "✓ Public route working"
    echo "$PUBLIC_RESPONSE" | head -5
else
    echo "⚠ Public route:"
    echo "$PUBLIC_RESPONSE" | head -5
fi

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  Complete"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "Summary:"
echo "  - PostgreSQL: Running in Docker container (postgres:15)"
echo "  - Password: Updated to match .env file"
echo "  - Configuration: POSTGRES_PASSWORD added to docker-compose.yml"
echo ""
echo "Access: https://orthodoxmetrics.com/helpdesk/"
echo "Local: http://127.0.0.1:3030/"
echo ""
echo "To watch logs: docker compose logs -f zammad"
