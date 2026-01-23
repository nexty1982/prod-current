#!/bin/bash
# Fix Zammad environment variable injection
# Run with: sudo bash fix-zammad-env.sh
set -e

cd /opt/zammad

echo "=== Step 1: Fix Environment Variable Injection ==="

# Option A: Create .env from .secrets.env if it doesn't exist
if [ ! -f .env ]; then
    if [ -f .secrets.env ]; then
        echo "Creating .env from .secrets.env..."
        sudo cp .secrets.env .env
        sudo chmod 600 .env
        echo "✓ Created .env with permissions 600"
    else
        echo "✗ ERROR: .secrets.env not found!"
        exit 1
    fi
else
    echo "✓ .env already exists"
fi

# Verify .env contains POSTGRES_PASSWORD
if grep -q "POSTGRES_PASSWORD" .env; then
    echo "✓ .env contains POSTGRES_PASSWORD"
else
    echo "✗ WARNING: .env does not contain POSTGRES_PASSWORD"
fi

# Verify docker-compose.yml doesn't use parse-time expansion
if grep -q '\${POSTGRES_PASSWORD}' docker-compose.yml; then
    echo "⚠ WARNING: docker-compose.yml still uses \${POSTGRES_PASSWORD} expansion"
    echo "This should have been fixed already, but checking..."
else
    echo "✓ docker-compose.yml does not use parse-time expansion"
fi

echo ""
echo "=== Step 2: Restart Containers ==="
sudo docker compose down
echo "✓ Containers stopped"

sudo docker compose up -d
echo "✓ Containers started"

echo ""
echo "Waiting for containers to initialize..."
sleep 15

echo ""
echo "=== Verification ==="
echo "Container status:"
sudo docker compose ps

echo ""
echo "Checking for POSTGRES_PASSWORD warning:"
if sudo docker compose config 2>&1 | grep -qi "POSTGRES_PASSWORD.*not set"; then
    echo "✗ WARNING: POSTGRES_PASSWORD warning still present!"
else
    echo "✓ No POSTGRES_PASSWORD warning"
fi

echo ""
echo "Testing local HTTP connection:"
sleep 5
curl -I http://127.0.0.1:3030/ 2>&1 | head -5 || echo "Still starting..."

echo ""
echo "=== Complete ==="
