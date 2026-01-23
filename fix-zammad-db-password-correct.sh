#!/bin/bash
# Fix Zammad database password - runs psql inside Docker container
# Run as root: bash fix-zammad-db-password-correct.sh
set -e

cd /opt/zammad

# Create log directory
LOG_DIR="/var/backups/OM/zammad_fix/runs/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$LOG_DIR"
LOG_FILE="$LOG_DIR/fix.log"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

log "═══════════════════════════════════════════════════════════"
log "  Fixing Zammad Database Password"
log "═══════════════════════════════════════════════════════════"

# Step 1: Validate environment files
log ""
log "=== Step 1: Validating Environment ==="
if [ -f .env ]; then
    ENV_FILE=".env"
elif [ -f .secrets.env ]; then
    ENV_FILE=".secrets.env"
else
    log "✗ ERROR: Neither .env nor .secrets.env found"
    exit 1
fi

log "✓ Using environment file: $ENV_FILE"

# Get password (don't print it)
# Handle permission issues - try with sudo if needed
if [ -r "$ENV_FILE" ]; then
    POSTGRES_PASSWORD=$(grep "^POSTGRES_PASSWORD=" "$ENV_FILE" | cut -d= -f2- | tr -d '"' | tr -d "'")
elif command -v sudo > /dev/null 2>&1 && sudo test -r "$ENV_FILE"; then
    POSTGRES_PASSWORD=$(sudo grep "^POSTGRES_PASSWORD=" "$ENV_FILE" | cut -d= -f2- | tr -d '"' | tr -d "'")
else
    log "✗ ERROR: Cannot read $ENV_FILE (permission denied)"
    log "Remediation: Run this script as root or ensure $ENV_FILE is readable"
    exit 1
fi

if [ -z "$POSTGRES_PASSWORD" ]; then
    log "✗ ERROR: POSTGRES_PASSWORD not found in $ENV_FILE"
    exit 1
fi

log "✓ POSTGRES_PASSWORD found in $ENV_FILE"

# Get database configuration from docker-compose.yml
POSTGRES_USER=$(grep -A 10 "postgres:" docker-compose.yml | grep "POSTGRES_USER:" | awk '{print $2}' | tr -d '"' || echo "zammad")
POSTGRES_DB=$(grep -A 10 "postgres:" docker-compose.yml | grep "POSTGRES_DB:" | awk '{print $2}' | tr -d '"' || echo "zammad")

log "✓ Database configuration:"
log "  User: $POSTGRES_USER"
log "  Database: $POSTGRES_DB"

# Step 2: Get postgres container name
log ""
log "=== Step 2: Finding Postgres Container ==="
POSTGRES_CTN=$(docker compose ps -q postgres 2>/dev/null || echo "")

if [ -z "$POSTGRES_CTN" ]; then
    log "✗ ERROR: Postgres container not found"
    log "Remediation: Start containers with: docker compose up -d"
    exit 1
fi

log "✓ Postgres container found: $POSTGRES_CTN"

# Verify container is running
if ! docker ps --format '{{.ID}}' | grep -q "^${POSTGRES_CTN}$"; then
    log "✗ ERROR: Postgres container is not running"
    log "Remediation: Start containers with: docker compose up -d"
    exit 1
fi

log "✓ Postgres container is running"

# Step 3: Determine superuser
log ""
log "=== Step 3: Determining Database Role ==="
# Try to connect as the configured user first
if docker exec "$POSTGRES_CTN" psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT 1;" > /dev/null 2>&1; then
    log "✓ Can connect as $POSTGRES_USER (will use this role)"
    SUPERUSER="$POSTGRES_USER"
elif docker exec "$POSTGRES_CTN" psql -U postgres -d postgres -c "SELECT 1;" > /dev/null 2>&1; then
    log "✓ Can connect as postgres superuser (will use this role)"
    SUPERUSER="postgres"
else
    log "⚠ Cannot determine superuser, trying postgres..."
    SUPERUSER="postgres"
fi

log "Using role: $SUPERUSER"

# Step 4: Update password
log ""
log "=== Step 4: Updating Password ==="
log "Updating password for user: $POSTGRES_USER"

# Use PGPASSWORD to avoid password prompt, run inside container
UPDATE_OUTPUT=$(docker exec -e PGPASSWORD="$POSTGRES_PASSWORD" "$POSTGRES_CTN" \
    psql -U "$SUPERUSER" -d postgres -c "ALTER USER \"$POSTGRES_USER\" WITH PASSWORD '$POSTGRES_PASSWORD';" 2>&1)

if [ $? -eq 0 ]; then
    log "✓ Password updated successfully"
    echo "$UPDATE_OUTPUT" >> "$LOG_FILE"
else
    log "✗ ERROR: Failed to update password"
    log "Output: $UPDATE_OUTPUT"
    echo "$UPDATE_OUTPUT" >> "$LOG_FILE"
    exit 1
fi

# Step 5: Verify password works
log ""
log "=== Step 5: Verifying Password ==="
log "Testing connection with new password..."

# Test connection using PGPASSWORD
if docker exec -e PGPASSWORD="$POSTGRES_PASSWORD" "$POSTGRES_CTN" \
    psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT 1;" > /dev/null 2>&1; then
    log "✓ Password verification successful"
else
    log "⚠ Password verification failed, but update command succeeded"
    log "This may be normal if user doesn't have database access yet"
fi

# Step 6: Update docker-compose.yml
log ""
log "=== Step 6: Updating docker-compose.yml ==="
if ! grep -A 10 "postgres:" docker-compose.yml | grep -q "POSTGRES_PASSWORD:"; then
    # Backup
    cp docker-compose.yml docker-compose.yml.backup.$(date +%Y%m%d_%H%M%S)
    log "✓ Backup created"
    
    # Add POSTGRES_PASSWORD
    sed -i "/POSTGRES_USER: $POSTGRES_USER/a\      POSTGRES_PASSWORD: \${POSTGRES_PASSWORD}" docker-compose.yml
    log "✓ Added POSTGRES_PASSWORD to docker-compose.yml"
else
    log "✓ POSTGRES_PASSWORD already in docker-compose.yml"
fi

# Step 7: Restart Zammad
log ""
log "=== Step 7: Restarting Zammad ==="
log "Restarting zammad container to pick up password change..."
docker compose restart zammad
log "✓ Zammad restarted"

# Step 8: Wait and verify
log ""
log "=== Step 8: Waiting for Startup ==="
log "Waiting 45 seconds for Zammad to initialize..."
sleep 45

# Step 9: Final verification
log ""
log "=== Step 9: Final Verification ==="

# Check container status
log "Container status:"
docker compose ps | tee -a "$LOG_FILE"

# Check for database errors
log ""
log "Checking logs for database errors..."
RECENT_LOGS=$(docker compose logs --tail=100 zammad 2>&1 | tail -50)
echo "$RECENT_LOGS" >> "$LOG_FILE"

if echo "$RECENT_LOGS" | grep -q "issue connecting to your database"; then
    log "⚠ Database connection issue still present in logs"
    log "Waiting additional 30 seconds..."
    sleep 30
    docker compose logs --tail=50 zammad 2>&1 | tail -25 | tee -a "$LOG_FILE"
else
    log "✓ No database connection errors in recent logs"
fi

# Check if zammad is restarting
if docker compose ps | grep -qi "restarting"; then
    log "⚠ Zammad container is restarting"
    docker compose ps | grep zammad | tee -a "$LOG_FILE"
else
    log "✓ Zammad container is not restarting"
fi

# Test HTTP
log ""
log "Testing HTTP connection..."
sleep 10
HTTP_OUTPUT=$(curl -v http://127.0.0.1:3030/ 2>&1)
HTTP_STATUS=$(echo "$HTTP_OUTPUT" | grep -E "^< HTTP" | head -1 || echo "NO_RESPONSE")
echo "$HTTP_OUTPUT" >> "$LOG_FILE"

if echo "$HTTP_STATUS" | grep -qE "HTTP.*(200|302|301)"; then
    log "✓ HTTP SUCCESS: $HTTP_STATUS"
    echo "$HTTP_OUTPUT" | grep -E "^< HTTP|^< Server|^< Content" | head -5
else
    log "⚠ HTTP response: $HTTP_STATUS"
    # Check port
    if ss -tlnp 2>/dev/null | grep -q ":3030 "; then
        log "✓ Port 3030 is listening"
    else
        log "✗ Port 3030 is not listening"
    fi
fi

# Test public route
log ""
log "Testing public route..."
PUBLIC_RESPONSE=$(curl -I https://orthodoxmetrics.com/helpdesk/ 2>&1 | head -5)
if echo "$PUBLIC_RESPONSE" | grep -qE "(200|302|301)"; then
    log "✓ Public route working"
else
    log "⚠ Public route response:"
    echo "$PUBLIC_RESPONSE" | head -3
fi

log ""
log "═══════════════════════════════════════════════════════════"
log "  Complete"
log "═══════════════════════════════════════════════════════════"
log ""
log "Log file: $LOG_FILE"
log "Access: https://orthodoxmetrics.com/helpdesk/"
log "Local: http://127.0.0.1:3030/"
