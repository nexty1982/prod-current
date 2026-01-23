#!/bin/bash
set -e
echo '=== Applying Zammad Fixes ==='
cd /opt/zammad
BACKUP_SUFFIX=\
sudo cp docker-compose.yml docker-compose.yml.backup.\
sudo cp /tmp/docker-compose-fixed.yml docker-compose.yml
echo '✓ docker-compose.yml updated'
sudo docker compose down
sudo docker compose up -d
echo '✓ Containers restarted'
sleep 15
sudo docker compose ps
sudo cp /etc/nginx/sites-enabled/orthodoxmetrics.com /etc/nginx/sites-enabled/orthodoxmetrics.com.backup.\
sudo cp /tmp/nginx-fixed.conf /etc/nginx/sites-enabled/orthodoxmetrics.com
echo '✓ Nginx config updated'
sudo nginx -t && sudo systemctl reload nginx
echo '✓ Nginx reloaded'
echo ''
echo '=== Verification ==='
curl -I http://127.0.0.1:3030/ 2>&1 | head -3
curl -I https://orthodoxmetrics.com/helpdesk/ 2>&1 | head -3
