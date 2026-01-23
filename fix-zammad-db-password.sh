#!/bin/bash
# Fix Zammad database password - run as ROOT
# Syncs Postgres zammad role password to match .env without wiping volumes
set -e

cd /opt/zammad

echo "═══════════════════════════════════════════════════════════"
echo "  Fix Zammad Database Password"
echo "═══════════════════════════════════════════════════════════"
echo ""

# Step 0: Document current setup
echo "=== Step 0: Current Setup ==="

# Check logs for database error
echo "Checking logs for database errors..."
DB_ERROR=$(docker logs --tail=120 zammad-app 2>&1 | grep -i "issue connecting to your database\|username/password\|username: zammad" | head -3 || echo "")
if [ -n "$DB_ERROR" ]; then
    echo "✓ Found database connection error in logs"
    echo "$DB_ERROR" | head -3 | sed 's/password[^,]*/password=***/gi'
else
    echo "⚠ No database connection errors found in recent logs"
fi
echo ""

# Check container status
echo "Container status:"
docker compose ps 2>&1 | head -8
echo ""

# Check which env file Zammad actually uses (from compose file)
echo "Checking which env file Zammad uses..."
# Zammad service uses .secrets.env per compose file
if [ -f .secrets.env ]; then
    ENV_FILE=".secrets.env"
    echo "✓ Found .secrets.env (used by Zammad)"
elif [ -f .env ]; then
    ENV_FILE=".env"
    echo "✓ Found .env (fallback)"
else
    echo "✗ ERROR: Neither .env nor .secrets.env found"
    exit 1
fi

echo "✓ Using: $ENV_FILE"

# Get password (don't print it)
POSTGRES_PASSWORD=$(grep "^POSTGRES_PASSWORD=" "$ENV_FILE" | cut -d= -f2- | tr -d '"' | tr -d "'" | head -1)
if [ -z "$POSTGRES_PASSWORD" ]; then
    echo "✗ ERROR: POSTGRES_PASSWORD not found in $ENV_FILE"
    exit 1
fi

PASSWORD_LEN=${#POSTGRES_PASSWORD}
echo "✓ POSTGRES_PASSWORD found (length: $PASSWORD_LEN characters)"

# Get user and DB (with defaults)
POSTGRES_USER=$(grep "^POSTGRES_USER=" "$ENV_FILE" | cut -d= -f2- | tr -d '"' | tr -d "'" | head -1)
if [ -z "$POSTGRES_USER" ]; then
    POSTGRES_USER="zammad"
fi

POSTGRES_DB=$(grep "^POSTGRES_DB=" "$ENV_FILE" | cut -d= -f2- | tr -d '"' | tr -d "'" | head -1)
if [ -z "$POSTGRES_DB" ]; then
    POSTGRES_DB="zammad"
fi

echo "✓ POSTGRES_USER: $POSTGRES_USER"
echo "✓ POSTGRES_DB: $POSTGRES_DB"
echo ""

# Check if postgres superuser exists
# In postgres:15 image, postgres superuser uses POSTGRES_PASSWORD
echo "Checking for postgres superuser..."
if docker exec -e PGPASSWORD="$POSTGRES_PASSWORD" zammad-postgres psql -U postgres -d postgres -c "select 1;" > /dev/null 2>&1; then
    SUPERUSER="postgres"
    SUPERUSER_DB="postgres"
    echo "✓ postgres superuser available (using POSTGRES_PASSWORD)"
elif docker exec zammad-postgres psql -U postgres -c "select 1;" > /dev/null 2>&1; then
    SUPERUSER="postgres"
    SUPERUSER_DB="postgres"
    echo "✓ postgres superuser available (no password required)"
else
    # Try POSTGRES_USER - in postgres:15, POSTGRES_USER is created as superuser
    if docker exec -e PGPASSWORD="$POSTGRES_PASSWORD" zammad-postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "select 1;" > /dev/null 2>&1; then
        SUPERUSER="$POSTGRES_USER"
        SUPERUSER_DB="$POSTGRES_DB"
        echo "✓ Using $POSTGRES_USER as superuser (created by postgres:15 image)"
    else
        echo "⚠ Cannot connect as postgres or $POSTGRES_USER"
        echo "Attempting to use postgres with POSTGRES_PASSWORD anyway..."
        SUPERUSER="postgres"
        SUPERUSER_DB="postgres"
    fi
fi
echo ""

# Step 1: Update password
echo "=== Step 1: Updating Database Password ==="

# Check if role exists
echo "Checking if role '$POSTGRES_USER' exists..."
ROLE_EXISTS=$(docker exec zammad-postgres psql -U "$SUPERUSER" -d "$SUPERUSER_DB" -tAc "SELECT 1 FROM pg_roles WHERE rolname='$POSTGRES_USER';" 2>&1 || echo "0")

if [ "$ROLE_EXISTS" = "1" ]; then
    echo "✓ Role '$POSTGRES_USER' exists"
    echo "Updating password..."
    
    # Update password using docker exec
    UPDATE_OUTPUT=$(docker exec -e PGPASSWORD="$POSTGRES_PASSWORD" zammad-postgres \
        psql -U "$SUPERUSER" -d "$SUPERUSER_DB" \
        -c "ALTER USER \"$POSTGRES_USER\" WITH PASSWORD '$POSTGRES_PASSWORD';" 2>&1)
    
    if [ $? -eq 0 ]; then
        echo "✓ Password updated successfully"
    else
        echo "✗ ERROR: Failed to update password"
        echo "$UPDATE_OUTPUT" | grep -v "password" | head -5
        exit 1
    fi
else
    echo "⚠ Role '$POSTGRES_USER' does not exist, creating it..."
    
    # Create role
    CREATE_OUTPUT=$(docker exec -e PGPASSWORD="$POSTGRES_PASSWORD" zammad-postgres \
        psql -U "$SUPERUSER" -d "$SUPERUSER_DB" \
        -c "CREATE USER \"$POSTGRES_USER\" WITH PASSWORD '$POSTGRES_PASSWORD' CREATEDB;" 2>&1)
    
    if [ $? -eq 0 ]; then
        echo "✓ Role '$POSTGRES_USER' created"
        
        # Grant privileges on database
        GRANT_OUTPUT=$(docker exec zammad-postgres \
            psql -U "$SUPERUSER" -d "$SUPERUSER_DB" \
            -c "GRANT ALL PRIVILEGES ON DATABASE \"$POSTGRES_DB\" TO \"$POSTGRES_USER\";" 2>&1)
        
        echo "✓ Privileges granted"
    else
        echo "✗ ERROR: Failed to create role"
        echo "$CREATE_OUTPUT" | grep -v "password" | head -5
        exit 1
    fi
fi
echo ""

# Verify password works
echo "Verifying password..."
if docker exec -e PGPASSWORD="$POSTGRES_PASSWORD" zammad-postgres \
    psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "select 1;" > /dev/null 2>&1; then
    echo "✓ Password verification successful"
else
    echo "⚠ Password verification failed, but update succeeded"
fi
echo ""

# Step 2: Restart Zammad (full restart to pick up env changes)
echo "=== Step 2: Restarting Zammad ==="
echo "Stopping Zammad..."
docker compose stop zammad
sleep 5
echo "Starting Zammad..."
docker compose up -d zammad
echo "✓ Zammad restarted"
echo ""

# Wait for startup
echo "Waiting 60 seconds for Zammad to initialize..."
sleep 60
echo ""

# Step 3: Verify
echo "=== Step 3: Verification ==="

# Container status
echo "Container status:"
docker compose ps 2>&1 | head -8
echo ""

# Check for restarting
RESTARTING=$(docker compose ps --format json 2>/dev/null | grep -c '"State":"restarting"' || echo "0")
if [ "$RESTARTING" -gt 0 ]; then
    echo "⚠ WARNING: Zammad is restarting"
    docker compose logs --tail=50 zammad 2>&1 | tail -20
else
    echo "✓ Zammad is not restarting"
fi
echo ""

# Port check
echo "Port 3030 check:"
if ss -tlnp 2>/dev/null | grep -q ":3030 "; then
    echo "✓ Port 3030 is listening"
    ss -tlnp | grep ":3030 "
else
    echo "✗ Port 3030 is NOT listening"
fi
echo ""

# HTTP check
echo "HTTP check:"
sleep 10
HTTP_OUTPUT=$(curl -sS -I http://127.0.0.1:3030/ 2>&1)
HTTP_STATUS=$(echo "$HTTP_OUTPUT" | grep -E "^HTTP" | head -1 || echo "NO_RESPONSE")
echo "$HTTP_OUTPUT" | head -10

if echo "$HTTP_STATUS" | grep -qE "HTTP.*(200|301|302)"; then
    echo "✓ HTTP SUCCESS: $HTTP_STATUS"
    HTTP_OK=true
else
    echo "✗ HTTP FAILED: $HTTP_STATUS"
    HTTP_OK=false
fi
echo ""

# Step 4: Password rotation (security)
echo "=== Step 4: Password Rotation (Security) ==="
echo "Generating new password..."

# Generate new password (32 chars, alphanumeric + special)
NEW_PASSWORD=$(openssl rand -base64 24 | tr -d "=+/" | cut -c1-32)

# Update the env file that Zammad uses
echo "Updating $ENV_FILE..."
sed -i "s/^POSTGRES_PASSWORD=.*/POSTGRES_PASSWORD=$NEW_PASSWORD/" "$ENV_FILE"
echo "✓ Updated $ENV_FILE with new password"

# Sync to other env file if it exists
if [ -f .env ] && [ "$ENV_FILE" != ".env" ]; then
    sed -i "s/^POSTGRES_PASSWORD=.*/POSTGRES_PASSWORD=$NEW_PASSWORD/" .env
    echo "✓ Synced .env with new password"
fi
if [ -f .secrets.env ] && [ "$ENV_FILE" != ".secrets.env" ]; then
    sed -i "s/^POSTGRES_PASSWORD=.*/POSTGRES_PASSWORD=$NEW_PASSWORD/" .secrets.env
    echo "✓ Synced .secrets.env with new password"
fi

# Update database
echo "Updating database password..."
ROTATE_OUTPUT=$(docker exec -e PGPASSWORD="$POSTGRES_PASSWORD" zammad-postgres \
    psql -U "$SUPERUSER" -d "$SUPERUSER_DB" \
    -c "ALTER USER \"$POSTGRES_USER\" WITH PASSWORD '$NEW_PASSWORD';" 2>&1)

if [ $? -eq 0 ]; then
    echo "✓ Database password rotated"
    
    # Restart to pick up new password
    echo "Restarting Zammad to use new password..."
    docker compose restart zammad
    sleep 30
    
    # Verify still working
    if docker compose ps | grep -q "zammad.*Up"; then
        echo "✓ Zammad still running after password rotation"
    else
        echo "⚠ Zammad may have issues with new password, check logs"
    fi
else
    echo "✗ ERROR: Failed to rotate password"
    echo "$ROTATE_OUTPUT" | grep -v "password" | head -5
fi
echo ""

echo "═══════════════════════════════════════════════════════════"
echo "  Complete"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "Summary:"
echo "  - Database password synced to .env"
echo "  - Password rotated for security"
echo "  - Zammad status: $(docker compose ps --format '{{.Service}} {{.State}}' | grep zammad || echo 'unknown')"
echo "  - Port 3030: $(ss -tlnp 2>/dev/null | grep -q ':3030 ' && echo 'listening' || echo 'not listening')"
echo "  - HTTP: $HTTP_STATUS"
