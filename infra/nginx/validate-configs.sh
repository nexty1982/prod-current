#!/bin/bash

# Nginx Configuration Validation Script
# Validates nginx configuration files without requiring nginx to be installed

set -e

CONFIG_DIR="$(dirname "$0")"

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

# Validate configuration syntax patterns
validate_syntax() {
    local file="$1"
    local filename=$(basename "$file")
    
    log "Validating $filename..."
    
    # Check for basic syntax issues
    local issues=0
    
    # Check for unmatched braces
    local open_braces=$(grep -o '{' "$file" | wc -l)
    local close_braces=$(grep -o '}' "$file" | wc -l)
    
    if [ "$open_braces" -ne "$close_braces" ]; then
        error "$filename: Unmatched braces (open: $open_braces, close: $close_braces)"
        issues=$((issues + 1))
    fi
    
    # Check for missing semicolons at end of directives
    while IFS= read -r line; do
        # Skip comments and empty lines
        if [[ "$line" =~ ^[[:space:]]*# ]] || [[ "$line" =~ ^[[:space:]]*$ ]]; then
            continue
        fi
        
        # Skip lines with braces
        if [[ "$line" =~ [{}] ]]; then
            continue
        fi
        
        # Check if directive line ends with semicolon
        if [[ "$line" =~ ^[[:space:]]*[a-zA-Z_] ]] && [[ ! "$line" =~ \;[[:space:]]*$ ]]; then
            warning "$filename: Line may be missing semicolon: $line"
        fi
    done < "$file"
    
    # Check for common directive issues
    if grep -q "proxy_set_header.*\$connection_upgrade" "$file"; then
        error "$filename: Uses undefined variable \$connection_upgrade"
        issues=$((issues + 1))
    fi
    
    if [ $issues -eq 0 ]; then
        success "$filename: Syntax validation passed"
    else
        error "$filename: Found $issues syntax issues"
        return 1
    fi
}

# Validate configuration logic
validate_logic() {
    local file="$1"
    local filename=$(basename "$file")
    
    log "Validating $filename logic..."
    
    local warnings=0
    
    # Check for IP addresses in server_name (should be avoided)
    if grep -q "server_name.*[0-9]\+\.[0-9]\+\.[0-9]\+\.[0-9]\+" "$file"; then
        warning "$filename: Contains IP address in server_name (not recommended)"
        warnings=$((warnings + 1))
    fi
    
    # Check for proper proxy headers
    if grep -q "proxy_pass" "$file"; then
        if ! grep -q "proxy_set_header Host" "$file"; then
            warning "$filename: proxy_pass without Host header"
            warnings=$((warnings + 1))
        fi
        
        if ! grep -q "proxy_set_header X-Real-IP" "$file"; then
            warning "$filename: proxy_pass without X-Real-IP header"
            warnings=$((warnings + 1))
        fi
    fi
    
    # Check for security headers
    if ! grep -q "X-Frame-Options" "$file"; then
        warning "$filename: Missing X-Frame-Options security header"
        warnings=$((warnings + 1))
    fi
    
    if [ $warnings -eq 0 ]; then
        success "$filename: Logic validation passed"
    else
        warning "$filename: Found $warnings logic warnings"
    fi
}

# Check configuration completeness
check_completeness() {
    log "Checking configuration completeness..."
    
    local missing=0
    
    # Check required files exist
    for config in "orthodoxmetrics.conf" "orthodmetrics.conf" "default.conf"; do
        if [ ! -f "$CONFIG_DIR/$config" ]; then
            error "Missing required configuration: $config"
            missing=$((missing + 1))
        fi
    done
    
    # Check for required server blocks
    if [ -f "$CONFIG_DIR/orthodoxmetrics.conf" ]; then
        if ! grep -q "server_name orthodoxmetrics.com" "$CONFIG_DIR/orthodoxmetrics.conf"; then
            error "orthodoxmetrics.conf: Missing orthodoxmetrics.com server_name"
            missing=$((missing + 1))
        fi
    fi
    
    if [ -f "$CONFIG_DIR/orthodmetrics.conf" ]; then
        if ! grep -q "server_name orthodmetrics.com" "$CONFIG_DIR/orthodmetrics.conf"; then
            error "orthodmetrics.conf: Missing orthodmetrics.com server_name"
            missing=$((missing + 1))
        fi
    fi
    
    if [ -f "$CONFIG_DIR/default.conf" ]; then
        if ! grep -q "default_server" "$CONFIG_DIR/default.conf"; then
            error "default.conf: Missing default_server configuration"
            missing=$((missing + 1))
        fi
    fi
    
    if [ $missing -eq 0 ]; then
        success "Configuration completeness check passed"
    else
        error "Found $missing missing configurations"
        return 1
    fi
}

# Generate configuration summary
generate_summary() {
    log "Configuration Summary:"
    echo ""
    
    for config in "$CONFIG_DIR"/*.conf; do
        if [ -f "$config" ]; then
            local filename=$(basename "$config")
            echo "📄 $filename:"
            
            # Extract server names
            local server_names=$(grep "server_name" "$config" | sed 's/.*server_name[[:space:]]*//;s/;.*//' | tr '\n' ' ')
            if [ -n "$server_names" ]; then
                echo "   🌐 Domains: $server_names"
            fi
            
            # Extract document root
            local doc_root=$(grep "root " "$config" | head -1 | sed 's/.*root[[:space:]]*//;s/;.*//')
            if [ -n "$doc_root" ]; then
                echo "   📁 Document Root: $doc_root"
            fi
            
            # Extract proxy passes
            local proxies=$(grep "proxy_pass" "$config" | sed 's/.*proxy_pass[[:space:]]*//;s/;.*//' | sort -u)
            if [ -n "$proxies" ]; then
                echo "   🔄 Proxies:"
                echo "$proxies" | sed 's/^/      /'
            fi
            
            echo ""
        fi
    done
}

# Main validation function
main() {
    log "Starting nginx configuration validation..."
    echo ""
    
    local total_errors=0
    
    # Validate each configuration file
    for config in "$CONFIG_DIR"/*.conf; do
        if [ -f "$config" ]; then
            if ! validate_syntax "$config"; then
                total_errors=$((total_errors + 1))
            fi
            validate_logic "$config"
            echo ""
        fi
    done
    
    # Check completeness
    if ! check_completeness; then
        total_errors=$((total_errors + 1))
    fi
    
    echo ""
    generate_summary
    
    if [ $total_errors -eq 0 ]; then
        success "All validations passed! Configurations are ready for deployment."
        exit 0
    else
        error "Found $total_errors configuration errors that must be fixed."
        exit 1
    fi
}

# Execute main function
main "$@"