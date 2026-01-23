#!/bin/bash
# Diagnose Zammad HTTP issues with detailed output
# Run with: sudo bash diagnose-zammad-http.sh
set -e

cd /opt/zammad

echo "═══════════════════════════════════════════════════════════"
echo "  Zammad HTTP Diagnosis"
echo "═══════════════════════════════════════════════════════════"

# Step 1: Check container status
echo ""
echo "=== Step 1: Container Status ==="
docker compose ps

ZAMMAD_CONTAINER=$(docker ps --format '{{.Names}}' | grep -E 'zammad-app|zammad$' | head -1)
if [ -z "$ZAMMAD_CONTAINER" ]; then
    echo "✗ ERROR: Zammad container not found!"
    echo "Checking all containers..."
    docker ps -a --format '{{.Names}}\t{{.Status}}' | grep -i zammad
    exit 1
fi

echo "Zammad container: $ZAMMAD_CONTAINER"

# Check container state
CONTAINER_STATUS=$(docker inspect --format '{{.State.Status}}' "$ZAMMAD_CONTAINER")
echo "Container status: $CONTAINER_STATUS"

if [ "$CONTAINER_STATUS" != "running" ]; then
    echo "✗ Container is not running!"
    exit 1
fi

# Check health status
HEALTH=$(docker inspect --format '{{json .State.Health}}' "$ZAMMAD_CONTAINER" 2>/dev/null || echo "no-healthcheck")
if [ "$HEALTH" != "no-healthcheck" ] && [ "$HEALTH" != "null" ]; then
    HEALTH_STATUS=$(echo "$HEALTH" | grep -o '"Status":"[^"]*"' | cut -d'"' -f4)
    echo "Health status: $HEALTH_STATUS"
else
    echo "Health check: Not configured or not available"
fi

# Step 2: Check port mapping
echo ""
echo "=== Step 2: Port Mapping ==="
echo "Checking port 3030 on host..."
if ss -tlnp 2>/dev/null | grep -q ":3030 "; then
    echo "✓ Port 3030 is listening"
    ss -tlnp | grep ":3030 "
else
    echo "✗ Port 3030 is NOT listening"
    echo "Checking docker port mapping..."
    docker port "$ZAMMAD_CONTAINER" 2>&1 || echo "No port mapping found"
fi

# Check if port 3000 is listening inside container
echo ""
echo "Checking port 3000 inside container..."
if docker exec "$ZAMMAD_CONTAINER" ss -tlnp 2>/dev/null | grep -q ":3000 "; then
    echo "✓ Port 3000 is listening inside container"
    docker exec "$ZAMMAD_CONTAINER" ss -tlnp | grep ":3000 "
elif docker exec "$ZAMMAD_CONTAINER" netstat -tlnp 2>/dev/null | grep -q ":3000 "; then
    echo "✓ Port 3000 is listening inside container"
    docker exec "$ZAMMAD_CONTAINER" netstat -tlnp | grep ":3000 "
else
    echo "✗ Port 3000 is NOT listening inside container"
fi

# Step 3: Test HTTP from inside container
echo ""
echo "=== Step 3: HTTP Test from Inside Container ==="
echo "Testing http://localhost:3000/ from inside container..."
HTTP_INTERNAL=$(docker exec "$ZAMMAD_CONTAINER" curl -v http://localhost:3000/ 2>&1 || echo "CURL_FAILED")
if echo "$HTTP_INTERNAL" | grep -qE "(200|302|301|HTTP)"; then
    echo "✓ Internal HTTP test successful"
    echo "$HTTP_INTERNAL" | grep -E "(HTTP|Location|Server)" | head -5
else
    echo "✗ Internal HTTP test failed"
    echo "$HTTP_INTERNAL" | tail -10
fi

# Step 4: Test HTTP from host
echo ""
echo "=== Step 4: HTTP Test from Host ==="
echo "Testing http://127.0.0.1:3030/..."
HTTP_EXTERNAL=$(curl -v http://127.0.0.1:3030/ 2>&1 || echo "CURL_FAILED")
if echo "$HTTP_EXTERNAL" | grep -qE "(200|302|301|HTTP)"; then
    echo "✓ External HTTP test successful"
    echo "$HTTP_EXTERNAL" | grep -E "(HTTP|Location|Server)" | head -5
elif echo "$HTTP_EXTERNAL" | grep -q "Connection refused"; then
    echo "✗ Connection refused - port 3030 not accessible"
    echo "Full output:"
    echo "$HTTP_EXTERNAL"
elif echo "$HTTP_EXTERNAL" | grep -q "timeout"; then
    echo "✗ Connection timeout"
    echo "Full output:"
    echo "$HTTP_EXTERNAL"
else
    echo "✗ HTTP test failed"
    echo "Full output:"
    echo "$HTTP_EXTERNAL"
fi

# Step 5: Check logs for errors
echo ""
echo "=== Step 5: Recent Logs ==="
echo "Last 100 lines of logs:"
docker logs --tail=100 "$ZAMMAD_CONTAINER" 2>&1 | tail -50

echo ""
echo "Error patterns in logs:"
docker logs --tail=200 "$ZAMMAD_CONTAINER" 2>&1 | grep -iE "error|fatal|exception|failed|cannot|unable|password|auth|connection|migration|ready|listening|started|boot" | tail -20 || echo "No obvious errors found"

# Step 6: Check environment variables
echo ""
echo "=== Step 6: Environment Configuration ==="
echo "Checking docker-compose.yml port mapping..."
grep -A 5 "ports:" docker-compose.yml | grep -A 5 "zammad:" || grep -B 5 -A 5 "3030" docker-compose.yml

echo ""
echo "Checking environment variables..."
docker inspect --format '{{range .Config.Env}}{{println .}}{{end}}' "$ZAMMAD_CONTAINER" | grep -E "POSTGRES|DATABASE|ELASTICSEARCH" | head -10

# Step 7: Check Nginx configuration
echo ""
echo "=== Step 7: Nginx Configuration ==="
if grep -q "location /helpdesk/" /etc/nginx/sites-enabled/orthodoxmetrics.com; then
    echo "✓ /helpdesk/ location block exists"
    echo "Configuration:"
    grep -A 10 "location /helpdesk/" /etc/nginx/sites-enabled/orthodoxmetrics.com | head -12
else
    echo "✗ /helpdesk/ location block not found"
fi

echo ""
echo "Testing public route..."
PUBLIC_TEST=$(curl -v https://orthodoxmetrics.com/helpdesk/ 2>&1 | head -20)
echo "$PUBLIC_TEST"

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  Diagnosis Complete"
echo "═══════════════════════════════════════════════════════════"
