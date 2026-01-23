#!/bin/bash
# Check Zammad state - run as ROOT
set -e

cd /opt/zammad

echo "=== Current Compose File (zammad service) ==="
grep -A 30 "^  zammad:" docker-compose.yml | head -35
echo ""

echo "=== REDIS_URL Check ==="
if grep -q "REDIS_URL" docker-compose.yml; then
    echo "✓ REDIS_URL found in docker-compose.yml:"
    grep "REDIS_URL" docker-compose.yml
else
    echo "✗ REDIS_URL NOT found in docker-compose.yml"
fi
echo ""

echo "=== Redis Service Check ==="
if grep -q "^  redis:" docker-compose.yml; then
    echo "✓ Redis service found"
    grep -A 10 "^  redis:" docker-compose.yml | head -12
else
    echo "✗ Redis service NOT found"
fi
echo ""

echo "=== Container Status ==="
docker compose ps
echo ""

echo "=== Port 3030 Check ==="
ss -tlnp | grep 3030 || echo "Port 3030 not listening"
echo ""

echo "=== HTTP Check ==="
curl -I http://127.0.0.1:3030/ 2>&1 | head -10 || echo "HTTP request failed"
echo ""
