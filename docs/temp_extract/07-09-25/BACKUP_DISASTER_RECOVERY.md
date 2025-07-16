# Orthodox Metrics System - Backup and Disaster Recovery Guide

## Overview

This guide provides comprehensive backup and disaster recovery procedures for the Orthodox Metrics church management system. It covers data protection, backup strategies, recovery procedures, and business continuity planning.

## Backup Strategy

### 1. Backup Components

#### Critical Data
- **Database**: MySQL database with all church and user data
- **Application Files**: Server-side application code and configurations
- **User Uploads**: Documents, images, and other user-generated content
- **Configuration Files**: Nginx, PM2, and system configurations
- **SSL Certificates**: Security certificates and keys
- **Logs**: System and application logs for forensic analysis

#### Backup Locations
- **Primary**: Local backup storage on the server
- **Secondary**: Remote backup storage (cloud or offsite)
- **Tertiary**: Offline backup storage (weekly full backups)

### 2. Backup Frequency

#### Daily Backups
- Database dump (compressed)
- Application logs
- User uploads (incremental)
- Configuration files

#### Weekly Backups
- Full system backup
- Database optimization and repair
- Log rotation and archival
- SSL certificate verification

#### Monthly Backups
- Complete system image
- Long-term archival
- Backup verification tests
- Disaster recovery testing

## Database Backup

### 1. MySQL Backup Scripts

#### Daily Database Backup
```bash
#!/bin/bash
# daily-db-backup.sh

# Configuration
DB_NAME="orthodox_metrics"
DB_USER="backup_user"
DB_PASS="secure_password"
BACKUP_DIR="/var/backups/orthodox-metrics"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/db_backup_$DATE.sql.gz"

# Create backup directory
mkdir -p $BACKUP_DIR

# Create database dump
mysqldump -u$DB_USER -p$DB_PASS \
    --single-transaction \
    --routines \
    --triggers \
    --events \
    --hex-blob \
    $DB_NAME | gzip > $BACKUP_FILE

# Verify backup
if [ $? -eq 0 ]; then
    echo "Database backup completed: $BACKUP_FILE"
    
    # Log backup success
    echo "$(date): Database backup successful - $BACKUP_FILE" >> /var/log/orthodox-metrics/backup.log
    
    # Remove backups older than 7 days
    find $BACKUP_DIR -name "db_backup_*.sql.gz" -mtime +7 -delete
else
    echo "Database backup failed!"
    echo "$(date): Database backup FAILED" >> /var/log/orthodox-metrics/backup.log
    exit 1
fi
```

#### Database Backup with Verification
```bash
#!/bin/bash
# verified-db-backup.sh

DB_NAME="orthodox_metrics"
DB_USER="backup_user"
DB_PASS="secure_password"
BACKUP_DIR="/var/backups/orthodox-metrics"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/db_backup_$DATE.sql.gz"
TEST_DB="orthodox_metrics_test"

# Create backup
mysqldump -u$DB_USER -p$DB_PASS \
    --single-transaction \
    --routines \
    --triggers \
    --events \
    --hex-blob \
    $DB_NAME | gzip > $BACKUP_FILE

# Verify backup by restoring to test database
echo "Verifying backup..."
mysql -u$DB_USER -p$DB_PASS -e "DROP DATABASE IF EXISTS $TEST_DB; CREATE DATABASE $TEST_DB;"
gunzip < $BACKUP_FILE | mysql -u$DB_USER -p$DB_PASS $TEST_DB

# Check if restoration was successful
TABLES=$(mysql -u$DB_USER -p$DB_PASS $TEST_DB -e "SHOW TABLES;" | wc -l)
if [ $TABLES -gt 1 ]; then
    echo "Backup verification successful - $TABLES tables restored"
    mysql -u$DB_USER -p$DB_PASS -e "DROP DATABASE $TEST_DB;"
else
    echo "Backup verification failed!"
    exit 1
fi
```

### 2. Point-in-Time Recovery Setup

#### Enable Binary Logging
```sql
-- Add to MySQL configuration (/etc/mysql/my.cnf)
[mysqld]
log-bin=mysql-bin
server-id=1
binlog-format=ROW
expire_logs_days=7
max_binlog_size=100M
```

#### Binary Log Backup
```bash
#!/bin/bash
# binlog-backup.sh

MYSQL_DATA_DIR="/var/lib/mysql"
BACKUP_DIR="/var/backups/orthodox-metrics/binlogs"
DATE=$(date +%Y%m%d)

# Create backup directory
mkdir -p $BACKUP_DIR/$DATE

# Flush binary logs
mysql -u root -p$MYSQL_ROOT_PASSWORD -e "FLUSH LOGS;"

# Copy binary logs
cp $MYSQL_DATA_DIR/mysql-bin.* $BACKUP_DIR/$DATE/

# Compress old binary logs
find $BACKUP_DIR -name "mysql-bin.*" -mtime +1 -exec gzip {} \;

# Remove binary logs older than 7 days
find $BACKUP_DIR -name "mysql-bin.*" -mtime +7 -delete
```

## Application Backup

### 1. Application Files Backup

#### Server Application Backup
```bash
#!/bin/bash
# app-backup.sh

APP_DIR="/var/www/orthodox-metrics"
BACKUP_DIR="/var/backups/orthodox-metrics"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/app_backup_$DATE.tar.gz"

# Create backup directory
mkdir -p $BACKUP_DIR

# Create application backup
tar -czf $BACKUP_FILE \
    --exclude="node_modules" \
    --exclude="logs" \
    --exclude="uploads" \
    $APP_DIR

# Verify backup
if [ $? -eq 0 ]; then
    echo "Application backup completed: $BACKUP_FILE"
    
    # Remove backups older than 30 days
    find $BACKUP_DIR -name "app_backup_*.tar.gz" -mtime +30 -delete
else
    echo "Application backup failed!"
    exit 1
fi
```

#### Configuration Files Backup
```bash
#!/bin/bash
# config-backup.sh

CONFIG_DIRS=(
    "/etc/nginx"
    "/etc/mysql"
    "/etc/ssl"
    "/etc/systemd/system"
    "/etc/cron.d"
)

BACKUP_DIR="/var/backups/orthodox-metrics"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/config_backup_$DATE.tar.gz"

# Create backup directory
mkdir -p $BACKUP_DIR

# Create configuration backup
tar -czf $BACKUP_FILE ${CONFIG_DIRS[@]}

echo "Configuration backup completed: $BACKUP_FILE"
```

### 2. User Uploads Backup

#### Incremental Uploads Backup
```bash
#!/bin/bash
# uploads-backup.sh

UPLOADS_DIR="/var/www/orthodox-metrics/uploads"
BACKUP_DIR="/var/backups/orthodox-metrics/uploads"
DATE=$(date +%Y%m%d)

# Create backup directory
mkdir -p $BACKUP_DIR

# Incremental backup using rsync
rsync -av \
    --delete \
    --backup \
    --backup-dir=$BACKUP_DIR/deleted_$DATE \
    $UPLOADS_DIR/ \
    $BACKUP_DIR/current/

# Compress old backups
find $BACKUP_DIR -name "deleted_*" -mtime +7 -exec tar -czf {}.tar.gz {} \; -exec rm -rf {} \;

echo "Uploads backup completed"
```

## Remote Backup

### 1. Cloud Backup Setup

#### AWS S3 Backup
```bash
#!/bin/bash
# s3-backup.sh

AWS_BUCKET="orthodox-metrics-backups"
LOCAL_BACKUP_DIR="/var/backups/orthodox-metrics"
S3_PREFIX="daily-backups"
DATE=$(date +%Y%m%d)

# Upload database backup
aws s3 sync $LOCAL_BACKUP_DIR/ s3://$AWS_BUCKET/$S3_PREFIX/$DATE/ \
    --exclude "*" \
    --include "db_backup_*.sql.gz"

# Upload application backup
aws s3 sync $LOCAL_BACKUP_DIR/ s3://$AWS_BUCKET/$S3_PREFIX/$DATE/ \
    --exclude "*" \
    --include "app_backup_*.tar.gz"

# Remove old backups from S3 (keep 30 days)
aws s3 ls s3://$AWS_BUCKET/$S3_PREFIX/ | \
    awk '{print $4}' | \
    xargs -I {} aws s3 rm s3://$AWS_BUCKET/$S3_PREFIX/{} \
    --recursive --exclude "*" --include "*$(date -d '30 days ago' +%Y%m%d)*"
```

#### Google Cloud Storage Backup
```bash
#!/bin/bash
# gcs-backup.sh

GCS_BUCKET="orthodox-metrics-backups"
LOCAL_BACKUP_DIR="/var/backups/orthodox-metrics"
DATE=$(date +%Y%m%d)

# Upload to Google Cloud Storage
gsutil -m rsync -r -d $LOCAL_BACKUP_DIR/ gs://$GCS_BUCKET/daily-backups/$DATE/

# Set lifecycle policy to delete old backups
gsutil lifecycle set backup-lifecycle.json gs://$GCS_BUCKET
```

### 2. Secure Remote Backup

#### Encrypted Backup Transfer
```bash
#!/bin/bash
# encrypted-backup.sh

BACKUP_DIR="/var/backups/orthodox-metrics"
REMOTE_HOST="backup.example.com"
REMOTE_USER="backup_user"
REMOTE_DIR="/backups/orthodox-metrics"
DATE=$(date +%Y%m%d)

# Encrypt and transfer database backup
find $BACKUP_DIR -name "db_backup_*.sql.gz" -mtime -1 | while read file; do
    # Encrypt file
    gpg --cipher-algo AES256 --compress-algo 1 --s2k-cipher-algo AES256 \
        --s2k-digest-algo SHA512 --s2k-mode 3 --s2k-count 65011712 \
        --force-mdc --quiet --no-greeting --batch --yes \
        --passphrase-file /etc/orthodox-metrics/backup.key \
        --output "$file.gpg" --encrypt "$file"
    
    # Transfer encrypted file
    scp "$file.gpg" $REMOTE_USER@$REMOTE_HOST:$REMOTE_DIR/
    
    # Remove local encrypted file
    rm "$file.gpg"
done
```

## Disaster Recovery

### 1. Recovery Procedures

#### Database Recovery
```bash
#!/bin/bash
# db-recovery.sh

DB_NAME="orthodox_metrics"
DB_USER="root"
DB_PASS="mysql_root_password"
BACKUP_FILE="$1"

if [ -z "$BACKUP_FILE" ]; then
    echo "Usage: $0 <backup_file.sql.gz>"
    exit 1
fi

# Verify backup file exists
if [ ! -f "$BACKUP_FILE" ]; then
    echo "Backup file not found: $BACKUP_FILE"
    exit 1
fi

# Stop application
pm2 stop orthodox-metrics

# Drop and recreate database
mysql -u$DB_USER -p$DB_PASS -e "DROP DATABASE IF EXISTS $DB_NAME; CREATE DATABASE $DB_NAME;"

# Restore database
echo "Restoring database from $BACKUP_FILE..."
gunzip < $BACKUP_FILE | mysql -u$DB_USER -p$DB_PASS $DB_NAME

# Verify restoration
TABLES=$(mysql -u$DB_USER -p$DB_PASS $DB_NAME -e "SHOW TABLES;" | wc -l)
if [ $TABLES -gt 1 ]; then
    echo "Database restoration successful - $TABLES tables restored"
    
    # Start application
    pm2 start orthodox-metrics
else
    echo "Database restoration failed!"
    exit 1
fi
```

#### Point-in-Time Recovery
```bash
#!/bin/bash
# point-in-time-recovery.sh

DB_NAME="orthodox_metrics"
DB_USER="root"
DB_PASS="mysql_root_password"
BACKUP_FILE="$1"
RECOVERY_TIME="$2"

if [ -z "$BACKUP_FILE" ] || [ -z "$RECOVERY_TIME" ]; then
    echo "Usage: $0 <backup_file.sql.gz> <recovery_time>"
    echo "Example: $0 db_backup_20241207.sql.gz '2024-12-07 14:30:00'"
    exit 1
fi

# Restore from backup
echo "Restoring from backup..."
mysql -u$DB_USER -p$DB_PASS -e "DROP DATABASE IF EXISTS $DB_NAME; CREATE DATABASE $DB_NAME;"
gunzip < $BACKUP_FILE | mysql -u$DB_USER -p$DB_PASS $DB_NAME

# Apply binary logs up to recovery time
echo "Applying binary logs up to $RECOVERY_TIME..."
mysqlbinlog --stop-datetime="$RECOVERY_TIME" /var/lib/mysql/mysql-bin.* | \
    mysql -u$DB_USER -p$DB_PASS $DB_NAME

echo "Point-in-time recovery completed"
```

### 2. Application Recovery

#### Complete System Recovery
```bash
#!/bin/bash
# system-recovery.sh

APP_BACKUP="$1"
DB_BACKUP="$2"
CONFIG_BACKUP="$3"

if [ -z "$APP_BACKUP" ] || [ -z "$DB_BACKUP" ] || [ -z "$CONFIG_BACKUP" ]; then
    echo "Usage: $0 <app_backup.tar.gz> <db_backup.sql.gz> <config_backup.tar.gz>"
    exit 1
fi

echo "Starting system recovery..."

# Stop services
systemctl stop nginx
pm2 stop all

# Restore application
echo "Restoring application files..."
tar -xzf $APP_BACKUP -C /

# Restore configuration
echo "Restoring configuration files..."
tar -xzf $CONFIG_BACKUP -C /

# Restore database
echo "Restoring database..."
./db-recovery.sh $DB_BACKUP

# Restore permissions
chown -R www-data:www-data /var/www/orthodox-metrics
chmod -R 755 /var/www/orthodox-metrics

# Start services
systemctl start nginx
pm2 start /var/www/orthodox-metrics/ecosystem.config.js

echo "System recovery completed"
```

## Business Continuity

### 1. Disaster Recovery Plan

#### Recovery Time Objectives (RTO)
- **Critical System Failure**: 4 hours
- **Database Corruption**: 2 hours
- **Complete Server Failure**: 24 hours
- **Natural Disaster**: 72 hours

#### Recovery Point Objectives (RPO)
- **Database**: 1 hour maximum data loss
- **Application Files**: 24 hours maximum data loss
- **User Uploads**: 24 hours maximum data loss

### 2. Emergency Procedures

#### Emergency Contact List
```text
Primary Administrator: admin@orthodoxmetrics.com
Secondary Administrator: backup-admin@orthodoxmetrics.com
Hosting Provider: support@hostingcompany.com
Database Administrator: dba@orthodoxmetrics.com
```

#### Emergency Recovery Steps
1. **Assess the situation**
   - Identify the scope of the failure
   - Determine recovery priority
   - Notify stakeholders

2. **Immediate Actions**
   - Stop affected services
   - Secure the environment
   - Begin recovery procedures

3. **Recovery Implementation**
   - Follow documented procedures
   - Verify each step
   - Document actions taken

4. **Post-Recovery**
   - Verify system functionality
   - Notify users of service restoration
   - Conduct post-incident review

### 3. Testing and Validation

#### Monthly Recovery Tests
```bash
#!/bin/bash
# recovery-test.sh

TEST_DB="orthodox_metrics_recovery_test"
LATEST_BACKUP=$(ls -t /var/backups/orthodox-metrics/db_backup_*.sql.gz | head -1)

echo "Testing recovery with backup: $LATEST_BACKUP"

# Test database recovery
mysql -u root -p$MYSQL_ROOT_PASSWORD -e "DROP DATABASE IF EXISTS $TEST_DB; CREATE DATABASE $TEST_DB;"
gunzip < $LATEST_BACKUP | mysql -u root -p$MYSQL_ROOT_PASSWORD $TEST_DB

# Verify recovery
TABLES=$(mysql -u root -p$MYSQL_ROOT_PASSWORD $TEST_DB -e "SHOW TABLES;" | wc -l)
if [ $TABLES -gt 1 ]; then
    echo "Recovery test PASSED - $TABLES tables restored"
    
    # Test data integrity
    USERS=$(mysql -u root -p$MYSQL_ROOT_PASSWORD $TEST_DB -e "SELECT COUNT(*) FROM users;" | tail -1)
    CHURCHES=$(mysql -u root -p$MYSQL_ROOT_PASSWORD $TEST_DB -e "SELECT COUNT(*) FROM churches;" | tail -1)
    
    echo "Data integrity: $USERS users, $CHURCHES churches"
else
    echo "Recovery test FAILED"
fi

# Cleanup
mysql -u root -p$MYSQL_ROOT_PASSWORD -e "DROP DATABASE $TEST_DB;"
```

## Backup Automation

### 1. Cron Job Configuration

#### Daily Backup Cron Jobs
```bash
# /etc/cron.d/orthodox-metrics-backup

# Database backup at 2:00 AM
0 2 * * * root /usr/local/bin/daily-db-backup.sh

# Application backup at 3:00 AM
0 3 * * * root /usr/local/bin/app-backup.sh

# Uploads backup at 4:00 AM
0 4 * * * root /usr/local/bin/uploads-backup.sh

# Remote backup at 5:00 AM
0 5 * * * root /usr/local/bin/s3-backup.sh
```

#### Weekly Backup Cron Jobs
```bash
# Weekly full backup on Sunday at 1:00 AM
0 1 * * 0 root /usr/local/bin/weekly-full-backup.sh

# Weekly backup verification on Sunday at 6:00 AM
0 6 * * 0 root /usr/local/bin/recovery-test.sh
```

### 2. Monitoring and Alerting

#### Backup Status Monitoring
```bash
#!/bin/bash
# backup-monitor.sh

BACKUP_DIR="/var/backups/orthodox-metrics"
LOG_FILE="/var/log/orthodox-metrics/backup.log"
ALERT_EMAIL="admin@orthodoxmetrics.com"

# Check if daily backup completed
TODAY=$(date +%Y%m%d)
DB_BACKUP=$(find $BACKUP_DIR -name "db_backup_${TODAY}_*.sql.gz" | wc -l)
APP_BACKUP=$(find $BACKUP_DIR -name "app_backup_${TODAY}_*.tar.gz" | wc -l)

if [ $DB_BACKUP -eq 0 ]; then
    echo "ALERT: Database backup missing for $TODAY" | \
        mail -s "Backup Alert - Database" $ALERT_EMAIL
fi

if [ $APP_BACKUP -eq 0 ]; then
    echo "ALERT: Application backup missing for $TODAY" | \
        mail -s "Backup Alert - Application" $ALERT_EMAIL
fi
```

## Security Considerations

### 1. Backup Security

#### Encryption
- All backups should be encrypted before storage
- Use strong encryption algorithms (AES-256)
- Secure key management practices
- Regular key rotation

#### Access Control
- Limit backup access to authorized personnel
- Use separate credentials for backup operations
- Implement audit logging for backup access
- Regular access review

### 2. Secure Storage

#### Local Storage
- Secure backup directory permissions
- Use dedicated backup user account
- Implement file integrity checking
- Regular security audits

#### Remote Storage
- Use secure transport protocols (HTTPS, SFTP)
- Implement multi-factor authentication
- Use service-specific access keys
- Regular security assessments

## Maintenance

### 1. Backup Maintenance

#### Weekly Tasks
- Verify backup completion
- Test random backup restoration
- Check backup storage usage
- Review backup logs

#### Monthly Tasks
- Full disaster recovery test
- Backup policy review
- Storage capacity planning
- Security assessment

### 2. Documentation Updates

#### Change Management
- Document all backup procedure changes
- Update recovery procedures
- Maintain emergency contact information
- Regular procedure reviews

## Conclusion

A comprehensive backup and disaster recovery strategy is essential for maintaining business continuity and protecting critical data. This guide provides the foundation for implementing robust backup procedures and disaster recovery capabilities for the Orthodox Metrics system.

Regular testing, monitoring, and maintenance of backup systems ensure that recovery procedures work effectively when needed. The combination of automated backups, secure storage, and documented procedures provides comprehensive protection against data loss and system failures.

For additional information on system monitoring and maintenance, refer to the [MONITORING_GUIDE.md](MONITORING_GUIDE.md) and [OPERATIONS_GUIDE.md](OPERATIONS_GUIDE.md) documentation.
