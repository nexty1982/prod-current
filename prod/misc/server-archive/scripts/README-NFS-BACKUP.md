# OrthodoxMetrics NFS Remote Backup Configuration

## Overview

The NFS Remote Backup feature allows super administrators to configure Network File System (NFS) shares for remote backup storage. This provides an additional layer of data protection by storing backups on a separate NFS server.

## Features

### 🔒 **Security**
- **Super Admin Only**: Only users with `super_admin` role can access NFS configuration
- **Input Validation**: Comprehensive validation for IP addresses and file paths
- **Secure Mounting**: Proper file permissions and mount point security
- **Audit Logging**: All NFS operations are logged for security tracking

### 📦 **Functionality**
- **Dynamic Mounting**: Mount/unmount NFS shares on demand
- **Connection Testing**: Test NFS connectivity before mounting
- **Persistent Mounts**: Optional `/etc/fstab` integration for boot-time mounting
- **Status Monitoring**: Real-time mount status and disk space monitoring
- **Backup Integration**: Seamless integration with existing backup systems

### 🗂️ **Configuration Options**
- **NFS Server IP**: IPv4 address of the NFS server
- **Remote Path**: NFS export path on the server
- **Mount Target**: Local mount point (default: `/mnt/orthodox-nfs-backup`)
- **Persist Mount**: Add mount to `/etc/fstab` for automatic mounting

## Installation

### Prerequisites
- Root access to the server
- NFS server with configured exports
- Network connectivity to NFS server

### Step 1: Install Dependencies
```bash
# Run the NFS dependencies installation script
sudo /var/www/orthodox-church-mgmt/orthodoxmetrics/prod/server/scripts/install-nfs-dependencies.sh
```

### Step 2: Configure NFS Server
On your NFS server, ensure the export is properly configured:

```bash
# Example /etc/exports entry
/nfs/backup 192.168.1.0/24(rw,sync,no_subtree_check)
```

### Step 3: Access Web Interface
1. Log in as a super administrator
2. Navigate to **Admin → Backup Settings**
3. Click on the **"NFS Remote Backup"** tab
4. Configure your NFS settings

## Configuration

### Web Interface Configuration

#### Basic Settings
- **NFS Server IP**: Enter the IPv4 address of your NFS server (e.g., `192.168.1.230`)
- **Remote Path**: Enter the NFS export path (e.g., `/nfs/backup`)
- **Mount Target**: Local mount point (default: `/mnt/orthodox-nfs-backup`)
- **Persist Mount**: Enable to add mount to `/etc/fstab`

#### Advanced Options
- **Enable NFS Remote Backup**: Master toggle to enable/disable the feature
- **Test Connection**: Verify NFS connectivity before mounting
- **Manual Mount/Unmount**: Control mount status manually

### Configuration File
The NFS configuration is stored in `/etc/orthodoxmetrics/nfs-backup.conf`:

```json
{
  "enabled": true,
  "nfsServerIP": "192.168.1.230",
  "remotePath": "/nfs/backup",
  "mountTarget": "/mnt/orthodox-nfs-backup",
  "persistMount": false
}
```

## Usage

### Web Interface Operations

#### 1. Test Connection
1. Enter NFS Server IP and Remote Path
2. Click **"Test Connection"**
3. Verify connectivity and export availability

#### 2. Apply Settings
1. Configure all required fields
2. Click **"Apply Settings"**
3. System will test connection and mount if enabled

#### 3. Manual Mount/Unmount
- **Mount Share**: Manually mount the NFS share
- **Unmount Share**: Manually unmount the NFS share

#### 4. Monitor Status
- **Status Chip**: Shows current mount status (🟢 Mounted / 🔴 Not Mounted)
- **Disk Space**: Displays available space when mounted
- **Recent Backups**: View recent backup activity logs

### Command Line Operations

#### Check Mount Status
```bash
# Check if NFS is mounted
mount | grep nfs

# Check mount point
df -h /mnt/orthodox-nfs-backup
```

#### Manual Mount/Unmount
```bash
# Manual mount
sudo mount -t nfs 192.168.1.230:/nfs/backup /mnt/orthodox-nfs-backup

# Manual unmount
sudo umount /mnt/orthodox-nfs-backup
```

#### Test NFS Connectivity
```bash
# Test server connectivity
ping -c 1 192.168.1.230

# Check available exports
showmount -e 192.168.1.230
```

## API Endpoints

### Configuration Management
- `GET /api/admin/nfs-backup/config` - Get current configuration
- `POST /api/admin/nfs-backup/config` - Update configuration

### Connection Testing
- `POST /api/admin/nfs-backup/test` - Test NFS connection

### Mount Operations
- `POST /api/admin/nfs-backup/mount` - Mount NFS share
- `POST /api/admin/nfs-backup/unmount` - Unmount NFS share

### Status Monitoring
- `GET /api/admin/nfs-backup/status` - Get detailed status information

## Security Considerations

### Access Control
- All endpoints require `super_admin` authentication
- Configuration files are restricted to root access
- Mount operations require root privileges

### Input Validation
- IPv4 address validation
- File path validation (must start with `/`)
- SQL injection prevention
- Command injection prevention

### File Permissions
- Configuration directory: `700` (root only)
- Configuration file: `600` (root read/write)
- Mount point: `755` (root read/write/execute, others read/execute)
- Audit log: `644` (root read/write, others read)

## Monitoring and Logging

### Audit Log
All NFS operations are logged to `/var/log/orthodoxmetrics/audit.log`:

```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "action": "NFS_BACKUP_CONFIG_UPDATE",
  "details": {
    "enabled": true,
    "nfsServerIP": "192.168.1.230",
    "remotePath": "/nfs/backup",
    "mountResult": {
      "success": true,
      "message": "NFS share mounted successfully"
    }
  },
  "success": true,
  "user": "system"
}
```

### System Logs
- Mount/unmount operations: `/var/log/syslog`
- NFS client errors: `/var/log/syslog`
- Application errors: Application logs

## Troubleshooting

### Common Issues

#### 1. Connection Test Fails
**Symptoms**: "NFS connection test failed" error
**Solutions**:
```bash
# Check network connectivity
ping -c 1 <nfs-server-ip>

# Check NFS server exports
showmount -e <nfs-server-ip>

# Verify firewall settings
sudo ufw status
```

#### 2. Mount Permission Denied
**Symptoms**: "Mount failed: Permission denied" error
**Solutions**:
```bash
# Check NFS server permissions
# Ensure export allows client access

# Check local mount point permissions
ls -la /mnt/orthodox-nfs-backup

# Verify NFS client packages
dpkg -l | grep nfs-common
```

#### 3. Mount Point Busy
**Symptoms**: "Mount failed: Device or resource busy" error
**Solutions**:
```bash
# Check if already mounted
mount | grep nfs

# Force unmount if needed
sudo umount -f /mnt/orthodox-nfs-backup

# Check for processes using mount point
lsof /mnt/orthodox-nfs-backup
```

#### 4. Configuration Not Saving
**Symptoms**: Configuration changes not persisting
**Solutions**:
```bash
# Check file permissions
ls -la /etc/orthodoxmetrics/nfs-backup.conf

# Check directory permissions
ls -la /etc/orthodoxmetrics/

# Verify application has write access
sudo chown root:root /etc/orthodoxmetrics/nfs-backup.conf
sudo chmod 600 /etc/orthodoxmetrics/nfs-backup.conf
```

### Diagnostic Commands

#### Check NFS Client Status
```bash
# Verify NFS client installation
dpkg -l | grep nfs-common

# Check NFS client services
systemctl status nfs-common

# Test NFS functionality
showmount -e localhost
```

#### Check Mount Status
```bash
# List all NFS mounts
mount | grep nfs

# Check specific mount point
df -h /mnt/orthodox-nfs-backup

# Check mount options
cat /proc/mounts | grep nfs
```

#### Check Logs
```bash
# Check audit logs
tail -f /var/log/orthodoxmetrics/audit.log

# Check system logs for NFS
grep -i nfs /var/log/syslog

# Check application logs
tail -f /var/log/om-backup.log
```

## Performance Considerations

### Network Performance
- Ensure adequate network bandwidth between client and NFS server
- Consider using dedicated network for backup traffic
- Monitor network latency and throughput

### Disk Performance
- NFS server should have fast storage (SSD recommended)
- Consider RAID configuration for redundancy
- Monitor disk I/O performance

### Backup Performance
- NFS backups may be slower than local backups
- Consider differential backups to reduce transfer time
- Monitor backup completion times

## Integration with Existing Systems

### Backup System Integration
- NFS mount point is automatically used by backup scripts
- Backup files are written to NFS share when mounted
- Existing backup retention policies apply to NFS backups

### Monitoring Integration
- NFS status is included in system health checks
- Backup monitoring includes NFS mount status
- Alert system can notify on NFS mount failures

## Future Enhancements

### Planned Features
- **SMB/CIFS Support**: Add support for Windows file shares
- **Cloud Backup**: Integration with cloud storage providers
- **Backup Encryption**: Encrypt backups before transfer
- **Compression**: Compress backups to reduce transfer time
- **Bandwidth Limiting**: Control backup transfer speeds

### Advanced Configuration
- **Multiple NFS Servers**: Support for backup redundancy
- **Load Balancing**: Distribute backups across multiple servers
- **Failover**: Automatic failover to backup NFS servers

## Support

### Getting Help
1. Check the troubleshooting section above
2. Review audit logs: `/var/log/orthodoxmetrics/audit.log`
3. Check system logs: `/var/log/syslog`
4. Test NFS connectivity manually
5. Verify NFS server configuration

### Emergency Recovery
```bash
# Emergency unmount
sudo umount -f /mnt/orthodox-nfs-backup

# Disable NFS backup
echo '{"enabled": false}' | sudo tee /etc/orthodoxmetrics/nfs-backup.conf

# Restart backup services
sudo systemctl restart orthodoxmetrics-backup
```

---

**Note**: This NFS backup feature is designed for enterprise use and requires proper NFS server configuration. Always test in a safe environment before deploying to production. 