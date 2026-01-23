#!/bin/bash
set -e
BACKUP=\
cp /etc/nginx/sites-enabled/orthodoxmetrics.com /etc/nginx/sites-enabled/orthodoxmetrics.com.backup.\
HELPDESK='    # ---------- Zammad Helpdesk ----------
    location /helpdesk/ {
        proxy_pass         http://127.0.0.1:3030/;
        proxy_http_version 1.1;
        proxy_set_header   Host \System.Management.Automation.Internal.Host.InternalHost;
        proxy_set_header   X-Real-IP \;
        proxy_set_header   X-Forwarded-For \;
        proxy_set_header   X-Forwarded-Proto \;
        proxy_set_header   X-Forwarded-Host \System.Management.Automation.Internal.Host.InternalHost;
        proxy_set_header   X-Forwarded-Port \;
        proxy_buffering    off;
        proxy_redirect     off;
        proxy_connect_timeout 300s;
        proxy_send_timeout    300s;
        proxy_read_timeout    300s;
    }'
awk -v block=" \\ '/# ---------- Backend API ----------/ {print block; print \\} 1' /etc/nginx/sites-enabled/orthodoxmetrics.com > /tmp/nginx-fixed.conf
mv /tmp/nginx-fixed.conf /etc/nginx/sites-enabled/orthodoxmetrics.com
nginx -t && systemctl reload nginx
