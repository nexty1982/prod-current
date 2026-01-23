#!/usr/bin/env python3
"""Create fixed nginx config with proper variable escaping"""
with open('/etc/nginx/sites-enabled/orthodoxmetrics.com', 'r') as f:
    content = f.read()

if 'location /helpdesk/' in content:
    print('⚠ /helpdesk/ already exists')
else:
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
    
    idx = content.find('# ---------- Backend API ----------')
    if idx >= 0:
        new_content = content[:idx] + helpdesk_block + '\n\n    ' + content[idx:]
        with open('/tmp/nginx-fixed.conf', 'w') as f:
            f.write(new_content)
        print('✓ nginx-fixed.conf created with proper variables')
    else:
        print('✗ Backend API marker not found')
