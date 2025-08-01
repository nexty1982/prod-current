-- Disable Socket Access for root@localhost on MariaDB
-- This script removes the ability for root to authenticate via Unix socket
-- Run this as root or a user with SUPER privilege

-- Check current root user authentication methods
SELECT user, host, plugin, authentication_string 
FROM mysql.user 
WHERE user = 'root' AND host = 'localhost';

-- Update root@localhost to use mysql_native_password instead of unix_socket
-- This disables socket authentication and requires password authentication
ALTER USER 'root'@'localhost' IDENTIFIED BY 'your_secure_root_password';

-- Alternative: If you want to completely remove socket authentication
-- ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY 'your_secure_root_password';

-- Verify the change
SELECT user, host, plugin, authentication_string 
FROM mysql.user 
WHERE user = 'root' AND host = 'localhost';

-- Flush privileges to apply changes
FLUSH PRIVILEGES;

-- Test the change (this should now require a password)
-- mysql -u root -p 