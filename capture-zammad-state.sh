#!/bin/bash
# Capture Zammad state for diagnosis - run as root
set -e

cd /opt/zammad

echo "═══════════════════════════════════════════════════════════"
echo "  Zammad State Capture"
echo "═══════════════════════════════════════════════════════════"
echo ""

echo "=== Docker Compose Status ==="
docker compose ps
echo ""

echo "=== Services ==="
docker compose config --services
echo ""

echo "=== Zammad App Logs (last 400 lines) ==="
docker logs --tail=400 zammad-app 2>&1 | tail -200
echo ""

echo "=== Compose Logs (zammad service, last 400 lines) ==="
docker compose logs --tail=400 zammad 2>&1 | tail -200
echo ""

echo "=== Port Status ==="
ss -tlnp 2>/dev/null | grep 3030 || echo "Port 3030 not listening"
echo ""

echo "=== HTTP Test ==="
curl -v http://127.0.0.1:3030/ 2>&1 | head -30 || echo "HTTP connection failed"
echo ""

echo "=== Docker Compose Config (zammad service) ==="
docker compose config zammad 2>&1 | grep -A 30 "zammad:" | head -40
echo ""

echo "=== Environment Check ==="
if [ -f .env ]; then
    echo ".env exists (permissions: $(ls -l .env | awk '{print $1}'))"
    grep -E "^POSTGRES|^REDIS" .env 2>/dev/null | sed 's/=.*/=***/' || echo "Cannot read .env"
elif [ -f .secrets.env ]; then
    echo ".secrets.env exists (permissions: $(ls -l .secrets.env | awk '{print $1}'))"
    grep -E "^POSTGRES|^REDIS" .secrets.env 2>/dev/null | sed 's/=.*/=***/' || echo "Cannot read .secrets.env"
else
    echo "No .env or .secrets.env found"
fi
echo ""

echo "═══════════════════════════════════════════════════════════"
