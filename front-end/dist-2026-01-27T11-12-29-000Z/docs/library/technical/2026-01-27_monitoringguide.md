# Orthodox Metrics System - Monitoring Guide

## Overview

This guide provides comprehensive monitoring procedures for the Orthodox Metrics church management system. It covers system health monitoring, performance metrics, log analysis, and alert management.

## System Monitoring Components

### 1. Application Monitoring (PM2)

#### PM2 Dashboard
```bash
# View all processes
pm2 list

# Monitor processes in real-time
pm2 monit

# View process logs
pm2 logs [process-name]

# Restart process
pm2 restart [process-name]

# View process details
pm2 describe [process-name]
```

#### PM2 Configuration
```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: "orthodox-metrics",
    script: "index.js",
    instances: "max",
    exec_mode: "cluster",
    env: {
      NODE_ENV: "production",
      PORT: 3001
    },
    log_file: "/var/log/pm2/orthodox-metrics.log",
    error_file: "/var/log/pm2/orthodox-metrics-error.log",
    out_file: "/var/log/pm2/orthodox-metrics-out.log",
    max_memory_restart: "1G",
    restart_delay: 4000,
    watch: false,
    ignore_watch: ["node_modules", "logs", "uploads"]
  }]
};
```

### 2. Database Monitoring

#### MySQL Performance Monitoring
```sql
-- Check database size
SELECT 
    table_schema "Database",
    ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) "Size (MB)"
FROM information_schema.tables 
WHERE table_schema = 'orthodox_metrics'
GROUP BY table_schema;

-- Monitor active connections
SHOW PROCESSLIST;

-- Check slow queries
SELECT * FROM mysql.slow_log 
WHERE start_time > DATE_SUB(NOW(), INTERVAL 1 HOUR);

-- Monitor table locks
SHOW OPEN TABLES WHERE In_use > 0;
```

#### Database Health Checks
```bash
#!/bin/bash
# db-health-check.sh

DB_NAME="orthodox_metrics"
DB_USER="your_db_user"
DB_PASS="your_db_pass"

# Check database connection
mysql -u$DB_USER -p$DB_PASS -e "SELECT 1" > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✓ Database connection: OK"
else
    echo "✗ Database connection: FAILED"
    exit 1
fi

# Check table integrity
mysql -u$DB_USER -p$DB_PASS $DB_NAME -e "CHECK TABLE users, churches, logs" > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✓ Table integrity: OK"
else
    echo "✗ Table integrity: FAILED"
fi
```

### 3. Web Server Monitoring (Nginx)

#### Nginx Status Module
```nginx
# Add to nginx.conf
location /nginx_status {
    stub_status on;
    access_log off;
    allow 127.0.0.1;
    deny all;
}
```

#### Nginx Log Analysis
```bash
# Monitor access logs
tail -f /var/log/nginx/access.log | grep orthodox-metrics

# Check error logs
tail -f /var/log/nginx/error.log

# Analyze response times
awk '{print $10}' /var/log/nginx/access.log | sort -n | tail -20

# Monitor 404 errors
grep "404" /var/log/nginx/access.log | tail -10
```

### 4. System Resource Monitoring

#### CPU and Memory Monitoring
```bash
# Real-time system monitoring
htop

# Check disk usage
df -h

# Monitor memory usage
free -h

# Check system load
uptime

# Monitor specific process
ps aux | grep node
```

#### System Performance Script
```bash
#!/bin/bash
# system-monitor.sh

echo "=== System Performance Report ==="
echo "Date: $(date)"
echo ""

echo "CPU Usage:"
top -bn1 | grep "Cpu(s)" | awk '{print $2 + $4}'

echo ""
echo "Memory Usage:"
free -h | awk 'NR==2{printf "%.2f%%\n", $3*100/$2}'

echo ""
echo "Disk Usage:"
df -h | grep -vE '^Filesystem|tmpfs|cdrom'

echo ""
echo "Load Average:"
uptime | awk -F'load average:' '{print $2}'

echo ""
echo "Active Connections:"
netstat -an | grep :80 | wc -l
```

## Performance Metrics

### 1. Application Performance

#### Response Time Monitoring
```javascript
// middleware/performance.js
const performanceMiddleware = (req, res, next) => {
    const start = Date.now();
    
    res.on('finish', () => {
        const duration = Date.now() - start;
        
        // Log slow requests (>1 second)
        if (duration > 1000) {
            console.log(`Slow request: ${req.method} ${req.path} - ${duration}ms`);
        }
        
        // Store metrics
        storeMetric('response_time', duration, {
            method: req.method,
            path: req.path,
            status: res.statusCode
        });
    });
    
    next();
};
```

#### Database Query Performance
```javascript
// utils/database-monitor.js
const mysql = require('mysql2/promise');

class DatabaseMonitor {
    static async logSlowQueries(query, params, duration) {
        if (duration > 1000) { // Log queries taking > 1 second
            console.log(`Slow query (${duration}ms): ${query}`);
            
            // Store in monitoring database
            await this.storeSlowQuery(query, params, duration);
        }
    }
    
    static async checkConnectionPool() {
        const pool = require('../config/database');
        const connections = pool.pool.allConnections.length;
        const free = pool.pool.freeConnections.length;
        
        return {
            total: connections,
            free: free,
            used: connections - free
        };
    }
}
```

### 2. Frontend Performance

#### Bundle Size Monitoring
```javascript
// vite.config.ts
import { defineConfig } from 'vite';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
    plugins: [
        visualizer({
            filename: 'dist/stats.html',
            open: true,
            gzipSize: true,
            brotliSize: true,
        })
    ],
    build: {
        rollupOptions: {
            output: {
                manualChunks: {
                    vendor: ['react', 'react-dom'],
                    material: ['@mui/material', '@mui/icons-material'],
                }
            }
        }
    }
});
```

#### Client-Side Performance Monitoring
```javascript
// src/utils/performance.js
export class PerformanceMonitor {
    static measurePageLoad() {
        window.addEventListener('load', () => {
            const navigation = performance.getEntriesByType('navigation')[0];
            const loadTime = navigation.loadEventEnd - navigation.loadEventStart;
            
            this.sendMetric('page_load_time', loadTime);
        });
    }
    
    static measureApiCalls(url, duration) {
        if (duration > 2000) { // Log API calls taking > 2 seconds
            console.log(`Slow API call: ${url} - ${duration}ms`);
        }
        
        this.sendMetric('api_response_time', duration, { url });
    }
}
```

## Log Analysis

### 1. Application Logs

#### Log Aggregation
```bash
# Centralized log viewing
journalctl -u orthodox-metrics -f

# Filter by log level
grep "ERROR" /var/log/orthodox-metrics/application.log

# Search for specific patterns
grep -i "authentication" /var/log/orthodox-metrics/application.log | tail -50
```

#### Log Rotation Configuration
```bash
# /etc/logrotate.d/orthodox-metrics
/var/log/orthodox-metrics/*.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    create 644 www-data www-data
    postrotate
        systemctl reload nginx
    endscript
}
```

### 2. Security Log Monitoring

#### Failed Login Attempts
```bash
# Monitor authentication failures
grep "Authentication failed" /var/log/orthodox-metrics/security.log | tail -20

# Check for brute force attempts
grep "Authentication failed" /var/log/orthodox-metrics/security.log | \
    awk '{print $5}' | sort | uniq -c | sort -nr | head -10
```

#### Suspicious Activity Detection
```javascript
// middleware/security-monitor.js
const securityMonitor = (req, res, next) => {
    const suspiciousPatterns = [
        /\.\.\//, // Path traversal
        /<script/i, // XSS attempts
        /union.*select/i, // SQL injection
        /eval\(/i, // Code injection
    ];
    
    const userAgent = req.get('User-Agent') || '';
    const url = req.url;
    const ip = req.ip;
    
    // Check for suspicious patterns
    suspiciousPatterns.forEach(pattern => {
        if (pattern.test(url) || pattern.test(userAgent)) {
            logger.warn(`Suspicious activity detected`, {
                ip,
                url,
                userAgent,
                pattern: pattern.toString()
            });
        }
    });
    
    next();
};
```

## Alert Management

### 1. System Alerts

#### Email Alerts Configuration
```javascript
// utils/alerting.js
const nodemailer = require('nodemailer');

class AlertManager {
    constructor() {
        this.transporter = nodemailer.createTransporter({
            host: 'smtp.gmail.com',
            port: 587,
            secure: false,
            auth: {
                user: process.env.ALERT_EMAIL,
                pass: process.env.ALERT_PASSWORD
            }
        });
    }
    
    async sendAlert(level, message, details = {}) {
        const alertEmail = {
            from: process.env.ALERT_EMAIL,
            to: process.env.ADMIN_EMAIL,
            subject: `Orthodox Metrics Alert - ${level.toUpperCase()}`,
            html: `
                <h2>System Alert</h2>
                <p><strong>Level:</strong> ${level}</p>
                <p><strong>Message:</strong> ${message}</p>
                <p><strong>Time:</strong> ${new Date().toISOString()}</p>
                <p><strong>Details:</strong></p>
                <pre>${JSON.stringify(details, null, 2)}</pre>
            `
        };
        
        try {
            await this.transporter.sendMail(alertEmail);
            console.log(`Alert sent: ${level} - ${message}`);
        } catch (error) {
            console.error('Failed to send alert:', error);
        }
    }
}
```

#### Critical System Alerts
```bash
#!/bin/bash
# alert-monitor.sh

# Check disk space
DISK_USAGE=$(df -h | grep '/dev/sda1' | awk '{print $5}' | sed 's/%//')
if [ $DISK_USAGE -gt 80 ]; then
    echo "CRITICAL: Disk usage is ${DISK_USAGE}%"
    # Send alert
fi

# Check memory usage
MEMORY_USAGE=$(free | grep Mem | awk '{printf "%.0f", $3/$2 * 100.0}')
if [ $MEMORY_USAGE -gt 85 ]; then
    echo "WARNING: Memory usage is ${MEMORY_USAGE}%"
    # Send alert
fi

# Check if application is running
if ! pgrep -f "orthodox-metrics" > /dev/null; then
    echo "CRITICAL: Orthodox Metrics application is not running"
    # Send alert and restart
    pm2 restart orthodox-metrics
fi
```

### 2. Performance Alerts

#### Response Time Thresholds
```javascript
// middleware/performance-alerts.js
const AlertManager = require('../utils/alerting');

const performanceAlerts = (req, res, next) => {
    const start = Date.now();
    
    res.on('finish', async () => {
        const duration = Date.now() - start;
        
        // Alert on slow responses
        if (duration > 5000) {
            await AlertManager.sendAlert('WARNING', 
                `Slow response time: ${duration}ms`, {
                    url: req.url,
                    method: req.method,
                    userAgent: req.get('User-Agent')
                });
        }
        
        // Alert on server errors
        if (res.statusCode >= 500) {
            await AlertManager.sendAlert('ERROR', 
                `Server error: ${res.statusCode}`, {
                    url: req.url,
                    method: req.method,
                    duration: duration
                });
        }
    });
    
    next();
};
```

## Health Checks

### 1. Application Health Check
```javascript
// routes/health.js
const express = require('express');
const router = express.Router();
const mysql = require('../config/database');

router.get('/health', async (req, res) => {
    const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        checks: {}
    };
    
    try {
        // Database connectivity check
        await mysql.execute('SELECT 1');
        health.checks.database = { status: 'healthy' };
    } catch (error) {
        health.checks.database = { 
            status: 'unhealthy', 
            error: error.message 
        };
        health.status = 'unhealthy';
    }
    
    // File system check
    try {
        const fs = require('fs');
        fs.accessSync('./uploads', fs.constants.W_OK);
        health.checks.filesystem = { status: 'healthy' };
    } catch (error) {
        health.checks.filesystem = { 
            status: 'unhealthy', 
            error: error.message 
        };
        health.status = 'unhealthy';
    }
    
    const statusCode = health.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(health);
});

module.exports = router;
```

### 2. Automated Health Monitoring
```bash
#!/bin/bash
# health-monitor.sh

URL="http://localhost:3001/health"
TIMEOUT=10

# Check application health
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" --max-time $TIMEOUT $URL)

if [ $RESPONSE -eq 200 ]; then
    echo "✓ Application health check: PASSED"
else
    echo "✗ Application health check: FAILED (HTTP $RESPONSE)"
    
    # Restart application if health check fails
    pm2 restart orthodox-metrics
    
    # Send alert
    echo "Application restarted due to health check failure" | \
        mail -s "Orthodox Metrics Alert" admin@example.com
fi
```

## Monitoring Dashboard

### 1. Custom Monitoring Dashboard
```html
<!-- monitoring-dashboard.html -->
<!DOCTYPE html>
<html>
<head>
    <title>Orthodox Metrics Monitoring Dashboard</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .metric-card { 
            border: 1px solid #ddd; 
            padding: 15px; 
            margin: 10px 0; 
            border-radius: 5px; 
        }
        .status-healthy { background-color: #d4edda; }
        .status-warning { background-color: #fff3cd; }
        .status-critical { background-color: #f8d7da; }
    </style>
</head>
<body>
    <h1>Orthodox Metrics System Monitoring</h1>
    
    <div id="system-status" class="metric-card">
        <h3>System Status</h3>
        <div id="status-indicator">Loading...</div>
    </div>
    
    <div id="performance-metrics" class="metric-card">
        <h3>Performance Metrics</h3>
        <canvas id="performance-chart"></canvas>
    </div>
    
    <div id="error-logs" class="metric-card">
        <h3>Recent Errors</h3>
        <div id="error-list">Loading...</div>
    </div>
    
    <script>
        // Fetch and display monitoring data
        async function updateDashboard() {
            try {
                const response = await fetch('/api/monitoring/status');
                const data = await response.json();
                
                updateSystemStatus(data);
                updatePerformanceChart(data.performance);
                updateErrorLogs(data.errors);
            } catch (error) {
                console.error('Failed to update dashboard:', error);
            }
        }
        
        // Update dashboard every 30 seconds
        setInterval(updateDashboard, 30000);
        updateDashboard();
    </script>
</body>
</html>
```

## Best Practices

### 1. Monitoring Strategy
- **Proactive Monitoring**: Set up alerts before issues become critical
- **Comprehensive Coverage**: Monitor all system components
- **Historical Data**: Keep performance metrics for trend analysis
- **Regular Review**: Weekly monitoring reports and monthly analysis

### 2. Alert Management
- **Severity Levels**: Use appropriate alert levels (INFO, WARNING, ERROR, CRITICAL)
- **Alert Fatigue**: Avoid too many false positives
- **Escalation**: Define clear escalation procedures
- **Documentation**: Log all incidents and resolutions

### 3. Performance Optimization
- **Baseline Metrics**: Establish performance baselines
- **Regular Audits**: Monthly performance reviews
- **Capacity Planning**: Monitor trends for scaling decisions
- **Optimization**: Continuously improve based on metrics

## Troubleshooting Common Issues

### High CPU Usage
```bash
# Identify processes consuming CPU
top -p $(pgrep -f orthodox-metrics)

# Check for memory leaks
pm2 monit

# Analyze application logs
grep -i "error\|exception" /var/log/orthodox-metrics/application.log
```

### Database Performance Issues
```sql
-- Check for long-running queries
SELECT * FROM INFORMATION_SCHEMA.PROCESSLIST 
WHERE TIME > 10 AND COMMAND != 'Sleep';

-- Analyze slow query log
mysqldumpslow /var/log/mysql/slow.log
```

### Memory Issues
```bash
# Check memory usage by process
ps aux --sort=-%mem | head -20

# Check for memory leaks
valgrind --tool=memcheck --leak-check=full node index.js
```

## Conclusion

Effective monitoring is crucial for maintaining system reliability and performance. This guide provides the foundation for comprehensive monitoring of the Orthodox Metrics system. Regular monitoring, combined with proactive alerting and performance optimization, ensures optimal system operation.

For additional monitoring tools and advanced configurations, refer to the [OPERATIONS_GUIDE.md](OPERATIONS_GUIDE.md) and [TROUBLESHOOTING_500_ERRORS.md](TROUBLESHOOTING_500_ERRORS.md) documentation.
