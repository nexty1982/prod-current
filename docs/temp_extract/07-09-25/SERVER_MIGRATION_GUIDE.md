# Server Migration Guide

This guide explains how to migrate your Orthodox Metrics system to a new server using the provided migration scripts.

## Overview

The migration system provides automated deployment of your backend system to a new server via SSH/SCP. It includes:

- **Automated server preparation** (dependencies, users, directories)
- **Application file transfer** with selective copying
- **Database setup and schema migration**
- **Service configuration** (systemd, nginx)
- **Health checks and verification**
- **Post-deployment instructions**

## Prerequisites

### Local Machine Requirements
- SSH client (OpenSSH recommended)
- SCP client
- Bash (Linux/macOS) or PowerShell 5.0+ (Windows)
- SSH key pair for target server access

### Target Server Requirements
- Ubuntu 18.04+ or similar Debian-based system
- SSH access with sudo privileges
- Internet connectivity for package installation
- At least 2GB RAM and 20GB disk space

## Quick Start

### 1. Prepare SSH Access

```bash
# Generate SSH key if you don't have one
ssh-keygen -t rsa -b 4096 -f ~/.ssh/ocm_deploy_key

# Copy public key to target server
ssh-copy-id -i ~/.ssh/ocm_deploy_key.pub user@target-server
```

### 2. Linux/macOS Migration

```bash
# Make script executable
chmod +x scripts/migrate-server.sh

# Basic migration
./scripts/migrate-server.sh -h 192.168.1.100

# Advanced migration with custom options
./scripts/migrate-server.sh \
  -h production-server.com \
  -u deploy \
  -k ~/.ssh/deploy_key \
  -d /opt/orthodox-church-mgmt
```

### 3. Windows Migration

```powershell
# Basic migration
.\scripts\migrate-server.ps1 -RemoteHost "192.168.1.100"

# Advanced migration with custom options
.\scripts\migrate-server.ps1 `
  -RemoteHost "production-server.com" `
  -RemoteUser "deploy" `
  -SshKey "~/.ssh/deploy_key" `
  -RemoteAppDir "/opt/orthodox-church-mgmt"
```

## Script Options

### Linux/macOS (migrate-server.sh)

| Option | Description | Default |
|--------|-------------|---------|
| `-h <host>` | Remote server hostname/IP | Required |
| `-u <user>` | Remote username | ubuntu |
| `-k <key>` | SSH private key path | ~/.ssh/id_rsa |
| `-d <dir>` | Remote app directory | /var/www/orthodox-church-mgmt |
| `-b <dir>` | Remote backup directory | /opt/backups/ocm |
| `--skip-deps` | Skip dependency installation | false |
| `--skip-db` | Skip database migration | false |
| `--dry-run` | Show commands without executing | false |

### PowerShell (migrate-server.ps1)

| Parameter | Description | Default |
|-----------|-------------|---------|
| `-RemoteHost` | Remote server hostname/IP | Required |
| `-RemoteUser` | Remote username | ubuntu |
| `-SshKey` | SSH private key path | ~/.ssh/id_rsa |
| `-RemoteAppDir` | Remote app directory | /var/www/orthodox-church-mgmt |
| `-RemoteBackupDir` | Remote backup directory | /opt/backups/ocm |
| `-SkipDeps` | Skip dependency installation | false |
| `-SkipDb` | Skip database migration | false |
| `-DryRun` | Show commands without executing | false |

## Migration Process

The migration follows these steps:

### 1. Server Preparation
- Creates necessary directories
- Backs up existing installation
- Installs system dependencies (Node.js, MySQL, Nginx)
- Creates application user account

### 2. File Transfer
- Copies application files selectively
- Excludes development files and sensitive data
- Creates production environment configuration

### 3. Dependency Installation
- Installs Node.js production dependencies
- Verifies package integrity

### 4. Database Setup
- Creates MySQL database and user
- Applies database schemas
- Sets up proper permissions

### 5. Service Configuration
- Creates systemd service for application
- Configures Nginx reverse proxy
- Sets up logging and monitoring

### 6. Service Startup
- Starts application service
- Configures automatic startup
- Performs health checks

## Post-Migration Tasks

After successful migration, complete these tasks:

### 1. Security Configuration

```bash
# SSH to your new server
ssh user@your-server

# Update database password
sudo nano /var/www/orthodox-church-mgmt/.env.production

# Generate new session secret
openssl rand -base64 32

# Update environment file with new values
```

### 2. Domain Configuration

```bash
# Update Nginx configuration
sudo nano /etc/nginx/sites-available/orthodox-church-mgmt

# Replace server_name _ with your domain
server_name your-domain.com www.your-domain.com;

# Test and reload Nginx
sudo nginx -t
sudo systemctl reload nginx
```

### 3. SSL Certificate (Recommended)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Verify auto-renewal
sudo certbot renew --dry-run
```

### 4. Database Backup Setup

```bash
# Create backup script
sudo nano /usr/local/bin/ocm-backup.sh

#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
mysqldump -u ocm_user -p orthodox_church_management > /opt/backups/ocm/db_backup_$DATE.sql
find /opt/backups/ocm -name "db_backup_*.sql" -mtime +30 -delete

# Make executable
sudo chmod +x /usr/local/bin/ocm-backup.sh

# Add to crontab
sudo crontab -e
# Add: 0 2 * * * /usr/local/bin/ocm-backup.sh
```

## Service Management

### Application Service

```bash
# Start/stop/restart application
sudo systemctl start orthodox-church-mgmt
sudo systemctl stop orthodox-church-mgmt
sudo systemctl restart orthodox-church-mgmt

# Check status and logs
sudo systemctl status orthodox-church-mgmt
sudo journalctl -u orthodox-church-mgmt -f

# Enable/disable automatic startup
sudo systemctl enable orthodox-church-mgmt
sudo systemctl disable orthodox-church-mgmt
```

### Nginx Service

```bash
# Test configuration
sudo nginx -t

# Reload/restart Nginx
sudo systemctl reload nginx
sudo systemctl restart nginx

# Check Nginx logs
sudo tail -f /var/log/nginx/ocm_access.log
sudo tail -f /var/log/nginx/ocm_error.log
```

## Troubleshooting

### Common Issues

#### SSH Connection Failed
```bash
# Check SSH key permissions
chmod 600 ~/.ssh/your_key

# Test SSH connection manually
ssh -i ~/.ssh/your_key user@server

# Check server SSH configuration
sudo nano /etc/ssh/sshd_config
```

#### Database Connection Failed
```bash
# Check MySQL service
sudo systemctl status mysql

# Test database connection
mysql -u ocm_user -p orthodox_church_management

# Check MySQL logs
sudo tail -f /var/log/mysql/error.log
```

#### Application Won't Start
```bash
# Check application logs
sudo journalctl -u orthodox-church-mgmt -f

# Check environment file
sudo nano /var/www/orthodox-church-mgmt/.env.production

# Test application manually
cd /var/www/orthodox-church-mgmt/server
sudo -u ocm NODE_ENV=production node index.js
```

#### Nginx Configuration Issues
```bash
# Test Nginx configuration
sudo nginx -t

# Check Nginx logs
sudo tail -f /var/log/nginx/error.log

# Verify port availability
sudo netstat -tlnp | grep :80
sudo netstat -tlnp | grep :3001
```

### Health Checks

```bash
# Application health check
curl http://localhost:3001/api/health

# Full service check
curl -I http://your-domain.com/api/health

# Database connectivity check
mysql -u ocm_user -p -e "SELECT 1" orthodox_church_management
```

## Migration Validation

After migration, verify these components:

- [ ] Application starts successfully
- [ ] Database connection works
- [ ] API endpoints respond correctly
- [ ] File uploads work
- [ ] SSL certificate is valid (if configured)
- [ ] Backups are working
- [ ] Monitoring is functional

## Rollback Procedure

If migration fails, you can rollback:

```bash
# Stop new services
sudo systemctl stop orthodox-church-mgmt
sudo systemctl stop nginx

# Restore from backup (if exists)
cd /opt/backups/ocm
sudo tar -xzf ocm_backup_TIMESTAMP.tar.gz -C /var/www/orthodox-church-mgmt

# Restart services
sudo systemctl start nginx
sudo systemctl start orthodox-church-mgmt
```

## Environment Variables Reference

Key environment variables for production:

```bash
# Database
DB_HOST=localhost
DB_USER=ocm_user
DB_PASSWORD=secure_password
DB_NAME=orthodox_church_management

# Application
NODE_ENV=production
PORT=3001
HOST=0.0.0.0

# Security
SESSION_SECRET=very_secure_secret
CORS_ORIGINS=https://your-domain.com

# Logging
LOG_LEVEL=info
LOG_FILE=/var/log/orthodox-church-mgmt/app.log
```

## Support

For migration issues:

1. Check application logs: `sudo journalctl -u orthodox-church-mgmt -f`
2. Verify configuration files
3. Test individual components
4. Review this documentation
5. Check system requirements

Remember to always test migration on a staging environment before production deployment.
