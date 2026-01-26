# Quick Start: SDLC Backup System

## 🚀 What You Need to Do

### 1. SSH into your Linux server
```bash
ssh user@your-server-ip
cd /var/www/orthodox-church-mgmt/orthodoxmetrics/prod
```

### 2. Run the setup script
```bash
sudo ./setup-sdlc-backup-complete.sh
```

### 3. Configure NFS (if using NFS backup)
```bash
sudo nano /etc/orthodoxmetrics/sdlc-backup.conf
```

Change these lines:
```bash
NFS_ENABLED=true
NFS_SERVER_IP="192.168.1.230"
NFS_REMOTE_PATH="/nfs/backup"
```

### 4. Test the system
```bash
# Check status
om-backup-status

# Test manual backup
om-backup-now

# Watch logs
tail -f /var/log/om-sdlc-backup.log
```

## 📅 Backup Schedule

- **Sundays at 3:00 AM**: Full backups of prod and dev
- **Monday-Saturday at 3:00 AM**: Incremental backups
- **Daily at 4:00 AM**: Cleanup old backups

## 📁 Backup Locations

- **Local**: `/var/backups/orthodoxmetrics/prod/` and `/dev/`
- **NFS**: `/mnt/orthodox-nfs-backup/prod/` and `/dev/`

## 🔧 Quick Commands

```bash
om-backup-status    # Check status
om-backup-now       # Manual backup
crontab -l          # View cron jobs
```

## 📋 What the System Does

1. **Full Backups** (Sundays): Complete zip files of both environments
2. **Incremental Backups** (Weekdays): Only changed files since last full backup
3. **NFS Integration**: Copies backups to your NFS server
4. **Auto Cleanup**: Removes backups older than 30 days
5. **Logging**: Detailed logs in `/var/log/om-sdlc-backup.log`

## ⚠️ Important Notes

- First backup will be full (no incremental available yet)
- NFS backup is disabled by default - enable in configuration
- Monitor disk space in `/var/backups/orthodoxmetrics/`
- Test restore procedures in a safe environment

## 🆘 Troubleshooting

```bash
# Check if scripts are executable
ls -la server/scripts/sdlc-backup-manager.sh

# Make executable if needed
chmod +x server/scripts/sdlc-backup-manager.sh

# Test NFS connection
ping 192.168.1.230
showmount -e 192.168.1.230
```

## 📖 Full Documentation

See `SDLC_BACKUP_SETUP_GUIDE.md` for complete documentation. 