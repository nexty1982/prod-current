# Nginx Virtual Host Setup Guide

This guide provides step-by-step instructions for deploying the nginx virtual host configurations to fix the site mismatch issue between `orthodoxmetrics.com` and `orthodmetrics.com`.

## Quick Start

For experienced administrators who want to deploy immediately:

```bash
cd /path/to/infra/nginx
sudo ./deploy-and-test.sh
```

## Detailed Setup Instructions

### 1. Prerequisites

#### System Requirements
- Ubuntu/Debian server with nginx installed
- Root/sudo access
- Node.js applications running on ports 3001 and 3009

#### Install nginx (if not already installed)
```bash
sudo apt update
sudo apt install nginx -y
sudo systemctl enable nginx
sudo systemctl start nginx
```

#### Verify nginx installation
```bash
nginx -v
sudo systemctl status nginx
```

### 2. Pre-deployment Validation

#### Validate configurations locally
```bash
cd /path/to/infra/nginx
./validate-configs.sh
```

#### Check current nginx status
```bash
sudo nginx -t
sudo systemctl status nginx
```

#### Backup existing configurations
```bash
sudo ./deploy-and-test.sh backup
```

### 3. Backend Services Setup

Ensure your backend services are properly configured:

#### Orthodox Metrics Main Service (Port 3001)
```bash
# Check if service is running
curl -s http://127.0.0.1:3001/health

# Example PM2 start command (adjust paths as needed)
pm2 start /var/www/orthodox-church-mgmt/orthodoxmetrics/prod/server/scripts/index.js \
  --name "orthodoxmetrics-main" \
  --env production \
  -- --port 3001
```

#### Orthodox Metrics Internal Service (Port 3009)
```bash
# Check if service is running
curl -s http://127.0.0.1:3009/api/health

# Example PM2 start command (adjust paths as needed)
pm2 start /var/www/orthodmetrics/site/om-base/server/index.js \
  --name "orthodmetrics-internal" \
  --env production \
  -- --port 3009
```

### 4. Directory Structure Setup

Create required directories and ensure proper permissions:

```bash
# Main site directories
sudo mkdir -p /var/www/orthodox-church-mgmt/orthodoxmetrics/prod/public
sudo mkdir -p /var/www/orthodmetrics/prod/UI/berry/dist

# Internal site directories
sudo mkdir -p /var/www/orthodmetrics/site/om-base/public

# Set proper ownership (adjust user as needed)
sudo chown -R www-data:www-data /var/www/orthodox-church-mgmt
sudo chown -R www-data:www-data /var/www/orthodmetrics

# Set proper permissions
sudo chmod -R 755 /var/www/orthodox-church-mgmt
sudo chmod -R 755 /var/www/orthodmetrics
```

### 5. Deploy Configurations

#### Option 1: Automated Deployment (Recommended)
```bash
cd /path/to/infra/nginx
sudo ./deploy-and-test.sh
```

#### Option 2: Manual Deployment
```bash
# Copy configurations
sudo cp orthodoxmetrics.conf /etc/nginx/sites-available/
sudo cp orthodmetrics.conf /etc/nginx/sites-available/
sudo cp default.conf /etc/nginx/sites-available/

# Remove old default site
sudo rm -f /etc/nginx/sites-enabled/default

# Enable new sites
sudo ln -sf /etc/nginx/sites-available/orthodoxmetrics.conf /etc/nginx/sites-enabled/
sudo ln -sf /etc/nginx/sites-available/orthodmetrics.conf /etc/nginx/sites-enabled/
sudo ln -sf /etc/nginx/sites-available/default.conf /etc/nginx/sites-enabled/

# Test and reload
sudo nginx -t
sudo systemctl reload nginx
```

### 6. Testing and Verification

#### Run comprehensive tests
```bash
cd /path/to/infra/nginx
./test-routing.sh
```

#### Manual testing with curl
```bash
# Test main site
curl -H "Host: orthodoxmetrics.com" http://localhost/

# Test internal site
curl -H "Host: orthodmetrics.com" http://localhost/

# Test API endpoints
curl -H "Host: orthodoxmetrics.com" http://localhost/api/health
curl -H "Host: orthodmetrics.com" http://localhost/api/health

# Test default server (should close connection)
curl -H "Host: unknown-site.com" http://localhost/
```

#### Check logs
```bash
# Monitor access logs
sudo tail -f /var/log/nginx/access.log

# Monitor error logs
sudo tail -f /var/log/nginx/error.log

# Check for routing issues
sudo tail -f /var/log/nginx/error.log | grep -E "(orthodoxmetrics|orthodmetrics)"
```

### 7. Outer Proxy Configuration

**CRITICAL**: Configure your outer proxy/load balancer to preserve Host headers.

#### Nginx Outer Proxy
```nginx
upstream backend {
    server 192.168.1.239:80;
}

server {
    listen 80;
    server_name orthodoxmetrics.com www.orthodoxmetrics.com orthodmetrics.com www.orthodmetrics.com;
    
    location / {
        proxy_pass http://backend;
        proxy_set_header Host $host;              # REQUIRED!
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

#### Apache Outer Proxy
```apache
<VirtualHost *:80>
    ServerName orthodoxmetrics.com
    ServerAlias www.orthodoxmetrics.com
    
    ProxyPass / http://192.168.1.239:80/
    ProxyPassReverse / http://192.168.1.239:80/
    ProxyPreserveHost On  # REQUIRED!
</VirtualHost>

<VirtualHost *:80>
    ServerName orthodmetrics.com
    ServerAlias www.orthodmetrics.com
    
    ProxyPass / http://192.168.1.239:80/
    ProxyPassReverse / http://192.168.1.239:80/
    ProxyPreserveHost On  # REQUIRED!
</VirtualHost>
```

#### Cloudflare Configuration
1. Ensure domains are **proxied** (orange cloud)
2. Set up **Page Rules** if needed for specific routing
3. Verify **Transform Rules** don't modify Host headers

### 8. SSL/HTTPS Setup (Optional but Recommended)

#### Using Certbot (Let's Encrypt)
```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx -y

# Get certificates for both domains
sudo certbot --nginx -d orthodoxmetrics.com -d www.orthodoxmetrics.com
sudo certbot --nginx -d orthodmetrics.com -d www.orthodmetrics.com

# Verify auto-renewal
sudo certbot renew --dry-run
```

#### Manual SSL Configuration
Add to each server block:
```nginx
listen 443 ssl http2;
listen [::]:443 ssl http2;

ssl_certificate /path/to/certificate.crt;
ssl_certificate_key /path/to/private.key;
ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384;
ssl_prefer_server_ciphers off;

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name orthodoxmetrics.com www.orthodoxmetrics.com;
    return 301 https://$server_name$request_uri;
}
```

### 9. Performance Optimization

#### Enable gzip compression (add to http block)
```nginx
gzip on;
gzip_vary on;
gzip_min_length 1024;
gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
```

#### Enable file caching (add to http block)
```nginx
open_file_cache max=1000 inactive=20s;
open_file_cache_valid 30s;
open_file_cache_min_uses 2;
open_file_cache_errors on;
```

### 10. Monitoring and Maintenance

#### Set up log rotation
```bash
sudo logrotate -d /etc/logrotate.d/nginx
```

#### Monitor nginx status
```bash
# Create monitoring script
cat > /usr/local/bin/nginx-status.sh << 'EOF'
#!/bin/bash
echo "Nginx Status: $(systemctl is-active nginx)"
echo "Configuration Test: $(nginx -t 2>&1 | tail -1)"
echo "Listening Ports:"
netstat -tlnp | grep nginx
echo "Active Connections:"
curl -s http://localhost/nginx_status 2>/dev/null || echo "Status page not configured"
EOF

chmod +x /usr/local/bin/nginx-status.sh
```

#### Set up health checks
```bash
# Add to crontab
echo "*/5 * * * * root /usr/local/bin/nginx-status.sh >> /var/log/nginx-health.log 2>&1" | sudo tee -a /etc/crontab
```

### 11. Troubleshooting

#### Common Issues

1. **502 Bad Gateway**
   ```bash
   # Check backend services
   curl http://127.0.0.1:3001/health
   curl http://127.0.0.1:3009/api/health
   
   # Check nginx error logs
   sudo tail -f /var/log/nginx/error.log
   ```

2. **Wrong site served**
   ```bash
   # Verify Host header is preserved
   curl -v -H "Host: orthodoxmetrics.com" http://localhost/
   
   # Check outer proxy configuration
   ```

3. **Static files not loading**
   ```bash
   # Check directory permissions
   ls -la /var/www/orthodox-church-mgmt/orthodoxmetrics/prod/public/
   ls -la /var/www/orthodmetrics/site/om-base/public/
   
   # Check nginx error logs for file not found errors
   ```

#### Debug Commands
```bash
# Show nginx configuration
sudo nginx -T

# Test configuration with specific file
sudo nginx -t -c /etc/nginx/nginx.conf

# Show active sites
ls -la /etc/nginx/sites-enabled/

# Check which process is using port 80
sudo lsof -i :80

# Show nginx worker processes
ps aux | grep nginx
```

### 12. Rollback Procedure

If issues occur after deployment:

```bash
# Stop nginx
sudo systemctl stop nginx

# Restore from backup
sudo cp -r /etc/nginx/backups/YYYYMMDD_HHMMSS/sites-available/* /etc/nginx/sites-available/
sudo cp -r /etc/nginx/backups/YYYYMMDD_HHMMSS/sites-enabled/* /etc/nginx/sites-enabled/

# Test and start
sudo nginx -t
sudo systemctl start nginx
```

### 13. Production Checklist

Before going live, verify:

- [ ] Backend services running on correct ports (3001, 3009)
- [ ] Directory structure created with proper permissions
- [ ] Nginx configurations deployed and tested
- [ ] Outer proxy preserves Host headers
- [ ] SSL certificates installed (if using HTTPS)
- [ ] DNS records point to correct servers
- [ ] Monitoring and logging configured
- [ ] Backup procedures in place
- [ ] Rollback plan documented

### 14. Support and Maintenance

#### Regular Tasks
- Monitor nginx error logs daily
- Check backend service health
- Verify SSL certificate expiration
- Update nginx configurations as needed
- Review performance metrics

#### Emergency Contacts
- Create runbook with escalation procedures
- Document key personnel contacts
- Maintain updated configuration backups

This setup guide ensures a smooth deployment and ongoing maintenance of the nginx virtual host routing solution.