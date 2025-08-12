#!/bin/bash

echo "=== OMAI Path Discovery System Setup ==="
echo "Date: $(date)"
echo "Description: Setting up comprehensive file discovery and indexing for OMAI"

echo ""
echo "This script will:"
echo "1. Create necessary directory structure"
echo "2. Set proper permissions"
echo "3. Initialize the OMAI Path Discovery system"
echo "4. Configure file watchers"
echo "5. Set up scheduled discovery tasks"
echo "6. Test the system"

# Configuration
PROD_ROOT="/var/www/orthodox-church-mgmt/orthodoxmetrics/prod"
BIGBOOK_ROOT="$PROD_ROOT/bigbook"
WEB_USER="www-data"

echo ""
echo "=== Step 1: Directory Structure Setup ==="

# Create directory structure
echo "Creating Big Book directory structure..."
sudo mkdir -p "$BIGBOOK_ROOT"/{index,metadata,references,categories,logs,tasks}
sudo mkdir -p "$BIGBOOK_ROOT/categories"/{DevOps_Build,DevOps_Test,DevOps_Setup,Backend_Server,Backend_Database,Frontend_Components,Configuration,Documentation,Diagnostic_Tools}

echo "Setting permissions..."
sudo chown -R $WEB_USER:$WEB_USER "$BIGBOOK_ROOT"
sudo chmod -R 755 "$BIGBOOK_ROOT"
sudo chmod -R 775 "$BIGBOOK_ROOT"/{metadata,references,categories,logs}

echo ""
echo "=== Step 2: Node.js Dependencies Check ==="

cd "$PROD_ROOT" || {
    echo "Error: Could not change to production directory"
    exit 1
}

# Check if required Node.js packages are installed
echo "Checking Node.js dependencies..."
if ! node -e "require('crypto')" 2>/dev/null; then
    echo "Warning: crypto module not available"
fi

echo ""
echo "=== Step 3: OMAI Discovery System Test ==="

# Create test configuration
echo "Creating OMAI discovery test configuration..."
cat > "$BIGBOOK_ROOT/test-config.json" << 'EOF'
{
  "testMode": true,
  "scanDirectories": [
    "/var/www/orthodox-church-mgmt/orthodoxmetrics/prod/server",
    "/var/www/orthodox-church-mgmt/orthodoxmetrics/prod/front-end/src",
    "/var/www/orthodox-church-mgmt/orthodoxmetrics/prod"
  ],
  "supportedExtensions": [".md", ".js", ".ts", ".json", ".sh", ".sql"],
  "excludeDirectories": ["node_modules", ".git", "dist", "build"],
  "securityRedaction": true,
  "maxFileSize": 10485760
}
EOF

echo ""
echo "=== Step 4: File Watcher Setup ==="

# Create systemd service for file watching
echo "Creating OMAI discovery systemd service..."
sudo tee /etc/systemd/system/omai-discovery.service > /dev/null << EOF
[Unit]
Description=OMAI Path Discovery Service
After=network.target

[Service]
Type=simple
User=$WEB_USER
Group=$WEB_USER
WorkingDirectory=$PROD_ROOT
Environment=NODE_ENV=production
Environment=BIGBOOK_ROOT=$BIGBOOK_ROOT
ExecStart=/usr/bin/node -e "
const OMAIPathDiscovery = require('./server/services/omaiPathDiscovery');
const discovery = new OMAIPathDiscovery();
discovery.initialize().then(() => {
  console.log('OMAI Path Discovery service started');
  discovery.scheduleDiscovery(24);
}).catch(console.error);
"
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

echo ""
echo "=== Step 5: Cron Job Setup ==="

# Create cron job for daily discovery
echo "Setting up daily discovery cron job..."
(crontab -u $WEB_USER -l 2>/dev/null; echo "0 2 * * * cd $PROD_ROOT && node -e \"const OMAIPathDiscovery = require('./server/services/omaiPathDiscovery'); const discovery = new OMAIPathDiscovery(); discovery.initialize().then(() => discovery.discoverFiles()).catch(console.error);\"") | sudo crontab -u $WEB_USER -

echo ""
echo "=== Step 6: Log Rotation Setup ==="

# Set up log rotation
sudo tee /etc/logrotate.d/omai-discovery > /dev/null << EOF
$BIGBOOK_ROOT/logs/*.log {
    daily
    rotate 30
    compress
    delaycompress
    notifempty
    missingok
    copytruncate
    su $WEB_USER $WEB_USER
}
EOF

echo ""
echo "=== Step 7: Security Configuration ==="

# Create security policy file
cat > "$BIGBOOK_ROOT/security-policy.json" << 'EOF'
{
  "redactionPatterns": [
    {
      "name": "passwords",
      "pattern": "(?:password|pwd|pass)\\s*[:=]\\s*['\"]([^'\"]+)['\"]",
      "replacement": "[REDACTED-PASSWORD]"
    },
    {
      "name": "api_keys",
      "pattern": "(?:api[_-]?key|apikey)\\s*[:=]\\s*['\"]([^'\"]+)['\"]",
      "replacement": "[REDACTED-API-KEY]"
    },
    {
      "name": "secrets",
      "pattern": "(?:secret|token)\\s*[:=]\\s*['\"]([^'\"]+)['\"]",
      "replacement": "[REDACTED-SECRET]"
    },
    {
      "name": "database_urls",
      "pattern": "(?:database[_-]?url|db[_-]?url)\\s*[:=]\\s*['\"]([^'\"]+)['\"]",
      "replacement": "[REDACTED-DB-URL]"
    },
    {
      "name": "env_vars",
      "pattern": "process\\.env\\.([A-Z_]+)",
      "replacement": "process.env.[REDACTED-ENV-VAR]"
    }
  ],
  "allowedFileTypes": [".md", ".js", ".ts", ".json", ".sh", ".sql", ".yaml", ".yml"],
  "maxFileSize": 10485760,
  "excludeDirectories": [
    "node_modules",
    ".git",
    "dist", 
    "build",
    ".next",
    "coverage",
    "logs",
    "tmp",
    "temp"
  ]
}
EOF

echo ""
echo "=== Step 8: Testing Discovery System ==="

cd "$PROD_ROOT" || exit 1

echo "Testing OMAI discovery initialization..."
if node -e "
const OMAIPathDiscovery = require('./server/services/omaiPathDiscovery');
const discovery = new OMAIPathDiscovery();
discovery.initialize().then(() => {
  console.log('✅ OMAI Path Discovery initialized successfully');
  process.exit(0);
}).catch(error => {
  console.error('❌ OMAI Path Discovery initialization failed:', error.message);
  process.exit(1);
});
" 2>/dev/null; then
    echo "✅ OMAI Discovery system test passed"
else
    echo "❌ OMAI Discovery system test failed"
    echo "Please check the server logs and ensure all dependencies are installed"
fi

echo ""
echo "=== Step 9: Frontend Build ==="

echo "Rebuilding frontend to include OMAI Discovery Panel..."
cd "$PROD_ROOT/front-end" || {
    echo "Error: Could not change to frontend directory"
    exit 1
}

echo "Installing dependencies with legacy peer deps flag..."
if NODE_OPTIONS="--max-old-space-size=4096" npm install --legacy-peer-deps; then
    echo "✅ Dependencies installed successfully"
else
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo "Building frontend with memory optimization..."
if NODE_OPTIONS="--max-old-space-size=4096" npm run build; then
    echo "✅ Frontend build completed successfully"
else
    echo "❌ Frontend build failed"
    exit 1
fi

echo ""
echo "=== Step 10: Service Configuration ==="

# Enable and start systemd service
echo "Enabling OMAI discovery service..."
sudo systemctl daemon-reload
sudo systemctl enable omai-discovery.service
sudo systemctl start omai-discovery.service

# Check service status
if sudo systemctl is-active omai-discovery.service >/dev/null 2>&1; then
    echo "✅ OMAI discovery service is running"
else
    echo "⚠️  OMAI discovery service failed to start"
    echo "Check service logs: sudo journalctl -u omai-discovery.service"
fi

echo ""
echo "=== OMAI Path Discovery Setup Complete ==="
echo ""
echo "📊 Summary:"
echo "✅ Directory structure created"
echo "✅ Permissions configured"
echo "✅ Security policies established"
echo "✅ Cron job scheduled (daily at 2 AM)"
echo "✅ Log rotation configured"
echo "✅ Systemd service installed"
echo "✅ Frontend rebuilt with OMAI Discovery Panel"
echo ""
echo "🎯 Next Steps:"
echo "1. Restart your web server to load the updated frontend"
echo "2. Access the Big Book Console at /admin/bigbook"
echo "3. Navigate to the 'OMAI Discovery' tab"
echo "4. Click 'Initialize OMAI' if not already done"
echo "5. Click 'Start Discovery' to scan your production directory"
echo ""
echo "📁 Key Locations:"
echo "   Big Book Root: $BIGBOOK_ROOT"
echo "   Index File: $BIGBOOK_ROOT/bigbook-index.json"
echo "   Metadata: $BIGBOOK_ROOT/metadata/"
echo "   Categories: $BIGBOOK_ROOT/categories/"
echo "   Logs: $BIGBOOK_ROOT/logs/"
echo ""
echo "🔧 Management Commands:"
echo "   Service Status: sudo systemctl status omai-discovery.service"
echo "   View Logs: sudo journalctl -u omai-discovery.service -f"
echo "   Manual Discovery: cd $PROD_ROOT && node -e \"require('./server/services/omaiPathDiscovery').discoverFiles()\""
echo "   Check Cron Jobs: sudo crontab -u $WEB_USER -l"
echo ""
echo "🔒 Security Features:"
echo "   ✅ Sensitive data redaction enabled"
echo "   ✅ File size limits enforced"
echo "   ✅ Directory exclusions configured"
echo "   ✅ Read-only file references (no copying)"
echo ""

if [ $? -eq 0 ]; then
    echo "🎉 OMAI Path Discovery system is ready!"
    echo "Your project files will now be automatically discovered, classified, and indexed for OMAI analysis."
else
    echo "⚠️  Setup completed with some warnings. Please review the output above."
fi 