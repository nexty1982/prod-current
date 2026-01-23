#!/bin/bash
# Restart Zammad with command fix applied
# Run with: sudo bash restart-zammad-with-command.sh
set -e

cd /opt/zammad

echo "═══════════════════════════════════════════════════════════"
echo "  Restarting Zammad with Command Fix"
echo "═══════════════════════════════════════════════════════════"

# Verify command is in docker-compose.yml
if ! grep -q 'command:.*rails.*server' docker-compose.yml; then
    echo "✗ ERROR: Command not found in docker-compose.yml"
    echo "Adding command..."
    sed -i '/ELASTICSEARCH_SSL_VERIFY: "false"/a\    command: ["rails", "server", "-b", "0.0.0.0", "-p", "3000"]' docker-compose.yml
    echo "✓ Command added"
fi

echo ""
echo "Current zammad service configuration:"
grep -A 8 "ELASTICSEARCH_SSL_VERIFY" docker-compose.yml | head -10

echo ""
echo "=== Restarting Containers ==="
docker compose down
echo "✓ Stopped"

docker compose up -d
echo "✓ Started"

echo ""
echo "Waiting for container to start..."
sleep 10

echo ""
echo "=== Checking Status ==="
docker compose ps

echo ""
echo "=== Watching Logs (Ctrl+C to stop) ==="
echo "Container logs:"
docker logs --tail=50 zammad-app

echo ""
echo "=== Monitoring (will show logs for 30 seconds) ==="
timeout 30 docker logs -f zammad-app 2>&1 || true

echo ""
echo "=== Final Status ==="
docker compose ps | grep zammad

echo ""
echo "Testing HTTP..."
sleep 5
curl -I http://127.0.0.1:3030/ 2>&1 | head -5 || echo "Still starting..."

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  Complete"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "To watch logs: sudo docker logs -f zammad-app"
echo "To test HTTP: curl -I http://127.0.0.1:3030/"
