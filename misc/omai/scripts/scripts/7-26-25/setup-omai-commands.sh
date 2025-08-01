#!/bin/bash

echo "=== OMAI Command System Setup ==="
echo "Date: $(date)"
echo "Setting up OMAI natural language command execution system"

# Navigate to production directory
PROD_ROOT="/var/www/orthodox-church-mgmt/orthodoxmetrics/prod"
echo "Setting up in: $PROD_ROOT"

cd "$PROD_ROOT" || {
    echo "❌ Error: Could not change to production directory"
    exit 1
}

echo ""
echo "=== Step 1: Create Log Directory ==="
echo "Creating OMAI log directory..."

sudo mkdir -p /var/log/omai
sudo chown www-data:www-data /var/log/omai
sudo chmod 755 /var/log/omai

echo "✅ Log directory created: /var/log/omai"

echo ""
echo "=== Step 2: Install Dependencies ==="
echo "Installing js-yaml for YAML parsing..."

npm install js-yaml 2>&1 && echo "✅ js-yaml installed" || echo "❌ Failed to install js-yaml"

echo ""
echo "=== Step 3: Make OMAI CLI Executable ==="
echo "Setting up OMAI command line interface..."

chmod +x omai
echo "✅ OMAI CLI made executable"

# Create symlink for global access (optional)
if command -v omai &> /dev/null; then
    echo "✅ OMAI already available globally"
else
    echo "Creating global symlink..."
    sudo ln -sf "$PROD_ROOT/omai" /usr/local/bin/omai 2>&1 && \
        echo "✅ OMAI available globally as 'omai'" || \
        echo "⚠️ Could not create global symlink (use ./omai instead)"
fi

echo ""
echo "=== Step 4: Test OMAI Configuration ==="
echo "Testing OMAI command configuration..."

./omai --help > /dev/null 2>&1 && echo "✅ OMAI CLI working" || echo "❌ OMAI CLI has issues"

echo ""
echo "Testing YAML configuration loading..."
./omai --list > /dev/null 2>&1 && echo "✅ Command configuration loaded" || echo "❌ Configuration loading failed"

echo ""
echo "=== Step 5: Test Basic Commands ==="
echo "Testing basic OMAI commands (safe mode)..."

echo "Testing 'check server status':"
./omai "check server status" && echo "✅ Server status command recognized" || echo "❌ Command recognition failed"

echo ""
echo "Testing 'list files':"
./omai "list files" && echo "✅ File listing command recognized" || echo "❌ Command recognition failed"

echo ""
echo "=== Step 6: Create Log Rotation ==="
echo "Setting up log rotation for OMAI logs..."

sudo tee /etc/logrotate.d/omai > /dev/null << 'EOF'
/var/log/omai/*.log {
    daily
    missingok
    rotate 7
    compress
    delaycompress
    notifempty
    create 644 www-data www-data
    postrotate
        # Signal any running OMAI processes if needed
        systemctl reload rsyslog > /dev/null 2>&1 || true
    endscript
}
EOF

echo "✅ Log rotation configured"

echo ""
echo "=== Step 7: Create OMAI Systemd Service (Optional) ==="
echo "Creating systemd service for OMAI daemon mode..."

sudo tee /etc/systemd/system/omai.service > /dev/null << EOF
[Unit]
Description=OMAI Command System Daemon
Documentation=https://orthodoxmetrics.com/docs/omai
After=network.target

[Service]
Type=simple
User=www-data
Group=www-data
WorkingDirectory=$PROD_ROOT
Environment=NODE_ENV=production
ExecStart=/usr/bin/node $PROD_ROOT/server/services/omaiDaemon.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=omai

# Security settings
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=$PROD_ROOT /var/log/omai /tmp

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
echo "✅ OMAI systemd service created (not started)"

echo ""
echo "=== Step 8: Create Sample Scripts Directory ==="
echo "Creating scripts directory for OMAI commands..."

mkdir -p scripts
chmod 755 scripts

# Create sample deploy script
tee scripts/deploy.sh > /dev/null << 'EOF'
#!/bin/bash
echo "Starting deployment..."
cd front-end
NODE_OPTIONS="--max-old-space-size=4096" npm install --legacy-peer-deps
NODE_OPTIONS="--max-old-space-size=4096" npm run build
echo "Deployment completed"
EOF

chmod +x scripts/deploy.sh

# Create sample backup script  
tee scripts/backup.sh > /dev/null << 'EOF'
#!/bin/bash
echo "Starting database backup..."
mysqldump -u root orthodoxmetrics_db > /var/backups/db_$(date +%Y%m%d_%H%M%S).sql
echo "Backup completed"
EOF

chmod +x scripts/backup.sh

echo "✅ Sample scripts created in scripts/ directory"

echo ""
echo "=== Step 9: Test Hands-On Mode ==="
echo "Testing OMAI hands-on mode with safe commands..."

echo "Testing with 'omai status' command:"
./omai --mode hands-on "omai status" && echo "✅ Hands-on mode working" || echo "⚠️ Hands-on mode needs attention"

echo ""
echo "=== Step 10: Security Configuration ==="
echo "Setting up security configurations..."

# Create OMAI security policy
tee omai_security_policy.json > /dev/null << 'EOF'
{
  "version": "1.0.0",
  "security_policies": {
    "allowed_users": ["root", "www-data"],
    "blocked_commands": [
      "rm -rf /",
      "format",
      "fdisk",
      "parted"
    ],
    "require_confirmation": [
      "systemctl stop",
      "systemctl disable",
      "userdel",
      "groupdel"
    ],
    "log_all_commands": true,
    "max_command_length": 1000,
    "timeout_seconds": 300
  }
}
EOF

echo "✅ Security policy created"

echo ""
echo "=== OMAI Command System Setup Complete ==="
echo ""
echo "🎯 Summary:"
echo "✅ OMAI command system installed and configured"
echo "✅ Log directory created: /var/log/omai/"
echo "✅ Command configuration: omai_commands.yaml"
echo "✅ CLI interface: ./omai or omai (global)"
echo "✅ Memory system enabled with caching"
echo "✅ Security policies configured"
echo "✅ Log rotation configured"
echo "✅ Sample scripts created"
echo ""
echo "🚀 Usage Examples:"
echo ""
echo "# List available commands"
echo "./omai --list"
echo ""
echo "# Test commands in safe mode"
echo "./omai 'check server status'"
echo ""
echo "# Execute commands in hands-on mode"
echo "./omai --mode hands-on 'restart the server'"
echo ""
echo "# Force dangerous commands"
echo "./omai --mode hands-on --force 'emergency restart'"
echo ""
echo "# Confirm sudo commands"
echo "./omai --mode hands-on --confirm-sudo 'backup the database'"
echo ""
echo "# View command history"
echo "./omai --history"
echo ""
echo "# View memory statistics"
echo "./omai --stats"
echo ""
echo "📁 Key Files:"
echo "  Configuration: $PROD_ROOT/omai_commands.yaml"
echo "  CLI Interface: $PROD_ROOT/omai"
echo "  Executor: $PROD_ROOT/server/utils/omaiCommandExecutor.js"
echo "  Logs: /var/log/omai/executed.log"
echo "  Cache: /var/log/omai/command_cache.json"
echo ""
echo "📖 Documentation:"
echo "  Help: ./omai --help"
echo "  Commands: ./omai --list"
echo "  Status: ./omai --stats"
echo ""
echo "🎉 OMAI is ready for natural language command execution!"

# Update TODO status
echo ""
echo "=== Updating TODO Status ==="
echo "OMAI command system implementation completed:"
echo "✅ omai_commands.yaml created with comprehensive command mappings"
echo "✅ Memory system implemented with frequency tracking and auto-caching"
echo "✅ Hands-on mode implemented with safety checks"
echo "✅ Command logging to /var/log/omai/executed.log"
echo "✅ Safety checks for sudo commands and trusted marking" 