#!/bin/bash
# Fix Zammad docker-compose.yml to add proper command
# Run with: sudo bash fix-zammad-command.sh
set -e

cd /opt/zammad

echo "═══════════════════════════════════════════════════════════"
echo "  Fixing Zammad Command"
echo "═══════════════════════════════════════════════════════════"

# Backup
cp docker-compose.yml docker-compose.yml.backup.$(date +%Y%m%d_%H%M%S)
echo "✓ Backup created"

# Check if command already exists
if grep -q "command:" docker-compose.yml; then
    echo "⚠ Command already exists in docker-compose.yml"
    grep -A 5 "command:" docker-compose.yml | grep -A 5 "zammad:"
else
    echo "Adding command to start Zammad..."
    
    # The Zammad image entrypoint likely expects a command
    # Common patterns: "rails server" or the image might have a default
    # Let's add a command that starts the Rails server
    
    # Find the zammad service section and add command after volumes
    python3 << 'PYEOF'
import re

with open('docker-compose.yml', 'r') as f:
    content = f.read()

# Check if command already exists
if 'command:' in content and 'zammad:' in content:
    print("Command already exists")
else:
    # Find the zammad service and add command after volumes
    # Pattern: find volumes section, then add command before healthcheck
    pattern = r'(zammad:.*?volumes:\s+- zammad-data:/opt/zammad\s+)(healthcheck:)'
    
    replacement = r'\1command: ["rails", "server", "-b", "0.0.0.0", "-p", "3000"]\n    \2'
    
    new_content = re.sub(pattern, replacement, content, flags=re.DOTALL)
    
    if new_content != content:
        with open('docker-compose.yml', 'w') as f:
            f.write(new_content)
        print("✓ Added command to start Rails server")
    else:
        # Try alternative pattern - add after environment
        pattern2 = r'(zammad:.*?environment:.*?ELASTICSEARCH_SSL_VERIFY: "false"\s+)(volumes:)'
        replacement2 = r'\1command: ["rails", "server", "-b", "0.0.0.0", "-p", "3000"]\n    \2'
        new_content = re.sub(pattern2, replacement2, content, flags=re.DOTALL)
        
        if new_content != content:
            with open('docker-compose.yml', 'w') as f:
                f.write(new_content)
            print("✓ Added command to start Rails server (alternative location)")
        else:
            print("✗ Could not find insertion point - manual edit needed")
            print("Add this under zammad service:")
            print('  command: ["rails", "server", "-b", "0.0.0.0", "-p", "3000"]')
PYEOF
fi

echo ""
echo "Updated docker-compose.yml:"
grep -A 10 "zammad:" docker-compose.yml | head -15

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
