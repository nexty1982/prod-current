#!/bin/bash
# Fix Zammad volume mounts - run as ROOT
set -e

cd /opt/zammad

echo "═══════════════════════════════════════════════════════════"
echo "  Fix Zammad Volume Mounts"
echo "═══════════════════════════════════════════════════════════"
echo ""

# Step 1: Backup current compose
echo "=== Step 1: Backing Up ==="
BACKUP="docker-compose.yml.backup.$(date +%Y%m%d_%H%M%S)"
cp docker-compose.yml "$BACKUP"
echo "✓ Backed up to: $BACKUP"
echo ""

# Step 2: Apply fixed compose
echo "=== Step 2: Applying Fixed Compose ==="
cp /tmp/docker-compose-fixed.yml docker-compose.yml
echo "✓ Applied fixed compose file"
echo ""

# Step 3: Verify compose
echo "=== Step 3: Validating Compose ==="
if ! docker compose config > /dev/null 2>&1; then
    echo "✗ ERROR: Compose file validation failed"
    docker compose config
    exit 1
fi
echo "✓ Compose file is valid"
echo ""

# Step 4: Stop containers
echo "=== Step 4: Stopping Containers ==="
docker compose down
echo "✓ Containers stopped"
echo ""

# Step 5: Remove old volume if it exists (optional - comment out if you want to keep data)
echo "=== Step 5: Cleaning Up Old Volume ==="
if docker volume ls | grep -q zammad-data; then
    echo "⚠ Old zammad-data volume exists. Removing it..."
    docker volume rm zammad-data 2>/dev/null || echo "Volume in use or doesn't exist, skipping"
fi
echo ""

# Step 6: Start containers
echo "=== Step 6: Starting Containers ==="
docker compose up -d
echo "✓ Containers started"
echo ""

# Step 7: Wait
echo "=== Step 7: Waiting for Initialization ==="
echo "Waiting 60 seconds for services to start..."
sleep 60
echo ""

# Step 8: Check status
echo "=== Step 8: Container Status ==="
docker compose ps
echo ""

# Step 9: Check logs
echo "=== Step 9: Recent Logs ==="
docker compose logs --tail=50 zammad 2>&1 | tail -30
echo ""

# Step 10: Check port
echo "=== Step 10: Port Check ==="
if ss -tlnp 2>/dev/null | grep -q ":3030 "; then
    echo "✓ Port 3030 is listening"
    ss -tlnp | grep ":3030 "
else
    echo "✗ Port 3030 is NOT listening"
fi
echo ""

# Step 11: HTTP test
echo "=== Step 11: HTTP Test ==="
sleep 10
HTTP_OUTPUT=$(curl -sS -I http://127.0.0.1:3030/ 2>&1)
HTTP_STATUS=$(echo "$HTTP_OUTPUT" | grep -E "^HTTP" | head -1 || echo "NO_RESPONSE")
echo "$HTTP_OUTPUT" | head -10

if echo "$HTTP_STATUS" | grep -qE "HTTP.*(200|301|302)"; then
    echo "✓ HTTP SUCCESS: $HTTP_STATUS"
else
    echo "✗ HTTP FAILED: $HTTP_STATUS"
    echo ""
    echo "Check logs for errors:"
    docker compose logs --tail=100 zammad | tail -50
fi

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  Complete"
echo "═══════════════════════════════════════════════════════════"
