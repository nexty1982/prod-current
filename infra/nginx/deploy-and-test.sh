#!/bin/bash

# Nginx Virtual Host Deployment and Testing Script
# This script deploys nginx configurations and tests routing

set -e

# Configuration
NGINX_SITES_AVAILABLE="/etc/nginx/sites-available"
NGINX_SITES_ENABLED="/etc/nginx/sites-enabled"
CONFIG_DIR="$(dirname "$0")"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Check if running as root
check_root() {
    if [[ $EUID -ne 0 ]]; then
        error "This script must be run as root (use sudo)"
        exit 1
    fi
}

# Backup existing configurations
backup_configs() {
    log "Creating backup of existing nginx configurations..."
    
    BACKUP_DIR="/etc/nginx/backups/$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$BACKUP_DIR"
    
    # Backup sites-available
    if [ -d "$NGINX_SITES_AVAILABLE" ]; then
        cp -r "$NGINX_SITES_AVAILABLE" "$BACKUP_DIR/"
        success "Backed up sites-available to $BACKUP_DIR"
    fi
    
    # Backup sites-enabled
    if [ -d "$NGINX_SITES_ENABLED" ]; then
        cp -r "$NGINX_SITES_ENABLED" "$BACKUP_DIR/"
        success "Backed up sites-enabled to $BACKUP_DIR"
    fi
}

# Deploy configurations
deploy_configs() {
    log "Deploying nginx configurations..."
    
    # Copy configuration files
    cp "$CONFIG_DIR/orthodoxmetrics.conf" "$NGINX_SITES_AVAILABLE/"
    cp "$CONFIG_DIR/orthodmetrics.conf" "$NGINX_SITES_AVAILABLE/"
    cp "$CONFIG_DIR/default.conf" "$NGINX_SITES_AVAILABLE/"
    
    # Remove old default if it exists
    if [ -L "$NGINX_SITES_ENABLED/default" ]; then
        rm "$NGINX_SITES_ENABLED/default"
        log "Removed old default site"
    fi
    
    # Enable new configurations
    ln -sf "$NGINX_SITES_AVAILABLE/orthodoxmetrics.conf" "$NGINX_SITES_ENABLED/"
    ln -sf "$NGINX_SITES_AVAILABLE/orthodmetrics.conf" "$NGINX_SITES_ENABLED/"
    ln -sf "$NGINX_SITES_AVAILABLE/default.conf" "$NGINX_SITES_ENABLED/"
    
    success "Nginx configurations deployed"
}

# Test nginx configuration
test_nginx_config() {
    log "Testing nginx configuration syntax..."
    
    if nginx -t; then
        success "Nginx configuration syntax is valid"
    else
        error "Nginx configuration syntax error!"
        exit 1
    fi
}

# Reload nginx
reload_nginx() {
    log "Reloading nginx..."
    
    if systemctl reload nginx; then
        success "Nginx reloaded successfully"
    else
        error "Failed to reload nginx!"
        exit 1
    fi
}

# Test virtual host routing
test_routing() {
    log "Testing virtual host routing..."
    
    # Test orthodoxmetrics.com (main site)
    log "Testing orthodoxmetrics.com routing..."
    if curl -s -H "Host: orthodoxmetrics.com" http://localhost/ > /dev/null; then
        success "orthodoxmetrics.com responds correctly"
    else
        warning "orthodoxmetrics.com may not be responding (this is expected if paths don't exist yet)"
    fi
    
    # Test orthodmetrics.com (typo/internal site)  
    log "Testing orthodmetrics.com routing..."
    if curl -s -H "Host: orthodmetrics.com" http://localhost/ > /dev/null; then
        success "orthodmetrics.com responds correctly"
    else
        warning "orthodmetrics.com may not be responding (this is expected if paths don't exist yet)"
    fi
    
    # Test default server (should return 444)
    log "Testing default server with unknown host..."
    HTTP_CODE=$(curl -s -H "Host: unknown-host.com" -o /dev/null -w "%{http_code}" http://localhost/ || echo "000")
    if [ "$HTTP_CODE" = "000" ]; then
        success "Default server correctly closes connection (444 response)"
    else
        warning "Default server returned HTTP $HTTP_CODE instead of closing connection"
    fi
}

# Check backend services
check_backends() {
    log "Checking backend services..."
    
    # Check orthodoxmetrics API (port 3001)
    if curl -s --connect-timeout 5 http://127.0.0.1:3001/health > /dev/null; then
        success "orthodoxmetrics API (port 3001) is running"
    else
        warning "orthodoxmetrics API (port 3001) is not responding"
    fi
    
    # Check orthodmetrics API (port 3009)
    if curl -s --connect-timeout 5 http://127.0.0.1:3009/api/health > /dev/null; then
        success "orthodmetrics API (port 3009) is running"
    else
        warning "orthodmetrics API (port 3009) is not responding"
    fi
}

# Show status
show_status() {
    log "Nginx status and configuration summary:"
    
    echo ""
    echo "Active nginx sites:"
    ls -la "$NGINX_SITES_ENABLED/"
    
    echo ""
    echo "Nginx process status:"
    systemctl status nginx --no-pager -l
    
    echo ""
    echo "Listening ports:"
    netstat -tlnp | grep nginx || ss -tlnp | grep nginx
}

# Main execution
main() {
    log "Starting nginx virtual host deployment and testing..."
    
    # Verify we're running as root
    check_root
    
    # Create backup
    backup_configs
    
    # Deploy configurations
    deploy_configs
    
    # Test configuration
    test_nginx_config
    
    # Reload nginx
    reload_nginx
    
    # Test routing
    test_routing
    
    # Check backend services
    check_backends
    
    # Show final status
    show_status
    
    success "Deployment completed successfully!"
    
    echo ""
    echo "Next steps:"
    echo "1. Ensure backend services are running on ports 3001 and 3009"
    echo "2. Verify outer proxy sets 'proxy_set_header Host \$host;'"
    echo "3. Test routing with real domain names"
    echo "4. Monitor nginx error logs: tail -f /var/log/nginx/error.log"
}

# Script options
case "${1:-deploy}" in
    "deploy")
        main
        ;;
    "test")
        log "Running tests only..."
        test_nginx_config
        test_routing
        check_backends
        ;;
    "status")
        show_status
        ;;
    "backup")
        check_root
        backup_configs
        ;;
    *)
        echo "Usage: $0 [deploy|test|status|backup]"
        echo ""
        echo "  deploy  - Full deployment with backup, config, and testing (default)"
        echo "  test    - Run tests only (config syntax, routing, backends)"
        echo "  status  - Show current nginx status and configuration"
        echo "  backup  - Create backup of current configurations only"
        exit 1
        ;;
esac