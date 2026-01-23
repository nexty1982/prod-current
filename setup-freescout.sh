#!/bin/bash
# Setup FreeScout - run as ROOT
set -e

echo "═══════════════════════════════════════════════════════════"
echo "  FreeScout Setup"
echo "═══════════════════════════════════════════════════════════"
echo ""

# Step 1: Create directory
echo "=== Step 1: Creating Directory ==="
mkdir -p /opt/freescout
cd /opt/freescout
echo "✓ Created /opt/freescout"
echo ""

# Step 2: Create .env file
echo "=== Step 2: Creating .env File ==="
if [ ! -f .env ]; then
    # Generate passwords
    MYSQL_ROOT_PASSWORD=$(openssl rand -base64 24 | tr -d "=+/" | cut -c1-32)
    MYSQL_PASSWORD=$(openssl rand -base64 24 | tr -d "=+/" | cut -c1-32)
    ADMIN_PASS=$(openssl rand -base64 24 | tr -d "=+/" | cut -c1-32)
    
    cat > .env << EOF
# MySQL Configuration
MYSQL_ROOT_PASSWORD=${MYSQL_ROOT_PASSWORD}
MYSQL_DATABASE=freescout
MYSQL_USER=freescout
MYSQL_PASSWORD=${MYSQL_PASSWORD}

# FreeScout Admin (initial setup)
ADMIN_PASS=${ADMIN_PASS}
EOF
    
    chmod 600 .env
    echo "✓ Created .env file with generated passwords"
    echo "  MySQL Database: freescout"
    echo "  MySQL User: freescout"
else
    echo "✓ .env file already exists"
fi
echo ""

# Step 3: Create docker-compose.yml
echo "=== Step 3: Creating docker-compose.yml ==="
if [ ! -f docker-compose.yml ]; then
    cp /tmp/freescout-docker-compose.yml docker-compose.yml
    echo "✓ Created docker-compose.yml"
else
    echo "✓ docker-compose.yml already exists"
fi
echo ""

# Step 4: Validate compose
echo "=== Step 4: Validating Compose ==="
if ! docker compose config > /dev/null 2>&1; then
    echo "✗ ERROR: Compose file validation failed"
    docker compose config
    exit 1
fi
echo "✓ Compose file is valid"
echo ""

# Step 5: Start services
echo "=== Step 5: Starting Services ==="
docker compose up -d
echo "✓ Services started"
echo ""

# Step 6: Wait for initialization
echo "=== Step 6: Waiting for Initialization ==="
echo "Waiting 60 seconds for MySQL and FreeScout to start..."
sleep 60
echo ""

# Step 7: Check status
echo "=== Step 7: Container Status ==="
docker compose ps
echo ""

# Step 8: Check port
echo "=== Step 8: Port Check ==="
if ss -tlnp 2>/dev/null | grep -q ":3080 "; then
    echo "✓ Port 3080 is listening"
    ss -tlnp | grep ":3080 "
else
    echo "✗ Port 3080 is NOT listening"
fi
echo ""

# Step 9: HTTP check
echo "=== Step 9: HTTP Check ==="
sleep 10
HTTP_OUTPUT=$(curl -sS -I http://127.0.0.1:3080/ 2>&1)
HTTP_STATUS=$(echo "$HTTP_OUTPUT" | grep -E "^HTTP" | head -1 || echo "NO_RESPONSE")
echo "$HTTP_OUTPUT" | head -10

if echo "$HTTP_STATUS" | grep -qE "HTTP.*(200|301|302)"; then
    echo "✓ HTTP SUCCESS: $HTTP_STATUS"
    echo ""
    echo "FreeScout should be accessible at:"
    echo "  Local: http://127.0.0.1:3080/"
    echo "  Public: https://orthodoxmetrics.com/helpdesk/ (after Nginx config)"
else
    echo "⚠ HTTP response: $HTTP_STATUS"
    echo ""
    echo "Checking logs:"
    docker compose logs --tail=30 freescout 2>&1 | tail -20
fi

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  Setup Complete"
echo "═══════════════════════════════════════════════════════════"
