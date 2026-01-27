# Orthodox Metrics Server Setup Guide for 192.168.1.239
# Complete setup from scratch with multilingual database

## Prerequisites
- Ubuntu 20.04 LTS or later
- Root or sudo access
- Internet connection

## Step 1: Connect to the New Server
Open your SSH client and connect:
```bash
ssh ubuntu@192.168.1.239
```

## Step 2: Update System and Install Dependencies
```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install essential packages
sudo apt install -y curl wget git unzip software-properties-common

# Install Node.js 18.x LTS
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify Node.js installation
node --version
npm --version

# Install PM2 for process management
sudo npm install -g pm2

# Install MariaDB (MySQL compatible)
sudo apt install -y mariadb-server mariadb-client

# Install Nginx web server
sudo apt install -y nginx

# Install additional utilities
sudo apt install -y htop ufw fail2ban logrotate
```

## Step 3: Secure MariaDB Installation
```bash
sudo mysql_secure_installation
```
**Use these settings:**
- Set root password: `SecureOCMPassword2025!`
- Remove anonymous users: `Y`
- Disallow root login remotely: `Y` 
- Remove test database: `Y`
- Reload privilege tables: `Y`

## Step 4: Create Application Directories
```bash
# Create main application directory
sudo mkdir -p /var/www/orthodox-church-mgmt
sudo chown -R ubuntu:ubuntu /var/www/orthodox-church-mgmt

# Create backup directory
sudo mkdir -p /opt/backups/ocm
sudo chown -R ubuntu:ubuntu /opt/backups/ocm

# Create log directory
sudo mkdir -p /var/log/orthodox-church-mgmt
sudo chown -R ubuntu:ubuntu /var/log/orthodox-church-mgmt

# Create temporary directory for uploads
sudo mkdir -p /tmp/orthodox-uploads
sudo chown -R ubuntu:ubuntu /tmp/orthodox-uploads
```

## Step 5: Transfer Application Files
You need to transfer the application files from the source server. Choose one method:

### Method A: Direct Copy (if both servers are accessible)
```bash
# On your local machine or from source server
scp -r \\192.168.1.221\ocm-ssppoc\server ubuntu@192.168.1.239:/tmp/
scp \\192.168.1.221\ocm-ssppoc\package.json ubuntu@192.168.1.239:/tmp/
```

### Method B: Create Archive and Transfer
On your Windows machine, run this PowerShell script:
```powershell
# Create deployment archive
$sourceDir = "\\192.168.1.221\ocm-ssppoc"
$archivePath = "C:\temp\orthodox-deployment.zip"

# Ensure temp directory exists
New-Item -ItemType Directory -Path "C:\temp" -Force

# Create archive (you can use 7-Zip or built-in compression)
Compress-Archive -Path "$sourceDir\server", "$sourceDir\package.json", "$sourceDir\scripts" -DestinationPath $archivePath -Force

Write-Host "Archive created: $archivePath"
Write-Host "Transfer this file to ubuntu@192.168.1.239:/tmp/"
```

### Method C: Download from Cloud Storage
If you upload the files to Google Drive/Dropbox:
```bash
# Example with wget (replace with your download link)
cd /tmp
wget "YOUR_DOWNLOAD_LINK" -O orthodox-deployment.zip
unzip orthodox-deployment.zip
```

## Step 6: Extract and Setup Application Files
```bash
# Navigate to application directory
cd /var/www/orthodox-church-mgmt

# If you have a zip file in /tmp
if [ -f "/tmp/orthodox-deployment.zip" ]; then
    unzip /tmp/orthodox-deployment.zip -d .
    rm /tmp/orthodox-deployment.zip
fi

# If files were copied directly to /tmp
if [ -d "/tmp/server" ]; then
    cp -r /tmp/server .
    cp /tmp/package.json .
    if [ -d "/tmp/scripts" ]; then
        cp -r /tmp/scripts .
    fi
    rm -rf /tmp/server /tmp/package.json /tmp/scripts
fi

# Set proper permissions
sudo chown -R ubuntu:ubuntu /var/www/orthodox-church-mgmt
chmod +x scripts/*.sh 2>/dev/null || true
```

## Step 7: Create the Multilingual Database
```bash
cd /var/www/orthodox-church-mgmt

# Create the database setup script if not transferred
cat > setup_database.sh << 'EOF'
#!/bin/bash
set -e

DB_NAME="orthodoxmetrics_db"
DB_USER="orthodoxmetrics_user"
DB_PASSWORD="SecureOCMPassword2025!"
ROOT_PASSWORD="SecureOCMPassword2025!"

echo "Setting up multilingual database: $DB_NAME"

# Create database and user
mysql -u root -p"$ROOT_PASSWORD" << MYSQL_EOF
CREATE DATABASE IF NOT EXISTS $DB_NAME 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

CREATE USER IF NOT EXISTS '$DB_USER'@'localhost' IDENTIFIED BY '$DB_PASSWORD';

GRANT ALL PRIVILEGES ON $DB_NAME.* TO '$DB_USER'@'localhost';
GRANT CREATE ROUTINE ON $DB_NAME.* TO '$DB_USER'@'localhost';
GRANT ALTER ROUTINE ON $DB_NAME.* TO '$DB_USER'@'localhost';
GRANT EXECUTE ON $DB_NAME.* TO '$DB_USER'@'localhost';

FLUSH PRIVILEGES;
MYSQL_EOF

echo "Database and user created successfully"

# Import schema if available
if [ -f "server/database/orthodoxmetrics_db_schema.sql" ]; then
    echo "Importing multilingual schema..."
    mysql -u $DB_USER -p"$DB_PASSWORD" $DB_NAME < server/database/orthodoxmetrics_db_schema.sql
    echo "Schema imported successfully"
else
    echo "Schema file not found. Will create basic structure."
    # Create basic tables for immediate functionality
    mysql -u $DB_USER -p"$DB_PASSWORD" $DB_NAME << BASIC_SCHEMA
    -- Basic tables for immediate functionality
    CREATE TABLE IF NOT EXISTS churches (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        phone VARCHAR(50),
        address TEXT,
        city VARCHAR(100),
        country VARCHAR(100),
        preferred_language CHAR(2) DEFAULT 'en',
        currency CHAR(3) DEFAULT 'USD',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS invoices (
        id INT PRIMARY KEY AUTO_INCREMENT,
        invoice_number VARCHAR(50) UNIQUE NOT NULL,
        church_id INT NOT NULL,
        issue_date DATE NOT NULL,
        due_date DATE,
        language CHAR(2) DEFAULT 'en',
        currency CHAR(3) DEFAULT 'USD',
        total_amount DECIMAL(10,2) NOT NULL,
        status ENUM('draft', 'pending', 'sent', 'paid', 'overdue', 'cancelled') DEFAULT 'draft',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (church_id) REFERENCES churches(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS users (
        id INT PRIMARY KEY AUTO_INCREMENT,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        preferred_language CHAR(2) DEFAULT 'en',
        role ENUM('super_admin', 'admin', 'manager', 'user') DEFAULT 'user',
        church_id INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (church_id) REFERENCES churches(id) ON DELETE SET NULL
    );

    -- Insert sample data
    INSERT INTO churches (name, email, address, city, country, preferred_language, currency) VALUES
    ('St. Nicholas Orthodox Cathedral', 'admin@stnicholascathedral.org', '123 Orthodox Way', 'New York', 'United States', 'en', 'USD');

    INSERT INTO users (email, password_hash, first_name, last_name, role) VALUES
    ('admin@orthodoxmetrics.com', '\$2a\$10\$example_hash', 'System', 'Administrator', 'super_admin');
BASIC_SCHEMA
    echo "Basic schema created"
fi

echo "Database setup complete!"
EOF

chmod +x setup_database.sh
./setup_database.sh
```

## Step 8: Install Node.js Dependencies
```bash
cd /var/www/orthodox-church-mgmt

# Install production dependencies
npm install --production

# If package-lock.json exists, use it for exact versions
if [ -f "package-lock.json" ]; then
    npm ci --production
fi
```

## Step 9: Create Environment Configuration
```bash
cd /var/www/orthodox-church-mgmt

# Create production environment file
cat > .env << 'EOF'
# Orthodox Metrics Production Configuration
NODE_ENV=production
PORT=3001

# Database Configuration
DB_HOST=localhost
DB_NAME=orthodoxmetrics_db
DB_USER=orthodoxmetrics_user
DB_PASSWORD=SecureOCMPassword2025!

# Security
SESSION_SECRET=SecureSessionSecret2025Orthodox!
JWT_SECRET=SecureJWTSecret2025Orthodox!

# CORS Configuration
CORS_ORIGINS=https://orthodoxmetrics.com,https://www.orthodoxmetrics.com,http://192.168.1.239

# Logging
LOG_LEVEL=info
LOG_FILE=/var/log/orthodox-church-mgmt/app.log

# Multilingual Support
DEFAULT_LANGUAGE=en
SUPPORTED_LANGUAGES=en,gr,ru,ro
ENABLE_MULTILINGUAL=true

# Features
ENABLE_PDF_GENERATION=true
ENABLE_OCR_PROCESSING=true
ENABLE_EMAIL_NOTIFICATIONS=false

# File Upload
UPLOAD_DIR=/tmp/orthodox-uploads
MAX_FILE_SIZE=10485760

# Rate Limiting
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=100

# SSL/TLS (when enabled)
SSL_ENABLED=false
FORCE_HTTPS=false
EOF

# Secure the environment file
chmod 600 .env
```

## Step 10: Configure Nginx
```bash
# Create nginx configuration
sudo tee /etc/nginx/sites-available/orthodox-church-mgmt << 'EOF'
server {
    listen 80;
    server_name orthodoxmetrics.com www.orthodoxmetrics.com 192.168.1.239 _;
    
    # Basic security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    
    # Client max body size for file uploads
    client_max_body_size 10M;
    
    # API routes
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
    
    # Health check endpoint
    location /health {
        proxy_pass http://localhost:3001/health;
        access_log off;
    }
    
    # Static files and frontend
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
    
    # Logging
    access_log /var/log/nginx/orthodox_access.log;
    error_log /var/log/nginx/orthodox_error.log;
}
EOF

# Enable the site
sudo ln -sf /etc/nginx/sites-available/orthodox-church-mgmt /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test nginx configuration
sudo nginx -t

# Restart nginx
sudo systemctl restart nginx
sudo systemctl enable nginx
```

## Step 11: Configure Firewall
```bash
# Reset and configure UFW firewall
sudo ufw --force reset
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Allow SSH, HTTP, HTTPS
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Enable firewall
sudo ufw --force enable

# Check status
sudo ufw status
```

## Step 12: Start the Application
```bash
cd /var/www/orthodox-church-mgmt

# Start the application with PM2
pm2 start server/index.js --name "orthodox-church-mgmt" --env production

# Configure PM2 to start on boot
pm2 startup
pm2 save

# Check application status
pm2 status
pm2 logs orthodox-church-mgmt --lines 20
```

## Step 13: Verify Installation
```bash
# Test database connection
mysql -u orthodoxmetrics_user -pSecureOCMPassword2025! orthodoxmetrics_db -e "SELECT 'Database OK' as status;"

# Test application locally
curl http://localhost:3001/api/health

# Test through nginx
curl http://localhost/api/health

# Check system status
systemctl status nginx
systemctl status mysql
pm2 status

# View application logs
pm2 logs orthodox-church-mgmt --lines 50
```

## Step 14: Final Validation
Test these URLs in your browser or with curl:
- `http://192.168.1.239/api/health` - Health check
- `http://192.168.1.239/api/churches` - Churches endpoint
- `http://192.168.1.239/api/enhanced-invoices` - Enhanced invoices

## Troubleshooting Commands
If something goes wrong:
```bash
# Restart all services
sudo systemctl restart nginx
sudo systemctl restart mysql
pm2 restart orthodox-church-mgmt

# Check logs
pm2 logs orthodox-church-mgmt
sudo tail -f /var/log/nginx/orthodox_error.log
sudo tail -f /var/log/mysql/error.log

# Check service status
sudo systemctl status nginx
sudo systemctl status mysql
pm2 status

# Test database connection
mysql -u orthodoxmetrics_user -pSecureOCMPassword2025! -e "SHOW DATABASES;"
```

## Setup Complete!
Once all steps are completed successfully, your Orthodox Metrics system will be running on 192.168.1.239 with:
- ✅ Multilingual database support (English, Greek, Russian, Romanian)
- ✅ Complete invoice management system
- ✅ Church management features
- ✅ PDF generation capabilities
- ✅ Secure configuration
- ✅ Production-ready setup
