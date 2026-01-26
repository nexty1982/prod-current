# OrthodoxMetrics SDLC Backup System

## Overview

The OrthodoxMetrics SDLC Backup System is an enterprise-grade backup solution that provides secure, automated full and differential backups with encryption, integrity verification, and comprehensive logging.

## Features

### 🔒 **Security**
- **GPG Encryption**: AES-256 encryption for all backup files
- **Secure Key Management**: Encryption keys stored in `/root/.om_backup_key` (chmod 600)
- **Root-only Access**: All backup files and directories restricted to root user

### 📦 **Backup Types**
- **Full Backups**: Complete system snapshots including all files and databases
- **Differential Backups**: Only files changed since the last full backup
- **Database Dumps**: Automatic MySQL dumps with transactions and triggers

### 🗂️ **Backup Targets**
- **System Directories**:
  - `/var/www/orthodox-church-mgmt/` (application code)
  - `/opt/om-frontend/` (frontend assets)
- **Databases**:
  - `orthodoxmetrics_db` (main database)
  - All `##-church_db` instances (automatically detected)
- **Configuration**:
  - `/etc/pm2/` (PM2 configuration)
  - `/root/.pm2/` (PM2 ecosystem)

### ⏰ **Automated Scheduling**
- **Full Backups**: Sundays at 2:00 AM
- **Differential Backups**: Monday-Saturday at 2:00 AM
- **Cleanup**: Daily at 3:00 AM (retention policy enforcement)

### 📊 **Retention Policy**
- **Full Backups**: Keep 4 most recent
- **Differential Backups**: Keep 7 days worth
- **Auto-pruning**: Automatic cleanup of old backups

### 🔍 **Integrity & Verification**
- **SHA256 Checksums**: Generated for all backup files
- **Automatic Verification**: Checksums verified after backup creation
- **Comprehensive Logging**: Detailed logs with timestamps and error tracking

## Installation

### Quick Install
```bash
# Run the installation script
sudo /var/www/orthodox-church-mgmt/orthodoxmetrics/prod/server/scripts/install-backup-system.sh
```

### Manual Installation
```bash
# 1. Install dependencies
sudo apt-get update
sudo apt-get install -y gpg tar gzip mysql-client nodejs npm

# 2. Set up directories
sudo mkdir -p /backups
sudo chmod 700 /backups
sudo chown root:root /backups

# 3. Create log files
sudo touch /var/log/om-backup.log /var/log/om-backup-cron.log
sudo chmod 644 /var/log/om-backup.log /var/log/om-backup-cron.log

# 4. Set script permissions
sudo chmod +x /var/www/orthodox-church-mgmt/orthodoxmetrics/prod/server/scripts/*.sh
sudo chmod +x /var/www/orthodox-church-mgmt/orthodoxmetrics/prod/server/scripts/*.js
```

## Usage

### Manual Commands

#### Create Backups
```bash
# Create a full backup
sudo /var/www/orthodox-church-mgmt/orthodoxmetrics/prod/server/scripts/backup.sh full

# Create a differential backup
sudo /var/www/orthodox-church-mgmt/orthodoxmetrics/prod/server/scripts/backup.sh diff
```

#### Check Status
```bash
# View backup status and recent logs
sudo /var/www/orthodox-church-mgmt/orthodoxmetrics/prod/server/scripts/backup.sh status
```

#### Cleanup
```bash
# Run retention policy cleanup
sudo /var/www/orthodox-church-mgmt/orthodoxmetrics/prod/server/scripts/backup.sh cleanup
```

### Automated Scheduling

#### Set Up Cron Jobs
```bash
# Install automated backup scheduling
sudo /var/www/orthodox-church-mgmt/orthodoxmetrics/prod/server/scripts/setup-backup-cron.sh

# Check current cron jobs
sudo /var/www/orthodox-church-mgmt/orthodoxmetrics/prod/server/scripts/setup-backup-cron.sh show

# Remove cron jobs
sudo /var/www/orthodox-church-mgmt/orthodoxmetrics/prod/server/scripts/setup-backup-cron.sh remove
```

## File Structure

### Backup Storage
```
/backups/
├── 2024-01-15/
│   ├── full/
│   │   ├── full-2024-01-15T02-00-00.tar.gz.gpg
│   │   └── full-2024-01-15T02-00-00.tar.gz.gpg.sha256sum
│   └── diff/
│       ├── diff-2024-01-15T02-00-00.tar.gz.gpg
│       └── diff-2024-01-15T02-00-00.tar.gz.gpg.sha256sum
├── 2024-01-16/
│   └── diff/
│       ├── diff-2024-01-16T02-00-00.tar.gz.gpg
│       └── diff-2024-01-16T02-00-00.tar.gz.gpg.sha256sum
└── ...
```

### Log Files
- **Backup Logs**: `/var/log/om-backup.log`
- **Cron Logs**: `/var/log/om-backup-cron.log`

### Configuration Files
- **Encryption Key**: `/root/.om_backup_key` (chmod 600)
- **Scripts**: `/var/www/orthodox-church-mgmt/orthodoxmetrics/prod/server/scripts/`

## Backup Contents

### Full Backup Includes
- Complete application codebase
- All database dumps (compressed)
- Configuration files
- Uploaded files and assets
- PM2 ecosystem configuration

### Excluded from Backups
- `node_modules/` directories
- `.git/` directories
- `*.log` files
- `temp/` directories
- `uploads/temp/` directories

## Security Considerations

### Encryption
- All backup files are encrypted using GPG with AES-256
- Encryption key is stored securely in `/root/.om_backup_key`
- Key file permissions: 600 (root read/write only)

### Access Control
- Backup directories: 700 (root only)
- Log files: 644 (root read/write, others read)
- Scripts: 755 (root read/write/execute, others read/execute)

### Key Management
```bash
# View encryption key (root only)
sudo cat /root/.om_backup_key

# Backup encryption key (store securely)
sudo cp /root/.om_backup_key /path/to/secure/backup/

# Restore encryption key (if needed)
sudo cp /path/to/backup/.om_backup_key /root/.om_backup_key
sudo chmod 600 /root/.om_backup_key
```

## Monitoring

### Log Monitoring
```bash
# Monitor backup logs in real-time
sudo tail -f /var/log/om-backup.log

# Monitor cron logs
sudo tail -f /var/log/om-backup-cron.log

# Search for errors
sudo grep "ERROR" /var/log/om-backup.log
```

### Backup Status
```bash
# Check backup directory size
sudo du -sh /backups

# List recent backups
sudo find /backups -name "*.gpg" -exec ls -lh {} \;

# Verify checksums
sudo find /backups -name "*.sha256sum" -exec sha256sum -c {} \;
```

## Troubleshooting

### Common Issues

#### Permission Denied
```bash
# Fix permissions
sudo chown -R root:root /backups
sudo chmod -R 700 /backups
```

#### Encryption Key Issues
```bash
# Regenerate encryption key
sudo rm /root/.om_backup_key
sudo /var/www/orthodox-church-mgmt/orthodoxmetrics/prod/server/scripts/backup.sh full
```

#### Database Connection Issues
```bash
# Test MySQL connection
mysql -u root -p -e "SHOW DATABASES;"

# Check MySQL service
sudo systemctl status mysql
```

#### Disk Space Issues
```bash
# Check disk space
df -h /backups

# Run cleanup
sudo /var/www/orthodox-church-mgmt/orthodoxmetrics/prod/server/scripts/backup.sh cleanup
```

### Log Analysis
```bash
# View recent backup activity
sudo tail -n 50 /var/log/om-backup.log

# Search for specific errors
sudo grep -i "error\|failed" /var/log/om-backup.log

# Check backup completion
sudo grep -i "completed successfully" /var/log/om-backup.log
```

## Recovery

### Restore from Backup
```bash
# Decrypt backup file
echo "your-encryption-key" | gpg --batch --yes --passphrase-fd 0 --decrypt backup-file.tar.gz.gpg > backup-file.tar.gz

# Extract backup
tar -xzf backup-file.tar.gz -C /path/to/restore/

# Restore databases
gunzip -c database.sql.gz | mysql -u root -p database_name
```

### Emergency Recovery
```bash
# Stop services
sudo pm2 stop all
sudo systemctl stop mysql

# Restore from backup
# (Follow restore procedure above)

# Restart services
sudo systemctl start mysql
sudo pm2 start all
```

## Performance Considerations

### Backup Size Optimization
- Excludes unnecessary files (node_modules, logs, temp files)
- Uses compression (gzip) for all backups
- Differential backups only include changed files

### Timing Considerations
- Full backups: ~30-60 minutes (depending on system size)
- Differential backups: ~5-15 minutes
- Cleanup: ~1-5 minutes

### Resource Usage
- CPU: Moderate during compression/encryption
- Memory: Low (streaming operations)
- Disk I/O: High during backup creation
- Network: None (local backups)

## Integration with Existing Systems

### Coexistence with Original Backup System
- This system runs independently of the original nightly backup system
- Both systems can operate simultaneously
- Different backup locations and schedules

### Web Interface Integration
- Current web interface remains unchanged
- New backup system operates via CLI and cron
- Future Phase 1.5 will add web-based backup explorer

## Support

### Getting Help
1. Check logs: `/var/log/om-backup.log`
2. Run status check: `sudo backup.sh status`
3. Test system: `sudo install-backup-system.sh test`

### Emergency Contacts
- System Administrator: [Contact Information]
- Backup System Documentation: This file
- Log Location: `/var/log/om-backup.log`

---

**Note**: This backup system is designed for enterprise use and requires root privileges. Always test backup and restore procedures in a safe environment before relying on them in production. 