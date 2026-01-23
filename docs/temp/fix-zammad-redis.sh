#!/bin/bash
# Quick fix: Add Redis to Zammad docker-compose.yml
# Run with: sudo bash fix-zammad-redis.sh
set -e

cd /opt/zammad

echo "Adding Redis service..."

# Backup
cp docker-compose.yml docker-compose.yml.backup.$(date +%Y%m%d_%H%M%S)

# Use the complete file with Redis
cp /tmp/zammad-docker-compose-with-redis.yml docker-compose.yml

echo "✓ Updated docker-compose.yml with Redis service"

echo ""
echo "Verifying changes:"
echo "- Redis service: $(grep -q 'redis:' docker-compose.yml && echo '✓' || echo '✗')"
echo "- Redis in depends_on: $(grep -A 5 'depends_on:' docker-compose.yml | grep -q 'redis:' && echo '✓' || echo '✗')"
echo "- REDIS_URL: $(grep -q 'REDIS_URL' docker-compose.yml && echo '✓' || echo '✗')"
echo "- Redis volume: $(grep -q 'zammad-redis-data:' docker-compose.yml && echo '✓' || echo '✗')"

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  Restart containers:"
echo "═══════════════════════════════════════════════════════════"
echo "  cd /opt/zammad"
echo "  sudo docker compose down"
echo "  sudo docker compose up -d"
echo "  sudo docker compose logs -f zammad"
