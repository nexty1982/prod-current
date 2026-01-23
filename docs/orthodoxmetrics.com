server {
    listen 80;
    server_name orthodoxmetrics.com www.orthodoxmetrics.com;

    access_log /var/log/nginx/orthodoxmetrics.access.log;
    error_log  /var/log/nginx/orthodoxmetrics.error.log;

    root  /var/www/orthodoxmetrics/prod/front-end/dist;
    index index.html;

    # ---------- Security headers ----------
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # ---------- Maintenance page for true 404s ----------
    error_page 404 /maintenance.html;
    location = /maintenance.html {
        root /var/www/orthodoxmetrics/;
        internal;  # prevent direct external requests
    }

    # ---------- SPA entry ----------
    # Try the file/dir; if missing, fall back to SPA index.html (so app routes don’t 404)
    location / {
        try_files $uri $uri/ /index.html;
        # Short cache while debugging; switch to immutable after
        expires 1h;
        # add_header Cache-Control "public, immutable";
    }

    # ---------- No-cache for index.* (HTML & JS bootstrap) ----------
    location ~* ^/index.*\.(html|js)$ {
        expires off;
        add_header Cache-Control "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0" always;
        add_header Pragma "no-cache" always;
        add_header Expires "0" always;
        try_files $uri =404;
    }

    # ---------- Static assets (adjust when done debugging) ----------
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1h;
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        add_header Pragma "no-cache";
        try_files $uri =404;
    }

    # ---------- Build metadata from backend ----------
    location = /build.meta.json {
        proxy_pass         http://127.0.0.1:3001/build.meta.json;
        proxy_http_version 1.1;
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;

        expires off;
        add_header Cache-Control "no-cache, no-store, must-revalidate" always;
        add_header Pragma "no-cache" always;
        add_header Expires "0" always;
    }

    # ---------- WebSocket: OMAI Logger ----------
    location /ws/omai-logger {
        proxy_pass         http://127.0.0.1:3001/ws/omai-logger;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade $http_upgrade;
        proxy_set_header   Connection "upgrade";
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;

        proxy_connect_timeout 7d;
        proxy_send_timeout    7d;
        proxy_read_timeout    7d;
    }

    # ---------- Socket.IO ----------
    location /socket.io/ {
        proxy_pass         http://127.0.0.1:3001/socket.io/;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade $http_upgrade;
        proxy_set_header   Connection "upgrade";
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;

        proxy_set_header   Cookie $http_cookie;
        proxy_pass_header  Set-Cookie;
        proxy_cookie_path  / /;

        proxy_connect_timeout 7d;
        proxy_send_timeout    7d;
        proxy_read_timeout    7d;
    }

        # ---------- FreeScout Helpdesk ----------
    location /helpdesk/ {
        proxy_pass         http://127.0.0.1:3080/;
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
    }

    # ---------- Backend API ----------
    location /api/ {
        proxy_pass         http://127.0.0.1:3001/api/;
        proxy_http_version 1.1;
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_set_header   Upgrade $http_upgrade;
        proxy_set_header   Connection "upgrade";
        proxy_buffering    off;

        # File upload size limit (must match or exceed server limit)
        client_max_body_size 50M;

        # Session cookie handling
        proxy_set_header   Cookie $http_cookie;
        proxy_pass_header  Set-Cookie;
        proxy_cookie_path  / /;
        proxy_cookie_domain 127.0.0.1 orthodoxmetrics.com;
        proxy_cookie_domain localhost orthodoxmetrics.com;

        # Timeouts
        proxy_connect_timeout 300s;
        proxy_send_timeout    300s;
        proxy_read_timeout    300s;
        send_timeout          300s;

        # Don't intercept errors - pass them through from backend
        proxy_intercept_errors off;

        # CORS (tune/lock down as needed)
        add_header Access-Control-Allow-Origin $http_origin always;
        add_header Access-Control-Allow-Credentials true always;
        add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" always;
        add_header Access-Control-Allow-Headers "Accept,Authorization,Cache-Control,Content-Type,DNT,If-Modified-Since,Keep-Alive,Origin,User-Agent,X-Requested-With" always;

        if ($request_method = OPTIONS) {
            add_header Access-Control-Allow-Origin "*";
            add_header Access-Control-Allow-Methods "GET, POST, OPTIONS, PUT, DELETE";
            add_header Access-Control-Allow-Headers "Accept,Authorization,Cache-Control,Content-Type,DNT,If-Modified-Since,Keep-Alive,Origin,User-Agent,X-Requested-With";
            add_header Access-Control-Max-Age 1728000;
            add_header Content-Type "text/plain; charset=utf-8";
            add_header Content-Length 0;
            return 204;
        }
    }

    # ---------- Public/Uploads ----------
    location /uploads/ {
        alias /var/www/orthodoxmetrics/prod/uploads/;
        expires 1h;
        add_header Cache-Control "public";
    }

    location /public/ {
        alias /var/www/orthodoxmetrics/prod/public/;
        expires 1h;
        add_header Cache-Control "public";
    }

    # ---------- Security: hide dotfiles & sensitive extensions ----------
    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }
    location ~ \.(sql|json|log|txt)$ {
        deny all;
        access_log off;
        log_not_found off;
    }

    # ---------- Compression ----------
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/json
        application/javascript
        application/xml+rss
        application/atom+xml
        image/svg+xml;

    client_max_body_size 50M;
}
