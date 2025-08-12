# MariaDB Startup Troubleshooting Guide

## 🔍 Overview

This guide provides comprehensive troubleshooting steps for MariaDB startup issues. Use the provided scripts for automated diagnosis or follow the manual steps below.

## ⚡ Quick Diagnosis

### Option 1: Quick Check Script
```bash
sudo ./quick-mariadb-check.sh
```
**Use this for:** Immediate feedback on common issues

### Option 2: Comprehensive Analysis
```bash
sudo ./troubleshoot-mariadb-startup.sh
```
**Use this for:** Detailed analysis and report generation

## 🚨 Common Startup Issues

### 1. Service Won't Start

#### Symptoms
- `systemctl start mariadb` fails
- Service status shows "failed" or "inactive"
- No error messages in logs

#### Quick Fixes
```bash
# Reset failed service
sudo systemctl reset-failed mariadb

# Start service
sudo systemctl start mariadb

# Check status
sudo systemctl status mariadb
```

#### Common Causes
- **Port conflicts**: Another process using port 3306
- **Permission issues**: Wrong ownership on data directory
- **Configuration errors**: Invalid my.cnf settings
- **Resource limits**: Insufficient memory or disk space

### 2. Permission Denied Errors

#### Symptoms
- "Permission denied" in error logs
- Cannot access data directory
- Service fails to start

#### Quick Fixes
```bash
# Fix data directory permissions
sudo chown -R mysql:mysql /var/lib/mysql
sudo chmod 755 /var/lib/mysql

# Fix log directory permissions
sudo chown -R mysql:mysql /var/log/mysql
sudo chmod 755 /var/log/mysql

# Fix configuration directory permissions
sudo chown -R mysql:mysql /etc/mysql
sudo chmod 644 /etc/mysql/*.cnf
```

### 3. Port Already in Use

#### Symptoms
- "Address already in use" error
- Port 3306 is occupied
- Service fails to bind to port

#### Quick Fixes
```bash
# Check what's using port 3306
sudo netstat -tlnp | grep 3306

# Kill conflicting process
sudo kill -9 [PID]

# Or stop conflicting service
sudo systemctl stop mysql  # if MySQL is running instead of MariaDB
```

### 4. Configuration File Errors

#### Symptoms
- "Unknown variable" errors
- "Invalid option" messages
- Service fails during startup

#### Quick Fixes
```bash
# Validate configuration
sudo mysqld --validate-config

# Check configuration syntax
sudo mysqld --print-defaults

# Backup and create minimal config
sudo cp /etc/mysql/my.cnf /etc/mysql/my.cnf.backup
sudo nano /etc/mysql/my.cnf
```

#### Minimal Configuration Example
```ini
[mysqld]
datadir=/var/lib/mysql
socket=/var/run/mysqld/mysqld.sock
user=mysql
bind-address=127.0.0.1
port=3306
```

### 5. Disk Space Issues

#### Symptoms
- "No space left on device" errors
- Service fails to write to data directory
- Log files show disk space warnings

#### Quick Fixes
```bash
# Check disk usage
df -h

# Clean up package cache
sudo apt-get clean
sudo apt-get autoremove

# Clean up logs
sudo journalctl --vacuum-time=7d

# Check for large files
sudo du -sh /var/lib/mysql/*
```

### 6. Memory Issues

#### Symptoms
- "Out of memory" errors
- Service starts but crashes
- High memory usage in logs

#### Quick Fixes
```bash
# Check memory usage
free -h

# Reduce memory settings in my.cnf
sudo nano /etc/mysql/my.cnf
```

#### Memory Configuration Example
```ini
[mysqld]
innodb_buffer_pool_size=256M
key_buffer_size=64M
max_connections=100
```

### 7. Corrupted Data Files

#### Symptoms
- "Table is corrupted" errors
- "InnoDB: Database was not shut down normally"
- Service fails during recovery

#### Quick Fixes
```bash
# Stop service
sudo systemctl stop mariadb

# Backup data directory
sudo cp -r /var/lib/mysql /var/lib/mysql.backup

# Run recovery
sudo mysqld --innodb-force-recovery=1

# Or reinstall if necessary
sudo apt-get remove --purge mariadb-server
sudo apt-get install mariadb-server
```

## 🔧 Advanced Troubleshooting

### 1. Manual Service Start

```bash
# Start MariaDB manually for debugging
sudo mysqld --user=mysql --verbose --help

# Start with specific configuration
sudo mysqld --defaults-file=/etc/mysql/my.cnf --user=mysql

# Start in safe mode
sudo mysqld --skip-grant-tables --user=mysql
```

### 2. Log Analysis

#### Error Log Locations
- `/var/log/mysql/error.log`
- `/var/log/mysqld.log`
- `/var/log/mysql/mysql.err`

#### System Logs
```bash
# Check system logs
sudo journalctl -u mariadb -f

# Check syslog
sudo tail -f /var/log/syslog | grep mariadb

# Check dmesg
sudo dmesg | grep -i mysql
```

### 3. Configuration Validation

```bash
# Validate all configuration files
sudo mysqld --validate-config

# Check configuration precedence
sudo mysqld --print-defaults

# Test configuration without starting
sudo mysqld --defaults-file=/etc/mysql/my.cnf --validate-config
```

### 4. Network Troubleshooting

```bash
# Check network interfaces
ip addr show

# Check firewall rules
sudo ufw status
sudo iptables -L

# Test network connectivity
telnet localhost 3306
```

## 📊 Diagnostic Commands

### System Information
```bash
# System overview
uname -a
cat /etc/os-release

# Resource usage
top
htop
iotop

# Disk information
df -h
iostat -x 1 5
```

### MariaDB Information
```bash
# Version information
mysql --version
mysqld --version

# Process information
ps aux | grep mysql
pgrep -l mysql

# Service information
systemctl status mariadb
systemctl show mariadb
```

### Network Information
```bash
# Port usage
netstat -tlnp | grep 3306
ss -tlnp | grep 3306
lsof -i :3306

# Network connections
netstat -an | grep 3306
ss -an | grep 3306
```

## 🛠️ Recovery Procedures

### 1. Complete Reset

```bash
# Stop service
sudo systemctl stop mariadb

# Backup data
sudo cp -r /var/lib/mysql /var/lib/mysql.backup.$(date +%Y%m%d)

# Remove data directory
sudo rm -rf /var/lib/mysql

# Reinitialize database
sudo mysql_install_db --user=mysql --datadir=/var/lib/mysql

# Start service
sudo systemctl start mariadb

# Secure installation
sudo mysql_secure_installation
```

### 2. Configuration Reset

```bash
# Backup current configuration
sudo cp /etc/mysql/my.cnf /etc/mysql/my.cnf.backup.$(date +%Y%m%d)

# Create minimal configuration
sudo tee /etc/mysql/my.cnf > /dev/null <<EOF
[mysqld]
datadir=/var/lib/mysql
socket=/var/run/mysqld/mysqld.sock
user=mysql
bind-address=127.0.0.1
port=3306

[mysql]
socket=/var/run/mysqld/mysqld.sock

[client]
socket=/var/run/mysqld/mysqld.sock
EOF

# Restart service
sudo systemctl restart mariadb
```

### 3. Service Reset

```bash
# Reset service state
sudo systemctl reset-failed mariadb

# Reload systemd
sudo systemctl daemon-reload

# Restart service
sudo systemctl restart mariadb

# Enable service
sudo systemctl enable mariadb
```

## 🔍 Log Analysis

### Common Error Patterns

#### 1. Permission Errors
```
ERROR 2002 (HY000): Can't connect to local MySQL server through socket
```
**Solution**: Fix socket file permissions

#### 2. Port Conflicts
```
ERROR 2003 (HY000): Can't connect to MySQL server on 'localhost' (111)
```
**Solution**: Check for conflicting processes

#### 3. Configuration Errors
```
ERROR 2002 (HY000): Can't connect to local MySQL server through socket
```
**Solution**: Validate configuration files

#### 4. Resource Errors
```
ERROR 2006 (HY000): MySQL server has gone away
```
**Solution**: Check memory and disk space

### Log Filtering Commands

```bash
# Show only errors
sudo tail -f /var/log/mysql/error.log | grep -i error

# Show startup messages
sudo journalctl -u mariadb | grep -i "start\|stop\|fail"

# Show recent activity
sudo tail -100 /var/log/mysql/error.log | grep -E "(ERROR|WARNING|CRITICAL)"

# Monitor live logs
sudo journalctl -u mariadb -f
```

## 📋 Troubleshooting Checklist

### Pre-Startup Checks
- [ ] Check disk space (`df -h`)
- [ ] Check memory usage (`free -h`)
- [ ] Verify service exists (`systemctl list-unit-files | grep mariadb`)
- [ ] Check port availability (`netstat -tlnp | grep 3306`)
- [ ] Verify data directory permissions (`ls -la /var/lib/mysql`)

### Startup Checks
- [ ] Check service status (`systemctl status mariadb`)
- [ ] Review error logs (`tail -50 /var/log/mysql/error.log`)
- [ ] Check system logs (`journalctl -u mariadb -n 50`)
- [ ] Validate configuration (`mysqld --validate-config`)
- [ ] Test network connectivity (`telnet localhost 3306`)

### Post-Startup Checks
- [ ] Verify service is running (`systemctl is-active mariadb`)
- [ ] Test database connection (`mysql -u root -p`)
- [ ] Check process list (`ps aux | grep mysql`)
- [ ] Monitor resource usage (`top`)
- [ ] Review access logs (`tail -f /var/log/mysql/access.log`)

## 🆘 Emergency Procedures

### If MariaDB Won't Start at All

1. **Check basic system health**
   ```bash
   df -h
   free -h
   uptime
   ```

2. **Check for conflicting processes**
   ```bash
   ps aux | grep mysql
   netstat -tlnp | grep 3306
   ```

3. **Review recent system changes**
   ```bash
   journalctl --since "1 hour ago" | grep -i mysql
   ```

4. **Try safe mode startup**
   ```bash
   sudo mysqld --skip-grant-tables --user=mysql
   ```

5. **Reset service completely**
   ```bash
   sudo systemctl stop mariadb
   sudo systemctl reset-failed mariadb
   sudo systemctl daemon-reload
   sudo systemctl start mariadb
   ```

### If Data is Corrupted

1. **Stop service immediately**
   ```bash
   sudo systemctl stop mariadb
   ```

2. **Backup current data**
   ```bash
   sudo cp -r /var/lib/mysql /var/lib/mysql.corrupted.$(date +%Y%m%d)
   ```

3. **Attempt recovery**
   ```bash
   sudo mysqld --innodb-force-recovery=1 --user=mysql
   ```

4. **If recovery fails, reinstall**
   ```bash
   sudo apt-get remove --purge mariadb-server
   sudo apt-get install mariadb-server
   ```

## 📞 Getting Help

### Information to Collect
- MariaDB version (`mysql --version`)
- Operating system (`cat /etc/os-release`)
- Error logs (`tail -100 /var/log/mysql/error.log`)
- System resources (`df -h && free -h`)
- Service status (`systemctl status mariadb`)
- Configuration files (`cat /etc/mysql/my.cnf`)

### Useful Commands for Support
```bash
# Generate comprehensive report
sudo ./troubleshoot-mariadb-startup.sh

# Collect system information
sudo dmesg > dmesg.log
sudo journalctl -u mariadb > mariadb.log
sudo systemctl status mariadb > status.log

# Package information
dpkg -l | grep mariadb
dpkg -l | grep mysql
```

## 🎯 Summary

This troubleshooting guide covers the most common MariaDB startup issues and their solutions. Use the provided scripts for automated diagnosis or follow the manual steps for specific problems.

**Remember:**
- Always backup data before making changes
- Check logs first for specific error messages
- Start with simple fixes before attempting complex recovery
- Document any changes made during troubleshooting

For persistent issues, collect the diagnostic information above and seek additional support. 