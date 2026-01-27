# Orthodox Church Management System - Operations Guide

## 📋 Table of Contents

1. [System Overview](#system-overview)
2. [Server Management](#server-management)
3. [Database Operations](#database-operations)
4. [Process Management with PM2](#process-management-with-pm2)
5. [Backup and Restore](#backup-and-restore)
6. [Deployment and Migration](#deployment-and-migration)
7. [Monitoring and Logs](#monitoring-and-logs)
8. [Troubleshooting](#troubleshooting)
9. [Security Operations](#security-operations)
10. [Maintenance Tasks](#maintenance-tasks)

---

## System Overview

The Orthodox Church Management System consists of:
- **Backend API Server**: Node.js/Express running on port 3001
- **Frontend Application**: React/Vite running on port 5173
- **Database**: MySQL/MariaDB
- **Process Manager**: PM2 for production deployments
- **Web Server**: Nginx (reverse proxy)

### Key Directories
```
/var/www/orthodox-church-mgmt/
├── server/           # Backend API
├── front-end/        # Frontend application
├── logs/            # Application logs
├── database/        # Database schemas and migrations
├── scripts/         # Deployment and utility scripts
└── docs/           # Documentation
```

---

## Server Management

### Starting Services

#### Development Mode
```bash
# Start backend (development)
cd /var/www/orthodox-church-mgmt/server
npm start

# Start frontend (development)
cd /var/www/orthodox-church-mgmt/front-end
npm run dev
```

#### Production Mode with PM2
```bash
# Start all services using PM2
pm2 start ecosystem.config.js

# Start specific service
pm2 start ecosystem.config.js --only orthodox-backend
pm2 start ecosystem.config.js --only orthodox-frontend
```

### Stopping Services
```bash
# Stop all PM2 processes
pm2 stop all

# Stop specific service
pm2 stop orthodox-backend
pm2 stop orthodox-frontend

# Delete processes from PM2
pm2 delete all
pm2 delete orthodox-backend
```

### Server Status
```bash
# Check all running processes
pm2 list

# Detailed status
pm2 status

# Interactive monitoring
pm2 monit

# Check system resources
htop
df -h
free -h
```

---

## Database Operations

### Database Connection
```bash
# Connect to MySQL
mysql -u root -p

# Connect to specific database
mysql -u ocm_user -p orthodox_metrics_db
```

### Schema Management
```bash
# Apply main schema
mysql -u root -p orthodox_metrics_db < /var/www/orthodox-church-mgmt/database/orthodoxmetrics_db_schema.sql

# Apply specific schema updates
mysql -u root -p orthodox_metrics_db < /var/www/orthodox-church-mgmt/database/notes_schema.sql
mysql -u root -p orthodox_metrics_db < /var/www/orthodox-church-mgmt/database/notifications_schema.sql
mysql -u root -p orthodox_metrics_db < /var/www/orthodox-church-mgmt/database/kanban_schema.sql
```

### User Management
```bash
# Create admin user
mysql -u root -p orthodox_metrics_db < /var/www/orthodox-church-mgmt/database/create_admin_user.sql

# Fix admin roles
mysql -u root -p orthodox_metrics_db < /var/www/orthodox-church-mgmt/database/fix_admin_role.sql
```

### Database Backup
```bash
# Full database backup
mysqldump -u root -p orthodox_metrics_db > /var/backups/orthodox_metrics_$(date +%Y%m%d_%H%M%S).sql

# Backup specific tables
mysqldump -u root -p orthodox_metrics_db users roles permissions > /var/backups/auth_tables_$(date +%Y%m%d_%H%M%S).sql

# Backup with compression
mysqldump -u root -p orthodox_metrics_db | gzip > /var/backups/orthodox_metrics_$(date +%Y%m%d_%H%M%S).sql.gz
```

### Database Restore
```bash
# Restore from backup
mysql -u root -p orthodox_metrics_db < /var/backups/orthodox_metrics_backup.sql

# Restore compressed backup
gunzip -c /var/backups/orthodox_metrics_backup.sql.gz | mysql -u root -p orthodox_metrics_db
```

---

## Process Management with PM2

### PM2 Configuration
The system uses `ecosystem.config.js` for PM2 configuration:

```javascript
module.exports = {
    apps: [
        {
            name: 'orthodox-backend',
            script: 'index.js',
            cwd: '/var/www/orthodox-church-mgmt/server',
            instances: 1,
            autorestart: true,
            max_memory_restart: '1G',
            env: {
                NODE_ENV: 'production',
                PORT: 3001
            }
        },
        {
            name: 'orthodox-frontend',
            script: 'npm',
            args: 'run dev',
            cwd: '/var/www/orthodox-church-mgmt/front-end',
            instances: 1,
            autorestart: true,
            max_memory_restart: '1G',
            env: {
                NODE_ENV: 'development',
                PORT: 5173
            }
        }
    ]
};
```

### PM2 Commands
```bash
# Process management
pm2 start ecosystem.config.js        # Start all services
pm2 restart all                      # Restart all services
pm2 reload all                       # Reload all services (zero-downtime)
pm2 stop all                         # Stop all services
pm2 delete all                       # Delete all services

# Individual service management
pm2 restart orthodox-backend
pm2 stop orthodox-frontend
pm2 delete orthodox-backend

# Process information
pm2 list                            # List all processes
pm2 describe orthodox-backend       # Detailed process info
pm2 monit                          # Real-time monitoring

# Log management
pm2 logs                           # Show all logs
pm2 logs orthodox-backend          # Show specific service logs
pm2 logs --lines 100               # Show last 100 lines
pm2 flush                          # Clear all logs

# Auto-startup
pm2 startup                        # Generate startup script
pm2 save                          # Save current process list
pm2 resurrect                     # Restore saved processes
```

---

## Backup and Restore

### Application Backup
```bash
# Create full system backup
tar -czf /var/backups/orthodox_system_$(date +%Y%m%d_%H%M%S).tar.gz \
    /var/www/orthodox-church-mgmt/ \
    --exclude=/var/www/orthodox-church-mgmt/node_modules \
    --exclude=/var/www/orthodox-church-mgmt/logs

# Backup configuration files
tar -czf /var/backups/orthodox_config_$(date +%Y%m%d_%H%M%S).tar.gz \
    /var/www/orthodox-church-mgmt/server/.env \
    /var/www/orthodox-church-mgmt/ecosystem.config.js \
    /etc/nginx/sites-available/orthodox-church-mgmt
```

### Database Backup (Automated)
```bash
# Add to crontab for daily backups
crontab -e

# Add this line for daily backup at 2 AM
0 2 * * * /usr/bin/mysqldump -u root -p'your_password' orthodox_metrics_db | gzip > /var/backups/orthodox_metrics_$(date +\%Y\%m\%d).sql.gz
```

### Log Rotation
```bash
# Create log rotation configuration
sudo nano /etc/logrotate.d/orthodox-church-mgmt

# Add this configuration:
/var/www/orthodox-church-mgmt/logs/*.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    create 644 www-data www-data
    postrotate
        pm2 reloadLogs
    endscript
}
```

---

## Deployment and Migration

### Server Migration Script
```bash
# Make migration script executable
chmod +x /var/www/orthodox-church-mgmt/scripts/migrate-server.sh

# Migrate to new server
./scripts/migrate-server.sh -h 192.168.1.100 -u ubuntu -p 22

# Verify deployment
./scripts/check-deployment.sh -h 192.168.1.100
```

### Manual Deployment Steps
```bash
# 1. Stop services
pm2 stop all

# 2. Backup current version
cp -r /var/www/orthodox-church-mgmt /var/backups/orthodox_$(date +%Y%m%d_%H%M%S)

# 3. Pull latest code
cd /var/www/orthodox-church-mgmt
git pull origin main

# 4. Install dependencies
cd server && npm install
cd ../front-end && npm install

# 5. Run database migrations
mysql -u root -p orthodox_metrics_db < database/latest_schema.sql

# 6. Start services
pm2 start ecosystem.config.js

# 7. Verify deployment
pm2 list
curl http://localhost:3001/health
curl http://localhost:5173
```

---

## Monitoring and Logs

### Real-time Monitoring
```bash
# PM2 monitoring dashboard
pm2 monit

# System resources
htop
iotop
nethogs

# Service status
systemctl status nginx
systemctl status mysql
```

### Log Analysis
```bash
# Application logs
tail -f /var/www/orthodox-church-mgmt/logs/orthodox-backend.log
tail -f /var/www/orthodox-church-mgmt/logs/orthodox-frontend.log

# PM2 logs
pm2 logs --lines 100
pm2 logs orthodox-backend --lines 50

# System logs
journalctl -u nginx -f
journalctl -u mysql -f

# Error logs
grep -i error /var/www/orthodox-church-mgmt/logs/*.log
grep -i "500" /var/log/nginx/error.log
```

### Performance Monitoring
```bash
# Check memory usage
ps aux | grep node
free -h

# Check disk usage
df -h
du -sh /var/www/orthodox-church-mgmt/*

# Check network connections
netstat -tulpn | grep :3001
netstat -tulpn | grep :5173

# Check database connections
mysql -u root -p -e "SHOW PROCESSLIST;"
```

---

## Troubleshooting

### Common Issues and Solutions

#### Service Won't Start
```bash
# Check PM2 status
pm2 list

# Check logs for errors
pm2 logs orthodox-backend --lines 20

# Check if ports are in use
lsof -i :3001
lsof -i :5173

# Kill processes on port
kill -9 $(lsof -t -i:3001)
```

#### Database Connection Issues
```bash
# Check MySQL service
systemctl status mysql

# Test database connection
mysql -u ocm_user -p orthodox_metrics_db -e "SELECT 1;"

# Check database users
mysql -u root -p -e "SELECT user, host FROM mysql.user;"

# Reset database password
mysql -u root -p -e "ALTER USER 'ocm_user'@'localhost' IDENTIFIED BY 'new_password';"
```

#### Permission Issues
```bash
# Fix file permissions
sudo chown -R www-data:www-data /var/www/orthodox-church-mgmt
sudo chmod -R 755 /var/www/orthodox-church-mgmt
sudo chmod 600 /var/www/orthodox-church-mgmt/server/.env

# Fix log directory permissions
sudo chown -R www-data:www-data /var/www/orthodox-church-mgmt/logs
sudo chmod -R 755 /var/www/orthodox-church-mgmt/logs
```

#### Frontend Build Issues
```bash
# Clear cache and rebuild
cd /var/www/orthodox-church-mgmt/front-end
rm -rf node_modules
rm package-lock.json
npm install
npm run build
```

#### Frontend Import/Module Errors
```bash
# Common React hook import errors
# Error: "useEffect is not defined"
# Fix: Add missing imports to React import statement
# Example: import React, { useState, useEffect, useCallback } from 'react';

# Common icon import errors  
# Error: "does not provide an export named 'IconName'"
# Fix: Check @tabler/icons-react documentation for correct icon names
# Alternative: Use different icon or create custom icon component

# Vite dependency issues
cd /var/www/orthodox-church-mgmt/front-end
rm -rf node_modules/.vite
npm run dev

# TypeScript compilation errors
npx tsc --noEmit  # Check for type errors without building
```

---

## Security Operations

### SSL Certificate Management
```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Generate SSL certificate
sudo certbot --nginx -d yourdomain.com

# Renew certificates
sudo certbot renew --dry-run

# Auto-renewal (add to crontab)
0 12 * * * /usr/bin/certbot renew --quiet
```

### Security Hardening
```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Check for security updates
sudo unattended-upgrades

# Configure firewall
sudo ufw enable
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 3001/tcp
sudo ufw allow 5173/tcp

# Check open ports
nmap -sT -O localhost
```

### Password Management
```bash
# Generate secure password
openssl rand -base64 32

# Hash password for admin user
node -e "console.log(require('bcrypt').hashSync('your_password', 10))"

# Update admin password in database
mysql -u root -p orthodox_metrics_db -e "UPDATE users SET password_hash = 'hashed_password' WHERE username = 'admin';"
```

---

## Maintenance Tasks

### Daily Tasks
```bash
# Check service status
pm2 list

# Check disk space
df -h

# Check error logs
grep -i error /var/www/orthodox-church-mgmt/logs/*.log | tail -10

# Check system resources
free -h
```

### Weekly Tasks
```bash
# Update system packages
sudo apt update && sudo apt list --upgradable

# Check log file sizes
du -sh /var/www/orthodox-church-mgmt/logs/*

# Review PM2 logs
pm2 logs --lines 100 | grep -i error

# Check database size
mysql -u root -p -e "SELECT table_schema AS 'Database', ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS 'Size (MB)' FROM information_schema.tables WHERE table_schema = 'orthodox_metrics_db';"
```

### Monthly Tasks
```bash
# Full system backup
tar -czf /var/backups/orthodox_system_$(date +%Y%m%d).tar.gz /var/www/orthodox-church-mgmt/

# Database backup
mysqldump -u root -p orthodox_metrics_db | gzip > /var/backups/orthodox_metrics_$(date +%Y%m%d).sql.gz

# Clean old backups (keep last 3 months)
find /var/backups -name "orthodox_*" -mtime +90 -delete

# Update npm dependencies
cd /var/www/orthodox-church-mgmt/server && npm audit fix
cd /var/www/orthodox-church-mgmt/front-end && npm audit fix

# SSL certificate renewal
sudo certbot renew
```

---

## Emergency Procedures

### Service Recovery
```bash
# Quick service restart
pm2 restart all

# If PM2 is unresponsive
pm2 kill
pm2 start ecosystem.config.js

# Database recovery
sudo systemctl restart mysql
mysql -u root -p orthodox_metrics_db < /var/backups/latest_backup.sql
```

### System Recovery
```bash
# Restore from backup
tar -xzf /var/backups/orthodox_system_backup.tar.gz -C /

# Restore database
gunzip -c /var/backups/orthodox_metrics_backup.sql.gz | mysql -u root -p orthodox_metrics_db

# Restart all services
sudo systemctl restart nginx
sudo systemctl restart mysql
pm2 restart all
```

---

## Contact Information

For technical support:
- System Administrator: [Your Contact]
- Database Administrator: [Your Contact]
- Development Team: [Your Contact]

## Useful Links

- [PM2 Documentation](https://pm2.keymetrics.io/docs/)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)
- [MySQL Documentation](https://dev.mysql.com/doc/)
- [Nginx Configuration](https://nginx.org/en/docs/)
