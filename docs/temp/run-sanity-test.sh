#!/bin/bash
# Run Docker Compose Sanity Test
# This script must be run as root (or user with Docker access)
set -e

SANITY_DIR="/opt/compose_sanity"
mkdir -p "$SANITY_DIR"
cd "$SANITY_DIR"

echo "═══════════════════════════════════════════════════════════"
echo "  Docker Compose Sanity Test"
echo "═══════════════════════════════════════════════════════════"
echo ""

# Step 0: Document current setup
echo "=== Step 0: Current Setup ==="
echo "Docker version:"
docker --version
echo ""
echo "Docker Compose version:"
docker compose version
echo ""
echo "Docker daemon status:"
systemctl is-active docker || echo "WARNING: Docker daemon not active"
echo ""
echo "Port conflicts check:"
ss -lntp 2>/dev/null | grep -E ':18080|:18081' || echo "✓ No conflicts on test ports"
echo ""
echo "Zammad containers status:"
cd /opt/zammad 2>/dev/null && docker compose ps 2>&1 | head -10 || echo "Zammad directory not accessible or no containers"
echo ""

# Step 1: Create compose file
echo "=== Step 1: Creating Compose File ==="
cd "$SANITY_DIR"
cat > docker-compose.yml << 'EOF'
services:
  whoami:
    image: traefik/whoami:latest
    container_name: compose-sanity-whoami
    restart: unless-stopped
    ports:
      - "127.0.0.1:18080:80"

  nginx:
    image: nginx:alpine
    container_name: compose-sanity-nginx
    restart: unless-stopped
    ports:
      - "127.0.0.1:18081:80"
EOF
echo "✓ Created docker-compose.yml"
echo ""

# Step 2: Bring up stack
echo "=== Step 2: Starting Services ==="
docker compose up -d
echo "✓ Started services"
echo ""

# Step 3: Wait and verify containers
echo "=== Step 3: Verifying Containers ==="
echo "Waiting 5 seconds for containers to start..."
sleep 5
echo ""
echo "Container status:"
docker compose ps
echo ""

# Step 4: Verify HTTP
echo "=== Step 4: Verifying HTTP ==="
echo ""
echo "Testing whoami (port 18080):"
WHOAMI_RESPONSE=$(curl -sS -D- http://127.0.0.1:18080/ 2>&1 | head -n 25)
echo "$WHOAMI_RESPONSE"
echo ""

echo "Testing nginx (port 18081):"
NGINX_RESPONSE=$(curl -I http://127.0.0.1:18081/ 2>&1 | head -15)
echo "$NGINX_RESPONSE"
echo ""

# Step 5: Port check
echo "=== Step 5: Port Status ==="
ss -tlnp 2>/dev/null | grep -E ':18080|:18081' || echo "Ports not found in ss output"
echo ""

# Step 6: Diagnostics (if needed)
echo "=== Step 6: Diagnostics ==="
echo "Recent logs:"
docker compose logs --tail=30 2>&1 | tail -20
echo ""
echo "Docker info (relevant):"
docker info 2>&1 | grep -E 'Server Version|Storage Driver|Logging Driver|Operating System' | head -5
echo ""

# Step 7: Conclusion
echo "=== Step 7: Conclusion ==="
if echo "$WHOAMI_RESPONSE" | grep -qE "HTTP.*200|Hostname" && echo "$NGINX_RESPONSE" | grep -qE "HTTP.*200"; then
    echo "✅ Docker/Compose OK - Both endpoints responding correctly"
    RESULT="SUCCESS"
else
    echo "❌ Host-level issue detected"
    echo "Checking logs for errors..."
    docker compose logs --tail=100 2>&1 | grep -iE "error|fatal|failed" | tail -10 || echo "No obvious errors in logs"
    RESULT="FAILURE"
fi
echo ""

# Step 8: Cleanup option
echo "=== Step 8: Cleanup ==="
echo "To stop and remove containers:"
echo "  cd $SANITY_DIR && docker compose down"
echo ""
echo "To keep running for further testing, leave containers up."
echo ""
echo "═══════════════════════════════════════════════════════════"
echo "Test complete. Result: $RESULT"
echo "═══════════════════════════════════════════════════════════"
