# Nginx Virtual Host Configuration

This directory contains nginx virtual host configurations to fix the site mismatch issue between `orthodoxmetrics.com` and `orthodmetrics.com`.

## Problem Statement

Previously, `orthodoxmetrics.com` sometimes served `orthodmetrics.com` content due to:
1. IP address (192.168.1.239) being listed in `server_name` 
2. Outer proxy not preserving the Host header

## Solution

This configuration provides:
- **Strict host-based routing** with no IP addresses in `server_name`
- **Default server** that returns 444 for unmatched hosts
- **Separate configurations** for each domain with proper backend routing

## Configuration Files

### 1. `orthodoxmetrics.conf` - Main Site
- **Domain**: `orthodoxmetrics.com`, `www.orthodoxmetrics.com`
- **Document Root**: `/var/www/orthodox-church-mgmt/orthodoxmetrics/prod/public`
- **Backend API**: `http://127.0.0.1:3001`
- **Features**:
  - Static asset caching (1 year, immutable)
  - `/berry/` subapp with alias to `/var/www/orthodmetrics/prod/UI/berry/dist/`
  - `/api/` proxy with cookie handling and WebSocket support
  - `/socket.io/` and `/health` endpoints
  - SPA routing for main application

### 2. `orthodmetrics.conf` - Internal/Typo Site  
- **Domain**: `orthodmetrics.com`, `www.orthodmetrics.com` (note missing 'x')
- **Document Root**: `/var/www/orthodmetrics/site/om-base/public`
- **Backend API**: `http://127.0.0.1:3009/api/`
- **Features**:
  - Static asset caching
  - SPA routing for `/berry/`, `/modernize/`, `/raydar/`
  - API proxy to different backend port

### 3. `default.conf` - Security Default
- **Purpose**: Catch-all server that returns 444 for unmatched hosts
- **Security**: Prevents serving content to unknown Host headers
- **Logging**: Disabled for performance (can be enabled for monitoring)

## Deployment

### Quick Deployment
```bash
sudo ./deploy-and-test.sh
```

### Manual Steps
```bash
# 1. Backup existing configurations
sudo cp -r /etc/nginx/sites-available /etc/nginx/backup-$(date +%Y%m%d)

# 2. Copy configurations
sudo cp *.conf /etc/nginx/sites-available/

# 3. Enable sites
sudo ln -sf /etc/nginx/sites-available/orthodoxmetrics.conf /etc/nginx/sites-enabled/
sudo ln -sf /etc/nginx/sites-available/orthodmetrics.conf /etc/nginx/sites-enabled/
sudo ln -sf /etc/nginx/sites-available/default.conf /etc/nginx/sites-enabled/

# 4. Remove old default (if exists)
sudo rm -f /etc/nginx/sites-enabled/default

# 5. Test and reload
sudo nginx -t
sudo systemctl reload nginx
```

## Testing

### Automated Testing
```bash
# Test configuration and routing
./deploy-and-test.sh test

# Show current status
./deploy-and-test.sh status
```

### Manual Testing
```bash
# Test orthodoxmetrics.com routing
curl -H "Host: orthodoxmetrics.com" http://localhost/

# Test orthodmetrics.com routing
curl -H "Host: orthodmetrics.com" http://localhost/

# Test default server (should close connection)
curl -H "Host: unknown-domain.com" http://localhost/

# Test API endpoints
curl -H "Host: orthodoxmetrics.com" http://localhost/api/health
curl -H "Host: orthodmetrics.com" http://localhost/api/health
```

## Backend Requirements

### Orthodox Metrics Main (orthodoxmetrics.com)
- **Service**: Node.js application
- **Port**: 3001
- **Health Check**: `http://127.0.0.1:3001/health`
- **API Base**: `http://127.0.0.1:3001/api/`

### Orthodox Metrics Internal (orthodmetrics.com)  
- **Service**: Alternative Node.js application
- **Port**: 3009
- **Health Check**: `http://127.0.0.1:3009/api/health`
- **API Base**: `http://127.0.0.1:3009/api/`

## Outer Proxy Configuration

**CRITICAL**: The outer proxy (load balancer, CDN, etc.) MUST preserve the Host header:

```nginx
# Example outer proxy configuration
location / {
    proxy_pass http://backend-servers;
    proxy_set_header Host $host;  # REQUIRED!
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

### Cloudflare Users
If using Cloudflare, ensure:
1. **Orange Cloud** is enabled (proxied)
2. **Always Use HTTPS** is configured if using SSL
3. **Transform Rules** don't modify the Host header

### AWS ALB/ELB Users
Application Load Balancer automatically preserves Host headers.
For Classic Load Balancer, ensure proxy protocol is properly configured.

## Directory Structure Requirements

The following directories must exist on the server:
```
/var/www/orthodox-church-mgmt/orthodoxmetrics/prod/public/     # Main site
/var/www/orthodmetrics/prod/UI/berry/dist/                    # Berry subapp
/var/www/orthodmetrics/site/om-base/public/                   # Internal site
```

## Security Features

1. **Strict Host Matching**: No IP addresses in server_name
2. **Default Server**: Returns 444 for unknown hosts
3. **Security Headers**: X-Frame-Options, X-Content-Type-Options, X-XSS-Protection
4. **Hidden Files Protection**: Blocks access to .* and ~ files
5. **Asset Caching**: Proper cache headers for static files

## Monitoring

### Log Files
```bash
# Access logs
tail -f /var/log/nginx/access.log

# Error logs  
tail -f /var/log/nginx/error.log

# Custom rejected hosts log (if enabled)
tail -f /var/log/nginx/rejected_hosts.log
```

### Health Checks
```bash
# Check nginx status
systemctl status nginx

# Check configuration
nginx -t

# Check listening ports
netstat -tlnp | grep nginx

# Check backend connectivity
curl http://127.0.0.1:3001/health
curl http://127.0.0.1:3009/api/health
```

## Troubleshooting

### Common Issues

1. **Wrong site served**: Verify outer proxy preserves Host header
2. **404 errors**: Check document root paths exist
3. **502 Bad Gateway**: Verify backend services are running
4. **Connection refused**: Check backend ports 3001 and 3009

### Debug Commands
```bash
# Check which site is being served
curl -v -H "Host: orthodoxmetrics.com" http://localhost/

# Check nginx configuration parsing
nginx -T | grep -A 20 "server_name orthodoxmetrics"

# Monitor real-time requests
tail -f /var/log/nginx/access.log | grep -E "(orthodoxmetrics|orthodmetrics)"
```

## Rollback Procedure

If issues occur after deployment:
```bash
# 1. Restore from backup
sudo cp -r /etc/nginx/backup-YYYYMMDD/* /etc/nginx/sites-available/

# 2. Re-enable original sites
sudo nginx -t
sudo systemctl reload nginx

# 3. Check status
systemctl status nginx
```

## Performance Notes

- Static assets cached for 1 year with immutable flag
- Gzip compression enabled for assets
- Access logging disabled for rejected hosts
- Connection pooling for backend proxies
- WebSocket upgrade support for real-time features