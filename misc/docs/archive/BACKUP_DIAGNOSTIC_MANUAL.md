# Backup System Manual Diagnostic Guide
# ====================================

## 1. Check if backup database tables exist

# Connect to your MySQL database and run these queries:

# Check if backup_settings table exists:
SELECT COUNT(*) as table_exists 
FROM information_schema.tables 
WHERE table_schema = DATABASE() 
AND table_name = 'backup_settings';

# Check if backup_files table exists:
SELECT COUNT(*) as table_exists 
FROM information_schema.tables 
WHERE table_schema = DATABASE() 
AND table_name = 'backup_files';

# If either table doesn't exist (returns 0), create them:

# Create backup_settings table:
CREATE TABLE backup_settings (
    id INT PRIMARY KEY,
    settings JSON NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

# Create backup_files table:
CREATE TABLE backup_files (
    id VARCHAR(255) PRIMARY KEY,
    filename VARCHAR(255) NOT NULL,
    size BIGINT DEFAULT 0,
    type ENUM('full', 'database', 'files') NOT NULL,
    status ENUM('completed', 'in_progress', 'failed') NOT NULL,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

## 2. Initialize default backup settings

# Insert default settings if none exist:
INSERT INTO backup_settings (id, settings) VALUES (1, '{
    "enabled": true,
    "schedule": "0 2 * * *",
    "retention_days": 30,
    "include_database": true,
    "include_files": true,
    "include_uploads": true,
    "compression": true,
    "email_notifications": false,
    "notification_email": "",
    "backup_location": "/opt/backups/orthodox-metrics",
    "max_backups": 50
}') ON DUPLICATE KEY UPDATE settings = VALUES(settings);

## 3. Check current data

# Check settings:
SELECT * FROM backup_settings;

# Check backup files:
SELECT * FROM backup_files ORDER BY created_at DESC LIMIT 10;

## 4. Check backup directory

# Check if backup directory exists and create it:
# Run this in your terminal:
mkdir -p /opt/backups/orthodox-metrics
ls -la /opt/backups/orthodox-metrics

## 5. Test database list query

# This is what the backup system uses to find databases:
SHOW DATABASES 
WHERE `Database` NOT IN ('information_schema', 'mysql', 'performance_schema', 'sys');

## 6. Verify environment variables

# Check your .env file has these variables:
# BACKUP_DIR=/opt/backups/orthodox-metrics
# DB_HOST=localhost
# DB_USER=your_username
# DB_NAME=your_database_name

## After running these steps:
# 1. Restart your Node.js server
# 2. Go to /admin/settings in your browser
# 3. Click on the Backup tab
# 4. Check if storage information and backup files now load

## Common Issues and Solutions:

# Issue: "Storage information not loading"
# Solution: Make sure backup_settings table exists and has data

# Issue: "Backup files not listing" 
# Solution: Make sure backup_files table exists

# Issue: "Permission denied"
# Solution: Make sure backup directory has write permissions:
# chmod 755 /opt/backups/orthodox-metrics

# Issue: "Cannot connect to database"
# Solution: Check your database credentials in .env file
