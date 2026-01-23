#!/bin/bash
# Verify Zammad status - run as ROOT
set -e

cd /opt/zammad

echo "═══════════════════════════════════════════════════════════"
echo "  Zammad Status Verification"
echo "═══════════════════════════════════════════════════════════"
echo ""

# Container status
echo "=== Container Status ==="
docker compose ps
echo ""

# Check if restarting
RESTARTING=$(docker compose ps --format json 2>/dev/null | grep -c '"State":"restarting"' || echo "0")
if [ "$RESTARTING" -gt 0 ]; then
    echo "⚠ WARNING: Zammad is restarting"
    echo ""
    echo "Recent logs:"
    docker compose logs --tail=100 zammad 2>&1 | tail -50
else
    echo "✓ Zammad is not restarting"
fi
echo ""

# Port check
echo "=== Port 3030 ==="
if ss -tlnp 2>/dev/null | grep -q ":3030 "; then
    echo "✓ Port 3030 is listening"
    ss -tlnp | grep ":3030 "
else
    echo "✗ Port 3030 is NOT listening"
fi
echo ""

# HTTP check (wait a bit first)
echo "=== HTTP Check ==="
echo "Waiting 10 seconds for application to be ready..."
sleep 10

HTTP_OUTPUT=$(curl -sS -I http://127.0.0.1:3030/ 2>&1)
HTTP_STATUS=$(echo "$HTTP_OUTPUT" | grep -E "^HTTP" | head -1 || echo "NO_RESPONSE")

if echo "$HTTP_STATUS" | grep -qE "HTTP.*(200|301|302)"; then
    echo "✓ HTTP SUCCESS: $HTTP_STATUS"
    echo "$HTTP_OUTPUT" | head -10
elif echo "$HTTP_OUTPUT" | grep -q "Connection refused"; then
    echo "✗ HTTP FAILED: Connection refused (application not ready or crashed)"
    echo ""
    echo "Checking logs for errors:"
    docker compose logs --tail=100 zammad 2>&1 | grep -E "error|fatal|exception|database|Bundler" | tail -20
elif echo "$HTTP_OUTPUT" | grep -q "Connection reset"; then
    echo "⚠ HTTP: Connection reset (application may still be starting)"
    echo ""
    echo "Waiting additional 30 seconds..."
    sleep 30
    HTTP_OUTPUT2=$(curl -sS -I http://127.0.0.1:3030/ 2>&1)
    HTTP_STATUS2=$(echo "$HTTP_OUTPUT2" | grep -E "^HTTP" | head -1 || echo "NO_RESPONSE")
    if echo "$HTTP_STATUS2" | grep -qE "HTTP.*(200|301|302)"; then
        echo "✓ HTTP SUCCESS after wait: $HTTP_STATUS2"
    else
        echo "✗ HTTP still failing: $HTTP_STATUS2"
        echo "Full output:"
        echo "$HTTP_OUTPUT2" | head -10
    fi
else
    echo "✗ HTTP FAILED: $HTTP_STATUS"
    echo "Full output:"
    echo "$HTTP_OUTPUT" | head -10
fi
echo ""

# Check logs for success indicators
echo "=== Log Analysis ==="
LOGS=$(docker compose logs --tail=200 zammad 2>&1)

if echo "$LOGS" | grep -q "Listening on"; then
    echo "✓ Rails server is listening"
    echo "$LOGS" | grep "Listening on" | tail -1
elif echo "$LOGS" | grep -q "Booting Puma"; then
    echo "⚠ Rails server is booting (may still be starting)"
elif echo "$LOGS" | grep -q "issue connecting to your database"; then
    echo "✗ Database connection error still present"
    echo "$LOGS" | grep "issue connecting" | tail -3
elif echo "$LOGS" | grep -q "Bundler::GemNotFound"; then
    echo "✗ Bundler gem error"
    echo "$LOGS" | grep "Bundler" | tail -3
else
    echo "Recent log entries:"
    echo "$LOGS" | tail -20
fi

echo ""
echo "═══════════════════════════════════════════════════════════"
