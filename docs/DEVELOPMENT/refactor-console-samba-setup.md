# Refactor Console - Samba Mount Setup Guide

## Overview

The Refactor Console supports scanning from a remote Samba share to access historical snapshots and backups. This guide explains how to configure the Samba mount on your server.

## Configuration Details

- **Remote Server**: `192.168.1.221`
- **Remote Path**: `/var/refactor-src/`
- **Local Mount Point**: `/mnt/refactor-remote`
- **Expected Structure**: `MM-YYYY/prod/` (e.g., `09-2025/prod/`, `01-2026/prod/`)

## Prerequisites

1. **Server Access**: SSH access to the production server
2. **Samba Client**: `cifs-utils` package installed
3. **Credentials**: Samba username and password
4. **Permissions**: Ability to modify `/etc/fstab` or configure autofs

## Installation Steps

### Step 1: Install Required Packages

```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install cifs-utils

# RHEL/CentOS
sudo yum install cifs-utils
```

### Step 2: Create Mount Point

```bash
sudo mkdir -p /mnt/refactor-remote
sudo chown www-data:www-data /mnt/refactor-remote  # Adjust user/group as needed
```

### Step 3: Configure Credentials

Create a credentials file (more secure than storing in fstab):

```bash
sudo nano /etc/samba/refactor-credentials
```

Add the following content:

```
username=your_samba_username
password=your_samba_password
domain=WORKGROUP
```

Secure the credentials file:

```bash
sudo chmod 600 /etc/samba/refactor-credentials
sudo chown root:root /etc/samba/refactor-credentials
```

### Step 4: Configure Mount (Choose One Method)

#### Option A: Using fstab (Simple, Mounts at Boot)

Edit `/etc/fstab`:

```bash
sudo nano /etc/fstab
```

Add this line:

```
//192.168.1.221/var/refactor-src /mnt/refactor-remote cifs credentials=/etc/samba/refactor-credentials,uid=33,gid=33,file_mode=0755,dir_mode=0755,nofail 0 0
```

**Note**: `uid=33,gid=33` is typically `www-data` on Ubuntu. Adjust based on your Node.js process user.

Mount immediately:

```bash
sudo mount -a
```

#### Option B: Using autofs (Recommended, On-Demand Mounting)

Install autofs:

```bash
sudo apt-get install autofs
```

Edit `/etc/auto.master`:

```bash
sudo nano /etc/auto.master
```

Add:

```
/mnt /etc/auto.mnt --timeout=300
```

Create `/etc/auto.mnt`:

```bash
sudo nano /etc/auto.mnt
```

Add:

```
refactor-remote -fstype=cifs,credentials=/etc/samba/refactor-credentials,uid=33,gid=33,file_mode=0755,dir_mode=0755 ://192.168.1.221/var/refactor-src
```

Restart autofs:

```bash
sudo systemctl restart autofs
sudo systemctl enable autofs
```

### Step 5: Verify Mount

Test the mount:

```bash
# Check if mounted
mount | grep refactor-remote

# List contents
ls -la /mnt/refactor-remote/

# Should see folders like:
# 09-2025/
# 10-2025/
# 11-2025/
# etc.

# Verify prod subdirectory
ls -la /mnt/refactor-remote/09-2025/prod/
```

## Testing the Integration

### 1. Test Backend API

```bash
# Health check
curl http://localhost:3001/api/refactor-console/health

# Test snapshot discovery
curl "http://localhost:3001/api/refactor-console/snapshots?sourceType=remote"

# Expected response:
# {
#   "ok": true,
#   "sourceType": "remote",
#   "basePath": "/mnt/refactor-remote",
#   "snapshots": [
#     {
#       "id": "01-2026",
#       "label": "January 2026",
#       "path": "/mnt/refactor-remote/01-2026/prod",
#       ...
#     }
#   ],
#   "defaultSnapshot": { ... },
#   "stats": { ... }
# }
```

### 2. Test in UI

1. Open Refactor Console in browser
2. Click the Settings icon (gear) next to the header
3. Select "Remote Samba" source type
4. Verify snapshots appear in dropdown
5. Select a snapshot
6. Click "Refresh" to scan
7. Verify scan completes successfully

## Troubleshooting

### Mount Failed - Permission Denied

**Problem**: Cannot mount the Samba share

**Solutions**:
```bash
# Check credentials
sudo cat /etc/samba/refactor-credentials

# Test manual mount
sudo mount -t cifs //192.168.1.221/var/refactor-src /mnt/refactor-remote -o credentials=/etc/samba/refactor-credentials

# Check Samba server accessibility
ping 192.168.1.221
telnet 192.168.1.221 445

# Check server logs
sudo tail -f /var/log/syslog | grep cifs
```

### Mount Succeeds But Directory Empty

**Problem**: Mount point appears empty

**Solutions**:
```bash
# Verify server-side permissions
# On the Samba server (192.168.1.221):
ls -la /var/refactor-src/

# Check Samba configuration
# On the Samba server:
sudo cat /etc/samba/smb.conf
# Verify the share is configured correctly

# Test from client
smbclient //192.168.1.221/var/refactor-src -U your_username
```

### Node.js Process Cannot Access Mount

**Problem**: API returns "Path does not exist" or permission errors

**Solutions**:
```bash
# Check ownership and permissions
ls -ld /mnt/refactor-remote
ls -la /mnt/refactor-remote/

# Verify Node.js process user
ps aux | grep node

# Fix permissions
sudo chown -R www-data:www-data /mnt/refactor-remote

# Or adjust fstab/autofs uid/gid
# uid=33,gid=33 (www-data)
# uid=1000,gid=1000 (first user)
```

### Snapshots Not Appearing

**Problem**: Dropdown shows "No snapshots available"

**Solutions**:
```bash
# Verify directory structure on mount
ls -la /mnt/refactor-remote/

# Expected structure:
# 09-2025/prod/
# 10-2025/prod/
# 11-2025/prod/

# Check backend logs
# Look for: "[SnapshotScanner] Found X snapshots"

# Manual test
node -e "
const fs = require('fs');
const entries = fs.readdirSync('/mnt/refactor-remote', { withFileTypes: true });
const dirs = entries.filter(e => e.isDirectory()).map(e => e.name);
console.log('Directories:', dirs);
const pattern = /^\d{2}-\d{4}$/;
const matches = dirs.filter(d => pattern.test(d));
console.log('Valid snapshots:', matches);
"
```

### Stale Mount (autofs)

**Problem**: Mount becomes stale or inaccessible

**Solutions**:
```bash
# Restart autofs
sudo systemctl restart autofs

# Force unmount and remount
sudo umount -l /mnt/refactor-remote
sudo systemctl restart autofs

# Access mount point to trigger remount
ls /mnt/refactor-remote/
```

## Security Considerations

1. **Credentials File**: Always use mode `600` and owner `root:root`
2. **Network**: Ensure Samba traffic is on trusted network or VPN
3. **Firewall**: Allow SMB/CIFS ports (445, 139) only from server IP
4. **Read-Only**: Consider mounting as read-only: `ro` option in fstab/autofs
5. **Audit**: Log access to the mount point for security auditing

## Performance Optimization

### Caching

Add caching options to fstab/autofs:

```
cache=loose,actimeo=3600
```

### Async I/O

Enable async for better performance:

```
async
```

### Complete Optimized Mount Options

```
//192.168.1.221/var/refactor-src /mnt/refactor-remote cifs credentials=/etc/samba/refactor-credentials,uid=33,gid=33,file_mode=0755,dir_mode=0755,cache=loose,actimeo=3600,async,nofail 0 0
```

## Monitoring

### Check Mount Status

```bash
# Script to check mount health
#!/bin/bash
if mount | grep -q refactor-remote; then
    echo "✓ Samba mount is active"
    ls /mnt/refactor-remote/ > /dev/null 2>&1
    if [ $? -eq 0 ]; then
        echo "✓ Mount is accessible"
    else
        echo "✗ Mount is stale, restarting autofs..."
        sudo systemctl restart autofs
    fi
else
    echo "✗ Mount is not active"
    if [ -f "/etc/auto.mnt" ]; then
        echo "  Triggering autofs..."
        ls /mnt/refactor-remote/ > /dev/null 2>&1
    fi
fi
```

### Add to Monitoring

Add this check to your monitoring system (Nagios, Zabbix, etc.):

```bash
#!/bin/bash
# Check if mount is accessible
timeout 5 ls /mnt/refactor-remote/ > /dev/null 2>&1
exit $?
```

## Backup and Recovery

### If Mount Fails

The application gracefully handles mount failures:
- Frontend shows warning message
- User can switch to "Local" source type
- No data loss occurs

### Fallback Configuration

If Samba mount is unavailable, you can temporarily copy snapshots locally:

```bash
# Copy remote snapshots to local directory
rsync -av user@192.168.1.221:/var/refactor-src/ /var/www/orthodoxmetrics/prod/refactor-src/

# Update UI to use "Local" source type
```

## Maintenance

### Regular Tasks

1. **Weekly**: Verify mount accessibility
2. **Monthly**: Check disk space on remote server
3. **Quarterly**: Review and rotate old snapshots
4. **Annually**: Update Samba credentials

### Log Rotation

Ensure Samba client logs are rotated:

```bash
# /etc/logrotate.d/cifs-mount
/var/log/cifs-mount.log {
    weekly
    rotate 4
    compress
    missingok
    notifempty
}
```

## Additional Resources

- [Ubuntu CIFS/Samba Mount Documentation](https://help.ubuntu.com/community/MountWindowsSharesPermanently)
- [autofs Documentation](https://wiki.archlinux.org/title/Autofs)
- [CIFS Mount Options](https://www.kernel.org/doc/html/latest/filesystems/cifs/usage.html)

## Support

If you encounter issues not covered in this guide:

1. Check backend logs: `tail -f /var/log/nginx/error.log` or Node.js logs
2. Check system logs: `sudo journalctl -xe`
3. Verify network connectivity: `ping 192.168.1.221`
4. Test Samba connectivity: `smbclient -L //192.168.1.221 -U username`

---

**Last Updated**: January 26, 2026  
**Tested On**: Ubuntu 20.04 LTS, Ubuntu 22.04 LTS
