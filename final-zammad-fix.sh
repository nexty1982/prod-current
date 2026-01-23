#!/bin/bash
# Final fix for Zammad - fixes database password and gets it running
# Run as root: bash final-zammad-fix.sh
set -e

cd /opt/zammad

echo "═══════════════════════════════════════════════════════════"
echo "  Final Zammad Fix"
echo "═══════════════════════════════════════════════════════════"

# Get password from .env or .secrets.env
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

# Update postgres password
echo ""
echo "=== Step 1: Updating Postgres Password ==="
docker exec zammad-postgres psql -U postgres << EOF
ALTER USER zammad WITH PASSWORD '$POSTGRES_PASSWORD';
\q
EOF

if [ $? -eq 0 ]; then
    echo "✓ Password updated in Postgres"
else
    echo "✗ Failed to update password"
    exit 1
fi

# Add POSTGRES_PASSWORD to postgres service environment
echo ""
echo "=== Step 2: Updating docker-compose.yml ==="
if ! grep -A 8 "postgres:" docker-compose.yml | grep -q "POSTGRES_PASSWORD"; then
    sed -i '/POSTGRES_USER: zammad/a\      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}' docker-compose.yml
    echo "✓ Added POSTGRES_PASSWORD to postgres environment"
else
    echo "✓ POSTGRES_PASSWORD already in postgres environment"
fi

# Restart zammad
echo ""
echo "=== Step 3: Restarting Zammad ==="
docker compose restart zammad
echo "✓ Zammad restarted"

# Wait and monitor
echo ""
echo "=== Step 4: Monitoring Startup ==="
echo "Waiting 45 seconds for Zammad to start..."
sleep 45

# Check logs
echo ""
echo "Recent logs:"
docker compose logs --tail=80 zammad 2>&1 | tail -40

# Check for database errors
if docker compose logs --tail=100 zammad 2>&1 | grep -q "issue connecting to your database"; then
    echo ""
    echo "⚠ Database connection issue still present"
    echo "Trying one more restart..."
    docker compose restart zammad
    sleep 30
fi

# Final status
echo ""
echo "=== Step 5: Final Status ==="
docker compose ps | head -6

# Test HTTP
echo ""
echo "Testing HTTP connection..."
sleep 10
HTTP_OUTPUT=$(curl -v http://127.0.0.1:3030/ 2>&1)
HTTP_STATUS=$(echo "$HTTP_OUTPUT" | grep -E "^< HTTP" | head -1 || echo "NO_RESPONSE")

if echo "$HTTP_STATUS" | grep -qE "HTTP.*(200|302|301)"; then
    echo "✓ HTTP SUCCESS: $HTTP_STATUS"
    echo ""
    echo "Full response:"
    echo "$HTTP_OUTPUT" | head -15
else
    echo "⚠ HTTP response: $HTTP_STATUS"
    echo "Full output:"
    echo "$HTTP_OUTPUT" | head -20
    
    # Check if port is listening
    echo ""
    echo "Checking port 3030..."
    if ss -tlnp 2>/dev/null | grep -q ":3030 "; then
        echo "✓ Port 3030 is listening"
    else
        echo "✗ Port 3030 is not listening"
        echo ""
        echo "Checking container status..."
        docker compose ps | grep zammad
        echo ""
        echo "Last 50 lines of logs:"
        docker compose logs --tail=50 zammad 2>&1 | tail -30
    fi
fi

# Check public route
echo ""
echo "Testing public route..."
PUBLIC_RESPONSE=$(curl -I https://orthodoxmetrics.com/helpdesk/ 2>&1 | head -5)
if echo "$PUBLIC_RESPONSE" | grep -qE "(200|302|301)"; then
    echo "✓ Public route working"
    echo "$PUBLIC_RESPONSE" | head -3
else
    echo "⚠ Public route:"
    echo "$PUBLIC_RESPONSE" | head -3
fi

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  Complete"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "Access: https://orthodoxmetrics.com/helpdesk/"
echo "Local: http://127.0.0.1:3030/"
echo ""
echo "To watch logs: docker compose logs -f zammad"
