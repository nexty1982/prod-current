# Disable Socket Access for root@localhost on MariaDB

## 🔒 Security Overview

By default, MariaDB allows the `root` user to authenticate via Unix socket authentication when connecting from `localhost`. This means that any process running as the `root` system user can connect to MariaDB without a password, which is a security risk.

This guide shows you how to disable socket authentication and require password authentication for the `root` user.

## 🚨 Why Disable Socket Authentication?

### Security Risks
- **Privilege Escalation**: Any process running as root can access the database
- **No Audit Trail**: Socket authentication bypasses password logging
- **Application Security**: Applications running as root can access database without credentials
- **Compliance**: Many security standards require password authentication

### Benefits of Disabling
- **Password Protection**: Requires explicit password for database access
- **Audit Trail**: All connections are logged with authentication method
- **Application Security**: Forces applications to use proper credentials
- **Compliance**: Meets security standards and best practices

## 📋 Prerequisites

- Root access to the server
- MariaDB/MySQL running
- Current root password (if already set)

## 🛠️ Method 1: Automated Script (Recommended)

### Step 1: Run the Disable Script

```bash
sudo ./disable-root-socket-access.sh
```

The script will:
- Check current authentication method
- Prompt for new root password
- Disable socket authentication
- Verify the changes
- Test the new configuration

### Step 2: Follow the Prompts

The script will ask you to:
1. Enter a new password for root@localhost
2. Confirm the password
3. Wait for the changes to be applied

### Step 3: Verify the Changes

The script automatically verifies that:
- Socket authentication is disabled
- Password authentication works
- All connections require credentials

## 🛠️ Method 2: Manual SQL Commands

### Step 1: Connect to MariaDB

```bash
mysql -u root
```

### Step 2: Check Current Authentication

```sql
SELECT user, host, plugin, authentication_string 
FROM mysql.user 
WHERE user = 'root' AND host = 'localhost';
```

### Step 3: Disable Socket Authentication

```sql
-- Set a new password for root@localhost
ALTER USER 'root'@'localhost' IDENTIFIED BY 'your_secure_password';

-- Flush privileges to apply changes
FLUSH PRIVILEGES;
```

### Step 4: Verify the Change

```sql
SELECT user, host, plugin 
FROM mysql.user 
WHERE user = 'root' AND host = 'localhost';
```

The `plugin` should now show `mysql_native_password` instead of `unix_socket`.

## 🔍 Verification Steps

### Test Password Authentication

```bash
mysql -u root -p
```

You should be prompted for a password.

### Test Socket Authentication (Should Fail)

```bash
mysql -u root
```

This should fail with an authentication error.

### Check Authentication Method

```sql
SELECT user, host, plugin 
FROM mysql.user 
WHERE user = 'root' AND host = 'localhost';
```

Expected result:
```
+------+-----------+-----------------------+
| user | host      | plugin                |
+------+-----------+-----------------------+
| root | localhost | mysql_native_password |
+------+-----------+-----------------------+
```

## ⚠️ Important Considerations

### Before Making Changes

1. **Backup Your Database**
   ```bash
   mysqldump -u root -p --all-databases > backup_before_socket_disable.sql
   ```

2. **Document Current Configuration**
   ```sql
   SELECT user, host, plugin FROM mysql.user WHERE user = 'root';
   ```

3. **Test Application Connections**
   - Ensure all applications can connect with the new password
   - Update configuration files
   - Test automated scripts

### After Making Changes

1. **Update Application Configurations**
   - Database connection strings
   - Environment variables
   - Configuration files

2. **Update Scripts**
   - Database setup scripts
   - Backup scripts
   - Maintenance scripts

3. **Test Everything**
   - Application functionality
   - Automated processes
   - Backup and restore procedures

## 🔧 Troubleshooting

### Common Issues

#### Issue: "Access denied for user 'root'@'localhost'"
**Cause**: Socket authentication is disabled but no password is provided
**Solution**: Use `mysql -u root -p` and provide the password

#### Issue: "Plugin 'unix_socket' is not loaded"
**Cause**: MariaDB is configured to use socket authentication but the plugin is missing
**Solution**: Install the unix_socket plugin or switch to mysql_native_password

#### Issue: Applications can't connect
**Cause**: Applications are trying to connect without a password
**Solution**: Update application configurations to include the root password

### Recovery Options

#### If You Forget the Root Password

1. **Stop MariaDB**
   ```bash
   sudo systemctl stop mariadb
   ```

2. **Start in Safe Mode**
   ```bash
   sudo mysqld_safe --skip-grant-tables &
   ```

3. **Reset Password**
   ```sql
   USE mysql;
   UPDATE user SET authentication_string = PASSWORD('new_password') WHERE user = 'root';
   FLUSH PRIVILEGES;
   ```

4. **Restart MariaDB**
   ```bash
   sudo systemctl restart mariadb
   ```

## 📝 Configuration Files

### Update Application Configurations

#### Node.js Applications
```javascript
const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'your_secure_password',
  database: 'your_database'
});
```

#### PHP Applications
```php
$mysqli = new mysqli('localhost', 'root', 'your_secure_password', 'your_database');
```

#### Python Applications
```python
import mysql.connector
connection = mysql.connector.connect(
  host='localhost',
  user='root',
  password='your_secure_password',
  database='your_database'
)
```

### Environment Variables

```bash
# Add to your environment or .env file
DB_ROOT_PASSWORD=your_secure_password
```

## 🔐 Security Best Practices

### Password Management

1. **Use Strong Passwords**
   - Minimum 12 characters
   - Mix of uppercase, lowercase, numbers, and symbols
   - Avoid common words and patterns

2. **Store Passwords Securely**
   - Use environment variables
   - Encrypt configuration files
   - Use password managers

3. **Rotate Passwords Regularly**
   - Change passwords every 90 days
   - Use different passwords for different environments

### Additional Security Measures

1. **Create Application Users**
   ```sql
   CREATE USER 'app_user'@'localhost' IDENTIFIED BY 'app_password';
   GRANT SELECT, INSERT, UPDATE, DELETE ON your_database.* TO 'app_user'@'localhost';
   ```

2. **Limit Root Access**
   - Only use root for administrative tasks
   - Use application-specific users for applications
   - Implement least privilege principle

3. **Enable Audit Logging**
   ```sql
   SET GLOBAL general_log = 'ON';
   SET GLOBAL general_log_file = '/var/log/mysql/general.log';
   ```

## 📊 Impact on OMAI Database Setup

### Updated Setup Process

After disabling socket authentication, the OMAI database setup will require the root password:

1. **Run OMAI Setup**
   ```bash
   sudo ./setup-omai-database.sh
   ```

2. **Provide Root Password**
   - The script will prompt for the root password
   - Enter the password you set when disabling socket authentication

3. **Verify Setup**
   ```bash
   omai-db-status
   ```

### Updated Configuration

The OMAI database configuration will include the root password:

```bash
# omai-database.conf
DB_HOST=localhost
DB_NAME=omai_db
DB_USER=omai_user
DB_PASSWORD=omai_secure_password_2025
DB_ROOT_PASSWORD=your_secure_root_password
```

## ✅ Checklist

- [ ] Backup database before making changes
- [ ] Document current authentication method
- [ ] Set secure root password
- [ ] Disable socket authentication
- [ ] Verify password authentication works
- [ ] Test socket authentication is disabled
- [ ] Update application configurations
- [ ] Update database scripts
- [ ] Test all database connections
- [ ] Update OMAI database setup
- [ ] Document new password securely
- [ ] Test backup and restore procedures

## 🎯 Summary

Disabling socket authentication for the root user is a critical security improvement that:

- **Enforces password authentication** for all root connections
- **Improves audit trail** by logging all authentication attempts
- **Reduces attack surface** by eliminating socket-based bypasses
- **Enhances compliance** with security standards
- **Protects against privilege escalation** attacks

The automated script provides a safe, step-by-step process to make this change while ensuring all functionality continues to work correctly. 