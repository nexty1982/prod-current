# Orthodox Metrics Complete System Deployment Guide

This guide covers the deployment of the complete Orthodox Metrics ecosystem, including both the main multi-tenant system and the OrthodMetrics church portal.

## System Architecture

### Orthodox Metrics (Main System)
- **Frontend**: React/TypeScript (Port 5174)
- **Backend**: Node.js/Express (Port 3001) 
- **Database**: MariaDB (orthodox_metrics + per-client databases)
- **Features**: Multi-tenant SaaS, Admin dashboard, Client management

### OrthodMetrics Portal (Church Portal)
- **Frontend**: React/TypeScript (Port 5175)
- **Backend**: Node.js/Express (Port 3002)
- **Database**: MariaDB (orthodmetrics_portal)
- **Features**: Church registration, Subscription management, Upgrade path

## Quick Start (Development)

### 1. Database Setup
```bash
# Create main Orthodox Metrics database
mysql -u root -p < scripts/setup-main-database.sql

# Create OrthodMetrics portal database
mysql -u root -p < scripts/create-orthodmetrics-database.sql

# Run the quick setup script
bash scripts/quick-setup.sh
```

### 2. Start All Services

#### Option A: Individual Services
```bash
# Orthodox Metrics Backend
cd server && npm install && npm start

# Orthodox Metrics Frontend
cd front-end && npm install && npm run dev

# OrthodMetrics Portal Backend
cd orthodmetrics-portal/server && npm install && npm start

# OrthodMetrics Portal Frontend
cd orthodmetrics-portal/frontend && npm install && npm run dev
```

#### Option B: Batch Scripts (Windows)
```bash
# Start Orthodox Metrics
start-services.bat

# Start OrthodMetrics Portal
start-orthodmetrics-portal.bat
```

#### Option C: PM2 (Production)
```bash
# Install PM2 globally
npm install -g pm2

# Start all services
pm2 start ecosystem.config.cjs

# Monitor services
pm2 monit

# View logs
pm2 logs
```

### 3. Access the Systems

- **Orthodox Metrics**: http://localhost:5174
- **OrthodMetrics Portal**: http://localhost:5175
- **Orthodox Metrics API**: http://localhost:3001
- **OrthodMetrics Portal API**: http://localhost:3002

## Login Integration

The main Orthodox Metrics login page now includes a platform selector:

1. **Orthodox Metrics (Full System)**: 
   - Multi-tenant admin dashboard
   - Client management
   - Full feature set

2. **OrthodMetrics (Church Portal)**:
   - Church registration
   - Basic analytics
   - Subscription management
   - Upgrade path to full system

## Testing

### Comprehensive Test Suite
```bash
# Test Orthodox Metrics
bash scripts/comprehensive-test.sh

# Test OrthodMetrics Portal
bash scripts/test-orthodmetrics-portal.sh

# Test integration
bash scripts/test-integration.sh
```

### Manual Testing Workflow

1. **Orthodox Metrics Admin**:
   - Login at http://localhost:5174
   - Select "Orthodox Metrics (Full System)"
   - Access admin dashboard at `/admin/clients`

2. **OrthodMetrics Portal**:
   - Visit http://localhost:5175
   - Register a new church
   - Explore subscription plans
   - Test upgrade flow

3. **Integration**:
   - Login at Orthodox Metrics
   - Select "OrthodMetrics (Church Portal)"
   - Should redirect to portal

## Production Deployment

### Server Requirements
- **OS**: Ubuntu 20.04+ or CentOS 8+
- **Memory**: 4GB+ RAM
- **Storage**: 50GB+ SSD
- **CPU**: 2+ cores
- **Node.js**: 18+
- **MariaDB**: 10.6+
- **Nginx**: 1.18+

### 1. Server Setup
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install MariaDB
sudo apt install mariadb-server mariadb-client

# Install Nginx
sudo apt install nginx

# Install PM2
npm install -g pm2
```

### 2. Database Configuration
```bash
# Secure MariaDB
sudo mysql_secure_installation

# Create databases
mysql -u root -p < scripts/setup-main-database.sql
mysql -u root -p < scripts/create-orthodmetrics-database.sql
```

### 3. Application Deployment
```bash
# Clone repository
git clone <your-repo-url> /var/www/orthodox-metrics
cd /var/www/orthodox-metrics

# Install dependencies
npm install
cd front-end && npm install && npm run build
cd ../orthodmetrics-portal/frontend && npm install && npm run build
cd ../server && npm install
cd ../orthodmetrics-portal/server && npm install
```

### 4. Nginx Configuration
```nginx
# /etc/nginx/sites-available/orthodox-metrics
server {
    listen 80;
    server_name orthodox-metrics.com;
    
    # Orthodox Metrics Main App
    location / {
        proxy_pass http://localhost:5174;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
    
    # Orthodox Metrics API
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

# OrthodMetrics Portal
server {
    listen 80;
    server_name portal.orthodox-metrics.com;
    
    # Portal Frontend
    location / {
        proxy_pass http://localhost:5175;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
    
    # Portal API
    location /api/ {
        proxy_pass http://localhost:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 5. SSL Configuration
```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get SSL certificates
sudo certbot --nginx -d orthodox-metrics.com
sudo certbot --nginx -d portal.orthodox-metrics.com
```

### 6. Process Management
```bash
# Start services with PM2
pm2 start ecosystem.config.cjs --env production

# Save PM2 configuration
pm2 save

# Setup PM2 startup
pm2 startup

# Monitor services
pm2 monit
```

### 7. Firewall Configuration
```bash
# Allow necessary ports
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

## Environment Variables

### Orthodox Metrics (.env)
```env
NODE_ENV=production
PORT=3001
DB_HOST=localhost
DB_USER=orthodox_metrics_user
DB_PASSWORD=secure_password
SESSION_SECRET=your_session_secret
JWT_SECRET=your_jwt_secret
```

### OrthodMetrics Portal (.env)
```env
NODE_ENV=production
ORTHODMETRICS_PORT=3002
DB_HOST=localhost
DB_USER=orthodmetrics_user
DB_PASSWORD=secure_password
SESSION_SECRET=portal_session_secret
ORTHODOX_METRICS_URL=https://orthodox-metrics.com
```

## Monitoring and Logging

### Log Files
- **Orthodox Metrics**: `/var/www/orthodox-metrics/logs/`
- **OrthodMetrics Portal**: `/var/www/orthodox-metrics/logs/`
- **Nginx**: `/var/log/nginx/`
- **PM2**: `~/.pm2/logs/`

### Health Checks
```bash
# Check service status
pm2 status

# Check Orthodox Metrics health
curl http://localhost:3001/api/health

# Check OrthodMetrics Portal health
curl http://localhost:3002/api/health
```

### Database Monitoring
```sql
-- Check database size
SELECT 
    table_schema AS 'Database',
    ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS 'Size (MB)'
FROM information_schema.tables 
WHERE table_schema IN ('orthodox_metrics', 'orthodmetrics_portal')
GROUP BY table_schema;

-- Check active connections
SHOW PROCESSLIST;
```

## Backup Strategy

### Database Backups
```bash
#!/bin/bash
# Daily backup script
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/var/backups/orthodox-metrics"

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup Orthodox Metrics database
mysqldump -u root -p orthodox_metrics > $BACKUP_DIR/orthodox_metrics_$DATE.sql

# Backup OrthodMetrics Portal database
mysqldump -u root -p orthodmetrics_portal > $BACKUP_DIR/orthodmetrics_portal_$DATE.sql

# Backup all client databases
mysql -u root -p -e "SHOW DATABASES LIKE 'client_%'" | while read database; do
    if [ "$database" != "Database" ]; then
        mysqldump -u root -p $database > $BACKUP_DIR/${database}_$DATE.sql
    fi
done

# Compress backups
tar -czf $BACKUP_DIR/backup_$DATE.tar.gz $BACKUP_DIR/*.sql
rm $BACKUP_DIR/*.sql

# Keep only last 7 days
find $BACKUP_DIR -name "backup_*.tar.gz" -mtime +7 -delete
```

### Application Backups
```bash
# Backup application files
tar -czf /var/backups/orthodox-metrics/app_backup_$(date +%Y%m%d_%H%M%S).tar.gz \
    /var/www/orthodox-metrics \
    --exclude=node_modules \
    --exclude=.git \
    --exclude=logs
```

## Troubleshooting

### Common Issues

1. **Port Conflicts**: Check if ports 3001, 3002, 5174, 5175 are free
2. **Database Connection**: Verify credentials and MariaDB service status
3. **Permission Issues**: Check file ownership and permissions
4. **Memory Issues**: Monitor RAM usage with `htop`
5. **Disk Space**: Check available space with `df -h`

### Debug Commands
```bash
# Check service logs
pm2 logs orthodox-backend
pm2 logs orthodmetrics-portal-backend

# Check nginx logs
sudo tail -f /var/log/nginx/error.log

# Check database logs
sudo tail -f /var/log/mysql/error.log

# Check system resources
htop
iostat
```

## Security Considerations

1. **Database Security**:
   - Use strong passwords
   - Create dedicated database users
   - Limit database access by IP

2. **Application Security**:
   - Use HTTPS in production
   - Set secure session secrets
   - Implement rate limiting
   - Regular security updates

3. **Server Security**:
   - Keep OS updated
   - Use firewall
   - Disable root SSH login
   - Regular security audits

## Support and Maintenance

### Regular Maintenance Tasks
- Weekly: Check logs and disk space
- Monthly: Update dependencies and security patches
- Quarterly: Review and optimize database performance
- Annually: Security audit and backup testing

### Getting Help
- Check logs for error messages
- Review this deployment guide
- Contact development team for technical support
- Submit issues through the project repository

This deployment guide ensures a robust, scalable deployment of the complete Orthodox Metrics ecosystem.
