#!/bin/bash
# Verify FreeScout status - run as ROOT
set -e

cd /opt/freescout

echo "═══════════════════════════════════════════════════════════"
echo "  FreeScout Verification"
echo "═══════════════════════════════════════════════════════════"
echo ""

echo "=== Container Status ==="
docker compose ps
echo ""

echo "=== Port 3080 ==="
if ss -tlnp 2>/dev/null | grep -q ":3080 "; then
    echo "✓ Port 3080 is listening"
    ss -tlnp | grep ":3080 "
else
    echo "✗ Port 3080 is NOT listening"
fi
echo ""

echo "=== HTTP Check ==="
HTTP_OUTPUT=$(curl -sS -I http://127.0.0.1:3080/ 2>&1)
HTTP_STATUS=$(echo "$HTTP_OUTPUT" | grep -E "^HTTP" | head -1 || echo "NO_RESPONSE")
echo "$HTTP_OUTPUT" | head -15

if echo "$HTTP_STATUS" | grep -qE "HTTP.*(200|301|302)"; then
    echo "✓ HTTP SUCCESS: $HTTP_STATUS"
    echo ""
    echo "FreeScout is ready! Access at:"
    echo "  Local: http://127.0.0.1:3080/"
    echo "  Public: https://orthodoxmetrics.com/helpdesk/ (after Nginx update)"
elif echo "$HTTP_OUTPUT" | grep -q "Connection refused"; then
    echo "⚠ HTTP: Connection refused (still starting)"
    echo ""
    echo "Recent logs:"
    docker compose logs --tail=30 freescout 2>&1 | tail -20
else
    echo "⚠ HTTP response: $HTTP_STATUS"
    echo ""
    echo "Recent logs:"
    docker compose logs --tail=30 freescout 2>&1 | tail -20
fi

echo ""
echo "═══════════════════════════════════════════════════════════"
