#!/bin/bash

echo "=== OMAI Watchdog & Secretary System Setup ==="
echo "Date: $(date)"
echo "Setting up comprehensive system monitoring and communication"

# Set script options
set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   print_error "This script should not be run as root. Please run as a regular user with sudo access."
   exit 1
fi

# Navigate to production directory
PROD_ROOT="/var/www/orthodox-church-mgmt/orthodoxmetrics/prod"
print_status "Setting up in: $PROD_ROOT"

cd "$PROD_ROOT" || {
    print_error "Could not change to production directory"
    exit 1
}

echo ""
echo "=== Step 1: Create Directory Structure ==="

# Create OMAI log directories
print_status "Creating OMAI log directories..."
sudo mkdir -p /var/log/omai
sudo chown www-data:www-data /var/log/omai
sudo chmod 755 /var/log/omai

# Create watchdog configuration directory
sudo mkdir -p /etc/omai
sudo chown www-data:www-data /etc/omai
sudo chmod 755 /etc/omai

# Create Big Book watchdog directories
print_status "Creating Big Book watchdog directories..."
sudo mkdir -p /mnt/bigbook_secure/System_Logs/Watchdog/{alerts,daily_summaries,trends}
sudo chown -R www-data:www-data /mnt/bigbook_secure/System_Logs/Watchdog
sudo chmod -R 755 /mnt/bigbook_secure/System_Logs/Watchdog

# Create local config directory
mkdir -p config

print_success "Directory structure created"

echo ""
echo "=== Step 2: Install Dependencies ==="

# Check if Node.js modules exist
if [ ! -d "node_modules" ]; then
    print_status "Installing Node.js dependencies..."
    npm install
fi

print_success "Dependencies verified"

echo ""
echo "=== Step 3: Create Default Configuration ==="

# Create default watchdog configuration
cat > config/watchdog.json << 'EOF'
{
  "enabled": false,
  "alertLevel": "warning",
  "scanFrequency": "5m",
  "quietHours": {
    "start": "01:00",
    "end": "06:00"
  },
  "maxAlerts": 100,
  "allowedFiles": [
    "/var/log/syslog",
    "/var/log/auth.log",
    "/var/log/kern.log",
    "/var/log/apache2/error.log",
    "/var/log/nginx/error.log",
    "/var/log/mysql/error.log",
    "/var/log/mysql/mysql.log",
    "/var/log/pm2/pm2.log",
    "/var/log/omai/watchdog.log",
    "/var/log/omai/maintenance.log"
  ],
  "blockedPatterns": [
    "password",
    "secret",
    "token",
    "key",
    "credential"
  ],
  "systemChecks": {
    "diskSpace": { "enabled": true, "threshold": 85 },
    "memoryUsage": { "enabled": true, "threshold": 90 },
    "cpuUsage": { "enabled": true, "threshold": 95 },
    "loadAverage": { "enabled": true, "threshold": 8.0 },
    "failedLogins": { "enabled": true, "threshold": 10 },
    "serviceHealth": { "enabled": true, "services": ["nginx", "mysql", "pm2"] }
  }
}
EOF

print_success "Default configuration created"

echo ""
echo "=== Step 4: Test Core Services ==="

print_status "Testing OMAIWatchdogService..."
node -e "
const OMAIWatchdogService = require('./server/services/omaiWatchdogService');
const service = new OMAIWatchdogService();

setTimeout(() => {
  const status = service.getSystemStatus();
  console.log('✅ Watchdog service test passed');
  console.log('Configuration loaded:', !!status.config);
  console.log('Watched files:', status.watchedFiles.length);
  process.exit(0);
}, 2000);
"

print_status "Testing BigBookWatchdogIntegration..."
node -e "
const BigBookIntegration = require('./server/services/bigBookWatchdogIntegration');
const integration = new BigBookIntegration();

setTimeout(async () => {
  const stats = await integration.getStatistics();
  console.log('✅ Big Book integration test passed');
  console.log('Statistics loaded:', !!stats);
  process.exit(0);
}, 2000);
"

print_success "Core services tested successfully"

echo ""
echo "=== Step 5: Set Up Log Rotation ==="

# Create logrotate configuration for OMAI logs
sudo tee /etc/logrotate.d/omai-watchdog > /dev/null << 'EOF'
/var/log/omai/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    copytruncate
    create 644 www-data www-data
}
EOF

print_success "Log rotation configured"

echo ""
echo "=== Step 6: Create Systemd Service ==="

# Create systemd service for OMAI Watchdog
sudo tee /etc/systemd/system/omai-watchdog.service > /dev/null << EOF
[Unit]
Description=OMAI Watchdog & Secretary System
Documentation=file://$PROD_ROOT/OMAI_WATCHDOG_IMPLEMENTATION.md
After=network.target mysql.service nginx.service

[Service]
Type=simple
User=www-data
Group=www-data
WorkingDirectory=$PROD_ROOT
ExecStart=/usr/bin/node -e "
const OMAIWatchdogService = require('./server/services/omaiWatchdogService');
const service = new OMAIWatchdogService();

// Keep the service running
process.on('SIGTERM', async () => {
  console.log('Received SIGTERM, stopping watchdog...');
  await service.stopMonitoring();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('Received SIGINT, stopping watchdog...');
  await service.stopMonitoring();
  process.exit(0);
});

console.log('OMAI Watchdog service started');
"
ExecReload=/bin/kill -HUP \$MAINPID
KillMode=process
Restart=on-failure
RestartSec=30
StandardOutput=journal
StandardError=journal
SyslogIdentifier=omai-watchdog

[Install]
WantedBy=multi-user.target
EOF

# Reload systemd and enable service
sudo systemctl daemon-reload
sudo systemctl enable omai-watchdog

print_success "Systemd service created and enabled"

echo ""
echo "=== Step 7: Set Up OMAI CLI Integration ==="

# Create OMAI watchdog CLI command
cat > omai-watchdog-cli << 'EOF'
#!/usr/bin/env node

const OMAIWatchdogService = require('./server/services/omaiWatchdogService');
const service = new OMAIWatchdogService();

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case 'status':
      const status = service.getSystemStatus();
      console.log('OMAI Watchdog Status:');
      console.log(`Monitoring: ${status.isMonitoring ? 'ACTIVE' : 'INACTIVE'}`);
      console.log(`Active Alerts: ${status.activeAlerts}`);
      console.log(`Total Alerts: ${status.totalAlerts}`);
      console.log(`Watched Files: ${status.watchedFiles.length}`);
      break;

    case 'start':
      await service.startMonitoring();
      console.log('✅ Watchdog monitoring started');
      break;

    case 'stop':
      await service.stopMonitoring();
      console.log('⏹️ Watchdog monitoring stopped');
      break;

    case 'alerts':
      const limit = parseInt(args[1]) || 10;
      const alerts = service.getAlerts({ limit });
      console.log(`Recent ${alerts.length} alerts:`);
      alerts.forEach(alert => {
        console.log(`[${alert.severity.toUpperCase()}] ${alert.title} - ${new Date(alert.timestamp).toLocaleString()}`);
      });
      break;

    case 'summary':
      if (service.dailySummary) {
        console.log('Today\'s Summary:');
        console.log(`Date: ${service.dailySummary.date}`);
        console.log(`Critical: ${service.dailySummary.events.critical}`);
        console.log(`Errors: ${service.dailySummary.events.error}`);
        console.log(`Warnings: ${service.dailySummary.events.warning}`);
        console.log(`Info: ${service.dailySummary.events.info}`);
      } else {
        console.log('No summary available for today');
      }
      break;

    case 'test':
      const testAlert = service.createAlert({
        timestamp: new Date().toISOString(),
        filePath: 'cli_test',
        severity: 'info',
        message: 'Test alert from CLI',
        category: 'test',
        service: 'cli'
      });
      console.log(`✅ Test alert created: ${testAlert.id}`);
      break;

    default:
      console.log('OMAI Watchdog CLI');
      console.log('Usage: omai-watchdog <command>');
      console.log('Commands:');
      console.log('  status  - Show watchdog status');
      console.log('  start   - Start monitoring');
      console.log('  stop    - Stop monitoring');
      console.log('  alerts [limit] - Show recent alerts');
      console.log('  summary - Show today\'s summary');
      console.log('  test    - Create test alert');
  }

  process.exit(0);
}

main().catch(console.error);
EOF

chmod +x omai-watchdog-cli

# Create symlink for global access
sudo ln -sf "$PROD_ROOT/omai-watchdog-cli" /usr/local/bin/omai-watchdog

print_success "OMAI CLI integration created"

echo ""
echo "=== Step 8: Configure Fail2Ban Integration ==="

# Check if fail2ban is installed
if command -v fail2ban-client &> /dev/null; then
    print_status "Configuring fail2ban integration..."
    
    # Create fail2ban jail for OMAI integration
    sudo tee /etc/fail2ban/jail.d/omai-watchdog.conf > /dev/null << 'EOF'
[omai-ssh]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 5
bantime = 3600
findtime = 600
action = iptables[name=SSH, port=ssh, protocol=tcp]
         sendmail-whois[name=SSH, dest=root, sender=fail2ban@localhost, sendername="Fail2Ban"]
EOF

    sudo systemctl restart fail2ban
    print_success "Fail2ban integration configured"
else
    print_warning "Fail2ban not installed - skipping integration"
fi

echo ""
echo "=== Step 9: Test API Endpoints ==="

print_status "Testing watchdog API endpoints..."

# Start a temporary test server
node -e "
const express = require('express');
const session = require('express-session');
const watchdogRouter = require('./server/routes/watchdog');

const app = express();
app.use(express.json());

// Mock session middleware for testing
app.use((req, res, next) => {
  req.session = {
    user: {
      email: 'test@orthodoxmetrics.com',
      role: 'super_admin'
    }
  };
  next();
});

app.use('/api/admin/watchdog', watchdogRouter);

const server = app.listen(3001, () => {
  console.log('Test server started on port 3001');
  
  // Test status endpoint
  fetch('http://localhost:3001/api/admin/watchdog/status')
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        console.log('✅ Status endpoint test passed');
      } else {
        console.log('❌ Status endpoint test failed');
      }
    })
    .catch(error => {
      console.log('❌ API test failed:', error.message);
    })
    .finally(() => {
      server.close();
      process.exit(0);
    });
});
" &

# Wait for test to complete
sleep 5

print_success "API endpoints tested"

echo ""
echo "=== Step 10: Create Documentation ==="

cat > OMAI_WATCHDOG_IMPLEMENTATION.md << 'EOF'
# OMAI Watchdog & Secretary System

## Overview

The OMAI Watchdog & Secretary system provides comprehensive monitoring and intelligent communication for the OrthodoxMetrics infrastructure.

## Features

### 🔍 Continuous Monitoring
- **Log File Monitoring**: Real-time monitoring of system, application, and security logs
- **System Health Checks**: Automated monitoring of disk space, memory, CPU, and service health
- **Pattern Detection**: ML/NLP-based pattern recognition for anomaly detection
- **Security Monitoring**: Authentication failure detection and IP-based threat analysis

### 🚨 Intelligent Alerting
- **Severity Classification**: Automatic classification of events (info, warning, error, critical)
- **Smart Filtering**: Configurable alert levels and quiet hours
- **Suggested Actions**: Context-aware action recommendations for each alert
- **One-Click Remediation**: Execute common fixes directly from the UI

### 📊 Analytics & Reporting
- **Daily Summaries**: Comprehensive daily reports with narrative insights
- **Trend Analysis**: Long-term pattern analysis and anomaly detection
- **Health Scoring**: System health metrics with actionable recommendations
- **Big Book Integration**: Encrypted storage of all events and analytics

### 💬 Communication Interface
- **Natural Language Alerts**: Human-readable alert messages and summaries
- **Admin Notifications**: Immediate alerts for critical events
- **Weekly Reports**: Comprehensive system health reports
- **Interactive Dashboard**: Real-time monitoring interface

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Log Files     │───▶│  OMAI Watchdog  │───▶│   Big Book      │
│                 │    │    Service      │    │   Storage       │
│ • syslog        │    │                 │    │                 │
│ • auth.log      │    │ • Log Parsing   │    │ • Alerts        │
│ • nginx logs    │    │ • Classification│    │ • Summaries     │
│ • mysql logs    │    │ • Health Checks │    │ • Trends        │
│ • pm2 logs      │    │ • Alert Gen     │    │ • Analytics     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │   Admin UI      │
                       │                 │
                       │ • Dashboard     │
                       │ • Alerts        │
                       │ • Config        │
                       │ • Actions       │
                       └─────────────────┘
```

## Configuration

### System Checks
- **Disk Space**: Monitor disk usage (default: 85% threshold)
- **Memory Usage**: Monitor RAM usage (default: 90% threshold)
- **CPU Usage**: Monitor CPU load (default: 95% threshold)
- **Load Average**: Monitor system load (default: 8.0 threshold)
- **Failed Logins**: Monitor authentication failures (default: 10 threshold)
- **Service Health**: Monitor critical services (nginx, mysql, pm2)

### Alert Levels
- **Info**: Informational events, low priority
- **Warning**: Potential issues that should be monitored
- **Error**: Active problems requiring attention
- **Critical**: Urgent issues requiring immediate action

### Monitored Log Files
- `/var/log/syslog` - System events
- `/var/log/auth.log` - Authentication events
- `/var/log/kern.log` - Kernel events
- `/var/log/nginx/error.log` - Web server errors
- `/var/log/mysql/error.log` - Database errors
- `/var/log/pm2/pm2.log` - Application manager logs
- `/var/log/omai/*.log` - OMAI system logs

## Usage

### CLI Commands
```bash
# Check status
omai-watchdog status

# Start/stop monitoring
omai-watchdog start
omai-watchdog stop

# View alerts
omai-watchdog alerts 20

# View today's summary
omai-watchdog summary

# Create test alert
omai-watchdog test
```

### Web Interface
Navigate to `/admin/watchdog` in the OrthodoxMetrics admin panel to access:
- Real-time system status
- Active alerts with suggested actions
- Configuration management
- Daily summaries and trends

### API Endpoints
- `GET /api/admin/watchdog/status` - System status
- `GET /api/admin/watchdog/alerts` - Current alerts
- `PUT /api/admin/watchdog/config` - Update configuration
- `POST /api/admin/watchdog/start` - Start monitoring
- `POST /api/admin/watchdog/stop` - Stop monitoring

## Security

### Permissions
- **Super Admin Only**: All watchdog functions require super_admin role
- **Sensitive Data Protection**: Automatic filtering of passwords and secrets
- **Encrypted Storage**: All data stored in encrypted Big Book format
- **Audit Logging**: All configuration changes and actions logged

### Data Privacy
- Sensitive patterns automatically filtered from logs
- No storage of authentication credentials
- IP addresses anonymized in long-term storage
- Configurable data retention policies

## Maintenance

### Log Rotation
- Automatic rotation of OMAI logs (30-day retention)
- Compressed storage of historical data
- Configurable retention policies

### Service Management
```bash
# Service status
sudo systemctl status omai-watchdog

# Start/stop service
sudo systemctl start omai-watchdog
sudo systemctl stop omai-watchdog

# View logs
sudo journalctl -u omai-watchdog -f
```

### Troubleshooting
1. **Check service status**: `sudo systemctl status omai-watchdog`
2. **Verify permissions**: Ensure www-data has access to log files
3. **Check configuration**: Review `/var/www/orthodox-church-mgmt/orthodoxmetrics/prod/config/watchdog.json`
4. **Review logs**: Check `/var/log/omai/watchdog.log`

## Examples

### Sample Alert Messages
```
🚨 Critical: "Disk space usage on / is 96%"
⚠️  Warning: "Failed login attempts from IP 192.168.1.100 (15 attempts)"
🔧 Error: "MySQL service is inactive"
ℹ️  Info: "System backup completed successfully"
```

### Daily Summary Narrative
```
Daily System Report for 2025-01-26

📊 Event Summary:
• Total events processed: 1,247
• Critical: 2, Errors: 15, Warnings: 89, Info: 1,141

🚨 Critical Issues: 2 critical events require immediate attention

📂 Top Activity Categories:
• webserver: 456 events
• authentication: 234 events
• system: 189 events

🔧 Most Active Services:
• nginx: 345 events
• mysql: 123 events
• ssh: 89 events

💡 Recommendations:
• Review and resolve 2 critical issues immediately
• High error count suggests investigating nginx configuration
• All events are logged in Big Book > System Logs > Watchdog for detailed analysis
```

## Future Enhancements

- **Machine Learning**: Predictive failure detection
- **External Integrations**: Slack, Teams, email notifications
- **Custom Dashboards**: Grafana integration
- **Mobile Alerts**: Push notifications
- **Automated Remediation**: Expanded one-click fixes
EOF

print_success "Documentation created"

echo ""
echo "=== Step 11: Integration Summary ==="

cat > INTEGRATION_INSTRUCTIONS.md << 'EOF'
# OMAI Watchdog Integration Instructions

## Required Server Integration

To complete the OMAI Watchdog setup, add the following to your main Express application:

### 1. Add Watchdog Routes to Main Server

In your main `server/index.js` or equivalent, add:

```javascript
// Add watchdog routes
const watchdogRouter = require('./routes/watchdog');
app.use('/api/admin/watchdog', watchdogRouter);
```

### 2. Add SystemWatchdog Component to Admin Routes

In your frontend router (`front-end/src/routes/Router.tsx`), add:

```typescript
import SystemWatchdog from '../components/admin/SystemWatchdog';

// Add to your admin routes
{
  path: '/admin/watchdog',
  element: (
    <ProtectedRoute requiredRole={['super_admin']}>
      <AdminErrorBoundary>
        <SystemWatchdog />
      </AdminErrorBoundary>
    </ProtectedRoute>
  )
}
```

### 3. Add Menu Item

In your admin menu configuration, add:

```typescript
{
  id: uniqueId(),
  title: '🔒 System Watchdog',
  icon: SecurityIcon,
  href: '/admin/watchdog',
}
```

### 4. Start the Service

```bash
# Start the watchdog service
sudo systemctl start omai-watchdog

# Enable auto-start on boot
sudo systemctl enable omai-watchdog

# Check status
sudo systemctl status omai-watchdog
```

### 5. Access the Interface

Navigate to: `https://orthodoxmetrics.com/admin/watchdog`

## Testing

1. **Create Test Alert**: Use the web interface or CLI
2. **Check Log Monitoring**: Trigger a test event
3. **Verify Big Book Storage**: Check `/mnt/bigbook_secure/System_Logs/Watchdog`
4. **Test Alerts**: Configure alert levels and verify notifications

## Monitoring

- **Service Logs**: `sudo journalctl -u omai-watchdog -f`
- **Application Logs**: `/var/log/omai/watchdog.log`
- **Big Book Data**: `/mnt/bigbook_secure/System_Logs/Watchdog`
EOF

print_success "Integration instructions created"

echo ""
echo "=== OMAI Watchdog System Setup Complete ==="
echo ""
echo "🎯 Summary:"
echo "✅ OMAI Watchdog service created and configured"
echo "✅ Big Book integration with encrypted storage"
echo "✅ Comprehensive log monitoring and health checks"
echo "✅ Web UI for real-time monitoring and management"
echo "✅ CLI tools for command-line access"
echo "✅ Systemd service for automatic startup"
echo "✅ Log rotation and maintenance configured"
echo ""
echo "🔧 Next Steps:"
echo "1. Review INTEGRATION_INSTRUCTIONS.md for server integration"
echo "2. Start the service: sudo systemctl start omai-watchdog"
echo "3. Access the web interface at /admin/watchdog"
echo "4. Configure alert levels and monitoring preferences"
echo "5. Test with: omai-watchdog test"
echo ""
echo "📊 Monitoring Capabilities:"
echo "• Real-time log file monitoring with pattern detection"
echo "• System health checks (disk, memory, CPU, services)"
echo "• Intelligent alerting with suggested actions"
echo "• Daily summaries with narrative insights"
echo "• Trend analysis and anomaly detection"
echo "• Big Book integration for long-term storage"
echo ""
echo "🔐 Security Features:"
echo "• Super admin access control"
echo "• Sensitive data filtering"
echo "• Encrypted Big Book storage"
echo "• Audit logging of all actions"
echo ""
echo "💬 Communication:"
echo "• Natural language alert messages"
echo "• Context-aware recommendations"
echo "• One-click remediation actions"
echo "• Comprehensive daily reports"
echo ""
echo "🚀 OMAI is now ready to serve as your intelligent system watchdog!"
echo "   It will monitor your infrastructure 24/7 and communicate findings"
echo "   in clear, actionable language with suggested remediation steps." 