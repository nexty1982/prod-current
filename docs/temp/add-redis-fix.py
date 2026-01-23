#!/usr/bin/env python3
"""Add Redis service to Zammad docker-compose.yml"""
import shutil
import re
from datetime import datetime

compose_file = '/opt/zammad/docker-compose.yml'

# Read current file
with open(compose_file, 'r') as f:
    content = f.read()

# Backup
backup_name = f'{compose_file}.backup.{datetime.now().strftime("%Y%m%d_%H%M%S")}'
shutil.copy2(compose_file, backup_name)
print(f'✓ Backup created: {backup_name}')

# Check if Redis already exists
if 'redis:' in content and 'zammad-redis' in content:
    print('✓ Redis already configured')
else:
    # Add Redis service after postgres, before elasticsearch
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
    
    # Insert Redis before elasticsearch
    if '  elasticsearch:' in content:
        content = content.replace('  elasticsearch:', redis_service + '  elasticsearch:')
        print('✓ Redis service added')
    
    # Add Redis to depends_on
    if 'depends_on:' in content:
        # Find zammad service depends_on and add redis before postgres
        pattern = r'(zammad:.*?depends_on:\s+)(postgres:)'
        replacement = r'\1redis:\n        condition: service_healthy\n      \2'
        content = re.sub(pattern, replacement, content, flags=re.DOTALL)
        print('✓ Redis added to depends_on')
    
    # Add REDIS_URL to environment
    if 'ELASTICSEARCH_SSL_VERIFY: "false"' in content:
        content = content.replace(
            'ELASTICSEARCH_SSL_VERIFY: "false"',
            'ELASTICSEARCH_SSL_VERIFY: "false"\n      REDIS_URL: redis://redis:6379'
        )
        print('✓ REDIS_URL added to environment')
    
    # Add Redis volume
    if 'volumes:' in content and 'zammad-data:' in content:
        content = content.replace(
            '  zammad-data:',
            '  zammad-redis-data:\n  zammad-data:'
        )
        print('✓ Redis volume added')
    
    # Write updated file
    with open(compose_file, 'w') as f:
        f.write(content)
    print('✓ docker-compose.yml updated')

print('')
print('Verification:')
print(f'  Redis service: {"✓" if "redis:" in content else "✗"}')
print(f'  Redis in depends_on: {"✓" if "redis:" in content and "depends_on" in content else "✗"}')
print(f'  REDIS_URL: {"✓" if "REDIS_URL" in content else "✗"}')
print(f'  Redis volume: {"✓" if "zammad-redis-data:" in content else "✗"}')
