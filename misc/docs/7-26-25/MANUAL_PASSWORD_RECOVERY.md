# Manual MariaDB Root Password Recovery

## 🚨 Emergency Recovery When Socket Access is Disabled

If you disabled socket access for root@localhost and can't remember the password, follow these steps:

## 🔧 Method 1: Automated Script (Recommended)

```bash
sudo ./reset-mariadb-root-password.sh
```

## 🛠️ Method 2: Manual Recovery Steps

### Step 1: Stop MariaDB Service
```bash
sudo systemctl stop mariadb
```

### Step 2: Start MariaDB in Safe Mode
```bash
# Create a temporary config file
sudo tee /tmp/mysql-safe.cnf > /dev/null <<EOF
[mysqld]
skip-grant-tables
skip-networking
user=mysql
datadir=/var/lib/mysql
socket=/var/run/mysqld/mysqld.sock
EOF

# Start MariaDB with skip-grant-tables
sudo mysqld --defaults-file=/tmp/mysql-safe.cnf --user=mysql &
```

### Step 3: Wait for MariaDB to Start
```bash
# Wait a few seconds
sleep 10

# Check if it's running
ps aux | grep mysqld
```

### Step 4: Reset Root Password
```bash
# Connect without password (skip-grant-tables bypasses authentication)
mysql

# In the MySQL prompt, run:
USE mysql;

-- For MariaDB 10.4+
ALTER USER 'root'@'localhost' IDENTIFIED BY 'your_new_password';

-- Flush privileges
FLUSH PRIVILEGES;

-- Verify the change
SELECT user, host, plugin FROM user WHERE user='root' AND host='localhost';

-- Exit
EXIT;
```

### Step 5: Stop Safe Mode and Restart Normally
```bash
# Kill the safe mode process
sudo pkill -f mysqld

# Wait for it to stop
sleep 5

# Start MariaDB normally
sudo systemctl start mariadb

# Test the new password
mysql -u root -p
```

## 🔍 Method 3: Alternative Recovery (If Above Fails)

### Step 1: Stop All MariaDB Processes
```bash
sudo systemctl stop mariadb
sudo pkill -f mysqld
sudo pkill -f mariadbd
```

### Step 2: Start with Skip-Grant-Tables
```bash
# Start MariaDB with skip-grant-tables
sudo mysqld --skip-grant-tables --user=mysql &
```

### Step 3: Reset Password Using UPDATE
```bash
# Connect without password
mysql

# In MySQL prompt:
USE mysql;

-- For older MariaDB versions, use UPDATE
UPDATE user SET authentication_string = PASSWORD('your_new_password') WHERE user='root' AND host='localhost';

-- For newer versions, try ALTER USER first, then UPDATE if needed
ALTER USER 'root'@'localhost' IDENTIFIED BY 'your_new_password';

-- Flush privileges
FLUSH PRIVILEGES;

-- Exit
EXIT;
```

### Step 4: Restart Normally
```bash
# Kill safe mode
sudo pkill -f mysqld

# Start service
sudo systemctl start mariadb

# Test
mysql -u root -p
```

## 🔐 Method 4: Complete Reset (Nuclear Option)

If nothing else works, you can completely reset MariaDB:

### Step 1: Backup Data (Important!)
```bash
# Stop MariaDB
sudo systemctl stop mariadb

# Backup data directory
sudo cp -r /var/lib/mysql /var/lib/mysql.backup.$(date +%Y%m%d)
```

### Step 2: Remove and Reinstall
```bash
# Remove MariaDB
sudo apt-get remove --purge mariadb-server mariadb-client

# Remove data directory
sudo rm -rf /var/lib/mysql

# Reinstall
sudo apt-get install mariadb-server

# Secure installation
sudo mysql_secure_installation
```

## ⚠️ Important Notes

### Security Considerations
- **skip-grant-tables** disables authentication - use only temporarily
- **skip-networking** prevents remote connections during recovery
- Always restart MariaDB normally after password reset

### Common Issues

#### Issue: "Access denied" after password reset
**Solution**: Make sure you're using the correct password and that MariaDB is running normally (not in safe mode)

#### Issue: "Plugin 'mysql_native_password' is not loaded"
**Solution**: Try using `ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY 'password';`

#### Issue: MariaDB won't start after recovery
**Solution**: Check logs with `sudo journalctl -u mariadb` and ensure all processes are stopped before restarting

### Verification Steps

After password reset, verify:

1. **Service is running**:
   ```bash
   sudo systemctl status mariadb
   ```

2. **Can connect with password**:
   ```bash
   mysql -u root -p
   ```

3. **Socket authentication is disabled**:
   ```bash
   mysql -u root  # Should fail
   mysql -u root -p  # Should work
   ```

4. **Applications can connect**:
   Test your applications with the new password

## 🔄 Updating Applications

After resetting the password, update:

### Configuration Files
```bash
# Update any .env files
sudo nano /path/to/your/app/.env

# Update database configuration
DB_PASSWORD=your_new_password
```

### Application Users
```bash
# Create application-specific users (recommended)
mysql -u root -p

CREATE USER 'app_user'@'localhost' IDENTIFIED BY 'app_password';
GRANT SELECT, INSERT, UPDATE, DELETE ON your_database.* TO 'app_user'@'localhost';
FLUSH PRIVILEGES;
```

## 📞 Getting Help

If you're still having issues:

1. **Check MariaDB logs**:
   ```bash
   sudo tail -f /var/log/mysql/error.log
   ```

2. **Check system logs**:
   ```bash
   sudo journalctl -u mariadb -f
   ```

3. **Verify MariaDB version**:
   ```bash
   mysql --version
   ```

4. **Check authentication plugins**:
   ```bash
   mysql -u root -p -e "SELECT user, host, plugin FROM mysql.user WHERE user='root';"
   ```

## 🎯 Summary

The key steps are:
1. **Stop MariaDB**
2. **Start with skip-grant-tables**
3. **Reset password**
4. **Restart normally**
5. **Test connection**

Use the automated script for the safest and easiest recovery process. 