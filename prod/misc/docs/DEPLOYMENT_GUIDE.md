# Deployment Guide - Orthodox Metrics

## 🚀 Production Deployment

This guide covers deploying Orthodox Metrics to production servers with security, performance, and reliability considerations.

## 🏗️ Infrastructure Requirements

### Server Specifications

#### Minimum Requirements
- **CPU**: 2 cores, 2.4GHz
- **Memory**: 4GB RAM
- **Storage**: 50GB SSD
- **Network**: 100Mbps connection
- **OS**: Ubuntu 20.04 LTS or CentOS 8+

#### Recommended Production
- **CPU**: 4 cores, 3.0GHz
- **Memory**: 8GB RAM
- **Storage**: 200GB SSD (NVMe preferred)
- **Network**: 1Gbps connection
- **OS**: Ubuntu 22.04 LTS

#### High-Availability Setup
- **Load Balancer**: Nginx or HAProxy
- **App Servers**: 2+ instances
- **Database**: MySQL 8.0 with read replicas
- **Redis**: Session storage and caching
- **CDN**: Static asset delivery

### Software Dependencies

#### Core Stack
```bash
# Node.js (v18+)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# MySQL 8.0
sudo apt update
sudo apt install mysql-server-8.0

# Nginx
sudo apt install nginx

# PM2 Process Manager
sudo npm install -g pm2

# Redis (optional, for sessions)
sudo apt install redis-server
```

#### SSL Certificate
```bash
# Let's Encrypt with Certbot
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

## 🔧 Deployment Process

### Automated Deployment Script

#### Using the Deployment Script
```bash
# Navigate to server directory
cd /path/to/orthodoxmetrics/prod/server

# Run deployment script
node deployment/RunScript.ps1     # For Windows servers
./deployment/deploy.sh            # For Linux servers (if created)
```

#### Manual Deployment Steps

**Step 1: Server Preparation**
```bash
# Create application user
sudo useradd -m -s /bin/bash orthodox
sudo usermod -aG sudo orthodox

# Create application directories
sudo mkdir -p /opt/orthodoxmetrics
sudo chown orthodox:orthodox /opt/orthodoxmetrics
```

**Step 2: Application Deployment**
```bash
# Switch to application user
sudo su - orthodox

# Clone repository
cd /opt/orthodoxmetrics
git clone https://github.com/your-org/orthodoxmetrics.git .
cd prod

# Install dependencies
cd server && npm ci --only=production
cd ../front-end && npm ci --only=production
```

**Step 3: Database Setup**
```bash
# Use the consolidated database manager
cd /opt/orthodoxmetrics/prod/server
node database/database-manager.js setup --production

# Or step-by-step
mysql -u root -p -e "CREATE DATABASE orthodox_metrics;"
mysql -u root -p -e "CREATE DATABASE orthodox_records;"
mysql -u root -p orthodox_metrics < database/orthodoxmetrics_db_schema.sql
```

**Step 4: Environment Configuration**
```bash
# Create production environment file
cp .env.example .env.production

# Edit with production values
nano .env.production
```

**Production Environment Variables:**
```env
# Production Configuration
NODE_ENV=production
PORT=3000
HOST=0.0.0.0

# Database (Production)
DB_HOST=localhost
DB_USER=orthodoxapps
DB_PASSWORD=secure_production_password
DB_NAME=orthodox_metrics

# Security
SESSION_SECRET=ultra_secure_session_secret_64_chars_minimum
JWT_SECRET=ultra_secure_jwt_secret_64_chars_minimum

# Google Vision API
GOOGLE_APPLICATION_CREDENTIALS=/opt/orthodoxmetrics/credentials/prod-service-account.json
GOOGLE_PROJECT_ID=orthodox-metrics-prod

# SSL/HTTPS
HTTPS_ENABLED=true
SSL_CERT_PATH=/etc/letsencrypt/live/yourdomain.com/fullchain.pem
SSL_KEY_PATH=/etc/letsencrypt/live/yourdomain.com/privkey.pem

# Logging
LOG_LEVEL=info
LOG_FILE=/var/log/orthodoxmetrics/app.log
ERROR_LOG_FILE=/var/log/orthodoxmetrics/error.log

# Performance
MAX_UPLOAD_SIZE=50mb
RATE_LIMIT_REQUESTS=1000
RATE_LIMIT_WINDOW=900000  # 15 minutes

# Email (for notifications)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=notifications@yourdomain.com
SMTP_PASS=app_specific_password
```

**Step 5: Build Frontend**
```bash
cd /opt/orthodoxmetrics/prod/front-end
npm run build

# Copy build to nginx directory
sudo cp -r dist/* /var/www/orthodoxmetrics/
```

**Step 6: Process Manager Setup**
```bash
# PM2 ecosystem configuration
cd /opt/orthodoxmetrics/prod/server
cp ecosystem.config.cjs ecosystem.production.cjs

# Edit for production
nano ecosystem.production.cjs
```

**PM2 Production Configuration:**
```javascript
module.exports = {
  apps: [{
    name: 'orthodox-metrics',
    script: 'index.js',
    cwd: '/opt/orthodoxmetrics/prod/server',
    instances: 'max',  // Use all CPU cores
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    log_file: '/var/log/orthodoxmetrics/combined.log',
    out_file: '/var/log/orthodoxmetrics/out.log',
    error_file: '/var/log/orthodoxmetrics/error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    max_memory_restart: '1G',
    restart_delay: 4000,
    watch: false,
    ignore_watch: ['node_modules', 'logs', 'uploads']
  }]
};
```

## 🌐 Nginx Configuration

### Production Nginx Setup

**Main Configuration** (`/etc/nginx/sites-available/orthodoxmetrics`):
```nginx
# Orthodox Metrics Production Configuration
upstream orthodox_backend {
    server 127.0.0.1:3000;
    # Add more servers for load balancing
    # server 127.0.0.1:3001;
    # server 127.0.0.1:3002;
}

# HTTP to HTTPS redirect
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

# HTTPS server
server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:50m;
    ssl_stapling on;
    ssl_stapling_verify on;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Root directory for frontend
    root /var/www/orthodoxmetrics;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    # Static files (frontend)
    location / {
        try_files $uri $uri/ /index.html;
        expires 1h;
        add_header Cache-Control "public, immutable";
    }

    # API routes (backend)
    location /api/ {
        proxy_pass http://orthodox_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Upload size limit
        client_max_body_size 50M;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Admin panel (backend)
    location /admin {
        proxy_pass http://orthodox_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Uploaded files
    location /uploads/ {
        alias /opt/orthodoxmetrics/prod/server/uploads/;
        expires 1y;
        add_header Cache-Control "public, immutable";
        
        # Security: Prevent script execution
        location ~* \.(php|pl|py|jsp|asp|sh|cgi)$ {
            deny all;
        }
    }

    # Logs access restriction
    location /logs {
        deny all;
        return 404;
    }

    # Hidden files protection
    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }
}
```

### Enable Nginx Configuration
```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/orthodoxmetrics /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Restart nginx
sudo systemctl restart nginx
```

## 🔒 Security Configuration

### Firewall Setup

#### UFW (Ubuntu)
```bash
# Enable UFW
sudo ufw enable

# Allow SSH
sudo ufw allow ssh

# Allow HTTP/HTTPS
sudo ufw allow 'Nginx Full'

# Allow MySQL (if external access needed)
sudo ufw allow 3306/tcp

# Check status
sudo ufw status
```

#### iptables (Advanced)
```bash
# Basic iptables rules
sudo iptables -A INPUT -i lo -j ACCEPT
sudo iptables -A INPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 22 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 80 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 443 -j ACCEPT
sudo iptables -A INPUT -j DROP

# Save rules
sudo iptables-save > /etc/iptables/rules.v4
```

### MySQL Security
```bash
# Run MySQL security script
sudo mysql_secure_installation

# Create production user
mysql -u root -p << EOF
CREATE USER 'orthodoxapps'@'localhost' IDENTIFIED BY 'secure_production_password';
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, DROP, INDEX, ALTER ON orthodox_metrics.* TO 'orthodoxapps'@'localhost';
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, DROP, INDEX, ALTER ON orthodox_records.* TO 'orthodoxapps'@'localhost';
FLUSH PRIVILEGES;
EOF
```

### Application Security

#### File Permissions
```bash
# Set secure permissions
sudo chown -R orthodox:orthodox /opt/orthodoxmetrics
sudo chmod -R 755 /opt/orthodoxmetrics
sudo chmod -R 700 /opt/orthodoxmetrics/prod/server/credentials
sudo chmod 600 /opt/orthodoxmetrics/prod/server/.env.production
```

#### Log Security
```bash
# Create log directory
sudo mkdir -p /var/log/orthodoxmetrics
sudo chown orthodox:orthodox /var/log/orthodoxmetrics
sudo chmod 755 /var/log/orthodoxmetrics

# Setup log rotation
sudo tee /etc/logrotate.d/orthodoxmetrics << EOF
/var/log/orthodoxmetrics/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    copytruncate
    su orthodox orthodox
}
EOF
```

## 📊 Monitoring and Health Checks

### Application Monitoring

#### PM2 Monitoring
```bash
# Monitor applications
pm2 monit

# View logs
pm2 logs orthodox-metrics

# Restart application
pm2 restart orthodox-metrics

# Save PM2 configuration
pm2 save
pm2 startup
```

#### Health Check Endpoint
```javascript
// Built-in health check at /api/health
{
  "status": "healthy",
  "timestamp": "2025-07-18T10:30:00Z",
  "version": "1.0.0",
  "database": "connected",
  "redis": "connected",
  "diskSpace": "45%",
  "memory": "2.1GB/8GB",
  "uptime": "5 days, 3 hours"
}
```

#### Automated Health Monitoring
```bash
# Create health check script
sudo tee /opt/orthodoxmetrics/scripts/health-check.sh << 'EOF'
#!/bin/bash
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/health)
if [ $RESPONSE -ne 200 ]; then
    echo "Health check failed with status $RESPONSE"
    pm2 restart orthodox-metrics
    # Send alert email
    echo "Orthodox Metrics health check failed at $(date)" | mail -s "Orthodox Metrics Alert" admin@yourdomain.com
fi
EOF

chmod +x /opt/orthodoxmetrics/scripts/health-check.sh

# Add to crontab
crontab -e
# Add: */5 * * * * /opt/orthodoxmetrics/scripts/health-check.sh
```

### System Monitoring

#### Resource Monitoring
```bash
# Install monitoring tools
sudo apt install htop iotop netstat-nat

# Monitor disk usage
df -h

# Monitor memory usage
free -h

# Monitor network connections
ss -tulpn
```

#### Database Monitoring
```bash
# MySQL performance monitoring
mysql -u root -p -e "SHOW PROCESSLIST;"
mysql -u root -p -e "SHOW STATUS LIKE 'Connections';"
mysql -u root -p -e "SHOW STATUS LIKE 'Threads_connected';"

# Database size monitoring
mysql -u root -p -e "
SELECT 
    table_schema AS 'Database',
    ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS 'Size (MB)'
FROM information_schema.tables 
WHERE table_schema IN ('orthodox_metrics', 'orthodox_records')
GROUP BY table_schema;
"
```

## 🔄 Backup and Recovery

### Automated Backup System

#### Database Backup Script
```bash
# Use the consolidated database manager
node database/database-manager.js backup --schedule=daily

# Or create custom backup script
sudo tee /opt/orthodoxmetrics/scripts/backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/opt/orthodoxmetrics/backups"
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup directory
mkdir -p $BACKUP_DIR

# Database backup
mysqldump -u orthodoxapps -p$DB_PASSWORD --single-transaction --routines --triggers orthodox_metrics > $BACKUP_DIR/orthodox_metrics_$DATE.sql
mysqldump -u orthodoxapps -p$DB_PASSWORD --single-transaction --routines --triggers orthodox_records > $BACKUP_DIR/orthodox_records_$DATE.sql

# Application backup
tar -czf $BACKUP_DIR/application_$DATE.tar.gz /opt/orthodoxmetrics/prod --exclude=node_modules --exclude=uploads

# Cleanup old backups (keep 30 days)
find $BACKUP_DIR -type f -mtime +30 -delete

echo "Backup completed: $DATE"
EOF

chmod +x /opt/orthodoxmetrics/scripts/backup.sh
```

#### Scheduled Backups
```bash
# Add to crontab
crontab -e
# Daily backup at 2 AM
0 2 * * * /opt/orthodoxmetrics/scripts/backup.sh

# Weekly backup verification
0 3 * * 0 /opt/orthodoxmetrics/scripts/verify-backup.sh
```

### Recovery Procedures

#### Database Recovery
```bash
# Stop application
pm2 stop orthodox-metrics

# Restore database
mysql -u root -p orthodox_metrics < /opt/orthodoxmetrics/backups/orthodox_metrics_20250718_020000.sql
mysql -u root -p orthodox_records < /opt/orthodoxmetrics/backups/orthodox_records_20250718_020000.sql

# Validate restoration
node database/database-manager.js validate

# Restart application
pm2 start orthodox-metrics
```

#### Application Recovery
```bash
# Extract application backup
cd /opt
sudo tar -xzf /opt/orthodoxmetrics/backups/application_20250718_020000.tar.gz

# Restore permissions
sudo chown -R orthodox:orthodox /opt/orthodoxmetrics

# Restart services
pm2 restart orthodox-metrics
sudo systemctl restart nginx
```

## 🚀 Performance Optimization

### Database Optimization

#### MySQL Configuration (`/etc/mysql/mysql.conf.d/mysqld.cnf`)
```ini
[mysqld]
# InnoDB settings
innodb_buffer_pool_size = 2G
innodb_log_file_size = 256M
innodb_flush_log_at_trx_commit = 2
innodb_file_per_table = 1

# Query cache
query_cache_type = 1
query_cache_size = 256M

# Connection settings
max_connections = 200
wait_timeout = 300
interactive_timeout = 300

# Slow query log
slow_query_log = 1
slow_query_log_file = /var/log/mysql/slow.log
long_query_time = 2
```

#### Database Optimization
```bash
# Run optimization
node database/database-manager.js optimize

# Manual optimization
mysql -u root -p << EOF
OPTIMIZE TABLE orthodox_metrics.baptism_records;
OPTIMIZE TABLE orthodox_metrics.marriage_records;
OPTIMIZE TABLE orthodox_metrics.funeral_records;
ANALYZE TABLE orthodox_metrics.churches;
ANALYZE TABLE orthodox_metrics.users;
EOF
```

### Application Performance

#### Node.js Optimization
```javascript
// PM2 cluster mode utilizes all CPU cores
// Memory monitoring and restart on threshold
// HTTP keep-alive connections
// Gzip compression
// Static file caching

// Performance middleware
app.use(compression());
app.use(helmet());
app.use(express.static('public', { maxAge: '1y' }));
```

#### Nginx Caching
```nginx
# Add to nginx configuration
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=orthodox_cache:10m max_size=100m;

location /api/ {
    proxy_cache orthodox_cache;
    proxy_cache_valid 200 302 10m;
    proxy_cache_valid 404 1m;
    # ... other proxy settings
}
```

## 🔧 Maintenance Procedures

### Regular Maintenance Tasks

#### Daily Tasks (Automated)
- Health checks every 5 minutes
- Log rotation
- Database backup
- Performance monitoring

#### Weekly Tasks
```bash
# System updates
sudo apt update && sudo apt upgrade

# Application updates
cd /opt/orthodoxmetrics/prod
git pull origin main
npm ci --only=production
pm2 restart orthodox-metrics

# Database optimization
node database/database-manager.js optimize

# Backup verification
node testing/unified-tests.js --level basic --production
```

#### Monthly Tasks
```bash
# SSL certificate renewal
sudo certbot renew

# Database cleanup
node maintenance/database-maintenance.js --cleanup

# Log archive
sudo tar -czf /opt/orthodoxmetrics/backups/logs_$(date +%Y%m).tar.gz /var/log/orthodoxmetrics/
sudo rm /var/log/orthodoxmetrics/*.log.*.gz

# Security audit
node testing/unified-tests.js --level debug --security-audit
```

### Troubleshooting Production Issues

#### Quick Diagnostics
```bash
# Check application status
pm2 status
pm2 logs orthodox-metrics --lines 50

# Check system resources
top
df -h
free -h

# Check database
mysql -u orthodoxapps -p -e "SHOW PROCESSLIST;"

# Check nginx
sudo nginx -t
sudo systemctl status nginx

# Run system health check
node testing/unified-tests.js --level debug --production
```

#### Emergency Procedures
```bash
# Application emergency restart
pm2 restart orthodox-metrics --update-env

# Database emergency restart
sudo systemctl restart mysql

# Nginx emergency restart
sudo systemctl restart nginx

# Full system restart (last resort)
sudo reboot
```

---

This deployment guide provides comprehensive production deployment procedures while maintaining security and performance standards for Orthodox church communities. For troubleshooting specific issues, refer to the [Troubleshooting Guide](TROUBLESHOOTING.md). 🏛️🚀
