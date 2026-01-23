#!/bin/bash
# Apply canonical Zammad compose file - run as ROOT
set -e

cd /opt/zammad

echo "═══════════════════════════════════════════════════════════"
echo "  Applying Canonical Zammad Compose"
echo "═══════════════════════════════════════════════════════════"
echo ""

# Step 1: Backup current
echo "=== Step 1: Backing Up Current Compose ==="
if [ -f docker-compose.yml ]; then
    BACKUP="docker-compose.yml.backup.$(date +%Y%m%d_%H%M%S)"
    cp docker-compose.yml "$BACKUP"
    echo "✓ Backed up to: $BACKUP"
else
    echo "⚠ No existing docker-compose.yml to backup"
fi
echo ""

# Step 2: Ensure .env exists
echo "=== Step 2: Checking .env File ==="
if [ -f .secrets.env ] && [ ! -f .env ]; then
    echo "Copying .secrets.env to .env..."
    cp .secrets.env .env
    chmod 600 .env
    echo "✓ Created .env from .secrets.env"
elif [ -f .env ]; then
    echo "✓ .env file exists"
else
    echo "✗ ERROR: Neither .env nor .secrets.env found"
    echo "Create .env with POSTGRES_PASSWORD=..."
    exit 1
fi
echo ""

# Step 3: Apply canonical compose
echo "=== Step 3: Applying Canonical Compose ==="
cp /tmp/zammad-docker-compose-canonical.yml docker-compose.yml
echo "✓ Applied canonical compose file"
echo ""

# Step 4: Validate compose
echo "=== Step 4: Validating Compose ==="
if ! docker compose -f docker-compose.yml config > /dev/null 2>&1; then
    echo "✗ ERROR: Compose file validation failed"
    docker compose -f docker-compose.yml config
    exit 1
fi
echo "✓ Compose file is valid"
echo ""

# Step 5: Stop existing
echo "=== Step 5: Stopping Existing Containers ==="
docker compose -f docker-compose.yml down
echo "✓ Containers stopped"
echo ""

# Step 6: Start fresh
echo "=== Step 6: Starting Containers ==="
docker compose -f docker-compose.yml up -d
echo "✓ Containers started"
echo ""

# Step 7: Wait
echo "=== Step 7: Waiting for Services ==="
echo "Waiting 60 seconds for services to initialize..."
sleep 60
echo ""

# Step 8: Status
echo "=== Step 8: Container Status ==="
docker compose -f docker-compose.yml ps
echo ""

echo "═══════════════════════════════════════════════════════════"
echo "  Complete"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "Next steps:"
echo "1. Run: python3 tools/om_ops/zammad_doctor.py --full --write-report"
echo "2. Check: curl -I http://127.0.0.1:3030/"
echo "3. Verify: ss -tlnp | grep 3030"
