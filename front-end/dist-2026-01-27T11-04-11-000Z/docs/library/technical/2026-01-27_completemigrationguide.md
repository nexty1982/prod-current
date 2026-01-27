# Orthodox Metrics - Server Migration Guide
## Migration from 192.168.1.221 to 192.168.1.239

### Overview
This guide provides step-by-step instructions to migrate the entire Orthodox Metrics backend from the current server (192.168.1.221) to the new server (192.168.1.239).

### Prerequisites
- SSH access to the target server (192.168.1.239)
- Ubuntu user with sudo privileges on target server
- Network connectivity between servers

---

## Phase 1: Prepare Target Server

### 1.1 Connect to Target Server
```bash
ssh ubuntu@192.168.1.239
```

### 1.2 Update System
```bash
sudo apt update && sudo apt upgrade -y
```

### 1.3 Install Node.js 18.x
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### 1.4 Install System Dependencies
```bash
sudo apt install -y nginx mariadb-server mariadb-client git curl wget unzip
```

### 1.5 Install PM2 Process Manager
```bash
sudo npm install -g pm2
```

### 1.6 Create Application Directories
```bash
sudo mkdir -p /var/www/orthodox-church-mgmt
sudo mkdir -p /opt/backups/ocm
sudo mkdir -p /var/log/orthodox-church-mgmt

# Set permissions
sudo chown -R ubuntu:ubuntu /var/www/orthodox-church-mgmt
sudo chown -R ubuntu:ubuntu /opt/backups/ocm
sudo chown -R ubuntu:ubuntu /var/log/orthodox-church-mgmt
```

---

## Phase 2: Transfer Application Files

### 2.1 Create Archive on Source Server
On your Windows machine, create a PowerShell script to archive the files:

```powershell
# Create temporary directory
$tempDir = "C:\temp\ocm-migration"
New-Item -ItemType Directory -Path $tempDir -Force

# Copy server files
Copy-Item "\\192.168.1.221\ocm-ssppoc\server" "$tempDir\server" -Recurse -Force
Copy-Item "\\192.168.1.221\ocm-ssppoc\package.json" "$tempDir\package.json" -Force

# Create zip archive
Add-Type -AssemblyName System.IO.Compression.FileSystem
[System.IO.Compression.ZipFile]::CreateFromDirectory("$tempDir", "$tempDir\ocm-deployment.zip")
```

### 2.2 Transfer Files to Target Server
Use one of these methods:

**Option A: SCP (if SSH keys are configured)**
```bash
scp C:\temp\ocm-migration\ocm-deployment.zip ubuntu@192.168.1.239:/tmp/
```

**Option B: SFTP Client**
- Use WinSCP, FileZilla, or similar
- Upload `ocm-deployment.zip` to `/tmp/` on target server

**Option C: Cloud Storage**
- Upload to Google Drive, Dropbox, etc.
- Download on target server using wget

### 2.3 Extract on Target Server
```bash
cd /var/www/orthodox-church-mgmt
unzip /tmp/ocm-deployment.zip
rm /tmp/ocm-deployment.zip
```

---

## Phase 3: Database Setup

### 3.1 Secure MySQL Installation
```bash
sudo mysql_secure_installation
```
Use password: `SecureOCMPassword2025!`

### 3.2 Setup Multilingual Database
```bash
cd /var/www/orthodox-church-mgmt
chmod +x scripts/setup-database.sh
./scripts/setup-database.sh
```

**Alternative Manual Setup:**
```bash
sudo mysql -u root -p << 'EOF'
-- Create the multilingual database
CREATE DATABASE IF NOT EXISTS orthodoxmetrics_db 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

-- Create user
CREATE USER IF NOT EXISTS 'orthodoxmetrics_user'@'localhost' IDENTIFIED BY 'SecureOCMPassword2025!';

-- Grant permissions
GRANT ALL PRIVILEGES ON orthodoxmetrics_db.* TO 'orthodoxmetrics_user'@'localhost';
GRANT CREATE ROUTINE ON orthodoxmetrics_db.* TO 'orthodoxmetrics_user'@'localhost';
GRANT ALTER ROUTINE ON orthodoxmetrics_db.* TO 'orthodoxmetrics_user'@'localhost';
GRANT EXECUTE ON orthodoxmetrics_db.* TO 'orthodoxmetrics_user'@'localhost';
FLUSH PRIVILEGES;
EXIT
EOF

# Import the comprehensive multilingual schema
mysql -u orthodoxmetrics_user -p orthodoxmetrics_db < server/database/orthodoxmetrics_db_schema.sql
```

---

## Phase 4: Application Configuration

### 4.1 Install Dependencies
```bash
cd /var/www/orthodox-church-mgmt
npm install --production
```

### 4.2 Create Environment File
```bash
cat > .env << 'EOF'
NODE_ENV=production
PORT=3001
DB_HOST=localhost
DB_NAME=orthodoxmetrics_db
DB_USER=orthodoxmetrics_user
DB_PASSWORD=SecureOCMPassword2025!
SESSION_SECRET=SecureSessionSecret2025Orthodox!
CORS_ORIGINS=https://orthodoxmetrics.com,https://www.orthodoxmetrics.com
LOG_LEVEL=info
LOG_FILE=/var/log/orthodox-church-mgmt/app.log
# Multilingual support
DEFAULT_LANGUAGE=en
SUPPORTED_LANGUAGES=en,gr,ru,ro
# Feature flags
ENABLE_MULTILINGUAL=true
ENABLE_PDF_GENERATION=true
ENABLE_OCR_PROCESSING=true
EOF

chmod 600 .env
```

---

## Phase 5: Web Server Configuration

### 5.1 Create Nginx Configuration
```bash
sudo tee /etc/nginx/sites-available/orthodox-church-mgmt << 'EOF'
server {
    listen 80;
    server_name orthodoxmetrics.com www.orthodoxmetrics.com _;
    
    # For Let's Encrypt challenges
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }
    
    # Proxy to Node.js application
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # Serve static files or proxy to Node.js
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF
```

### 5.2 Enable Site and Restart Nginx
```bash
sudo ln -sf /etc/nginx/sites-available/orthodox-church-mgmt /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
sudo systemctl enable nginx
```

---

## Phase 6: Application Startup

### 6.1 Start Application with PM2
```bash
cd /var/www/orthodox-church-mgmt
pm2 start server/index.js --name "orthodox-church-mgmt" --env production
pm2 startup
pm2 save
```

### 6.2 Configure Firewall
```bash
sudo ufw --force reset
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable
```

---

## Phase 7: SSL Configuration (Optional but Recommended)

### 7.1 Install Certbot
```bash
sudo apt install -y certbot python3-certbot-nginx
```

### 7.2 Obtain SSL Certificate
```bash
sudo certbot --nginx -d orthodoxmetrics.com -d www.orthodoxmetrics.com --agree-tos --no-eff-email
```

---

## Phase 8: Validation and Testing

### 8.1 Test Basic Connectivity
```bash
curl http://192.168.1.239/api/health
```

### 8.2 Test All API Endpoints
```bash
# Health check
curl http://192.168.1.239/api/health

# Invoices
curl http://192.168.1.239/api/invoices

# Enhanced invoices
curl http://192.168.1.239/api/enhanced-invoices

# Churches
curl http://192.168.1.239/api/churches

# Baptism
curl http://192.168.1.239/api/baptism

# Marriage
curl http://192.168.1.239/api/marriage

# Funeral
curl http://192.168.1.239/api/funeral
```

### 8.3 Check Application Logs
```bash
pm2 logs orthodox-church-mgmt
```

### 8.4 Check System Status
```bash
pm2 status
sudo systemctl status nginx
sudo systemctl status mysql
```

---

## Phase 9: DNS and Final Setup

### 9.1 Update DNS Records
Point your domain to the new server IP: `192.168.1.239`

### 9.2 Test Production URLs
- https://orthodoxmetrics.com/api/health
- https://orthodoxmetrics.com/api/invoices
- https://orthodoxmetrics.com/api/enhanced-invoices

---

## Phase 10: Monitoring and Maintenance

### 10.1 Setup Log Rotation
```bash
sudo tee /etc/logrotate.d/orthodox-church-mgmt << 'EOF'
/var/log/orthodox-church-mgmt/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 ubuntu ubuntu
    postrotate
        pm2 reload orthodox-church-mgmt
    endscript
}
EOF
```

### 10.2 Setup Automated Backups
```bash
# Create backup script
sudo tee /opt/backups/ocm/backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/opt/backups/ocm"
DATE=$(date +%Y%m%d_%H%M%S)

# Database backup
mysqldump -u ocm_user -pSecureOCMPassword2025! orthodox_church_management > "$BACKUP_DIR/db_backup_$DATE.sql"

# Application backup
tar -czf "$BACKUP_DIR/app_backup_$DATE.tar.gz" -C /var/www orthodox-church-mgmt

# Remove backups older than 30 days
find "$BACKUP_DIR" -name "*.sql" -mtime +30 -delete
find "$BACKUP_DIR" -name "*.tar.gz" -mtime +30 -delete
EOF

chmod +x /opt/backups/ocm/backup.sh

# Add to crontab
(crontab -l 2>/dev/null; echo "0 2 * * * /opt/backups/ocm/backup.sh") | crontab -
```

---

## Troubleshooting

### Common Issues

1. **Application won't start**
   - Check logs: `pm2 logs orthodox-church-mgmt`
   - Verify environment file: `cat /var/www/orthodox-church-mgmt/.env`
   - Check database connection: `mysql -u ocm_user -p orthodox_church_management`

2. **Nginx 502 errors**
   - Verify Node.js is running: `pm2 status`
   - Check nginx logs: `sudo tail -f /var/log/nginx/error.log`
   - Test proxy connection: `curl http://localhost:3001/api/health`

3. **Database connection errors**
   - Verify MySQL is running: `sudo systemctl status mysql`
   - Check database credentials in `.env` file
   - Test connection: `mysql -u ocm_user -p orthodox_church_management`

4. **SSL certificate issues**
   - Check certificate status: `sudo certbot certificates`
   - Renew if needed: `sudo certbot renew`
   - Verify nginx configuration: `sudo nginx -t`

### Emergency Commands

```bash
# Restart all services
sudo systemctl restart nginx
pm2 restart orthodox-church-mgmt
sudo systemctl restart mysql

# Check all service status
sudo systemctl status nginx
pm2 status
sudo systemctl status mysql

# View real-time logs
pm2 logs orthodox-church-mgmt --lines 100
sudo tail -f /var/log/nginx/error.log
```

---

## Migration Checklist

- [ ] Target server prepared with all dependencies
- [ ] Application files transferred and extracted
- [ ] Database created and schema imported
- [ ] Environment configuration created
- [ ] Nginx configured and running
- [ ] Application started with PM2
- [ ] Firewall configured
- [ ] SSL certificate installed (optional)
- [ ] All API endpoints tested
- [ ] DNS updated to point to new server
- [ ] Backup system configured
- [ ] Monitoring in place

---

## API Endpoints Summary

After successful migration, these endpoints should be available:

### Core API Endpoints
- `GET /api/health` - Health check
- `GET /api/invoices` - List invoices
- `POST /api/invoices` - Create invoice
- `GET /api/enhanced-invoices` - Enhanced invoice management
- `POST /api/enhanced-invoices` - Create enhanced invoice
- `GET /api/enhanced-invoices/:id/generate-pdf` - Generate PDF

### Church Management
- `GET /api/churches` - List churches
- `POST /api/churches` - Create church
- `PUT /api/churches/:id` - Update church
- `DELETE /api/churches/:id` - Delete church

### Sacraments
- `GET /api/baptism` - Baptism records
- `POST /api/baptism` - Create baptism record
- `GET /api/marriage` - Marriage records  
- `POST /api/marriage` - Create marriage record
- `GET /api/funeral` - Funeral records
- `POST /api/funeral` - Create funeral record

### Support Endpoints
- `GET /api/components` - UI components
- `GET /api/menu` - Navigation menu
- `GET /api/pages` - Page content
- `GET /api/users` - User management
- `GET /api/permissions` - Permission management

---

This completes the comprehensive migration guide. Following these steps will successfully migrate the entire Orthodox Metrics system to the new server at 192.168.1.239.
