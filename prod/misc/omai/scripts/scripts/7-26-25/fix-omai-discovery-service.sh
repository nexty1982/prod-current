#!/bin/bash

echo "=== Fixing OMAI Discovery Service Configuration ==="
echo "Date: $(date)"

# Stop any running service first
echo "Stopping existing service if running..."
sudo systemctl stop omai-discovery.service 2>/dev/null || true

# Remove bad service file
echo "Removing problematic service file..."
sudo rm -f /etc/systemd/system/omai-discovery.service

# Create corrected systemd service file
echo "Creating corrected OMAI discovery systemd service..."
sudo tee /etc/systemd/system/omai-discovery.service > /dev/null << 'EOF'
[Unit]
Description=OMAI Path Discovery Service
After=network.target
Wants=network.target

[Service]
Type=simple
User=www-data
Group=www-data
WorkingDirectory=/var/www/orthodox-church-mgmt/orthodoxmetrics/prod
Environment=NODE_ENV=production
Environment=BIGBOOK_ROOT=/var/www/orthodox-church-mgmt/orthodoxmetrics/prod/bigbook
ExecStart=/usr/bin/node -e "const OMAIPathDiscovery = require('./server/services/omaiPathDiscovery'); const discovery = new OMAIPathDiscovery(); discovery.initialize().then(() => { console.log('OMAI Path Discovery service started'); discovery.scheduleDiscovery(24); }).catch(console.error);"
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

# Reload systemd daemon
echo "Reloading systemd daemon..."
sudo systemctl daemon-reload

# Test the service file syntax
echo "Testing service file syntax..."
if sudo systemd-analyze verify /etc/systemd/system/omai-discovery.service; then
    echo "✅ Service file syntax is valid"
else
    echo "❌ Service file syntax is still invalid"
    exit 1
fi

# Enable and start the service
echo "Enabling OMAI discovery service..."
sudo systemctl enable omai-discovery.service

echo "Starting OMAI discovery service..."
if sudo systemctl start omai-discovery.service; then
    echo "✅ OMAI discovery service started successfully"
else
    echo "❌ Failed to start service. Checking logs..."
    sudo journalctl -u omai-discovery.service --no-pager -l
    exit 1
fi

# Check service status
echo "Checking service status..."
sudo systemctl status omai-discovery.service --no-pager -l

echo ""
echo "=== Service Fix Complete ==="
echo "✅ Corrected systemd service file created"
echo "✅ Service syntax validated"
echo "✅ Service enabled and started"
echo ""
echo "Monitor the service with:"
echo "  sudo journalctl -u omai-discovery.service -f" 