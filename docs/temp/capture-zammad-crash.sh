#!/bin/bash
# Capture detailed Zammad crash information
# Run with: sudo bash capture-zammad-crash.sh

cd /opt/zammad

echo "═══════════════════════════════════════════════════════════"
echo "  Zammad Crash Analysis"
echo "═══════════════════════════════════════════════════════════"

ZAMMAD_CONTAINER="zammad-app"

echo ""
echo "=== Container Status ==="
docker inspect --format 'Status: {{.State.Status}}
Started: {{.State.StartedAt}}
Finished: {{.State.FinishedAt}}
Exit Code: {{.State.ExitCode}}
Restart Count: {{.RestartCount}}
Health: {{json .State.Health}}' "$ZAMMAD_CONTAINER"

echo ""
echo "=== Recent Logs (last 300 lines) ==="
docker logs --tail=300 "$ZAMMAD_CONTAINER" 2>&1 | tee /tmp/zammad-full-logs.txt | tail -150

echo ""
echo "=== Error Patterns ==="
docker logs --tail=500 "$ZAMMAD_CONTAINER" 2>&1 | grep -iE "error|fatal|exception|failed|cannot|unable|password|auth|connection|exit|killed|signal" | tail -50

echo ""
echo "=== Startup Sequence ==="
docker logs "$ZAMMAD_CONTAINER" 2>&1 | grep -iE "starting|started|ready|listening|boot|rails|puma|webpack|migration|database" | tail -30

echo ""
echo "=== Environment Variables ==="
docker inspect --format '{{range .Config.Env}}{{println .}}{{end}}' "$ZAMMAD_CONTAINER" | grep -E "POSTGRES|DATABASE|ELASTICSEARCH|RAILS|ZAMMAD" | head -20

echo ""
echo "=== Port Configuration ==="
docker inspect --format 'Ports: {{json .NetworkSettings.Ports}}' "$ZAMMAD_CONTAINER" | python3 -m json.tool 2>/dev/null || docker port "$ZAMMAD_CONTAINER" 2>&1

echo ""
echo "=== Docker Compose Configuration ==="
grep -A 20 "zammad:" docker-compose.yml | head -25

echo ""
echo "=== Full logs saved to: /tmp/zammad-full-logs.txt ==="
