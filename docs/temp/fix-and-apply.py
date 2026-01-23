#!/usr/bin/env python3
"""Fix Nginx config and apply all Zammad fixes"""
import subprocess
import sys
from datetime import datetime

def fix_nginx():
    """Add /helpdesk/ location block to Nginx config"""
    nginx_path = '/etc/nginx/sites-enabled/orthodoxmetrics.com'
    
    with open(nginx_path, 'r') as f:
        lines = f.readlines()
    
    if 'location /helpdesk/' in ''.join(lines):
        print('⚠ /helpdesk/ already exists')
        return True
    
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
    
    # Find Backend API marker (line 100)
    for i, line in enumerate(lines):
        if '# ---------- Backend API ----------' in line:
            lines.insert(i, helpdesk_block + '\n\n')
            break
    
    with open('/tmp/nginx-fixed.conf', 'w') as f:
        f.writelines(lines)
    
    print('✓ Fixed Nginx config created')
    return True

def apply_fixes():
    """Apply docker-compose and nginx fixes"""
    backup_suffix = datetime.now().strftime('%Y%m%d_%H%M%S')
    
    # Fix docker-compose
    print('\n=== Applying docker-compose.yml fix ===')
    subprocess.run(['sudo', 'cp', '/opt/zammad/docker-compose.yml', 
                   f'/opt/zammad/docker-compose.yml.backup.{backup_suffix}'], check=True)
    subprocess.run(['sudo', 'cp', '/tmp/docker-compose-fixed.yml', 
                   '/opt/zammad/docker-compose.yml'], check=True)
    print('✓ docker-compose.yml updated')
    
    # Restart containers
    print('\n=== Restarting containers ===')
    subprocess.run(['sudo', 'docker', 'compose', '-f', '/opt/zammad/docker-compose.yml', 'down'], 
                  check=True, cwd='/opt/zammad')
    subprocess.run(['sudo', 'docker', 'compose', '-f', '/opt/zammad/docker-compose.yml', 'up', '-d'], 
                  check=True, cwd='/opt/zammad')
    print('✓ Containers restarted')
    
    import time
    time.sleep(15)
    
    # Check status
    subprocess.run(['sudo', 'docker', 'compose', '-f', '/opt/zammad/docker-compose.yml', 'ps'], 
                  cwd='/opt/zammad')
    
    # Fix Nginx
    print('\n=== Applying Nginx fix ===')
    fix_nginx()
    subprocess.run(['sudo', 'cp', '/etc/nginx/sites-enabled/orthodoxmetrics.com', 
                   f'/etc/nginx/sites-enabled/orthodoxmetrics.com.backup.{backup_suffix}'], check=True)
    subprocess.run(['sudo', 'cp', '/tmp/nginx-fixed.conf', 
                   '/etc/nginx/sites-enabled/orthodoxmetrics.com'], check=True)
    print('✓ Nginx config updated')
    
    # Test and reload
    subprocess.run(['sudo', 'nginx', '-t'], check=True)
    subprocess.run(['sudo', 'systemctl', 'reload', 'nginx'], check=True)
    print('✓ Nginx reloaded')
    
    # Verification
    print('\n=== Verification ===')
    subprocess.run(['curl', '-I', 'http://127.0.0.1:3030/'])
    subprocess.run(['curl', '-I', 'https://orthodoxmetrics.com/helpdesk/'])

if __name__ == '__main__':
    import os
    if os.geteuid() != 0:
        print('ERROR: Must run as root (use sudo)')
        sys.exit(1)
    apply_fixes()
