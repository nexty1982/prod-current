#!/bin/bash
# Restart Zammad and verify - run as ROOT
set -e

cd /opt/zammad

echo "═══════════════════════════════════════════════════════════"
echo "  Restart Zammad and Verify"
echo "═══════════════════════════════════════════════════════════"
echo ""

# Step 1: Verify REDIS_URL is set
echo "=== Step 1: Verifying REDIS_URL ==="
if grep -q "REDIS_URL.*redis://redis:6379" docker-compose.yml; then
    echo "✓ REDIS_URL is set correctly in docker-compose.yml"
    grep "REDIS_URL" docker-compose.yml
else
    echo "✗ ERROR: REDIS_URL not found or incorrect"
    exit 1
fi
echo ""

# Step 2: Stop containers
echo "=== Step 2: Stopping Containers ==="
docker compose down
echo "✓ Containers stopped"
echo ""

# Step 3: Start containers
echo "=== Step 3: Starting Containers ==="
docker compose up -d
echo "✓ Containers started"
echo ""

# Step 4: Wait for initialization
echo "=== Step 4: Waiting for Initialization ==="
echo "Waiting 60 seconds for services to start..."
sleep 60
echo ""

# Step 5: Check container status
echo "=== Step 5: Container Status ==="
docker compose ps
echo ""

# Step 6: Check for restarting containers
echo "=== Step 6: Checking for Restart Loops ==="
RESTARTING=$(docker compose ps --format json | grep -c '"State":"restarting"' || echo "0")
if [ "$RESTARTING" -gt 0 ]; then
    echo "⚠ WARNING: Some containers are restarting"
    docker compose ps | grep restarting
else
    echo "✓ No containers restarting"
fi
echo ""

# Step 7: Check port 3030
echo "=== Step 7: Port 3030 Check ==="
if ss -tlnp 2>/dev/null | grep -q ":3030 "; then
    echo "✓ Port 3030 is listening"
    ss -tlnp | grep ":3030 "
else
    echo "✗ Port 3030 is NOT listening"
fi
echo ""

# Step 8: Check HTTP response
echo "=== Step 8: HTTP Response Check ==="
HTTP_OUTPUT=$(curl -sS -I http://127.0.0.1:3030/ 2>&1)
HTTP_STATUS=$(echo "$HTTP_OUTPUT" | grep -E "^HTTP" | head -1 || echo "NO_RESPONSE")
echo "$HTTP_OUTPUT" | head -10

if echo "$HTTP_STATUS" | grep -qE "HTTP.*(200|301|302)"; then
    echo "✓ HTTP SUCCESS: $HTTP_STATUS"
    HTTP_OK=true
else
    echo "✗ HTTP FAILED: $HTTP_STATUS"
    HTTP_OK=false
fi
echo ""

# Step 9: Summary
echo "═══════════════════════════════════════════════════════════"
echo "  Summary"
echo "═══════════════════════════════════════════════════════════"
if [ "$RESTARTING" -eq 0 ] && [ "$HTTP_OK" = true ]; then
    echo "✅ ZAMMAD IS WORKING"
    echo ""
    echo "Next: Run doctor tool to verify:"
    echo "  python3 tools/om_ops/zammad_doctor.py --full --write-report"
    exit 0
else
    echo "❌ ZAMMAD HAS ISSUES"
    echo ""
    echo "Check logs:"
    echo "  docker compose logs --tail=100 zammad"
    exit 1
fi
