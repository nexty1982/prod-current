# 🚨 Orthodox Metrics - 500 Error Troubleshooting Guide

## Quick Diagnosis & Fix

### 🔧 **Immediate Actions (Run These First)**

#### From Your Local Machine:
```powershell
# Diagnose the issue remotely
.\scripts\diagnose-remote.ps1

# Attempt automatic fix
.\scripts\diagnose-remote.ps1 -QuickFix
```

#### On the Server (SSH):
```bash
# Quick diagnostic
sudo bash scripts/diagnose-site.sh

# Automatic fix attempt
sudo bash scripts/quick-fix-site.sh
```

---

## 🔍 **Common 500 Error Causes**

### 1. **Backend Service Down**
```bash
# Check if service is running
sudo systemctl status orthodox-church-mgmt

# Start the service
sudo systemctl start orthodox-church-mgmt

# Check logs
sudo journalctl -u orthodox-church-mgmt -f
```

### 2. **Database Connection Issues**
```bash
# Test database connection
mysql -u ocm_user -p orthodox_church_management

# Check MySQL status
sudo systemctl status mysql

# Restart MySQL if needed
sudo systemctl restart mysql
```

### 3. **Nginx Configuration Problems**
```bash
# Test Nginx configuration
sudo nginx -t

# Check Nginx status
sudo systemctl status nginx

# Restart Nginx
sudo systemctl restart nginx
```

### 4. **Port Conflicts**
```bash
# Check what's running on port 3001
sudo ss -tlnp | grep :3001

# Check what's running on ports 80/443
sudo ss -tlnp | grep -E ':(80|443)'
```

### 5. **File Permission Issues**
```bash
# Fix application permissions
sudo chown -R ocm:ocm /var/www/orthodox-church-mgmt
sudo chmod -R 755 /var/www/orthodox-church-mgmt
```

---

## 🛠️ **Step-by-Step Troubleshooting**

### Step 1: Check Service Status
```bash
# Check all critical services
sudo systemctl status mysql nginx orthodox-church-mgmt

# If any are down, start them
sudo systemctl start mysql
sudo systemctl start orthodox-church-mgmt
sudo systemctl start nginx
```

### Step 2: Test Backend Directly
```bash
# Test if backend responds
curl http://localhost:3001/api/health

# If this fails, check application logs
sudo journalctl -u orthodox-church-mgmt --no-pager -n 20
```

### Step 3: Check Nginx Proxy
```bash
# Test Nginx configuration
sudo nginx -t

# Check Nginx error logs
sudo tail -20 /var/log/nginx/error.log

# Test proxy to backend
curl -H "Host: orthodoxmetrics.com" http://localhost/api/health
```

### Step 4: Verify Environment Configuration
```bash
# Check environment file exists
ls -la /var/www/orthodox-church-mgmt/.env.production

# Verify critical settings
grep -E "(DB_|PORT|HOST)" /var/www/orthodox-church-mgmt/.env.production
```

### Step 5: Check SSL/HTTPS Setup
```bash
# Test SSL certificate
openssl s_client -servername orthodoxmetrics.com -connect orthodoxmetrics.com:443

# Check certificate expiration
echo | openssl s_client -servername orthodoxmetrics.com -connect orthodoxmetrics.com:443 2>/dev/null | openssl x509 -noout -dates
```

---

## 🔧 **Nginx Configuration for orthodoxmetrics.com**

### Optimal Configuration:
```nginx
server {
    listen 80;
    server_name orthodoxmetrics.com www.orthodoxmetrics.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name orthodoxmetrics.com www.orthodoxmetrics.com;
    
    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/orthodoxmetrics.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/orthodoxmetrics.com/privkey.pem;
    
    # Proxy Settings
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    
    # API Routes
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_cache_bypass $http_upgrade;
    }
    
    # Health check
    location /health {
        proxy_pass http://localhost:3001;
        access_log off;
    }
    
    # File uploads
    location /uploads {
        proxy_pass http://localhost:3001;
        client_max_body_size 50M;
    }
    
    # Default route
    location / {
        proxy_pass http://localhost:3001;
    }
    
    # Logging
    access_log /var/log/nginx/orthodoxmetrics_access.log;
    error_log /var/log/nginx/orthodoxmetrics_error.log;
}
```

---

## 📊 **Real-Time Monitoring**

### Monitor All Components:
```bash
# Terminal 1: Application logs
sudo journalctl -u orthodox-church-mgmt -f

# Terminal 2: Nginx access logs
sudo tail -f /var/log/nginx/orthodoxmetrics_access.log

# Terminal 3: Nginx error logs
sudo tail -f /var/log/nginx/orthodoxmetrics_error.log

# Terminal 4: System resources
watch -n 2 'free -h && echo && df -h'
```

### Test Requests While Monitoring:
```bash
# Test different endpoints
curl -I https://orthodoxmetrics.com
curl -I https://orthodoxmetrics.com/api/health
curl -I https://orthodoxmetrics.com/api/auth/test
```

---

## 🚀 **Quick Recovery Commands**

### Nuclear Option (Full Restart):
```bash
# Stop everything
sudo systemctl stop nginx orthodox-church-mgmt

# Wait a moment
sleep 5

# Start in order
sudo systemctl start mysql
sudo systemctl start orthodox-church-mgmt
sudo systemctl start nginx

# Check status
sudo systemctl status orthodox-church-mgmt nginx
```

### Check Everything is Working:
```bash
# Test backend
curl http://localhost:3001/api/health

# Test proxy
curl -k https://orthodoxmetrics.com/api/health

# Check services
sudo systemctl is-active mysql nginx orthodox-church-mgmt
```

---

## 📞 **Getting Help**

If the issue persists after trying these steps:

1. **Gather Information:**
   ```bash
   # Run full diagnostic
   sudo bash scripts/diagnose-site.sh > diagnostic_report.txt
   
   # Get recent logs
   sudo journalctl -u orthodox-church-mgmt --no-pager -n 50 > app_logs.txt
   sudo tail -50 /var/log/nginx/error.log > nginx_errors.txt
   ```

2. **Check Status:**
   ```bash
   # System status
   systemctl status orthodox-church-mgmt nginx mysql
   
   # Port usage
   sudo ss -tlnp | grep -E ':(80|443|3001)'
   
   # Resource usage
   free -h && df -h
   ```

3. **Try Safe Restart:**
   ```bash
   # Restart services safely
   sudo systemctl restart orthodox-church-mgmt
   sudo systemctl reload nginx
   ```

---

## ✅ **Prevention**

### Set Up Monitoring:
```bash
# Create health check script
echo '#!/bin/bash
if ! curl -f http://localhost:3001/api/health >/dev/null 2>&1; then
    systemctl restart orthodox-church-mgmt
    logger "Orthodox Metrics service was restarted due to health check failure"
fi' | sudo tee /usr/local/bin/ocm-healthcheck.sh

sudo chmod +x /usr/local/bin/ocm-healthcheck.sh

# Add to crontab (check every 5 minutes)
echo "*/5 * * * * /usr/local/bin/ocm-healthcheck.sh" | sudo crontab -
```

### Regular Maintenance:
```bash
# Weekly log rotation
sudo logrotate -f /etc/logrotate.d/nginx

# Monthly dependency updates
cd /var/www/orthodox-church-mgmt/server && npm audit fix

# Database optimization
mysql -u root -e "OPTIMIZE TABLE orthodox_church_management.*;"
```

---

**Remember**: Always test changes in a staging environment first!
