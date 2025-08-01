# Nginx Configuration Guide

## Overview

This document explains the nginx configuration for the Orthodox Metrics application, including proxy setup, session handling, and debugging.

## Configuration File Location
- **Development**: `z:\orthodox-church-mgmt-nginx.conf`
- **Production**: `/etc/nginx/sites-available/orthodox-church-mgmt`

## Server Block Configuration

### Basic Server Setup
```nginx
server {
    listen 80;
    server_name 192.168.1.239 orthodox-church-mgmt.local localhost;
    
    root /var/www/orthodox-church-mgmt/front-end/dist;
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
```

## Deployment Instructions

### 1. Copy Configuration
```bash
sudo cp orthodox-church-mgmt-nginx.conf /etc/nginx/sites-available/orthodox-church-mgmt
```

### 2. Enable Site
```bash
sudo ln -s /etc/nginx/sites-available/orthodox-church-mgmt /etc/nginx/sites-enabled/
```

### 3. Test Configuration
```bash
sudo nginx -t
```

### 4. Reload Nginx
```bash
sudo systemctl reload nginx
```

## Troubleshooting

### Common Issues

#### Session Cookies Not Working
**Symptoms**: 401 authentication errors despite login
**Check**:
- Cookie forwarding headers in proxy config
- Backend session configuration
- Browser cookie storage

#### CORS Errors
**Symptoms**: Preflight request failures
**Check**:
- OPTIONS request handling
- CORS headers configuration
- Frontend credentials setting

#### Static Files Not Loading
**Symptoms**: 404 errors for assets
**Check**:
- Root directory path
- File permissions
- Try_files configuration

### Debugging Commands

#### Check Nginx Status
```bash
sudo systemctl status nginx
```

#### View Error Logs
```bash
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/orthodox-church-mgmt_error.log
```

#### Test Configuration
```bash
sudo nginx -t -c /etc/nginx/nginx.conf
```

#### Check Proxy Connectivity
```bash
curl -I http://localhost:3001/api/debug/session
```

## Performance Optimization

### Gzip Compression
```nginx
gzip on;
gzip_vary on;
gzip_min_length 1024;
gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
```

### Connection Settings
```nginx
proxy_read_timeout 300s;
proxy_connect_timeout 75s;
```

### Caching Strategy
- Static assets: 1 year cache
- API responses: No cache
- Service worker/manifest: No cache

## Security Considerations

### Headers
- X-Frame-Options: Prevent clickjacking
- X-XSS-Protection: Basic XSS protection
- Content-Security-Policy: Resource loading restrictions

### Proxy Security
- Real IP forwarding for logging
- Proper cookie handling
- Secure headers forwarding

### SSL (Production)
For production deployment, enable SSL:
```nginx
listen 443 ssl http2;
ssl_certificate /path/to/certificate.crt;
ssl_certificate_key /path/to/private.key;
```
