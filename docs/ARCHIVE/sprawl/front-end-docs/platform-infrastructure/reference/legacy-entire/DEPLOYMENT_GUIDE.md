# Deployment Guide

## 🚀 Orthodox Metrics Production Deployment

This document provides comprehensive instructions for deploying the Orthodox Metrics system to production environments.

## 🎯 Deployment Overview

### Deployment Architecture
- **Frontend**: React SPA served by Nginx
- **Backend**: Node.js/Express API server
- **Database**: MySQL 8.0 with replication
- **Reverse Proxy**: Nginx with SSL termination
- **Process Management**: PM2 for Node.js processes
- **Monitoring**: System and application monitoring

### Deployment Options
1. **Single Server Deployment**: All components on one server
2. **Multi-Server Deployment**: Separate servers for different components
3. **Cloud Deployment**: AWS, Google Cloud, or Azure
4. **Container Deployment**: Docker with orchestration

## 🏗️ Infrastructure Requirements

### 1. Server Specifications

#### Production Server (Minimum)
- **CPU**: 4 cores (2.4GHz+)
- **RAM**: 8GB
- **Storage**: 100GB SSD
- **Network**: 1Gbps connection
- **OS**: Ubuntu 20.04 LTS or CentOS 8

#### Production Server (Recommended)
- **CPU**: 8 cores (3.0GHz+)
- **RAM**: 16GB
- **Storage**: 200GB SSD + backup storage
- **Network**: 1Gbps connection with redundancy
- **OS**: Ubuntu 22.04 LTS

### 2. Network Configuration

#### Firewall Rules
```bash
# Allow HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Allow SSH (change port if needed)
sudo ufw allow 22/tcp

# Allow MySQL (if external access needed)
sudo ufw allow 3306/tcp

# Enable firewall
sudo ufw enable
```

#### Domain and DNS Setup
```bash
# Example DNS records
example.com.        A       192.168.1.100
www.example.com.    CNAME   example.com.
api.example.com.    CNAME   example.com.
```

## 🛠️ System Preparation

### 1. Operating System Setup

#### Ubuntu 22.04 LTS Setup
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install essential packages
sudo apt install -y \
  curl \
  wget \
  git \
  unzip \
  software-properties-common \
  apt-transport-https \
  ca-certificates \
  gnupg \
  lsb-release

# Install build tools
sudo apt install -y \
  build-essential \
  python3 \
  python3-pip \
  make \
  g++
```

### 2. Node.js Installation

#### Install Node.js 18.x
```bash
# Add NodeSource repository
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -

# Install Node.js
sudo apt-get install -y nodejs

# Verify installation
node --version
npm --version

# Install PM2 globally
sudo npm install -g pm2
```

### 3. MySQL Installation

#### Install MySQL 8.0
```bash
# Install MySQL server
sudo apt update
sudo apt install -y mysql-server

# Secure MySQL installation
sudo mysql_secure_installation

# Start and enable MySQL
sudo systemctl start mysql
sudo systemctl enable mysql

# Create production database
mysql -u root -p
```

#### MySQL Production Configuration
```sql
-- Create production database
CREATE DATABASE orthodox_metrics;

-- Create application user
CREATE USER 'orthodox_app'@'localhost' IDENTIFIED BY 'strong_password_here';

-- Grant privileges
GRANT SELECT, INSERT, UPDATE, DELETE ON orthodox_metrics.* TO 'orthodox_app'@'localhost';

-- Create backup user
CREATE USER 'orthodox_backup'@'localhost' IDENTIFIED BY 'backup_password_here';
GRANT SELECT, LOCK TABLES ON orthodox_metrics.* TO 'orthodox_backup'@'localhost';

-- Flush privileges
FLUSH PRIVILEGES;
```

### 4. Nginx Installation

#### Install and Configure Nginx
```bash
# Install Nginx
sudo apt update
sudo apt install -y nginx

# Start and enable Nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Test Nginx
sudo nginx -t
```

## 📦 Application Deployment

### 1. Code Deployment

#### Create Application Directory
```bash
# Create application directory
sudo mkdir -p /var/www/orthodox-metrics
sudo chown -R $USER:$USER /var/www/orthodox-metrics

# Navigate to application directory
cd /var/www/orthodox-metrics
```

#### Deploy from Git Repository
```bash
# Clone repository
git clone https://github.com/your-org/orthodox-metrics.git .

# Create production branch
git checkout -b production
git pull origin main

# Set up directory structure
mkdir -p logs uploads certificates backups
```

### 2. Backend Deployment

#### Install Dependencies
```bash
# Navigate to server directory
cd /var/www/orthodox-metrics/server

# Install production dependencies
npm ci --only=production

# Install PM2 ecosystem
npm install -g pm2
```

#### Production Environment Configuration
```bash
# Create production environment file
cat > .env << EOF
# Database Configuration
DB_HOST=localhost
DB_USER=orthodox_app
DB_PASSWORD=strong_password_here
DB_NAME=orthodox_metrics

# Application Configuration
NODE_ENV=production
PORT=3000
FRONTEND_URL=https://example.com

# Session Configuration
SESSION_SECRET=$(openssl rand -base64 32)
SESSION_ENCRYPTION_KEY=$(openssl rand -base64 32)

# Security Configuration
BCRYPT_ROUNDS=12
JWT_SECRET=$(openssl rand -base64 32)

# File Upload Configuration
UPLOAD_MAX_SIZE=10485760
UPLOAD_ALLOWED_TYPES=pdf,doc,docx,txt,jpg,jpeg,png,gif
UPLOAD_PATH=/var/www/orthodox-metrics/uploads

# Logging Configuration
LOG_LEVEL=info
LOG_FILE=/var/www/orthodox-metrics/logs/app.log

# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_FROM=noreply@example.com

# SSL Configuration
SSL_CERT_PATH=/etc/letsencrypt/live/example.com/fullchain.pem
SSL_KEY_PATH=/etc/letsencrypt/live/example.com/privkey.pem
EOF

# Secure environment file
chmod 600 .env
```

#### Database Migration
```bash
# Run database migrations
mysql -u orthodox_app -p orthodox_metrics < database/schema.sql

# Run initial data seeding
node database/seed.js
```

#### PM2 Configuration
```bash
# Create PM2 ecosystem file
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [
    {
      name: 'orthodox-metrics-api',
      script: 'index.js',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      error_file: '/var/www/orthodox-metrics/logs/pm2-error.log',
      out_file: '/var/www/orthodox-metrics/logs/pm2-out.log',
      log_file: '/var/www/orthodox-metrics/logs/pm2-combined.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      max_memory_restart: '1G',
      node_args: '--max-old-space-size=1024',
      watch: false,
      ignore_watch: ['node_modules', 'logs', 'uploads'],
      restart_delay: 4000,
      max_restarts: 5,
      min_uptime: '10s'
    }
  ]
};
EOF
```

### 3. Frontend Deployment

#### Build Production Assets
```bash
# Navigate to frontend directory
cd /var/www/orthodox-metrics/front-end

# Install dependencies
npm ci

# Build production assets
npm run build

# Move build to web root
sudo cp -r dist/* /var/www/orthodox-metrics/public/
```

#### Frontend Environment Configuration
```bash
# Create production environment file
cat > .env.production << EOF
REACT_APP_API_URL=https://api.example.com
REACT_APP_NAME=Orthodox Metrics
REACT_APP_VERSION=1.0.0
REACT_APP_ENV=production
REACT_APP_DEBUG=false
EOF
```

## 🌐 Nginx Configuration

### 1. SSL Certificate Setup

#### Install Certbot
```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obtain SSL certificate
sudo certbot --nginx -d example.com -d www.example.com -d api.example.com

# Test certificate renewal
sudo certbot renew --dry-run
```

### 2. Nginx Site Configuration

#### Create Nginx Configuration
```bash
# Create site configuration
sudo tee /etc/nginx/sites-available/orthodox-metrics << EOF
# Rate limiting
limit_req_zone \$binary_remote_addr zone=login:10m rate=5r/m;
limit_req_zone \$binary_remote_addr zone=api:10m rate=20r/m;

# Upstream backend
upstream orthodox_api {
    server 127.0.0.1:3000;
    keepalive 32;
}

# HTTP redirect to HTTPS
server {
    listen 80;
    server_name example.com www.example.com api.example.com;
    return 301 https://\$server_name\$request_uri;
}

# Main website
server {
    listen 443 ssl http2;
    server_name example.com www.example.com;

    # SSL configuration
    ssl_certificate /etc/letsencrypt/live/example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Document root
    root /var/www/orthodox-metrics/public;
    index index.html index.htm;

    # Static file serving
    location ~* \.(css|js|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        gzip_static on;
    }

    # API proxy
    location /api {
        limit_req zone=api burst=10 nodelay;
        
        proxy_pass http://orthodox_api;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 86400;
    }

    # Auth endpoints with stricter rate limiting
    location /api/auth {
        limit_req zone=login burst=3 nodelay;
        
        proxy_pass http://orthodox_api;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # File uploads
    location /uploads {
        alias /var/www/orthodox-metrics/uploads;
        expires 1d;
        add_header Cache-Control "public";
    }

    # React app (catch all)
    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # Error pages
    error_page 404 /404.html;
    error_page 500 502 503 504 /50x.html;
}

# API subdomain
server {
    listen 443 ssl http2;
    server_name api.example.com;

    # SSL configuration
    ssl_certificate /etc/letsencrypt/live/example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # API proxy
    location / {
        limit_req zone=api burst=10 nodelay;
        
        proxy_pass http://orthodox_api;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

# Enable site
sudo ln -s /etc/nginx/sites-available/orthodox-metrics /etc/nginx/sites-enabled/

# Remove default site
sudo rm /etc/nginx/sites-enabled/default

# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

## 🚀 Service Management

### 1. Start Application Services

#### Start Backend with PM2
```bash
# Navigate to server directory
cd /var/www/orthodox-metrics/server

# Start application
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 startup script
pm2 startup

# Follow the instructions provided by PM2
```

#### Verify Services
```bash
# Check PM2 processes
pm2 list

# Check PM2 logs
pm2 logs

# Check Nginx status
sudo systemctl status nginx

# Check MySQL status
sudo systemctl status mysql
```

### 2. Service Monitoring

#### PM2 Monitoring
```bash
# Monitor processes
pm2 monit

# View logs
pm2 logs orthodox-metrics-api

# Restart application
pm2 restart orthodox-metrics-api

# Reload with zero downtime
pm2 reload orthodox-metrics-api
```

## 🔧 Configuration Management

### 1. Environment-Specific Configurations

#### Production Security Settings
```bash
# Secure file permissions
sudo chown -R www-data:www-data /var/www/orthodox-metrics
sudo chmod -R 755 /var/www/orthodox-metrics
sudo chmod -R 700 /var/www/orthodox-metrics/uploads
sudo chmod 600 /var/www/orthodox-metrics/server/.env

# Secure log files
sudo chmod 644 /var/www/orthodox-metrics/logs/*
sudo chown -R www-data:www-data /var/www/orthodox-metrics/logs
```

### 2. Database Configuration

#### MySQL Production Optimization
```sql
-- /etc/mysql/mysql.conf.d/mysqld.cnf
[mysqld]
# Performance tuning
innodb_buffer_pool_size = 4G
innodb_log_file_size = 512M
innodb_flush_method = O_DIRECT
innodb_flush_log_at_trx_commit = 2

# Security settings
bind-address = 127.0.0.1
skip-name-resolve
secure_file_priv = /var/lib/mysql-files/

# Logging
log_error = /var/log/mysql/error.log
slow_query_log = 1
slow_query_log_file = /var/log/mysql/slow.log
long_query_time = 2
```

## 📊 Monitoring and Logging

### 1. Application Monitoring

#### Setup System Monitoring
```bash
# Install monitoring tools
sudo apt install -y htop iotop nethogs

# Install log monitoring
sudo apt install -y logwatch

# Configure logwatch
sudo tee /etc/logwatch/conf/logwatch.conf << EOF
LogDir = /var/log
TmpDir = /var/cache/logwatch
MailTo = admin@example.com
MailFrom = logwatch@example.com
Print = No
Save = /var/cache/logwatch
Range = yesterday
Detail = Med
Service = All
EOF
```

#### Setup Application Monitoring
```bash
# Install PM2 monitoring
pm2 install pm2-logrotate

# Configure log rotation
pm2 set pm2-logrotate:retain 30
pm2 set pm2-logrotate:compress true
pm2 set pm2-logrotate:dateFormat 'YYYY-MM-DD_HH-mm-ss'
pm2 set pm2-logrotate:max_size 10M
```

### 2. Log Management

#### Configure Logrotate
```bash
# Create logrotate configuration
sudo tee /etc/logrotate.d/orthodox-metrics << EOF
/var/www/orthodox-metrics/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 www-data www-data
    postrotate
        pm2 reloadLogs
    endscript
}
EOF
```

## 🔄 Backup and Recovery

### 1. Database Backup

#### Automated Database Backup
```bash
# Create backup script
sudo tee /usr/local/bin/backup-orthodox-db.sh << 'EOF'
#!/bin/bash

# Configuration
DB_NAME="orthodox_metrics"
DB_USER="orthodox_backup"
DB_PASS="backup_password_here"
BACKUP_DIR="/var/backups/orthodox-metrics"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="orthodox_metrics_${DATE}.sql.gz"

# Create backup directory
mkdir -p ${BACKUP_DIR}

# Create backup
mysqldump -u ${DB_USER} -p${DB_PASS} ${DB_NAME} | gzip > ${BACKUP_DIR}/${BACKUP_FILE}

# Remove backups older than 30 days
find ${BACKUP_DIR} -name "*.sql.gz" -mtime +30 -delete

# Log backup completion
echo "$(date): Database backup completed: ${BACKUP_FILE}" >> /var/log/orthodox-backup.log
EOF

# Make script executable
sudo chmod +x /usr/local/bin/backup-orthodox-db.sh

# Schedule daily backup
sudo crontab -e
# Add line: 0 2 * * * /usr/local/bin/backup-orthodox-db.sh
```

### 2. File System Backup

#### Application Backup Script
```bash
# Create application backup script
sudo tee /usr/local/bin/backup-orthodox-files.sh << 'EOF'
#!/bin/bash

# Configuration
APP_DIR="/var/www/orthodox-metrics"
BACKUP_DIR="/var/backups/orthodox-metrics"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="orthodox_files_${DATE}.tar.gz"

# Create backup directory
mkdir -p ${BACKUP_DIR}

# Create backup excluding unnecessary files
tar -czf ${BACKUP_DIR}/${BACKUP_FILE} \
    --exclude='node_modules' \
    --exclude='logs' \
    --exclude='.git' \
    --exclude='coverage' \
    --exclude='dist' \
    ${APP_DIR}

# Remove backups older than 7 days
find ${BACKUP_DIR} -name "*_files_*.tar.gz" -mtime +7 -delete

# Log backup completion
echo "$(date): Files backup completed: ${BACKUP_FILE}" >> /var/log/orthodox-backup.log
EOF

# Make script executable
sudo chmod +x /usr/local/bin/backup-orthodox-files.sh

# Schedule weekly backup
sudo crontab -e
# Add line: 0 3 * * 0 /usr/local/bin/backup-orthodox-files.sh
```

## 🔄 Deployment Automation

### 1. Deployment Script

#### Create Deployment Script
```bash
# Create deployment script
tee /var/www/orthodox-metrics/deploy.sh << 'EOF'
#!/bin/bash

# Configuration
APP_DIR="/var/www/orthodox-metrics"
BRANCH="production"
BACKUP_DIR="/var/backups/orthodox-metrics"
DATE=$(date +%Y%m%d_%H%M%S)

echo "Starting deployment at $(date)"

# Navigate to application directory
cd ${APP_DIR}

# Create backup before deployment
echo "Creating backup..."
tar -czf ${BACKUP_DIR}/pre_deploy_${DATE}.tar.gz \
    --exclude='node_modules' \
    --exclude='logs' \
    --exclude='.git' \
    .

# Pull latest code
echo "Pulling latest code..."
git fetch origin
git checkout ${BRANCH}
git pull origin ${BRANCH}

# Install/update dependencies
echo "Installing dependencies..."
cd server && npm ci --only=production
cd ../front-end && npm ci && npm run build

# Copy build to public directory
echo "Copying frontend build..."
cp -r dist/* ../public/

# Run database migrations
echo "Running database migrations..."
cd ../server
node database/migrate.js

# Restart application
echo "Restarting application..."
pm2 reload orthodox-metrics-api

# Test deployment
echo "Testing deployment..."
sleep 10
curl -f http://localhost:3000/api/health || exit 1

echo "Deployment completed successfully at $(date)"
EOF

# Make script executable
chmod +x /var/www/orthodox-metrics/deploy.sh
```

### 2. Health Check Script

#### Create Health Check Script
```bash
# Create health check script
tee /usr/local/bin/orthodox-health-check.sh << 'EOF'
#!/bin/bash

# Configuration
API_URL="http://localhost:3000/api/health"
EMAIL="admin@example.com"
LOG_FILE="/var/log/orthodox-health.log"

# Function to send alert
send_alert() {
    local message="$1"
    echo "$(date): $message" >> ${LOG_FILE}
    echo "$message" | mail -s "Orthodox Metrics Health Alert" ${EMAIL}
}

# Check API health
if ! curl -f -s ${API_URL} > /dev/null; then
    send_alert "API health check failed"
    exit 1
fi

# Check database connectivity
if ! mysql -u orthodox_app -p'strong_password_here' -e "SELECT 1" orthodox_metrics > /dev/null 2>&1; then
    send_alert "Database connectivity check failed"
    exit 1
fi

# Check disk space
DISK_USAGE=$(df /var/www/orthodox-metrics | tail -1 | awk '{print $5}' | sed 's/%//')
if [ ${DISK_USAGE} -gt 80 ]; then
    send_alert "Disk usage is ${DISK_USAGE}% - cleanup required"
fi

# Check memory usage
MEMORY_USAGE=$(free | grep Mem | awk '{printf "%.0f", ($3/$2)*100}')
if [ ${MEMORY_USAGE} -gt 90 ]; then
    send_alert "Memory usage is ${MEMORY_USAGE}% - investigation required"
fi

echo "$(date): Health check passed" >> ${LOG_FILE}
EOF

# Make script executable
sudo chmod +x /usr/local/bin/orthodox-health-check.sh

# Schedule health check every 5 minutes
sudo crontab -e
# Add line: */5 * * * * /usr/local/bin/orthodox-health-check.sh
```

## 🔍 Troubleshooting

### 1. Common Issues

#### Service Not Starting
```bash
# Check PM2 logs
pm2 logs orthodox-metrics-api

# Check system logs
sudo journalctl -u nginx -f

# Check MySQL logs
sudo tail -f /var/log/mysql/error.log

# Check port conflicts
sudo netstat -tulpn | grep :3000
sudo netstat -tulpn | grep :80
```

#### Database Connection Issues
```bash
# Test database connection
mysql -u orthodox_app -p orthodox_metrics

# Check MySQL process
sudo systemctl status mysql

# Reset MySQL password
sudo mysql -u root -p
ALTER USER 'orthodox_app'@'localhost' IDENTIFIED BY 'new_password';
FLUSH PRIVILEGES;
```

#### SSL Certificate Issues
```bash
# Check certificate expiry
sudo certbot certificates

# Renew certificate
sudo certbot renew

# Test SSL configuration
sudo nginx -t
```

### 2. Performance Issues

#### Identify Performance Bottlenecks
```bash
# Check CPU usage
top
htop

# Check memory usage
free -h
cat /proc/meminfo

# Check disk I/O
iotop
iostat -x 1

# Check network usage
nethogs
iftop
```

#### Database Performance
```sql
-- Check slow queries
SHOW PROCESSLIST;
SHOW FULL PROCESSLIST;

-- Check query performance
EXPLAIN SELECT * FROM users WHERE email = 'test@example.com';

-- Check table sizes
SELECT 
    table_name AS "Table",
    ROUND(((data_length + index_length) / 1024 / 1024), 2) AS "Size (MB)"
FROM information_schema.tables 
WHERE table_schema = 'orthodox_metrics'
ORDER BY (data_length + index_length) DESC;
```

## 📋 Deployment Checklist

### Pre-Deployment
- [ ] Code reviewed and tested
- [ ] Environment variables configured
- [ ] Database migrations ready
- [ ] SSL certificates valid
- [ ] Backup strategy in place
- [ ] Monitoring configured
- [ ] Health checks configured

### During Deployment
- [ ] Create backup
- [ ] Deploy code
- [ ] Run migrations
- [ ] Update dependencies
- [ ] Restart services
- [ ] Verify deployment
- [ ] Test critical functionality

### Post-Deployment
- [ ] Monitor logs for errors
- [ ] Check performance metrics
- [ ] Verify SSL certificates
- [ ] Test backup procedures
- [ ] Update documentation
- [ ] Notify stakeholders

---

*This deployment guide provides comprehensive instructions for deploying the Orthodox Metrics system to production. It should be updated whenever deployment procedures change or new infrastructure is added.*
