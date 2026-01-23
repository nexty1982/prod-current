#!/bin/bash
# Add command to Zammad docker-compose.yml
# Run with: sudo bash add-zammad-command.sh
set -e

cd /opt/zammad

echo "Adding command to docker-compose.yml..."

# Backup
cp docker-compose.yml docker-compose.yml.backup.$(date +%Y%m%d_%H%M%S)
echo "✓ Backup created"

# Check if command already exists
if grep -q 'command:.*rails.*server' docker-compose.yml; then
    echo "✓ Command already exists"
    grep -A 2 "command:" docker-compose.yml | grep -A 2 "zammad:"
else
    # Add command after ELASTICSEARCH_SSL_VERIFY
    sed -i '/ELASTICSEARCH_SSL_VERIFY: "false"/a\    command: ["rails", "server", "-b", "0.0.0.0", "-p", "3000"]' docker-compose.yml
    echo "✓ Command added"
fi

echo ""
echo "Updated configuration:"
grep -A 5 "ELASTICSEARCH_SSL_VERIFY" docker-compose.yml

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  Next steps:"
echo "═══════════════════════════════════════════════════════════"
echo "1. Restart containers:"
echo "   cd /opt/zammad"
echo "   sudo docker compose down"
echo "   sudo docker compose up -d"
echo ""
echo "2. Watch logs:"
echo "   sudo docker logs -f zammad-app"
echo ""
echo "3. Test HTTP:"
echo "   curl -I http://127.0.0.1:3030/"
