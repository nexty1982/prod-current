# OrthodoxMetrics SDLC Backup System Setup Guide

## Overview

This guide will help you set up the automated SDLC backup system that creates:
- **Full backups every Sunday at 3:00 AM** for both prod and dev environments
- **Incremental backups Monday-Saturday at 3:00 AM**
- **NFS integration** for remote backup storage
- **Automatic cleanup** of old backups

## What Was Created

### 1. Core Scripts
- **`server/scripts/sdlc-backup-manager.sh`** - Main backup manager
- **`server/scripts/setup-sdlc-cron.sh`** - Cron job setup script
- **`setup-sdlc-backup-complete.sh`** - Complete installation script

### 2. Backup Targets
- **Production**: `/var/www/orthodox-church-mgmt/orthodoxmetrics/prod`
- **Development**: `/var/www/orthodox-church-mgmt/orthodoxmetrics/dev`

### 3. Backup Schedule
- **Sundays at 3:00 AM**: Full backups of both environments
- **Monday-Saturday at 3:00 AM**: Incremental backups
- **Daily at 4:00 AM**: Cleanup old backups

## Installation Steps

### Step 1: SSH into your Linux server
```bash
ssh user@your-server-ip
```

### Step 2: Navigate to the project directory
```bash
cd /var/www/orthodox-church-mgmt/orthodoxmetrics/prod
```

### Step 3: Run the complete setup script
```bash
sudo ./setup-sdlc-backup-complete.sh
```

This script will:
- Install system dependencies (zip, rsync, nfs-common, cron)
- Create backup directories
- Set up configuration files
- Install cron jobs
- Create management scripts
- Set up log files

### Step 4: Configure NFS (if using NFS backup)
```bash
sudo nano /etc/orthodoxmetrics/sdlc-backup.conf
```

Edit the configuration:
```bash
# Enable NFS backup
NFS_ENABLED=true
NFS_SERVER_IP="192.168.1.230"
NFS_REMOTE_PATH="/nfs/backup"
```

### Step 5: Test the system
```bash
# Check status
om-backup-status

# Test manual backup
om-backup-now

# Check logs
tail -f /var/log/om-sdlc-backup.log
```

## Configuration Options

### Main Configuration File: `/etc/orthodoxmetrics/sdlc-backup.conf`

```bash
# Enable/disable backup system
BACKUP_ENABLED=true

# NFS Configuration
NFS_ENABLED=false
NFS_SERVER_IP="192.168.1.230"
NFS_REMOTE_PATH="/nfs/backup"

# Backup Settings
RETENTION_DAYS=30
COMPRESSION=true

# Email Notifications
EMAIL_NOTIFICATIONS=false
NOTIFICATION_EMAIL=""
```

### Key Settings to Configure:

1. **NFS_ENABLED**: Set to `true` to enable NFS backup
2. **NFS_SERVER_IP**: Your NFS server IP address
3. **NFS_REMOTE_PATH**: NFS export path
4. **RETENTION_DAYS**: How long to keep backups (default: 30 days)
5. **EMAIL_NOTIFICATIONS**: Enable email alerts
6. **NOTIFICATION_EMAIL**: Email address for notifications

## Manual Commands

### Quick Commands (installed in `/usr/local/bin/`)
```bash
om-backup-status    # Check backup status
om-backup-now       # Create full backup now
```

### Advanced Commands
```bash
# Full backup
sudo /var/www/orthodox-church-mgmt/orthodoxmetrics/prod/server/scripts/sdlc-backup-manager.sh full

# Incremental backup
sudo /var/www/orthodox-church-mgmt/orthodoxmetrics/prod/server/scripts/sdlc-backup-manager.sh incremental

# Cleanup old backups
sudo /var/www/orthodox-church-mgmt/orthodoxmetrics/prod/server/scripts/sdlc-backup-manager.sh cleanup

# Check status
sudo /var/www/orthodox-church-mgmt/orthodoxmetrics/prod/server/scripts/sdlc-backup-manager.sh status
```

## Backup Locations

### Local Backups
```
/var/backups/orthodoxmetrics/
├── prod/
│   ├── full_backup_prod_20250126_030000.zip
│   ├── incremental_backup_prod_20250127_030000.zip
│   └── ...
└── dev/
    ├── full_backup_dev_20250126_030000.zip
    ├── incremental_backup_dev_20250127_030000.zip
    └── ...
```

### NFS Backups (if enabled)
```
/mnt/orthodox-nfs-backup/
├── prod/
│   ├── full_backup_prod_20250126_030000.zip
│   └── ...
└── dev/
    ├── full_backup_dev_20250126_030000.zip
    └── ...
```

## Monitoring and Logs

### Log Files
- **Backup logs**: `/var/log/om-sdlc-backup.log`
- **Cron logs**: `/var/log/om-sdlc-backup-cron.log`

### Monitor in Real-time
```bash
# Watch backup logs
tail -f /var/log/om-sdlc-backup.log

# Watch cron logs
tail -f /var/log/om-sdlc-backup-cron.log

# Check cron jobs
crontab -l
```

## NFS Setup

### 1. Test NFS Connection
```bash
# Test if NFS server is reachable
ping 192.168.1.230

# Check NFS exports
showmount -e 192.168.1.230
```

### 2. Mount NFS Share
```bash
# Create mount point
sudo mkdir -p /mnt/orthodox-nfs-backup

# Mount NFS share
sudo mount -t nfs 192.168.1.230:/nfs/backup /mnt/orthodox-nfs-backup

# Test mount
ls -la /mnt/orthodox-nfs-backup
```

### 3. Auto-mount on Boot
Add to `/etc/fstab`:
```
192.168.1.230:/nfs/backup /mnt/orthodox-nfs-backup nfs defaults 0 0
```

## Troubleshooting

### Common Issues

#### 1. Backup Script Not Found
```bash
# Check if script exists
ls -la /var/www/orthodox-church-mgmt/orthodoxmetrics/prod/server/scripts/sdlc-backup-manager.sh

# Make executable if needed
chmod +x /var/www/orthodox-church-mgmt/orthodoxmetrics/prod/server/scripts/sdlc-backup-manager.sh
```

#### 2. Permission Denied
```bash
# Check file permissions
ls -la /var/backups/orthodoxmetrics/

# Fix permissions if needed
sudo chown -R root:root /var/backups/orthodoxmetrics/
sudo chmod -R 755 /var/backups/orthodoxmetrics/
```

#### 3. NFS Mount Failed
```bash
# Check NFS server
ping 192.168.1.230

# Check NFS exports
showmount -e 192.168.1.230

# Check mount point
ls -la /mnt/orthodox-nfs-backup
```

#### 4. Cron Jobs Not Running
```bash
# Check cron service
sudo systemctl status cron

# Check cron jobs
crontab -l

# Check cron logs
sudo tail -f /var/log/syslog | grep CRON
```

### Debug Commands

#### Test Backup Script
```bash
# Test help
sudo /var/www/orthodox-church-mgmt/orthodoxmetrics/prod/server/scripts/sdlc-backup-manager.sh help

# Test status
sudo /var/www/orthodox-church-mgmt/orthodoxmetrics/prod/server/scripts/sdlc-backup-manager.sh status

# Test manual backup
sudo /var/www/orthodox-church-mgmt/orthodoxmetrics/prod/server/scripts/sdlc-backup-manager.sh full
```

#### Check System Resources
```bash
# Check disk space
df -h /var/backups/orthodoxmetrics/

# Check memory
free -h

# Check system load
uptime
```

## Backup Verification

### 1. Check Backup Files
```bash
# List backup files
ls -la /var/backups/orthodoxmetrics/prod/
ls -la /var/backups/orthodoxmetrics/dev/

# Check file sizes
du -sh /var/backups/orthodoxmetrics/*/
```

### 2. Test Backup Restoration
```bash
# Extract a backup to test
cd /tmp
unzip /var/backups/orthodoxmetrics/prod/full_backup_prod_20250126_030000.zip

# Check contents
ls -la
```

### 3. Verify NFS Backups
```bash
# Check NFS backups
ls -la /mnt/orthodox-nfs-backup/prod/
ls -la /mnt/orthodox-nfs-backup/dev/
```

## Security Considerations

### 1. File Permissions
- Backup directories: `755` (root:root)
- Configuration file: `600` (root:root)
- Log files: `644` (root:root)

### 2. Network Security
- Use firewall rules to restrict NFS access
- Consider VPN for remote NFS access
- Use NFS v4 with Kerberos if available

### 3. Backup Encryption
- Consider encrypting sensitive backup files
- Use GPG for backup encryption
- Secure key management

## Maintenance

### 1. Regular Checks
```bash
# Weekly status check
om-backup-status

# Monthly log review
sudo tail -100 /var/log/om-sdlc-backup.log

# Quarterly disk space check
df -h /var/backups/orthodoxmetrics/
```

### 2. Update Configuration
```bash
# Edit configuration
sudo nano /etc/orthodoxmetrics/sdlc-backup.conf

# Reload configuration (no restart needed)
om-backup-status
```

### 3. Update Scripts
When updating the backup scripts:
```bash
# Make new scripts executable
chmod +x server/scripts/sdlc-backup-manager.sh
chmod +x server/scripts/setup-sdlc-cron.sh

# Test new scripts
sudo server/scripts/sdlc-backup-manager.sh help
```

## Support and Documentation

### Additional Documentation
- **System logs**: `/var/log/om-sdlc-backup.log`
- **Configuration**: `/etc/orthodoxmetrics/sdlc-backup.conf`
- **README**: `/etc/orthodoxmetrics/README-SDLC-BACKUP.md`

### Quick Reference
```bash
# Status
om-backup-status

# Manual backup
om-backup-now

# View logs
tail -f /var/log/om-sdlc-backup.log

# Edit config
sudo nano /etc/orthodoxmetrics/sdlc-backup.conf

# Check cron
crontab -l
```

## Next Steps

1. **Run the setup script** on your Linux server
2. **Configure NFS settings** if using NFS backup
3. **Test manual backup** to verify everything works
4. **Monitor the first automated backup** on Sunday at 3 AM
5. **Set up monitoring** for backup success/failure
6. **Test restore procedures** in a safe environment

The system is designed to be robust and self-maintaining, but regular monitoring and testing is recommended to ensure your backups are working correctly. 