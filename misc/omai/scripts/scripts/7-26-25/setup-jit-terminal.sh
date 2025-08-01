#!/bin/bash

# JIT Terminal Setup Script for OrthodoxMetrics
# This script installs all dependencies and sets up directories for JIT Terminal functionality

set -e  # Exit on any error

echo "🚀 Setting up JIT Terminal for OrthodoxMetrics..."
echo "================================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
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

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "package.json not found. Please run this script from your project root directory."
    exit 1
fi

# Check for server directory
if [ ! -d "server" ]; then
    print_error "Server directory not found. Please ensure you're in the correct project directory."
    exit 1
fi

# Check for front-end directory
if [ ! -d "front-end" ]; then
    print_error "front-end directory not found. Please ensure you're in the correct project directory."
    exit 1
fi

print_status "Project structure validated ✓"

# Step 1: Install backend dependencies
echo
echo "📦 Installing Backend Dependencies..."
echo "====================================="

cd server
print_status "Installing node-pty, ws, and xterm dependencies in server directory..."

npm install --legacy-peer-deps node-pty ws xterm xterm-addon-fit xterm-addon-web-links xterm-addon-search

if [ $? -eq 0 ]; then
    print_success "Backend dependencies installed successfully"
else
    print_error "Failed to install backend dependencies"
    exit 1
fi

cd ..

# Step 2: Install frontend dependencies
echo
echo "🎨 Installing Frontend Dependencies..."
echo "======================================"

cd front-end
print_status "Installing xterm and addons in front-end directory..."

npm install --legacy-peer-deps xterm xterm-addon-fit xterm-addon-web-links xterm-addon-search

if [ $? -eq 0 ]; then
    print_success "Frontend dependencies installed successfully"
else
    print_error "Failed to install frontend dependencies"
    exit 1
fi

cd ..

# Step 3: Create log directories
echo
echo "📁 Creating Log Directories..."
echo "=============================="

# Default log directory
LOG_DIR="/var/log/orthodoxmetrics"
JIT_SESSIONS_DIR="${LOG_DIR}/jit_sessions"
BACKUPS_DIR="${LOG_DIR}/backups"

print_status "Creating log directories..."

# Create directories with proper permissions
sudo mkdir -p "$LOG_DIR"
sudo mkdir -p "$JIT_SESSIONS_DIR"
sudo mkdir -p "$BACKUPS_DIR"
sudo mkdir -p "${BACKUPS_DIR}/components"

print_success "Log directories created"

# Step 4: Set up permissions
echo
echo "🔐 Setting Up Permissions..."
echo "============================"

# Get current user and group
CURRENT_USER=$(whoami)
CURRENT_GROUP=$(id -gn)

print_status "Setting ownership to ${CURRENT_USER}:${CURRENT_GROUP}..."

sudo chown -R "${CURRENT_USER}:${CURRENT_GROUP}" "$LOG_DIR"
sudo chmod -R 755 "$LOG_DIR"

print_success "Permissions configured"

# Step 5: Create environment configuration
echo
echo "⚙️  Creating Environment Configuration..."
echo "========================================"

ENV_FILE=".env.jit"

cat > "$ENV_FILE" << EOF
# JIT Terminal Configuration
# Copy these variables to your main .env file

# JIT Terminal Settings
ALLOW_JIT_TERMINAL=true
JIT_ALLOW_PRODUCTION=false
JIT_TIMEOUT_MINUTES=10
JIT_MAX_SESSIONS=3
JIT_REQUIRE_REAUTH=false
JIT_LOG_COMMANDS=true
JIT_LOG_DIR=${LOG_DIR}

# Site Editor Settings (Phase 17)
SITE_EDITOR_ENABLED=true
SITE_EDITOR_ALLOW_PRODUCTION=false
SITE_EDITOR_BACKUP_DIR=${BACKUPS_DIR}
SITE_EDITOR_AUTO_BACKUP=true
SITE_EDITOR_MAX_BACKUPS=50

# GitOps Settings
GITOPS_ENABLED=false
GITOPS_AUTO_COMMIT=false
GITOPS_BRANCH_PREFIX=site-editor-fix
GITOPS_DEFAULT_BRANCH=main
GITOPS_REMOTE_ORIGIN=origin
GITOPS_CREATE_PR=false

# Component Paths
COMPONENTS_DIR=$(pwd)/front-end/src/components
EOF

print_success "Environment configuration created: $ENV_FILE"

# Step 6: Verify installation
echo
echo "✅ Verifying Installation..."
echo "==========================="

print_status "Checking backend dependencies..."
cd server
if npm list node-pty ws xterm > /dev/null 2>&1; then
    print_success "Backend dependencies verified"
else
    print_warning "Some backend dependencies may not be properly installed"
fi
cd ..

print_status "Checking frontend dependencies..."
cd front-end
if npm list xterm > /dev/null 2>&1; then
    print_success "Frontend dependencies verified"
else
    print_warning "Some frontend dependencies may not be properly installed"
fi
cd ..

print_status "Checking log directories..."
if [ -d "$LOG_DIR" ] && [ -w "$LOG_DIR" ]; then
    print_success "Log directories accessible"
else
    print_warning "Log directories may not be properly configured"
fi

# Step 7: Integration instructions
echo
echo "🔧 Integration Instructions..."
echo "============================="

print_status "To complete the setup:"
echo
echo "1. Copy the environment variables from .env.jit to your main .env file:"
echo "   ${BLUE}cat .env.jit >> .env${NC}"
echo
echo "2. Add JIT routes to your Express server (e.g., server/app.js):"
echo "   ${BLUE}const { router: jitRouter, setupJITWebSocket } = require('./routes/jit-terminal');${NC}"
echo "   ${BLUE}app.use('/api/jit', jitRouter);${NC}"
echo
echo "3. Add Site Editor routes:"
echo "   ${BLUE}const siteEditorRouter = require('./routes/site-editor');${NC}"
echo "   ${BLUE}app.use('/api/editor', siteEditorRouter);${NC}"
echo
echo "4. Setup WebSocket server:"
echo "   ${BLUE}const server = http.createServer(app);${NC}"
echo "   ${BLUE}setupJITWebSocket(server);${NC}"
echo
echo "5. Ensure your authentication middleware is available:"
echo "   ${BLUE}const { authenticateToken, requireSuperAdmin } = require('./middleware/auth');${NC}"
echo

# Step 8: Security reminder
echo "🔒 Security Reminders..."
echo "======================="
echo
print_warning "IMPORTANT SECURITY NOTES:"
echo "• JIT Terminal is disabled in production by default"
echo "• Only super_admin users can access JIT Terminal"
echo "• All commands are logged to ${LOG_DIR}/jit_terminal.log"
echo "• Session transcripts are stored in ${JIT_SESSIONS_DIR}/"
echo "• Component backups are stored in ${BACKUPS_DIR}/components/"
echo

# Step 9: Final status
echo "🎉 Setup Complete!"
echo "=================="
echo
print_success "JIT Terminal setup completed successfully!"
print_success "Log directories: $LOG_DIR"
print_success "Environment config: $ENV_FILE"
echo
print_status "Next steps:"
echo "1. Copy environment variables to your .env file"
echo "2. Add routes to your Express server"
echo "3. Restart your application"
echo "4. Access via Settings → JIT Terminal Access (super_admin only)"
echo
print_status "For troubleshooting, see: JIT_TERMINAL_CONFIG.md"

exit 0 