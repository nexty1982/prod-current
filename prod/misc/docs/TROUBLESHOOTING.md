# Troubleshooting Guide - Orthodox Metrics

## 🔧 Quick Diagnostic Commands

Before diving into specific issues, run these commands to get system status:

```bash
# System health check
node testing/unified-tests.js --level basic

# Database connectivity
node database/database-manager.js validate

# Application logs
pm2 logs orthodox-metrics --lines 50

# System resources
top
df -h
free -h
```

## 🗄️ Database Issues

### Database Connection Problems

#### "Cannot connect to MySQL server"

**Symptoms**:
- Application fails to start
- Database connection timeout errors
- "ECONNREFUSED" errors in logs

**Diagnosis**:
```bash
# Check MySQL service status
sudo systemctl status mysql

# Test MySQL connection
mysql -u orthodoxapps -p orthodox_metrics -e "SELECT 1;"

# Check MySQL error logs
sudo tail -f /var/log/mysql/error.log

# Verify database exists
mysql -u root -p -e "SHOW DATABASES;"
```

**Solutions**:
```bash
# Restart MySQL service
sudo systemctl restart mysql

# Fix permissions
mysql -u root -p << EOF
GRANT ALL PRIVILEGES ON orthodox_metrics.* TO 'orthodoxapps'@'localhost';
GRANT ALL PRIVILEGES ON orthodox_records.* TO 'orthodoxapps'@'localhost';
FLUSH PRIVILEGES;
EOF

# Recreate database if needed
node database/database-manager.js setup --force
```

#### "Table doesn't exist" Errors

**Symptoms**:
- API calls return database errors
- Missing table errors in logs
- Fresh installation issues

**Diagnosis**:
```bash
# Check existing tables
mysql -u orthodoxapps -p orthodox_metrics -e "SHOW TABLES;"

# Verify schema integrity
node database/database-manager.js validate
```

**Solutions**:
```bash
# Recreate missing tables
node database/database-manager.js schema

# Full database reset (CAUTION: destroys data)
node database/database-manager.js setup --force

# Run specific migration
mysql -u orthodoxapps -p orthodox_metrics < database/churches_schema.sql
```

#### Database Performance Issues

**Symptoms**:
- Slow query responses
- High CPU usage by MySQL
- Application timeouts

**Diagnosis**:
```bash
# Check running queries
mysql -u root -p -e "SHOW PROCESSLIST;"

# Check slow queries
mysql -u root -p -e "SHOW STATUS LIKE 'Slow_queries';"

# Database size analysis
mysql -u root -p -e "
SELECT 
    table_schema AS 'Database',
    ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS 'Size (MB)'
FROM information_schema.tables 
WHERE table_schema IN ('orthodox_metrics', 'orthodox_records')
GROUP BY table_schema;
"
```

**Solutions**:
```bash
# Optimize database
node database/database-manager.js optimize

# Manual table optimization
mysql -u root -p << EOF
OPTIMIZE TABLE orthodox_metrics.churches;
OPTIMIZE TABLE orthodox_records.baptism_records;
ANALYZE TABLE orthodox_metrics.users;
EOF

# Check MySQL configuration
sudo nano /etc/mysql/mysql.conf.d/mysqld.cnf
# Increase innodb_buffer_pool_size if needed
```

## 🔐 Authentication & Permission Issues

### Login Problems

#### "Invalid credentials" for Valid Users

**Symptoms**:
- Users cannot log in with correct passwords
- Authentication failures in logs
- Session creation errors

**Diagnosis**:
```bash
# Check user records
mysql -u orthodoxapps -p orthodox_metrics -e "
SELECT id, email, role, active, last_login 
FROM users 
WHERE email = 'user@example.com';
"

# Test authentication endpoint
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'

# Check session configuration
node testing/debug-auth.js
```

**Solutions**:
```bash
# Reset user password
mysql -u orthodoxapps -p orthodox_metrics << EOF
UPDATE users 
SET password = '$2b$10$hashed_password_here' 
WHERE email = 'user@example.com';
EOF

# Clear sessions
redis-cli FLUSHDB  # If using Redis
# OR
mysql -u orthodoxapps -p orthodox_metrics -e "DELETE FROM sessions;"

# Verify environment variables
echo $SESSION_SECRET
echo $JWT_SECRET
```

#### Permission Denied Errors

**Symptoms**:
- "Access denied" for valid operations
- 403 Forbidden responses
- Users cannot access their own church data

**Diagnosis**:
```bash
# Check user permissions
mysql -u orthodoxapps -p orthodox_metrics -e "
SELECT u.email, u.role, u.church_id, c.name as church_name
FROM users u
LEFT JOIN churches c ON u.church_id = c.id
WHERE u.email = 'user@example.com';
"

# Test permission middleware
node testing/debug-permissions.js --user-id=123
```

**Solutions**:
```bash
# Fix user-church association
mysql -u orthodoxapps -p orthodox_metrics << EOF
UPDATE users 
SET church_id = 1 
WHERE email = 'user@example.com';
EOF

# Reset user role
mysql -u orthodoxapps -p orthodox_metrics << EOF
UPDATE users 
SET role = 'admin' 
WHERE email = 'admin@church.org';
EOF
```

## 📄 OCR Processing Issues

### Google Vision API Problems

#### "GOOGLE_APPLICATION_CREDENTIALS not found"

**Symptoms**:
- OCR uploads fail immediately
- Google API authentication errors
- "Service account key not found"

**Diagnosis**:
```bash
# Check credentials file
ls -la $GOOGLE_APPLICATION_CREDENTIALS
cat $GOOGLE_APPLICATION_CREDENTIALS | jq .type

# Test Google Vision API
node testing/test-ocr-simple.js --debug
```

**Solutions**:
```bash
# Set correct path
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account.json"

# Verify service account permissions
# In Google Cloud Console:
# 1. Check service account has Vision API access
# 2. Verify API is enabled
# 3. Check billing account is active

# Test with sample document
node testing/test-ocr-upload.js --file=test-document.pdf
```

#### OCR Processing Stuck/Slow

**Symptoms**:
- Documents stuck in "processing" status
- Very slow OCR processing
- Timeout errors

**Diagnosis**:
```bash
# Check OCR sessions
mysql -u orthodoxapps -p orthodox_records -e "
SELECT id, status, created_at, updated_at, file_path
FROM ocr_sessions 
WHERE status = 'processing'
ORDER BY created_at DESC;
"

# Check Google API quotas
# Google Cloud Console → APIs & Services → Quotas

# Test OCR pipeline
node testing/debug-ocr-pipeline.js --session-id=123
```

**Solutions**:
```bash
# Reset stuck sessions
mysql -u orthodoxapps -p orthodox_records << EOF
UPDATE ocr_sessions 
SET status = 'failed', 
    error_message = 'Reset due to timeout'
WHERE status = 'processing' 
AND created_at < DATE_SUB(NOW(), INTERVAL 1 HOUR);
EOF

# Restart OCR processing
node testing/debug-ocr-results.js --retry-failed

# Check file permissions
ls -la server/uploads/
sudo chown -R orthodox:orthodox server/uploads/
```

#### OCR Results Inaccurate

**Symptoms**:
- Poor text extraction quality
- Wrong language detection
- Misclassified document types

**Diagnosis**:
```bash
# Check OCR confidence scores
mysql -u orthodoxapps -p orthodox_records -e "
SELECT file_name, language_detected, confidence_score, document_type
FROM ocr_sessions 
WHERE confidence_score < 0.8
ORDER BY created_at DESC 
LIMIT 10;
"

# Test specific document
node testing/debug-public-ocr.js --file=problem-document.pdf --verbose
```

**Solutions**:
```bash
# Improve document quality before upload
# - Scan at higher resolution (300+ DPI)
# - Ensure good lighting and contrast
# - Remove shadows and skewing

# Adjust OCR parameters
# In ocr processing code:
# - Lower confidence threshold for difficult documents
# - Enable multiple language detection
# - Use manual review for borderline cases

# Retrain document classification
node maintenance/analyze-ocr-patterns.js --retrain
```

## 🌐 Network & Server Issues

### Application Not Accessible

#### "Connection Refused" Errors

**Symptoms**:
- Cannot access website
- API calls fail
- Nginx errors

**Diagnosis**:
```bash
# Check application status
pm2 status
pm2 logs orthodox-metrics

# Check port binding
sudo netstat -tulpn | grep :3000
sudo ss -tulpn | grep :3000

# Check nginx status
sudo systemctl status nginx
sudo nginx -t

# Check firewall
sudo ufw status
```

**Solutions**:
```bash
# Restart application
pm2 restart orthodox-metrics

# Check application startup
cd /opt/orthodoxmetrics/prod/server
node index.js  # Manual start to see errors

# Fix nginx configuration
sudo nginx -t
sudo systemctl reload nginx

# Open firewall ports
sudo ufw allow 80
sudo ufw allow 443
```

#### SSL Certificate Issues

**Symptoms**:
- "Your connection is not private" warnings
- Certificate expired errors
- Mixed content warnings

**Diagnosis**:
```bash
# Check certificate status
sudo certbot certificates

# Test SSL configuration
openssl s_client -connect yourdomain.com:443 -servername yourdomain.com

# Check certificate expiry
echo | openssl s_client -servername yourdomain.com -connect yourdomain.com:443 2>/dev/null | openssl x509 -noout -dates
```

**Solutions**:
```bash
# Renew certificates
sudo certbot renew

# Force renewal
sudo certbot renew --force-renewal

# Fix nginx SSL configuration
sudo nano /etc/nginx/sites-available/orthodoxmetrics
# Verify SSL paths are correct

# Test SSL setup
sudo nginx -t
sudo systemctl reload nginx
```

### Performance Issues

#### High Memory Usage

**Symptoms**:
- System running out of memory
- Application crashes with "out of memory"
- Slow response times

**Diagnosis**:
```bash
# Check memory usage
free -h
top -o %MEM

# Check application memory
pm2 monit
ps aux | grep node

# Check for memory leaks
node --inspect testing/debug-memory-usage.js
```

**Solutions**:
```bash
# Restart application to free memory
pm2 restart orthodox-metrics

# Adjust PM2 configuration
# In ecosystem.config.cjs:
max_memory_restart: '1G'

# Optimize database queries
node database/database-manager.js optimize

# Add swap space if needed
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

#### High CPU Usage

**Symptoms**:
- System becomes unresponsive
- High load averages
- Slow API responses

**Diagnosis**:
```bash
# Check CPU usage
top
htop

# Check application processes
pm2 list
pm2 show orthodox-metrics

# Check database load
mysql -u root -p -e "SHOW PROCESSLIST;"
```

**Solutions**:
```bash
# Scale application instances
pm2 scale orthodox-metrics +2

# Optimize database
node database/database-manager.js optimize

# Check for infinite loops or blocking operations
pm2 logs orthodox-metrics --lines 100

# Add CPU monitoring
pm2 install pm2-server-monit
```

## 📁 File Upload Issues

### Upload Failures

#### "File too large" Errors

**Symptoms**:
- Document uploads fail
- "413 Payload Too Large" errors
- Upload progress stops

**Diagnosis**:
```bash
# Check nginx upload limits
grep client_max_body_size /etc/nginx/sites-available/orthodoxmetrics

# Check application limits
grep MAX_UPLOAD_SIZE server/.env

# Check disk space
df -h /opt/orthodoxmetrics/prod/server/uploads/
```

**Solutions**:
```bash
# Increase nginx limit
sudo nano /etc/nginx/sites-available/orthodoxmetrics
# Add: client_max_body_size 50M;

# Increase application limit
nano server/.env
# Set: MAX_UPLOAD_SIZE=50mb

# Restart services
sudo systemctl reload nginx
pm2 restart orthodox-metrics
```

#### Upload Directory Permission Issues

**Symptoms**:
- "Permission denied" on file upload
- Cannot save uploaded files
- File upload succeeds but files missing

**Diagnosis**:
```bash
# Check upload directory permissions
ls -la server/uploads/
ls -la server/uploads/ocr-documents/

# Check disk space
df -h server/uploads/
```

**Solutions**:
```bash
# Fix permissions
sudo chown -R orthodox:orthodox server/uploads/
sudo chmod -R 755 server/uploads/

# Create missing directories
mkdir -p server/uploads/ocr-documents
mkdir -p server/uploads/profile-images
mkdir -p server/uploads/church-assets

# Check disk space and clean if needed
du -sh server/uploads/*
# Remove old temporary files if needed
```

## 🔄 Frontend Issues

### React Application Problems

#### "White screen" or Application Won't Load

**Symptoms**:
- Blank page after loading
- JavaScript errors in browser console
- "Loading..." never completes

**Diagnosis**:
```bash
# Check frontend build
ls -la front-end/dist/

# Check nginx static file serving
curl -I http://yourdomain.com/

# Check browser console for errors
# Open browser dev tools → Console

# Check network requests
# Browser dev tools → Network tab
```

**Solutions**:
```bash
# Rebuild frontend
cd front-end
npm run build

# Copy to nginx directory
sudo cp -r dist/* /var/www/orthodoxmetrics/

# Fix nginx static file configuration
sudo nano /etc/nginx/sites-available/orthodoxmetrics
# Verify root path is correct

# Clear browser cache
# Browser dev tools → Application → Storage → Clear storage
```

#### API Connection Issues

**Symptoms**:
- Frontend loads but API calls fail
- "Network Error" messages
- CORS errors in browser console

**Diagnosis**:
```bash
# Test API directly
curl -X GET http://localhost:3000/api/health

# Check CORS configuration
grep -r "cors" server/

# Check network connectivity
ping yourdomain.com
```

**Solutions**:
```bash
# Fix CORS configuration
# In server/index.js or middleware:
app.use(cors({
  origin: ['http://localhost:5173', 'https://yourdomain.com'],
  credentials: true
}));

# Update API base URL in frontend
# Check front-end/src/services/api.js

# Restart application
pm2 restart orthodox-metrics
```

## 🔍 Logging and Debugging

### Enable Debug Logging

#### Application Debug Mode
```bash
# Enable debug logging
DEBUG=orthodox:* npm run dev

# Specific component debugging
DEBUG=orthodox:auth,orthodox:ocr pm run dev

# Production debugging (careful with logs)
DEBUG=orthodox:error pm2 restart orthodox-metrics --update-env
```

#### Database Query Logging
```sql
-- Enable general query log (temporarily)
SET GLOBAL general_log = 'ON';
SET GLOBAL general_log_file = '/var/log/mysql/general.log';

-- Disable after debugging
SET GLOBAL general_log = 'OFF';
```

### Common Error Patterns

#### Memory Leak Detection
```bash
# Monitor memory over time
while true; do
  ps aux | grep "node.*orthodox" | awk '{print $4, $6}'
  sleep 60
done

# Use memory profiling
node --inspect=0.0.0.0:9229 index.js
# Connect Chrome DevTools to localhost:9229
```

#### Database Deadlock Detection
```sql
-- Check for deadlocks
SHOW ENGINE INNODB STATUS;

-- Monitor blocking queries
SELECT 
    r.trx_id waiting_trx_id,
    r.trx_mysql_thread_id waiting_thread,
    r.trx_query waiting_query,
    b.trx_id blocking_trx_id,
    b.trx_mysql_thread_id blocking_thread,
    b.trx_query blocking_query
FROM information_schema.innodb_lock_waits w
INNER JOIN information_schema.innodb_trx b ON b.trx_id = w.blocking_trx_id
INNER JOIN information_schema.innodb_trx r ON r.trx_id = w.requesting_trx_id;
```

## 🆘 Emergency Procedures

### System Recovery

#### Complete System Restart
```bash
# Graceful restart
pm2 stop orthodox-metrics
sudo systemctl stop nginx
sudo systemctl stop mysql

# Wait 30 seconds
sleep 30

# Start services
sudo systemctl start mysql
sudo systemctl start nginx
pm2 start orthodox-metrics

# Verify functionality
node testing/unified-tests.js --level basic
```

#### Database Recovery from Backup
```bash
# Stop application
pm2 stop orthodox-metrics

# Restore from backup
mysql -u root -p orthodox_metrics < /opt/orthodoxmetrics/backups/orthodox_metrics_latest.sql
mysql -u root -p orthodox_records < /opt/orthodoxmetrics/backups/orthodox_records_latest.sql

# Validate restoration
node database/database-manager.js validate

# Restart application
pm2 start orthodox-metrics
```

### Emergency Contacts and Escalation

#### Immediate Actions for Critical Issues
1. **Take screenshot/note exact error message**
2. **Check if issue affects all users or specific users**
3. **Run quick diagnostic**: `node testing/unified-tests.js --level basic`
4. **Check system resources**: `top`, `df -h`, `free -h`
5. **Review recent changes**: Check git log and deployment history

#### Emergency Rollback
```bash
# Rollback to previous version
cd /opt/orthodoxmetrics/prod
git log --oneline -5  # Check recent commits
git checkout [previous-commit-hash]

# Reinstall dependencies
npm ci --only=production

# Restart application
pm2 restart orthodox-metrics

# Verify rollback success
node testing/unified-tests.js --level basic
```

---

This troubleshooting guide covers the most common issues in Orthodox Metrics. For additional support, refer to the [Development Guide](DEVELOPMENT_GUIDE.md) for technical details or [Administration Guide](ADMINISTRATION_GUIDE.md) for operational procedures. 🏛️🔧
