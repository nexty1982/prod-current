import re
# Fix docker-compose
with open('/opt/zammad/docker-compose.yml') as f:
    content = f.read()
content = content.replace(" version: 3.8 \\n\\n\, '')
content = content.replace(' DATABASE_URL: postgres://zammad:\@postgres/zammad', ''' POSTGRES_HOST: postgres
 POSTGRES_USER: zammad
 POSTGRES_DB: zammad''')
with open('/tmp/docker-compose-fixed.yml', 'w') as f:
 f.write(content)
print('docker-compose fixed')
# Fix nginx
with open('/etc/nginx/sites-enabled/orthodoxmetrics.com') as f:
 nginx = f.read()
if 'location /helpdesk/' not in nginx:
 block = ''' # ---------- Zammad Helpdesk ----------
 location /helpdesk/ {
 proxy_pass http://127.0.0.1:3030/;
 proxy_http_version 1.1;
 proxy_set_header Host System.Management.Automation.Internal.Host.InternalHost;
 proxy_set_header X-Real-IP ;
 proxy_set_header X-Forwarded-For ;
 proxy_set_header X-Forwarded-Proto ;
 proxy_set_header X-Forwarded-Host System.Management.Automation.Internal.Host.InternalHost;
 proxy_set_header X-Forwarded-Port ;
 proxy_buffering off;
 proxy_redirect off;
 proxy_connect_timeout 300s;
 proxy_send_timeout 300s;
 proxy_read_timeout 300s;
 }'''
 nginx = nginx.replace('# ---------- Backend API ----------', block + '\\n\\n # ---------- Backend API ----------')
 with open('/tmp/nginx-fixed.conf', 'w') as f:
 f.write(nginx)
 print('nginx fixed')
else:
 print('nginx already has helpdesk')
