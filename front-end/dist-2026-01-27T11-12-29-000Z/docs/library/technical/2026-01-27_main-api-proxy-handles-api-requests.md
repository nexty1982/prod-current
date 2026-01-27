NGINX configuration for proxy server and site server

configuration for first nginx server
***********************************************************************************************
root@orthodmetrics:/etc/nginx/sites-available# cat orthodoxmetrics.com
server {
    listen 80;
    server_name orthodoxmetrics.com www.orthodoxmetrics.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name orthodoxmetrics.com www.orthodoxmetrics.com;

    ssl_certificate     /etc/ssl/certs/orthodoxmetrics-full-cert.pem;
    ssl_certificate_key /etc/ssl/private/orthodoxmetrics.key;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         HIGH:!aNULL:!MD5;

    access_log /var/log/nginx/orthodoxmetrics.access.log;
    error_log  /var/log/nginx/orthodoxmetrics.error.log;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # ------------------------------
    # FRONTEND
    # ------------------------------
    location / {
        proxy_pass         http://192.168.1.239:80;
        proxy_http_version 1.1;
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
    }

    # ------------------------------
    # BACKEND /api
    # ------------------------------
    location /api/ {
        proxy_pass         http://192.168.1.239:3001/;
        proxy_http_version 1.1;
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_set_header   Upgrade $http_upgrade;
        proxy_set_header   Connection "upgrade";

        # Forward cookies and allow credentials
        proxy_pass_header  Set-Cookie;
        proxy_cookie_path  / /;

        # CORS Support (OPTIONAL - can be removed if handled in backend)
        add_header Access-Control-Allow-Origin $http_origin always;
        add_header Access-Control-Allow-Credentials true always;
        add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" always;
        add_header Access-Control-Allow-Headers "Accept,Authorization,Cache-Control,Content-Type,DNT,If-Modified-Since,Keep-Alive,Origin,User-Agent,X-Requested-With" always;

        # Handle CORS preflight requests
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

    # Max body size for file uploads
    client_max_body_size 50M;
}
*********************************************************************************************************************

configuration for internal nginx server

server {
    listen 80;
    server_name 192.168.1.239 orthodox-church-mgmt.local localhost;

    root /var/www/orthodox-church-mgmt/orthodoxmetrics/prod/front-end/dist;
    index index.html;
}
```

### Security Headers
```nginx
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header X-Content-Type-Options "nosniff" always;
add_header Referrer-Policy "no-referrer-when-downgrade" always;
add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
```

## Proxy Configuration

### Backend Proxy Settings
All API proxy locations include these essential headers:
```nginx
proxy_pass http://127.0.0.1:3001;
proxy_http_version 1.1;
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection 'upgrade';
proxy_set_header Host $host;
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;
proxy_cache_bypass $http_upgrade;
proxy_read_timeout 300s;
proxy_connect_timeout 75s;
```

### Session Cookie Forwarding
Critical for session-based authentication:
```nginx
proxy_set_header Cookie $http_cookie;
proxy_pass_header Set-Cookie;
proxy_cookie_path / /;
```

### CORS Configuration
```nginx
add_header 'Access-Control-Allow-Origin' '$http_origin' always;
add_header 'Access-Control-Allow-Credentials' 'true' always;
add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS' always;
add_header 'Access-Control-Allow-Headers' 'Accept,Authorization,Cache-Control,Content-Type,DNT,If-Modified-Since,Keep-Alive,Origin,User-Agent,X-Requested-With' always;
```

## Route Configuration

### Primary API Routes
```nginx
# Main API proxy - handles /api/* requests
location /api/ {
    # ... proxy configuration
}
```

### Direct API Routes
These provide alternative access paths without the `/api` prefix:

```nginx
# Authentication routes
location /auth {
    # ... proxy configuration
}

# Admin management routes
location /admin {
    # ... proxy configuration
}

# Church management routes
location /churches {
    # ... proxy configuration
}

# System logs routes
location /logs {
    # ... proxy configuration
}

# Notifications routes
location /notifications {
    # ... proxy configuration
}

# Notes system routes
location /notes {
    # ... proxy configuration
}

# Debug routes
location /debug {
    # ... proxy configuration
}
```

### Catch-All Direct Routes
```nginx
# Regex pattern for all backend routes
location ~ ^/(auth|admin|churches|logs|notifications|notes|menu-management|menu-permissions|baptism-records|marriage-records|funeral-records|unique-values|dashboard|calendar|billing|invoices|kanban|debug)/ {
    # ... proxy configuration
}
```

## Static File Handling

### Long-term Caching
```nginx
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
    try_files $uri =404;
}
```

### No-cache Files
```nginx
location /manifest.json {
    add_header Cache-Control "no-cache";
    try_files $uri =404;
}

location /service-worker.js {
    add_header Cache-Control "no-cache";
    try_files $uri =404;
}
```

### React Router Support
```nginx
# Handle client-side routing
location / {
    try_files $uri $uri/ /index.html;
}
```

## OPTIONS Request Handling

### Preflight CORS Support
```nginx
if ($request_method = 'OPTIONS') {
    add_header 'Access-Control-Allow-Origin' '*';
    add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS';
    add_header 'Access-Control-Allow-Headers' 'Accept,Authorization,Cache-Control,Content-Type,DNT,If-Modified-Since,Keep-Alive,Origin,User-Agent,X-Requested-With';
    add_header 'Access-Control-Max-Age' 1728000;
    add_header 'Content-Type' 'text/plain; charset=utf-8';
    add_header 'Content-Length' 0;
    return 204;
}
```

## WebSocket Support

### Socket.io Proxy
```nginx
location /socket.io/ {
    proxy_pass http://127.0.0.1:3001;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

## Error Handling

### Custom Error Pages
```nginx
error_page 404 /index.html;
error_page 500 502 503 504 /50x.html;

location = /50x.html {
    root /usr/share/nginx/html;
}
```

## File Upload Limits
```nginx
client_max_body_size 50M;
```

## Logging Configuration

### Access and Error Logs
```nginx
access_log /var/log/nginx/orthodox-church-mgmt_access.log;
error_log /var/log/nginx/orthodox-church-mgmt_error.log;

*****************************************************************************************************************
