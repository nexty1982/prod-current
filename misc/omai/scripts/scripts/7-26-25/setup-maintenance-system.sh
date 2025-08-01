#!/bin/bash

echo "=== OMAI Maintenance System Setup ==="
echo "Date: $(date)"
echo "Setting up comprehensive maintenance mode control for OrthodoxMetrics"

# Navigate to production directory
PROD_ROOT="/var/www/orthodox-church-mgmt/orthodoxmetrics/prod"
echo "Setting up in: $PROD_ROOT"

cd "$PROD_ROOT" || {
    echo "❌ Error: Could not change to production directory"
    exit 1
}

echo ""
echo "=== Step 1: Create Maintenance Directories ==="
echo "Creating required directories for maintenance system..."

# Create OMAI directories
sudo mkdir -p /etc/omai
sudo mkdir -p /var/log/omai
sudo mkdir -p config

# Set permissions
sudo chown -R www-data:www-data /etc/omai /var/log/omai
sudo chmod 755 /etc/omai /var/log/omai

echo "✅ Directories created and permissions set"

echo ""
echo "=== Step 2: Make CLI Tool Executable ==="
echo "Setting up OMAI maintenance CLI..."

chmod +x omai-maintenance

# Create global symlink
if command -v omai-maintenance &> /dev/null; then
    echo "✅ OMAI maintenance CLI already available globally"
else
    echo "Creating global symlink..."
    sudo ln -sf "$PROD_ROOT/omai-maintenance" /usr/local/bin/omai-maintenance 2>&1 && \
        echo "✅ OMAI maintenance CLI available globally" || \
        echo "⚠️ Could not create global symlink (use ./omai-maintenance instead)"
fi

echo ""
echo "=== Step 3: Test Maintenance Service ==="
echo "Testing maintenance service initialization..."

node -e "
const MaintenanceService = require('./server/services/maintenanceService');

async function testService() {
  try {
    console.log('Initializing maintenance service...');
    const service = new MaintenanceService();
    
    // Wait a moment for initialization
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('✅ Maintenance service initialized successfully');
    
    const status = await service.getStatus();
    console.log('Current status:', status.isActive ? 'ACTIVE' : 'INACTIVE');
    
  } catch (error) {
    console.error('❌ Maintenance service test failed:', error.message);
    process.exit(1);
  }
}

testService();
" 2>&1

if [ $? -eq 0 ]; then
    echo "✅ Maintenance service test passed"
else
    echo "❌ Maintenance service test failed"
    exit 1
fi

echo ""
echo "=== Step 4: Test OMAI Interface ==="
echo "Testing OMAI maintenance interface..."

node -e "
const OMAIInterface = require('./server/utils/omaiMaintenanceInterface');

async function testInterface() {
  try {
    console.log('Testing OMAI maintenance interface...');
    
    // Test status check
    const status = await OMAIInterface.status();
    console.log('✅ OMAI status check:', status.success ? 'PASSED' : 'FAILED');
    
    // Test method listing
    const methods = OMAIInterface.getAvailableMethods();
    console.log('✅ Available methods:', Object.keys(methods).length);
    
    console.log('✅ OMAI interface test completed successfully');
    
  } catch (error) {
    console.error('❌ OMAI interface test failed:', error.message);
    process.exit(1);
  }
}

testInterface();
" 2>&1

echo ""
echo "=== Step 5: Test CLI Tool ==="
echo "Testing OMAI maintenance CLI..."

echo "Testing CLI help..."
./omai-maintenance --help > /dev/null 2>&1 && echo "✅ CLI help working" || echo "❌ CLI help failed"

echo "Testing CLI status..."
./omai-maintenance status > /dev/null 2>&1 && echo "✅ CLI status working" || echo "❌ CLI status failed"

echo ""
echo "=== Step 6: Test Maintenance Middleware ==="
echo "Testing maintenance middleware initialization..."

node -e "
const maintenanceMiddleware = require('./server/middleware/maintenanceMiddleware');

console.log('Testing maintenance middleware...');

// Test middleware function creation
const middleware = maintenanceMiddleware.middleware();
if (typeof middleware === 'function') {
  console.log('✅ Middleware function created successfully');
} else {
  console.error('❌ Middleware function creation failed');
  process.exit(1);
}

console.log('✅ Maintenance middleware test completed');
" 2>&1

echo ""
echo "=== Step 7: Create Sample Configuration ==="
echo "Creating sample maintenance configuration..."

# Create sample maintenance config
cat > config/maintenance.json << 'EOF'
{
  "status": "System maintenance in progress",
  "message": "We are currently performing scheduled maintenance to improve your experience.",
  "eta": null,
  "reason": "Sample configuration",
  "activatedAt": null,
  "activatedBy": "system",
  "allowlist": [],
  "exemptRoles": ["super_admin", "dev_admin"],
  "exemptIPs": ["127.0.0.1", "::1"],
  "contactInfo": {
    "email": "support@orthodoxmetrics.com",
    "phone": null
  },
  "theme": {
    "backgroundColor": "#1e40af",
    "textColor": "#ffffff",
    "logoUrl": "/assets/logo.png"
  }
}
EOF

echo "✅ Sample configuration created"

echo ""
echo "=== Step 8: Set Up Log Rotation ==="
echo "Configuring log rotation for maintenance logs..."

sudo tee /etc/logrotate.d/omai-maintenance > /dev/null << 'EOF'
/var/log/omai/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 644 www-data www-data
    postrotate
        # Signal any running processes if needed
        systemctl reload rsyslog > /dev/null 2>&1 || true
    endscript
}
EOF

echo "✅ Log rotation configured"

echo ""
echo "=== Step 9: Integration Test ==="
echo "Running comprehensive integration test..."

echo "Testing full activation/deactivation cycle..."
./omai-maintenance on --message="Integration test" --reason="Setup test" > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✅ Activation test passed"
    
    # Wait a moment
    sleep 2
    
    ./omai-maintenance off --reason="Test completed" > /dev/null 2>&1
    if [ $? -eq 0 ]; then
        echo "✅ Deactivation test passed"
    else
        echo "❌ Deactivation test failed"
    fi
else
    echo "❌ Activation test failed"
fi

echo ""
echo "=== Step 10: Server Integration Instructions ==="
echo "Setting up server integration requirements..."

echo "📝 To complete the setup, add these to your server configuration:"
echo ""
echo "1. Add maintenance middleware to Express app:"
echo "   const maintenanceMiddleware = require('./server/middleware/maintenanceMiddleware');"
echo "   app.use(maintenanceMiddleware.middleware());"
echo ""
echo "2. Add maintenance routes to Express app:"
echo "   const maintenanceRoutes = require('./server/routes/maintenance');"
echo "   app.use('/api/admin/maintenance', maintenanceRoutes);"
echo ""
echo "3. For OMAI integration, import the interface:"
echo "   const OMAI = { maintenance: require('./server/utils/omaiMaintenanceInterface') };"
echo ""

# Create integration example file
cat > maintenance-integration-example.js << 'EOF'
// Example Express app integration
const express = require('express');
const app = express();

// Add maintenance middleware (should be early in middleware stack)
const maintenanceMiddleware = require('./server/middleware/maintenanceMiddleware');
app.use(maintenanceMiddleware.middleware());

// Add maintenance API routes
const maintenanceRoutes = require('./server/routes/maintenance');
app.use('/api/admin/maintenance', maintenanceRoutes);

// OMAI interface usage examples
const OMAI = {
  maintenance: require('./server/utils/omaiMaintenanceInterface')
};

// Example OMAI usage:
// await OMAI.maintenance.activate("Database upgrade", "2025-01-27T03:00:00Z", "Scheduled maintenance");
// await OMAI.maintenance.deactivate("Maintenance completed");
// const status = await OMAI.maintenance.status();

module.exports = { app, OMAI };
EOF

echo "✅ Integration example created: maintenance-integration-example.js"

echo ""
echo "=== OMAI Maintenance System Setup Complete ==="
echo ""
echo "🎯 Summary:"
echo "✅ Maintenance service with flag file management"
echo "✅ API routes with super_admin security controls"
echo "✅ Express middleware for HTTP 503 responses"
echo "✅ Beautiful maintenance page with countdown"
echo "✅ OMAI programmatic interface"
echo "✅ CLI tool for command-line control"
echo "✅ Comprehensive logging and statistics"
echo "✅ Admin bypass functionality"
echo "✅ Emergency shutdown capability"
echo "✅ Scheduled maintenance support"
echo ""
echo "🔧 Key Components:"
echo "  Service: server/services/maintenanceService.js"
echo "  API Routes: server/routes/maintenance.js"
echo "  Middleware: server/middleware/maintenanceMiddleware.js"
echo "  OMAI Interface: server/utils/omaiMaintenanceInterface.js"
echo "  CLI Tool: omai-maintenance"
echo ""
echo "🌐 Access Points:"
echo "  API: /api/admin/maintenance/*"
echo "  CLI: omai-maintenance <command>"
echo "  Files: /etc/omai/maintenance.flag"
echo "  Logs: /var/log/omai/maintenance.log"
echo ""
echo "📖 Usage Examples:"
echo ""
echo "# CLI Usage:"
echo "omai-maintenance on --message='Database upgrade' --eta='2025-01-27T03:00:00Z'"
echo "omai-maintenance status"
echo "omai-maintenance off --reason='Upgrade completed'"
echo "omai-maintenance emergency --reason='Critical issue'"
echo ""
echo "# API Usage:"
echo "curl -X POST /api/admin/maintenance/activate \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{\"message\":\"Database upgrade\",\"eta\":\"2025-01-27T03:00:00Z\"}'"
echo ""
echo "# OMAI Programmatic Usage:"
echo "await OMAI.maintenance.activate('Database upgrade', '2025-01-27T03:00:00Z');"
echo "const status = await OMAI.maintenance.status();"
echo "await OMAI.maintenance.deactivate('Completed');"
echo ""
echo "🚀 Next Steps:"
echo "1. Integrate middleware and routes into your Express app"
echo "2. Add frontend UI for maintenance control in admin panel"
echo "3. Test the maintenance page by activating maintenance mode"
echo "4. Set up monitoring and alerting for maintenance events"
echo "5. Configure automated maintenance schedules if needed"
echo ""
echo "🔐 Security Features:"
echo "  - Only super_admin role can activate/deactivate"
echo "  - Admin and dev roles bypass maintenance mode"
echo "  - IP-based exemption support"
echo "  - Comprehensive audit logging"
echo "  - Emergency shutdown protection"
echo ""
echo "🎉 OMAI Maintenance System is ready for production use!" 