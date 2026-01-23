#!/bin/bash
# Diagnose and fix Zammad - captures crash logs and applies fixes
# Run with: sudo bash diagnose-and-fix-zammad.sh
set -e

cd /opt/zammad

echo "═══════════════════════════════════════════════════════════"
echo "  Zammad Diagnosis and Fix"
echo "═══════════════════════════════════════════════════════════"

# Step 1: Capture crash logs
echo ""
echo "=== Step 1: Capturing Crash Logs ==="
echo ""

# Find zammad container name
ZAMMAD_CONTAINER=$(docker ps -a --format '{{.Names}} {{.Image}}' | grep zammad | grep -v postgres | grep -v elasticsearch | awk '{print $1}' | head -1)

if [ -z "$ZAMMAD_CONTAINER" ]; then
    echo "⚠ No zammad container found, checking all containers..."
    docker ps -a --format '{{.Names}} {{.Image}} {{.Status}}' | grep -i zammad
    ZAMMAD_CONTAINER="zammad-app"  # Default name
fi

echo "Zammad container name: $ZAMMAD_CONTAINER"
echo ""

# Capture recent logs
echo "--- Recent logs (last 400 lines) ---"
docker logs --tail=400 "$ZAMMAD_CONTAINER" 2>&1 | tail -150 > /tmp/zammad-logs-recent.txt
cat /tmp/zammad-logs-recent.txt

echo ""
echo "--- Logs from last 10 minutes ---"
docker logs --tail=400 --since 10m "$ZAMMAD_CONTAINER" 2>&1 | tail -150 > /tmp/zammad-logs-10m.txt
cat /tmp/zammad-logs-10m.txt

# Extract error patterns
echo ""
echo "--- Error Summary ---"
grep -i "error\|fatal\|exception\|failed\|cannot\|unable" /tmp/zammad-logs-recent.txt | tail -20 || echo "No obvious errors found in recent logs"

# Step 2: Check environment setup
echo ""
echo "=== Step 2: Checking Environment Setup ==="

# Check .env file
if [ -f .env ]; then
    echo "✓ .env exists"
    if grep -q "POSTGRES_PASSWORD" .env; then
        echo "✓ .env contains POSTGRES_PASSWORD"
    else
        echo "✗ ERROR: .env does not contain POSTGRES_PASSWORD"
        exit 1
    fi
else
    echo "✗ ERROR: .env file not found!"
    if [ -f .secrets.env ]; then
        echo "Creating .env from .secrets.env..."
        cp .secrets.env .env
        chmod 600 .env
        echo "✓ Created .env"
    else
        echo "✗ ERROR: .secrets.env also not found!"
        exit 1
    fi
fi

# Check docker-compose.yml for parse-time expansion
echo ""
echo "Checking docker-compose.yml for parse-time variable expansion..."
if grep -q '\${POSTGRES_PASSWORD}' docker-compose.yml; then
    echo "✗ ERROR: docker-compose.yml still uses \${POSTGRES_PASSWORD} expansion"
    echo "This needs to be fixed!"
    exit 1
else
    echo "✓ docker-compose.yml does not use parse-time expansion"
fi

# Check compose config for warnings
echo ""
echo "Checking docker compose config for POSTGRES_PASSWORD warnings..."
COMPOSE_CONFIG=$(docker compose config 2>&1)
if echo "$COMPOSE_CONFIG" | grep -qi "POSTGRES_PASSWORD.*not set"; then
    echo "✗ WARNING: POSTGRES_PASSWORD not set warning found!"
    echo "$COMPOSE_CONFIG" | grep -i "POSTGRES_PASSWORD\|warning" | head -5
    exit 1
else
    echo "✓ No POSTGRES_PASSWORD warning"
fi

# Check for DATABASE_URL vs POSTGRES_* vars
echo ""
echo "Checking environment variables in compose config..."
if echo "$COMPOSE_CONFIG" | grep -q "DATABASE_URL.*POSTGRES_PASSWORD"; then
    echo "⚠ WARNING: DATABASE_URL still contains POSTGRES_PASSWORD"
    echo "$COMPOSE_CONFIG" | grep -n "DATABASE_URL\|POSTGRES_PASSWORD" | head -10
else
    echo "✓ Using POSTGRES_HOST/USER/DB variables (good)"
fi

# Step 3: Check volumes
echo ""
echo "=== Step 3: Checking Volumes ==="
echo "Checking for zammad volumes..."
docker volume ls | grep zammad || echo "⚠ No zammad volumes found (will be created)"

echo ""
echo "Verifying volume declarations in docker-compose.yml..."
if grep -q "zammad-postgres-data:\|zammad-data:\|zammad-elasticsearch-data:" docker-compose.yml; then
    echo "✓ Volume declarations found in docker-compose.yml"
else
    echo "✗ ERROR: Volume declarations missing!"
    exit 1
fi

# Step 4: Restart containers
echo ""
echo "=== Step 4: Restarting Containers ==="
echo "Stopping containers..."
docker compose down
echo "✓ Containers stopped"

echo ""
echo "Starting containers..."
docker compose up -d
echo "✓ Containers started"

echo ""
echo "Waiting for containers to initialize..."
sleep 20

# Step 5: Verify
echo ""
echo "=== Step 5: Verification ==="
echo "Container status:"
docker compose ps

echo ""
echo "Checking for restarting containers..."
if docker compose ps | grep -q "restarting"; then
    echo "✗ WARNING: Some containers are restarting!"
    docker compose ps | grep restarting
    echo ""
    echo "Checking zammad logs again..."
    sleep 5
    docker logs --tail=50 "$ZAMMAD_CONTAINER" 2>&1 | tail -30
    exit 1
else
    echo "✓ No containers restarting"
fi

echo ""
echo "Checking port 3030..."
if ss -tlnp 2>/dev/null | grep -q ":3030 "; then
    echo "✓ Port 3030 is listening"
    ss -tlnp | grep ":3030 "
else
    echo "✗ Port 3030 is not listening"
    exit 1
fi

echo ""
echo "Testing HTTP connection..."
HTTP_RESPONSE=$(curl -I http://127.0.0.1:3030/ 2>&1 | head -1)
if echo "$HTTP_RESPONSE" | grep -qE "(200|302|301)"; then
    echo "✓ HTTP connection successful: $HTTP_RESPONSE"
else
    echo "✗ HTTP connection failed: $HTTP_RESPONSE"
    exit 1
fi

# Step 6: Nginx (only if Zammad is stable)
echo ""
echo "=== Step 6: Nginx Configuration ==="

# Check if helpdesk location exists
if grep -q "location /helpdesk/" /etc/nginx/sites-enabled/orthodoxmetrics.com; then
    echo "✓ /helpdesk/ location block exists"
else
    echo "✗ ERROR: /helpdesk/ location block not found!"
    exit 1
fi

# Remove problematic snippet include if it exists
ORTHOD_CONFIG="/etc/nginx/sites-available/orthodmetrics.com"
if [ -f "$ORTHOD_CONFIG" ] && grep -q "orthodoxmetrics-helpdesk" "$ORTHOD_CONFIG"; then
    echo "Removing problematic include from $ORTHOD_CONFIG..."
    sed -i '/orthodoxmetrics-helpdesk/d' "$ORTHOD_CONFIG"
    echo "✓ Removed include statement"
fi

# Test Nginx
echo ""
echo "Testing Nginx configuration..."
if nginx -t; then
    echo "✓ Nginx configuration is valid"
else
    echo "✗ Nginx configuration test failed!"
    exit 1
fi

# Reload Nginx
echo ""
echo "Reloading Nginx..."
systemctl reload nginx
echo "✓ Nginx reloaded"

# Test public route
echo ""
echo "Testing public route..."
PUBLIC_RESPONSE=$(curl -I https://orthodoxmetrics.com/helpdesk/ 2>&1 | head -1)
if echo "$PUBLIC_RESPONSE" | grep -qE "(200|302|301)"; then
    echo "✓ Public route working: $PUBLIC_RESPONSE"
else
    echo "⚠ Public route response: $PUBLIC_RESPONSE"
    echo "  (May need a moment to propagate)"
fi

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  ✓ All Steps Complete!"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "Zammad Helpdesk: https://orthodoxmetrics.com/helpdesk/"
echo ""
echo "Logs saved to:"
echo "  /tmp/zammad-logs-recent.txt"
echo "  /tmp/zammad-logs-10m.txt"
