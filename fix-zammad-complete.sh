#!/bin/bash
# Complete Zammad fix - run as ROOT
# This script applies fixes and restarts Zammad
set -e

cd /opt/zammad

echo "═══════════════════════════════════════════════════════════"
echo "  Zammad Complete Fix"
echo "═══════════════════════════════════════════════════════════"
echo ""

# Step 1: Stop containers
echo "=== Step 1: Stopping Containers ==="
docker compose down
echo "✓ Containers stopped"
echo ""

# Step 2: Verify compose file
echo "=== Step 2: Verifying Compose File ==="
if ! docker compose config > /dev/null 2>&1; then
    echo "✗ ERROR: docker-compose.yml is invalid"
    docker compose config
    exit 1
fi
echo "✓ Compose file is valid"
echo ""

# Step 3: Start containers
echo "=== Step 3: Starting Containers ==="
docker compose up -d
echo "✓ Containers started"
echo ""

# Step 4: Wait for services
echo "=== Step 4: Waiting for Services ==="
echo "Waiting 60 seconds for services to initialize..."
sleep 60
echo ""

# Step 5: Check status
echo "=== Step 5: Container Status ==="
docker compose ps
echo ""

# Step 6: Check logs
echo "=== Step 6: Recent Logs ==="
docker compose logs --tail=50 zammad 2>&1 | tail -30
echo ""

# Step 7: Test HTTP
echo "=== Step 7: HTTP Test ==="
sleep 10
HTTP_OUTPUT=$(curl -v http://127.0.0.1:3030/ 2>&1 | head -30)
HTTP_STATUS=$(echo "$HTTP_OUTPUT" | grep -E "^< HTTP" | head -1 || echo "NO_RESPONSE")
echo "$HTTP_OUTPUT"
echo ""

if echo "$HTTP_STATUS" | grep -qE "HTTP.*(200|302|301)"; then
    echo "✅ HTTP SUCCESS: $HTTP_STATUS"
else
    echo "⚠ HTTP response: $HTTP_STATUS"
fi

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  Complete"
echo "═══════════════════════════════════════════════════════════"
