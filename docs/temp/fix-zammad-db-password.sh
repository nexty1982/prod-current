#!/bin/bash
# Fix Zammad database password mismatch
# Run with: sudo bash fix-zammad-db-password.sh
set -e

cd /opt/zammad

echo "═══════════════════════════════════════════════════════════"
echo "  Fixing Database Password"
echo "═══════════════════════════════════════════════════════════"

# Get password from .env
if [ ! -f .env ]; then
    echo "✗ ERROR: .env file not found!"
    exit 1
fi

POSTGRES_PASSWORD=$(grep POSTGRES_PASSWORD .env | cut -d= -f2)
if [ -z "$POSTGRES_PASSWORD" ]; then
    echo "✗ ERROR: POSTGRES_PASSWORD not found in .env"
    exit 1
fi

echo "✓ Found POSTGRES_PASSWORD in .env"

# Check if postgres container is running
if ! docker ps | grep -q zammad-postgres; then
    echo "✗ ERROR: zammad-postgres container is not running"
    exit 1
fi

echo ""
echo "=== Updating Postgres Password ==="
echo "Resetting password for user 'zammad'..."

# Update password in postgres
docker exec zammad-postgres psql -U postgres -c "ALTER USER zammad WITH PASSWORD '$POSTGRES_PASSWORD';" 2>&1

if [ $? -eq 0 ]; then
    echo "✓ Password updated successfully"
else
    echo "✗ ERROR: Failed to update password"
    exit 1
fi

# Verify connection
echo ""
echo "=== Verifying Connection ==="
if docker exec zammad-postgres psql -U zammad -d zammad -c "SELECT 1;" > /dev/null 2>&1; then
    echo "✓ Database connection verified"
else
    echo "⚠ Connection test failed, but password was updated"
fi

# Also ensure POSTGRES_PASSWORD is explicitly set in postgres service
echo ""
echo "=== Updating docker-compose.yml ==="
if ! grep -q "POSTGRES_PASSWORD:" docker-compose.yml || ! grep -A 5 "postgres:" docker-compose.yml | grep -q "POSTGRES_PASSWORD"; then
    # Add POSTGRES_PASSWORD to postgres environment
    sed -i '/POSTGRES_USER: zammad/a\      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}' docker-compose.yml
    echo "✓ Added POSTGRES_PASSWORD to postgres environment"
else
    echo "✓ POSTGRES_PASSWORD already in postgres environment"
fi

# Restart zammad to pick up the password change
echo ""
echo "=== Restarting Zammad ==="
docker compose restart zammad
echo "✓ Zammad restarted"

echo ""
echo "Waiting for Zammad to start..."
sleep 20

echo ""
echo "=== Checking Status ==="
docker compose ps | grep zammad

echo ""
echo "Recent logs:"
docker compose logs --tail=30 zammad 2>&1 | tail -20

echo ""
echo "Testing HTTP..."
sleep 10
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3030/ 2>&1 || echo "000")
if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "302" ] || [ "$HTTP_CODE" = "301" ]; then
    echo "✓ HTTP responding: $HTTP_CODE"
else
    echo "⚠ HTTP status: $HTTP_CODE (may need more time)"
    echo "Check logs: docker compose logs -f zammad"
fi

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  Complete"
echo "═══════════════════════════════════════════════════════════"
