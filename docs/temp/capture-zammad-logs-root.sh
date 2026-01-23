#!/bin/bash
# Capture Zammad logs - run as ROOT
set -e

cd /opt/zammad

echo "=== Zammad App Logs (last 400 lines) ==="
docker logs --tail=400 zammad-app 2>&1 | tail -200
echo ""
echo "=== Compose Logs (zammad service) ==="
docker compose logs --tail=400 zammad 2>&1 | tail -200
echo ""
echo "=== Container Status ==="
docker compose ps
echo ""
echo "=== Services ==="
docker compose config --services
echo ""
