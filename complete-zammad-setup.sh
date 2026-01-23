#!/bin/bash
# Complete Zammad setup - applies all fixes and starts containers
# Run with: sudo bash complete-zammad-setup.sh
set -e

cd /opt/zammad

echo "═══════════════════════════════════════════════════════════"
echo "  Complete Zammad Setup"
echo "═══════════════════════════════════════════════════════════"

# Step 1: Backup and update docker-compose.yml
echo ""
echo "=== Step 1: Updating docker-compose.yml ==="
if [ -f docker-compose.yml ]; then
    cp docker-compose.yml docker-compose.yml.backup.$(date +%Y%m%d_%H%M%S)
    echo "✓ Backup created"
fi

cp /tmp/zammad-complete-docker-compose.yml docker-compose.yml
echo "✓ Updated docker-compose.yml with Redis and command"

# Verify changes
echo ""
echo "Verification:"
echo "  Redis service: $(grep -q 'redis:' docker-compose.yml && echo '✓' || echo '✗')"
echo "  Redis in depends_on: $(grep -A 5 'depends_on:' docker-compose.yml | grep -q 'redis:' && echo '✓' || echo '✗')"
echo "  REDIS_URL: $(grep -q 'REDIS_URL' docker-compose.yml && echo '✓' || echo '✗')"
echo "  Command: $(grep -q 'command:.*rails.*server' docker-compose.yml && echo '✓' || echo '✗')"
echo "  Redis volume: $(grep -q 'zammad-redis-data:' docker-compose.yml && echo '✓' || echo '✗')"

# Step 2: Ensure .env exists
echo ""
echo "=== Step 2: Checking .env file ==="
if [ ! -f .env ]; then
    if [ -f .secrets.env ]; then
        cp .secrets.env .env
        chmod 600 .env
        echo "✓ Created .env from .secrets.env"
    else
        echo "✗ ERROR: .secrets.env not found!"
        exit 1
    fi
else
    echo "✓ .env exists"
fi

if grep -q "POSTGRES_PASSWORD" .env; then
    echo "✓ .env contains POSTGRES_PASSWORD"
else
    echo "✗ ERROR: .env missing POSTGRES_PASSWORD"
    exit 1
fi

# Step 3: Stop existing containers
echo ""
echo "=== Step 3: Stopping existing containers ==="
docker compose down 2>&1 | tail -5
echo "✓ Containers stopped"

# Step 4: Start containers
echo ""
echo "=== Step 4: Starting containers ==="
docker compose up -d
echo "✓ Containers started"

# Step 5: Wait for initialization
echo ""
echo "=== Step 5: Waiting for containers to initialize ==="
echo "This may take 1-2 minutes..."
sleep 30

# Check status
echo ""
echo "Container status:"
docker compose ps

# Step 6: Monitor logs and wait for readiness
echo ""
echo "=== Step 6: Monitoring startup ==="
MAX_WAIT=180
WAITED=0
READY=0

while [ $WAITED -lt $MAX_WAIT ] && [ $READY -eq 0 ]; do
    # Check if zammad is running (not restarting)
    STATUS=$(docker compose ps --format json 2>/dev/null | python3 -c "import sys, json; containers = [json.loads(line) for line in sys.stdin if line.strip()]; zammad = [c for c in containers if 'zammad' in c.get('Name', '').lower() and 'app' in c.get('Name', '').lower()]; print(zammad[0].get('Status', '') if zammad else 'not-found')" 2>/dev/null || echo "checking")
    
    if echo "$STATUS" | grep -qi "up" && ! echo "$STATUS" | grep -qi "restarting"; then
        # Check if port 3000 is listening inside container
        if docker exec zammad-app ss -tlnp 2>/dev/null | grep -q ":3000 " || \
           docker exec zammad-app netstat -tlnp 2>/dev/null | grep -q ":3000 "; then
            echo "✓ Container is ready!"
            READY=1
            break
        fi
    fi
    
    # Check if HTTP responds
    if curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3030/ 2>/dev/null | grep -qE "(200|302|301)"; then
        echo "✓ HTTP is responding!"
        READY=1
        break
    fi
    
    sleep 5
    WAITED=$((WAITED + 5))
    if [ $((WAITED % 30)) -eq 0 ]; then
        echo "  Still waiting... ($WAITED/$MAX_WAIT seconds)"
        docker compose ps | grep zammad || true
    fi
done

# Step 7: Final verification
echo ""
echo "=== Step 7: Final Verification ==="

# Check container status
echo ""
echo "Container status:"
docker compose ps

# Check for restarting containers
if docker compose ps | grep -qi "restarting"; then
    echo ""
    echo "⚠ WARNING: Some containers are restarting!"
    docker compose ps | grep -i restarting
    echo ""
    echo "Recent logs:"
    docker logs --tail=50 zammad-app 2>&1 | tail -30
    exit 1
fi

# Check port 3030
echo ""
echo "Checking port 3030..."
if ss -tlnp 2>/dev/null | grep -q ":3030 "; then
    echo "✓ Port 3030 is listening"
    ss -tlnp | grep ":3030 "
else
    echo "✗ Port 3030 is not listening"
    exit 1
fi

# Test HTTP
echo ""
echo "Testing HTTP connection..."
HTTP_RESPONSE=$(curl -v http://127.0.0.1:3030/ 2>&1)
HTTP_STATUS=$(echo "$HTTP_RESPONSE" | grep -E "^< HTTP" | head -1 || echo "NO_RESPONSE")

if echo "$HTTP_STATUS" | grep -qE "HTTP.*(200|302|301)"; then
    echo "✓ HTTP connection successful"
    echo "$HTTP_STATUS"
else
    echo "✗ HTTP connection failed"
    echo "Response: $HTTP_RESPONSE" | head -20
    exit 1
fi

# Step 8: Check Nginx
echo ""
echo "=== Step 8: Verifying Nginx ==="
if grep -q "location /helpdesk/" /etc/nginx/sites-enabled/orthodoxmetrics.com; then
    echo "✓ /helpdesk/ location block exists"
    
    # Remove problematic snippet include if it exists
    if [ -f /etc/nginx/sites-available/orthodmetrics.com ] && grep -q "orthodoxmetrics-helpdesk" /etc/nginx/sites-available/orthodmetrics.com; then
        sed -i '/orthodoxmetrics-helpdesk/d' /etc/nginx/sites-available/orthodmetrics.com
        echo "✓ Removed problematic snippet include"
    fi
    
    # Test and reload Nginx
    if nginx -t && systemctl reload nginx; then
        echo "✓ Nginx reloaded"
        
        # Test public route
        echo ""
        echo "Testing public route..."
        PUBLIC_RESPONSE=$(curl -I https://orthodoxmetrics.com/helpdesk/ 2>&1 | head -5)
        if echo "$PUBLIC_RESPONSE" | grep -qE "(200|302|301)"; then
            echo "✓ Public route working"
            echo "$PUBLIC_RESPONSE" | head -3
        else
            echo "⚠ Public route response:"
            echo "$PUBLIC_RESPONSE" | head -3
        fi
    else
        echo "✗ Nginx reload failed"
    fi
else
    echo "⚠ /helpdesk/ location block not found in Nginx config"
fi

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  ✓ Zammad Setup Complete!"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "Access Zammad at: https://orthodoxmetrics.com/helpdesk/"
echo ""
echo "Container status:"
docker compose ps | grep -E "NAME|zammad|redis"
echo ""
echo "To view logs: docker compose logs -f zammad"
echo "To test locally: curl -I http://127.0.0.1:3030/"
