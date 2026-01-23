#!/usr/bin/env python3
"""
Apply Zammad fixes: docker-compose.yml and Nginx configuration
Run with: sudo python3 scripts/apply-zammad-fixes.py
"""

import shutil
import subprocess
import sys
from pathlib import Path
from datetime import datetime

def fix_docker_compose():
    """Fix docker-compose.yml to remove parse-time POSTGRES_PASSWORD expansion"""
    compose_path = Path('/opt/zammad/docker-compose.yml')
    backup_suffix = datetime.now().strftime('%Y%m%d_%H%M%S')
    backup_path = Path(f'/opt/zammad/docker-compose.yml.backup.{backup_suffix}')
    
    print("Step 1: Fixing docker-compose.yml...")
    
    # Read current file
    with open(compose_path, 'r') as f:
        content = f.read()
    
    # Create backup
    shutil.copy2(compose_path, backup_path)
    print(f"   Backup created: {backup_path.name}")
    
    # Remove version line
    lines = content.split('\n')
    if lines[0].startswith('version:'):
        lines.pop(0)
        if lines[0] == '':
            lines.pop(0)
        content = '\n'.join(lines)
        print("   ✓ Removed version line")
    
    # Replace DATABASE_URL with POSTGRES_* variables
    old_line = '      DATABASE_URL: postgres://zammad:${POSTGRES_PASSWORD}@postgres/zammad'
    new_lines = '''      POSTGRES_HOST: postgres
      POSTGRES_USER: zammad
      POSTGRES_DB: zammad'''
    
    if old_line in content:
        content = content.replace(old_line, new_lines)
        print("   ✓ Replaced DATABASE_URL with POSTGRES_* variables")
    else:
        print("   ⚠  DATABASE_URL line not found (may already be fixed)")
    
    # Write fixed file
    with open(compose_path, 'w') as f:
        f.write(content)
    
    # Verify
    if 'POSTGRES_HOST: postgres' in content and 'DATABASE_URL' not in content.split('\n')[50:55]:
        print("   ✓ docker-compose.yml fixed successfully")
        return True
    else:
        print("   ✗ ERROR: Fix verification failed")
        return False

def fix_nginx():
    """Add /helpdesk/ location block to Nginx config"""
    nginx_path = Path('/etc/nginx/sites-enabled/orthodoxmetrics.com')
    backup_suffix = datetime.now().strftime('%Y%m%d_%H%M%S')
    backup_path = Path(f'/etc/nginx/sites-enabled/orthodoxmetrics.com.backup.{backup_suffix}')
    
    print("\nStep 2: Fixing Nginx configuration...")
    
    # Read current file
    with open(nginx_path, 'r') as f:
        content = f.read()
    
    # Check if already exists
    if 'location /helpdesk/' in content:
        print("   ⚠  /helpdesk/ location already exists, skipping...")
        return True
    
    # Create backup
    shutil.copy2(nginx_path, backup_path)
    print(f"   Backup created: {backup_path.name}")
    
    # Create helpdesk block
    helpdesk_block = '''    # ---------- Zammad Helpdesk ----------
    location /helpdesk/ {
        proxy_pass         http://127.0.0.1:3030/;
        proxy_http_version 1.1;
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_set_header   X-Forwarded-Host $host;
        proxy_set_header   X-Forwarded-Port $server_port;
        proxy_buffering    off;
        proxy_redirect     off;
        proxy_connect_timeout 300s;
        proxy_send_timeout    300s;
        proxy_read_timeout    300s;
    }'''
    
    # Insert before Backend API section
    insert_marker = '# ---------- Backend API ----------'
    if insert_marker in content:
        content = content.replace(
            insert_marker,
            helpdesk_block + '\n\n    ' + insert_marker
        )
        print("   ✓ Added /helpdesk/ location block")
    else:
        print("   ✗ ERROR: Could not find Backend API marker")
        return False
    
    # Write fixed file
    with open(nginx_path, 'w') as f:
        f.write(content)
    
    print("   ✓ Nginx configuration updated")
    return True

def restart_containers():
    """Restart Zammad containers"""
    print("\nStep 3: Restarting containers...")
    
    try:
        subprocess.run(['docker', 'compose', '-f', '/opt/zammad/docker-compose.yml', 'down'], 
                      check=True, cwd='/opt/zammad')
        print("   ✓ Containers stopped")
        
        subprocess.run(['docker', 'compose', '-f', '/opt/zammad/docker-compose.yml', 'up', '-d'], 
                      check=True, cwd='/opt/zammad')
        print("   ✓ Containers started")
        
        return True
    except subprocess.CalledProcessError as e:
        print(f"   ✗ ERROR: {e}")
        return False

def test_nginx():
    """Test Nginx configuration"""
    print("\nStep 4: Testing Nginx configuration...")
    
    try:
        result = subprocess.run(['nginx', '-t'], capture_output=True, text=True, check=True)
        print("   ✓ Nginx configuration valid")
        return True
    except subprocess.CalledProcessError as e:
        print(f"   ✗ ERROR: Nginx test failed")
        print(f"   {e.stderr}")
        return False

def reload_nginx():
    """Reload Nginx"""
    print("\nStep 5: Reloading Nginx...")
    
    try:
        subprocess.run(['systemctl', 'reload', 'nginx'], check=True)
        print("   ✓ Nginx reloaded")
        return True
    except subprocess.CalledProcessError as e:
        print(f"   ✗ ERROR: {e}")
        return False

def main():
    if os.geteuid() != 0:
        print("ERROR: This script must be run as root (use sudo)")
        sys.exit(1)
    
    success = True
    
    # Fix docker-compose
    if not fix_docker_compose():
        success = False
    
    # Restart containers
    if success and not restart_containers():
        success = False
    
    # Fix Nginx
    if not fix_nginx():
        success = False
    
    # Test and reload Nginx
    if success:
        if not test_nginx():
            success = False
        elif not reload_nginx():
            success = False
    
    print("\n=== Verification ===")
    print("\nContainer status:")
    subprocess.run(['docker', 'compose', '-f', '/opt/zammad/docker-compose.yml', 'ps'], 
                  cwd='/opt/zammad')
    
    print("\nLocal port check:")
    subprocess.run(['curl', '-I', 'http://127.0.0.1:3030/'])
    
    print("\nPublic route check:")
    subprocess.run(['curl', '-I', 'https://orthodoxmetrics.com/helpdesk/'])
    
    if success:
        print("\n✓ All fixes applied successfully")
    else:
        print("\n✗ Some fixes failed - check output above")
        sys.exit(1)

if __name__ == '__main__':
    import os
    main()
