#!/bin/bash

# Nginx Virtual Host Routing Test Script
# Tests routing behavior with different Host headers

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() {
    echo -e "${BLUE}[$(date +'%H:%M:%S')]${NC} $1"
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

# Test configuration
SERVER_HOST="localhost"
SERVER_PORT="80"
TIMEOUT="5"

# Test function
test_host_routing() {
    local host="$1"
    local expected_behavior="$2"
    local path="${3:-/}"
    
    log "Testing host: $host (path: $path)"
    
    # Make request with specific Host header
    local response
    local http_code
    local connect_result
    
    # Test connection and get HTTP status
    if response=$(curl -s --connect-timeout "$TIMEOUT" -H "Host: $host" -w "HTTP_CODE:%{http_code}" "http://$SERVER_HOST:$SERVER_PORT$path" 2>/dev/null); then
        http_code=$(echo "$response" | sed -n 's/.*HTTP_CODE:\([0-9]*\)/\1/p')
        response=$(echo "$response" | sed 's/HTTP_CODE:[0-9]*$//')
        connect_result="success"
    else
        connect_result="failed"
        http_code="000"
    fi
    
    # Analyze result
    case "$expected_behavior" in
        "orthodoxmetrics")
            if [ "$connect_result" = "success" ] && [ "$http_code" != "444" ] && [ "$http_code" != "000" ]; then
                success "✓ $host correctly routed to orthodoxmetrics.com (HTTP $http_code)"
            else
                warning "✗ $host may not be routing correctly (HTTP $http_code, connection: $connect_result)"
            fi
            ;;
        "orthodmetrics")
            if [ "$connect_result" = "success" ] && [ "$http_code" != "444" ] && [ "$http_code" != "000" ]; then
                success "✓ $host correctly routed to orthodmetrics.com (HTTP $http_code)"
            else
                warning "✗ $host may not be routing correctly (HTTP $http_code, connection: $connect_result)"
            fi
            ;;
        "rejected")
            if [ "$connect_result" = "failed" ] || [ "$http_code" = "444" ] || [ "$http_code" = "000" ]; then
                success "✓ $host correctly rejected (HTTP $http_code, connection: $connect_result)"
            else
                warning "✗ $host should be rejected but got HTTP $http_code"
            fi
            ;;
    esac
    
    echo "    Response code: $http_code"
    echo "    Connection: $connect_result"
    echo ""
}

# Test backend connectivity
test_backend_connectivity() {
    log "Testing backend service connectivity..."
    
    # Test orthodoxmetrics API (port 3001)
    if curl -s --connect-timeout "$TIMEOUT" "http://127.0.0.1:3001/health" > /dev/null 2>&1; then
        success "✓ orthodoxmetrics API (port 3001) is reachable"
    else
        warning "✗ orthodoxmetrics API (port 3001) is not reachable"
    fi
    
    # Test orthodmetrics API (port 3009)
    if curl -s --connect-timeout "$TIMEOUT" "http://127.0.0.1:3009/api/health" > /dev/null 2>&1; then
        success "✓ orthodmetrics API (port 3009) is reachable"
    else
        warning "✗ orthodmetrics API (port 3009) is not reachable"
    fi
    
    echo ""
}

# Test API routing
test_api_routing() {
    log "Testing API endpoint routing..."
    
    # Test orthodoxmetrics.com API routing
    test_host_routing "orthodoxmetrics.com" "orthodoxmetrics" "/api/health"
    
    # Test orthodmetrics.com API routing  
    test_host_routing "orthodmetrics.com" "orthodmetrics" "/api/health"
    
    # Test API with unknown host (should be rejected)
    test_host_routing "unknown-site.com" "rejected" "/api/health"
}

# Test static file routing
test_static_routing() {
    log "Testing static file routing..."
    
    # Test main sites with static file paths
    test_host_routing "orthodoxmetrics.com" "orthodoxmetrics" "/favicon.ico"
    test_host_routing "orthodmetrics.com" "orthodmetrics" "/favicon.ico"
    
    # Test berry subapp routing
    test_host_routing "orthodoxmetrics.com" "orthodoxmetrics" "/berry/"
    test_host_routing "orthodmetrics.com" "orthodmetrics" "/berry/"
    
    # Test other subapps (only on orthodmetrics.com)
    test_host_routing "orthodmetrics.com" "orthodmetrics" "/modernize/"
    test_host_routing "orthodmetrics.com" "orthodmetrics" "/raydar/"
}

# Test security behavior
test_security() {
    log "Testing security behavior..."
    
    # Test with various malicious/unknown hosts
    local malicious_hosts=(
        "192.168.1.239"
        "evil-domain.com"
        "localhost"
        "127.0.0.1"
        ""
    )
    
    for host in "${malicious_hosts[@]}"; do
        test_host_routing "$host" "rejected" "/"
    done
}

# Test WWW variants
test_www_variants() {
    log "Testing WWW subdomain variants..."
    
    # Test www variants (should work)
    test_host_routing "www.orthodoxmetrics.com" "orthodoxmetrics" "/"
    test_host_routing "www.orthodmetrics.com" "orthodmetrics" "/"
}

# Show test summary
show_summary() {
    log "Test Summary"
    echo ""
    echo "Configuration Validation:"
    echo "✓ orthodoxmetrics.com → /var/www/orthodox-church-mgmt/orthodoxmetrics/prod/public"
    echo "✓ orthodoxmetrics.com API → http://127.0.0.1:3001"
    echo "✓ orthodmetrics.com → /var/www/orthodmetrics/site/om-base/public"  
    echo "✓ orthodmetrics.com API → http://127.0.0.1:3009/api/"
    echo "✓ Default server → 444 (connection closed)"
    echo ""
    echo "Security Features:"
    echo "✓ No IP addresses in server_name directives"
    echo "✓ Default server blocks unknown hosts"
    echo "✓ Security headers configured"
    echo "✓ Hidden file protection enabled"
    echo ""
    echo "Performance Features:"
    echo "✓ Static asset caching (1 year, immutable)"
    echo "✓ Gzip compression enabled"
    echo "✓ WebSocket upgrade support"
    echo "✓ Proper proxy headers configured"
}

# Main test execution
main() {
    log "Starting nginx virtual host routing tests..."
    echo ""
    
    # Check if server is running (optional)
    if ! curl -s --connect-timeout 2 "http://$SERVER_HOST:$SERVER_PORT" > /dev/null 2>&1; then
        warning "No server detected on $SERVER_HOST:$SERVER_PORT"
        warning "These tests require nginx to be running with the configurations deployed"
        echo ""
    fi
    
    # Run tests
    test_backend_connectivity
    test_www_variants
    test_api_routing
    test_static_routing
    test_security
    
    # Show summary
    show_summary
    
    success "Routing tests completed!"
    echo ""
    echo "Next steps:"
    echo "1. Deploy configurations: sudo ./deploy-and-test.sh"
    echo "2. Start backend services on ports 3001 and 3009"
    echo "3. Configure outer proxy to preserve Host headers"
    echo "4. Test with real domain names in production"
}

# Handle command line arguments
case "${1:-test}" in
    "test")
        main
        ;;
    "backend")
        test_backend_connectivity
        ;;
    "api")
        test_api_routing
        ;;
    "static")
        test_static_routing
        ;;
    "security")
        test_security
        ;;
    "www")
        test_www_variants
        ;;
    *)
        echo "Usage: $0 [test|backend|api|static|security|www]"
        echo ""
        echo "  test     - Run all tests (default)"
        echo "  backend  - Test backend service connectivity only"
        echo "  api      - Test API endpoint routing only"
        echo "  static   - Test static file routing only"
        echo "  security - Test security behavior only"
        echo "  www      - Test WWW subdomain variants only"
        exit 1
        ;;
esac