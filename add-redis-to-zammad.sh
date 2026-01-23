#!/bin/bash
# Add Redis service to Zammad docker-compose.yml
# Run with: sudo bash add-redis-to-zammad.sh
set -e

cd /opt/zammad

echo "═══════════════════════════════════════════════════════════"
echo "  Adding Redis Service to Zammad"
echo "═══════════════════════════════════════════════════════════"

# Backup
cp docker-compose.yml docker-compose.yml.backup.$(date +%Y%m%d_%H%M%S)
echo "✓ Backup created"

# Check if Redis already exists
if grep -q "zammad-redis:" docker-compose.yml; then
    echo "✓ Redis service already exists"
    grep -A 10 "zammad-redis:" docker-compose.yml | head -12
else
    echo "Adding Redis service..."
    
    # Add Redis service before zammad service
    python3 << 'PYEOF'
with open('docker-compose.yml', 'r') as f:
    content = f.read()

# Find where to insert Redis (before zammad service)
if '  zammad:' in content and '  redis:' not in content:
    # Insert Redis service before zammad
    redis_service = '''  redis:
    image: redis:7-alpine
    container_name: zammad-redis
    restart: unless-stopped
    volumes:
      - zammad-redis-data:/data
    healthcheck:
      test: ["CMD-SHELL", "redis-cli ping | grep PONG"]
      interval: 10s
      timeout: 5s
      retries: 5

'''
    
    # Replace "  zammad:" with redis service + zammad
    new_content = content.replace('  zammad:', redis_service + '  zammad:')
    
    # Add Redis to zammad depends_on
    if 'depends_on:' in content and 'zammad:' in content:
        # Find depends_on section and add redis
        import re
        pattern = r'(zammad:.*?depends_on:\s+)(postgres:)'
        replacement = r'\1redis:\n        condition: service_healthy\n      \2'
        new_content = re.sub(pattern, replacement, new_content, flags=re.DOTALL)
    
    # Add REDIS_URL to zammad environment
    if 'ELASTICSEARCH_SSL_VERIFY' in new_content:
        new_content = new_content.replace(
            'ELASTICSEARCH_SSL_VERIFY: "false"',
            'ELASTICSEARCH_SSL_VERIFY: "false"\n      REDIS_URL: redis://redis:6379'
        )
    
    # Add redis volume to volumes section
    if 'volumes:' in new_content and 'zammad-data:' in new_content:
        new_content = new_content.replace(
            '  zammad-data:',
            '  zammad-redis-data:\n  zammad-data:'
        )
    
    with open('docker-compose.yml', 'w') as f:
        f.write(new_content)
    
    print('✓ Redis service added')
    print('✓ Redis added to zammad depends_on')
    print('✓ REDIS_URL added to zammad environment')
    print('✓ Redis volume added')
else:
    print('⚠ Redis already exists or zammad service not found')
PYEOF
fi

echo ""
echo "Updated docker-compose.yml:"
echo ""
echo "Redis service:"
grep -A 10 "redis:" docker-compose.yml | head -12
echo ""
echo "Zammad depends_on:"
grep -A 8 "depends_on:" docker-compose.yml | grep -A 8 "zammad:" | head -10
echo ""
echo "Zammad REDIS_URL:"
grep "REDIS_URL" docker-compose.yml || echo "Not found (may need manual addition)"
echo ""
echo "Volumes:"
grep -A 5 "^volumes:" docker-compose.yml

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  Next: Restart containers"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "Run:"
echo "  cd /opt/zammad"
echo "  sudo docker compose down"
echo "  sudo docker compose up -d"
echo "  sudo docker compose logs -f zammad"
