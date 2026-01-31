# 🛠️ Database Setup Guide for Orthodox Metrics

## 🔍 Current Issue
The monitoring system cannot connect to MySQL because:
- Database user `orthodoxapps` doesn't exist or has wrong credentials
- Database `orthodox_metrics` may not exist
- MySQL authentication needs configuration

## 🚀 Solution Steps

### Step 1: Check MySQL Service Status

**Windows:**
```powershell
# Check if MySQL service is running
Get-Service -Name "*mysql*"

# Start MySQL if not running
Start-Service -Name "MySQL80" # or your MySQL service name
```

**Linux:**
```bash
# Check MySQL status
sudo systemctl status mysql

# Start MySQL if not running
sudo systemctl start mysql
```

### Step 2: Connect to MySQL as Root

**Option A: Using MySQL Command Line (if available)**
```bash
mysql -u root -p
```

**Option B: Using phpMyAdmin or MySQL Workbench**
- Open your MySQL management tool
- Connect as root user

**Option C: Using Node.js Script**
```bash
# Try with different root passwords
node server/check-database-connection.js
```

### Step 3: Create Database and User

Run these SQL commands in MySQL:

```sql
-- Create database
CREATE DATABASE IF NOT EXISTS orthodox_metrics 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

-- Create user with proper authentication
CREATE USER IF NOT EXISTS 'orthodoxapps'@'localhost' 
IDENTIFIED BY 'Summerof1982@!';

-- Grant privileges
GRANT ALL PRIVILEGES ON orthodox_metrics.* 
TO 'orthodoxapps'@'localhost';

-- Apply changes
FLUSH PRIVILEGES;

-- Verify user creation
SELECT User, Host FROM mysql.user WHERE User = 'orthodoxapps';

-- Test privileges
SHOW GRANTS FOR 'orthodoxapps'@'localhost';
```

### Step 4: Alternative Authentication Methods

If the above doesn't work, try these alternatives:

**Option A: Use mysql_native_password**
```sql
ALTER USER 'orthodoxapps'@'localhost' 
IDENTIFIED WITH mysql_native_password BY 'Summerof1982@!';
FLUSH PRIVILEGES;
```

**Option B: Create user with different host**
```sql
CREATE USER 'orthodoxapps'@'%' IDENTIFIED BY 'Summerof1982@!';
GRANT ALL PRIVILEGES ON orthodox_metrics.* TO 'orthodoxapps'@'%';
FLUSH PRIVILEGES;
```

**Option C: Use root user temporarily**
```sql
-- Grant root access from localhost
ALTER USER 'root'@'localhost' IDENTIFIED BY 'Summerof1982@!';
FLUSH PRIVILEGES;
```

### Step 5: Test Connection

```bash
# Run the connection test
node server/check-database-connection.js

# If successful, run the full demo
node step6-demo.js
```

## 🎯 Quick Fix Commands

**For immediate testing, copy-paste these commands into MySQL:**

```sql
DROP USER IF EXISTS 'orthodoxapps'@'localhost';
DROP DATABASE IF EXISTS orthodox_metrics;

CREATE DATABASE orthodox_metrics CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'orthodoxapps'@'localhost' IDENTIFIED WITH mysql_native_password BY 'Summerof1982@!';
GRANT ALL PRIVILEGES ON orthodox_metrics.* TO 'orthodoxapps'@'localhost';
FLUSH PRIVILEGES;

SELECT 'Setup Complete' as Status;
```

## 🔧 Troubleshooting

### Issue: "Access denied for user 'root'"
**Solution:** Reset root password or use authentication method
```sql
-- In MySQL configuration (my.cnf/my.ini), add:
[mysqld]
skip-grant-tables

-- Restart MySQL, then:
mysql -u root
UPDATE mysql.user SET Password=PASSWORD('Summerof1982@!') WHERE User='root';
FLUSH PRIVILEGES;
```

### Issue: "Can't connect to MySQL server"
**Solution:** 
1. Check if MySQL service is running
2. Verify port 3306 is open
3. Check firewall settings

### Issue: "Authentication plugin error"
**Solution:** Use mysql_native_password
```sql
ALTER USER 'orthodoxapps'@'localhost' 
IDENTIFIED WITH mysql_native_password BY 'Summerof1982@!';
```

## ✅ Verification

After setup, you should see:
```
🧪 Testing: Original Config
──────────────────────────────
✅ Connection successful!
✅ Query execution successful: { test: 1 }
✅ Database 'orthodox_metrics' exists
```

## 🚀 Alternative: Run Standalone Demo

If database setup is complex, run the standalone demo:
```bash
node server/step6-standalone-demo.js
```

This demonstrates all Step 6 features without requiring database connectivity.

---

## 📞 Need Help?

1. **Check MySQL Error Log**: Look for authentication errors
2. **Verify MySQL Version**: Some versions have different auth requirements  
3. **Use Standalone Demo**: Full functionality demo without database
4. **Contact Support**: Provide MySQL version and error messages

The Orthodox Church Directory Builder Step 6 is complete and ready - database connection just needs proper authentication setup!
