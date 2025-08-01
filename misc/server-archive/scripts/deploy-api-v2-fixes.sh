#!/bin/bash

# ==============================================================================
# OrthodoxMetrics API v2 Deployment & Testing Script
# ==============================================================================
# This script deploys the refactored API v2 changes and tests authentication
# 
# Fixes Applied:
# 1. Refactored /api/churches routes with proper auth and database context
# 2. Enhanced session authentication middleware 
# 3. Consistent API v2 response format
# 4. Fixed church_id scoping and role-based access
#
# Usage: ./deploy-api-v2-fixes.sh [--test-only] [--skip-restart]
# ==============================================================================

set -e  # Exit on error

# Configuration
SERVER_DIR="/var/www/orthodox-church-mgmt/orthodoxmetrics/prod/server"
BACKUP_DIR="/var/www/orthodox-church-mgmt/orthodoxmetrics/prod/server/backups/$(date +%Y%m%d_%H%M%S)"
LOG_FILE="/var/www/orthodox-church-mgmt/orthodoxmetrics/prod/server/logs/api-v2-deployment.log"
TEST_BASE_URL="https://orthodoxmetrics.com"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Parse command line arguments
TEST_ONLY=false
SKIP_RESTART=false

for arg in "$@"; do
    case $arg in
        --test-only)
            TEST_ONLY=true
            shift
            ;;
        --skip-restart)
            SKIP_RESTART=true
            shift
            ;;
        -h|--help)
            echo "Usage: $0 [--test-only] [--skip-restart]"
            echo "  --test-only   : Only run tests, don't deploy changes"
            echo "  --skip-restart: Don't restart the server"
            exit 0
            ;;
    esac
done

# Logging function
log() {
    echo -e "${2:-$NC}$(date '+%Y-%m-%d %H:%M:%S') - $1${NC}" | tee -a "$LOG_FILE"
}

# Error handling
error_exit() {
    log "ERROR: $1" "$RED"
    exit 1
}

# Success messages
success() {
    log "✅ $1" "$GREEN"
}

# Warning messages  
warning() {
    log "⚠️ $1" "$YELLOW"
}

# Info messages
info() {
    log "ℹ️ $1" "$BLUE"
}

# ==============================================================================
# PRE-DEPLOYMENT CHECKS
# ==============================================================================

check_prerequisites() {
    info "Checking prerequisites..."
    
    # Check if we're in the right directory
    if [ ! -f "$SERVER_DIR/package.json" ]; then
        error_exit "Server directory not found or invalid: $SERVER_DIR"
    fi
    
    # Check if Node.js is available
    if ! command -v node &> /dev/null; then
        error_exit "Node.js is not installed or not in PATH"
    fi
    
    # Check if PM2 is available (optional but recommended)
    if command -v pm2 &> /dev/null; then
        info "PM2 detected - will use for process management"
        USE_PM2=true
    else
        warning "PM2 not detected - will use manual process management"
        USE_PM2=false
    fi
    
    # Check MySQL connectivity
    if command -v mysql &> /dev/null; then
        info "MySQL client available for database tests"
        HAS_MYSQL=true
    else
        warning "MySQL client not available - skipping database tests"
        HAS_MYSQL=false
    fi
    
    success "Prerequisites check completed"
}

# ==============================================================================
# BACKUP CURRENT CONFIGURATION
# ==============================================================================

backup_current_state() {
    if [ "$TEST_ONLY" = true ]; then
        info "Skipping backup (test-only mode)"
        return
    fi
    
    info "Creating backup of current state..."
    
    mkdir -p "$BACKUP_DIR"
    
    # Backup key files
    cp "$SERVER_DIR/routes/churches.js" "$BACKUP_DIR/churches.js.backup" 2>/dev/null || true
    cp "$SERVER_DIR/middleware/auth.js" "$BACKUP_DIR/auth.js.backup" 2>/dev/null || true
    
    # Backup PM2 config if exists
    if [ -f "$SERVER_DIR/ecosystem.config.cjs" ]; then
        cp "$SERVER_DIR/ecosystem.config.cjs" "$BACKUP_DIR/ecosystem.config.cjs.backup"
    fi
    
    success "Backup created at: $BACKUP_DIR"
}

# ==============================================================================
# DEPLOYMENT FUNCTIONS
# ==============================================================================

validate_refactored_files() {
    info "Validating refactored files..."
    
    # Check if churches.js has been refactored (look for API v2 markers)
    if grep -q "REFACTORED for API v2 consistency" "$SERVER_DIR/routes/churches.js"; then
        success "churches.js has been refactored for API v2"
    else
        error_exit "churches.js has not been refactored yet"
    fi
    
    # Check if auth.js has been enhanced (look for enhanced markers)
    if grep -q "Enhanced Session Authentication Middleware" "$SERVER_DIR/middleware/auth.js"; then
        success "auth.js has been enhanced with session debugging"
    else
        error_exit "auth.js has not been enhanced yet"
    fi
    
    # Validate syntax
    info "Checking JavaScript syntax..."
    
    if node -c "$SERVER_DIR/routes/churches.js"; then
        success "churches.js syntax is valid"
    else
        error_exit "churches.js has syntax errors"
    fi
    
    if node -c "$SERVER_DIR/middleware/auth.js"; then
        success "auth.js syntax is valid"
    else
        error_exit "auth.js has syntax errors"
    fi
}

restart_server() {
    if [ "$SKIP_RESTART" = true ]; then
        warning "Skipping server restart (--skip-restart flag)"
        return
    fi
    
    info "Restarting server to apply changes..."
    
    cd "$SERVER_DIR"
    
    if [ "$USE_PM2" = true ]; then
        # Use PM2 for restart
        if pm2 list | grep -q "orthodox-server"; then
            pm2 restart orthodox-server
            sleep 3
            if pm2 list | grep -q "orthodox-server.*online"; then
                success "Server restarted successfully with PM2"
            else
                error_exit "Server failed to restart with PM2"
            fi
        else
            warning "PM2 process 'orthodox-server' not found, attempting manual restart"
            pm2 start ecosystem.config.cjs 2>/dev/null || error_exit "Failed to start with PM2"
        fi
    else
        # Manual restart (kill existing processes and start new)
        warning "Manual server restart - this may cause brief downtime"
        
        # Kill existing node processes (be careful!)
        pkill -f "node.*index.js" || true
        sleep 2
        
        # Start server in background
        nohup node index.js > "$LOG_FILE.server" 2>&1 &
        sleep 5
        
        # Check if process started
        if pgrep -f "node.*index.js" > /dev/null; then
            success "Server started manually"
        else
            error_exit "Failed to start server manually"
        fi
    fi
}

# ==============================================================================
# TESTING FUNCTIONS  
# ==============================================================================

test_server_health() {
    info "Testing server health..."
    
    local max_retries=10
    local retry_count=0
    
    while [ $retry_count -lt $max_retries ]; do
        if curl -s "$TEST_BASE_URL/api/health" > /dev/null 2>&1; then
            success "Server is responding to health checks"
            return 0
        fi
        
        retry_count=$((retry_count + 1))
        info "Waiting for server to respond... ($retry_count/$max_retries)"
        sleep 3
    done
    
    error_exit "Server is not responding after $max_retries attempts"
}

test_session_endpoints() {
    info "Testing session and authentication endpoints..."
    
    # Test session debug endpoint
    local session_response=$(curl -s -w "HTTPSTATUS:%{http_code}" "$TEST_BASE_URL/debug/session" || echo "HTTPSTATUS:000")
    local session_status=$(echo "$session_response" | grep -o "HTTPSTATUS:[0-9]*" | cut -d: -f2)
    
    if [ "$session_status" = "200" ]; then
        success "Session debug endpoint is working"
    else
        warning "Session debug endpoint returned status: $session_status"
    fi
    
    # Test auth check endpoint
    local auth_response=$(curl -s -w "HTTPSTATUS:%{http_code}" "$TEST_BASE_URL/api/auth/check" || echo "HTTPSTATUS:000")
    local auth_status=$(echo "$auth_response" | grep -o "HTTPSTATUS:[0-9]*" | cut -d: -f2)
    
    if [ "$auth_status" = "401" ] || [ "$auth_status" = "200" ]; then
        success "Auth check endpoint is responding correctly"
    else
        warning "Auth check endpoint returned unexpected status: $auth_status"
    fi
}

test_churches_api() {
    info "Testing refactored churches API..."
    
    # Test GET /api/churches (should require auth - expect 401)
    local churches_response=$(curl -s -w "HTTPSTATUS:%{http_code}" "$TEST_BASE_URL/api/churches" || echo "HTTPSTATUS:000")
    local churches_status=$(echo "$churches_response" | grep -o "HTTPSTATUS:[0-9]*" | cut -d: -f2)
    
    if [ "$churches_status" = "401" ]; then
        success "Churches API correctly requires authentication"
        
        # Check response format
        local response_body=$(echo "$churches_response" | sed 's/HTTPSTATUS:[0-9]*$//')
        if echo "$response_body" | jq -e '.success == false and .error.code == "NO_SESSION"' > /dev/null 2>&1; then
            success "Churches API returns proper API v2 error format"
        else
            warning "Churches API response format may not be API v2 compliant"
        fi
    else
        warning "Churches API returned unexpected status: $churches_status (expected 401)"
    fi
}

test_database_connectivity() {
    if [ "$HAS_MYSQL" = false ]; then
        warning "Skipping database tests (MySQL client not available)"
        return
    fi
    
    info "Testing database connectivity..."
    
    # Test basic database connection
    if mysql -u orthodoxapps -p"${DB_PASSWORD:-Summerof1982@!}" -e "USE orthodoxmetrics_db; SELECT COUNT(*) FROM churches;" > /dev/null 2>&1; then
        success "Database connectivity test passed"
    else
        warning "Database connectivity test failed - this may affect API functionality"
    fi
}

run_comprehensive_tests() {
    info "Running comprehensive API v2 tests..."
    
    test_server_health
    test_session_endpoints  
    test_churches_api
    test_database_connectivity
    
    success "Comprehensive testing completed"
}

# ==============================================================================
# MAIN DEPLOYMENT FLOW
# ==============================================================================

main() {
    log "========================================" "$PURPLE"
    log "OrthodoxMetrics API v2 Deployment Started" "$PURPLE"  
    log "========================================" "$PURPLE"
    
    check_prerequisites
    
    if [ "$TEST_ONLY" = false ]; then
        backup_current_state
        validate_refactored_files
        restart_server
    else
        info "Running in test-only mode"
    fi
    
    run_comprehensive_tests
    
    log "========================================" "$GREEN"
    log "API v2 Deployment Completed Successfully!" "$GREEN"
    log "========================================" "$GREEN"
    
    info "Next steps:"
    echo "1. Monitor server logs: tail -f $LOG_FILE"
    echo "2. Test admin login and churches functionality"
    echo "3. Check session persistence across requests"
    echo "4. Verify role-based access control"
    
    if [ "$TEST_ONLY" = false ]; then
        info "Backup location: $BACKUP_DIR"
    fi
}

# ==============================================================================
# ERROR RECOVERY
# ==============================================================================

cleanup() {
    local exit_code=$?
    if [ $exit_code -ne 0 ] && [ "$TEST_ONLY" = false ]; then
        warning "Deployment failed - consider restoring from backup if needed"
        info "Backup location: $BACKUP_DIR"
    fi
}

trap cleanup EXIT

# ==============================================================================
# RUN MAIN FUNCTION
# ==============================================================================

main "$@" 
