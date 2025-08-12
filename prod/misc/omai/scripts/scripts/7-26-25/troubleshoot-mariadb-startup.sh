#!/bin/bash

# MariaDB Startup Troubleshooting Script
# Comprehensive diagnostic tool for MariaDB startup issues

set -e

echo "🔍 MariaDB Startup Troubleshooting"
echo "==================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
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

print_header() {
    echo -e "${PURPLE}[SECTION]${NC} $1"
}

print_debug() {
    echo -e "${CYAN}[DEBUG]${NC} $1"
}

# Check if running as root
if [[ $EUID -ne 0 ]]; then
    print_warning "Some checks may require root privileges. Consider running with sudo."
fi

# Configuration
MARIADB_SERVICE="mariadb"
MYSQL_SERVICE="mysql"
LOG_DIR="/var/log/mysql"
MARIADB_LOG="/var/log/mysql/error.log"
SYSTEM_LOG="/var/log/syslog"
JOURNAL_LOG="journalctl -u mariadb"

# Create temporary directory for analysis
TEMP_DIR=$(mktemp -d)
print_debug "Using temporary directory: $TEMP_DIR"

# Function to check if service exists
check_service_exists() {
    local service=$1
    if systemctl list-unit-files | grep -q "^$service.service"; then
        return 0
    else
        return 1
    fi
}

# Function to get service status
get_service_status() {
    local service=$1
    if check_service_exists "$service"; then
        systemctl is-active "$service" 2>/dev/null || echo "inactive"
    else
        echo "not-found"
    fi
}

# Function to check if port is in use
check_port_usage() {
    local port=$1
    if command -v netstat >/dev/null 2>&1; then
        netstat -tlnp 2>/dev/null | grep ":$port " || echo "Port $port is not in use"
    elif command -v ss >/dev/null 2>&1; then
        ss -tlnp 2>/dev/null | grep ":$port " || echo "Port $port is not in use"
    else
        echo "Cannot check port usage (netstat/ss not available)"
    fi
}

# Function to analyze log files
analyze_logs() {
    local log_file=$1
    local lines=${2:-50}
    
    if [ -f "$log_file" ]; then
        print_status "Analyzing $log_file (last $lines lines):"
        echo "----------------------------------------"
        tail -n "$lines" "$log_file" | grep -E "(ERROR|FATAL|CRITICAL|failed|error)" || echo "No errors found in recent logs"
        echo "----------------------------------------"
    else
        print_warning "Log file not found: $log_file"
    fi
}

# Function to check disk space
check_disk_space() {
    print_status "Checking disk space..."
    df -h | grep -E "(/$|/var|/tmp)" || df -h
}

# Function to check memory usage
check_memory() {
    print_status "Checking memory usage..."
    free -h
    echo ""
    print_status "Checking swap usage..."
    swapon --show || echo "No swap configured"
}

# Function to check file permissions
check_permissions() {
    local dir=$1
    local desc=$2
    
    if [ -d "$dir" ]; then
        print_status "Checking permissions for $desc ($dir):"
        ls -la "$dir" | head -10
        echo "..."
    else
        print_warning "$desc directory not found: $dir"
    fi
}

# Function to validate configuration file
validate_config() {
    local config_file=$1
    
    if [ -f "$config_file" ]; then
        print_status "Validating configuration file: $config_file"
        
        # Check for syntax errors
        if command -v mysqld >/dev/null 2>&1; then
            if mysqld --defaults-file="$config_file" --validate-config 2>/dev/null; then
                print_success "Configuration file syntax is valid"
            else
                print_error "Configuration file has syntax errors"
                mysqld --defaults-file="$config_file" --validate-config 2>&1 | head -20
            fi
        else
            print_warning "mysqld not found, cannot validate configuration"
        fi
        
        # Check for common issues
        echo ""
        print_status "Checking for common configuration issues:"
        
        # Check bind-address
        if grep -q "^bind-address" "$config_file"; then
            print_debug "bind-address found: $(grep "^bind-address" "$config_file")"
        fi
        
        # Check port
        if grep -q "^port" "$config_file"; then
            print_debug "port found: $(grep "^port" "$config_file")"
        fi
        
        # Check datadir
        if grep -q "^datadir" "$config_file"; then
            local datadir=$(grep "^datadir" "$config_file" | cut -d'=' -f2 | tr -d ' ')
            print_debug "datadir found: $datadir"
            if [ -d "$datadir" ]; then
                print_success "datadir exists and is accessible"
            else
                print_error "datadir does not exist: $datadir"
            fi
        fi
        
        # Check socket
        if grep -q "^socket" "$config_file"; then
            local socket=$(grep "^socket" "$config_file" | cut -d'=' -f2 | tr -d ' ')
            print_debug "socket found: $socket"
            if [ -S "$socket" ]; then
                print_warning "Socket file already exists: $socket"
            fi
        fi
        
    else
        print_warning "Configuration file not found: $config_file"
    fi
}

# Function to check for conflicting processes
check_conflicting_processes() {
    print_status "Checking for conflicting processes..."
    
    # Check for MySQL/MariaDB processes
    if pgrep -x "mysqld" >/dev/null; then
        print_warning "mysqld process is already running:"
        ps aux | grep mysqld | grep -v grep
    fi
    
    if pgrep -x "mariadbd" >/dev/null; then
        print_warning "mariadbd process is already running:"
        ps aux | grep mariadbd | grep -v grep
    fi
    
    # Check for processes using MySQL ports
    print_status "Checking for processes using MySQL ports..."
    check_port_usage 3306
    check_port_usage 3307
}

# Function to check system resources
check_system_resources() {
    print_header "System Resource Check"
    
    check_disk_space
    echo ""
    check_memory
    echo ""
    
    # Check CPU load
    print_status "Checking CPU load..."
    uptime
    echo ""
    
    # Check system limits
    print_status "Checking system limits..."
    ulimit -a | grep -E "(open files|max user processes|virtual memory)"
}

# Function to check service configuration
check_service_configuration() {
    print_header "Service Configuration Check"
    
    # Determine which service to check
    local primary_service=""
    local secondary_service=""
    
    if check_service_exists "$MARIADB_SERVICE"; then
        primary_service="$MARIADB_SERVICE"
        secondary_service="$MYSQL_SERVICE"
    elif check_service_exists "$MYSQL_SERVICE"; then
        primary_service="$MYSQL_SERVICE"
        secondary_service="$MARIADB_SERVICE"
    else
        print_error "Neither mariadb nor mysql service found"
        return 1
    fi
    
    print_success "Found service: $primary_service"
    
    # Check service status
    local status=$(get_service_status "$primary_service")
    print_status "Service status: $status"
    
    # Check service configuration
    print_status "Checking service configuration..."
    systemctl show "$primary_service" | grep -E "(ExecStart|WorkingDirectory|User|Group)" | head -10
    
    # Check service dependencies
    print_status "Checking service dependencies..."
    systemctl list-dependencies "$primary_service" --reverse | head -10
    
    # Check if service is enabled
    if systemctl is-enabled "$primary_service" >/dev/null 2>&1; then
        print_success "Service is enabled"
    else
        print_warning "Service is not enabled"
    fi
}

# Function to check log files
check_log_files() {
    print_header "Log File Analysis"
    
    # Check MariaDB error log
    if [ -f "$MARIADB_LOG" ]; then
        analyze_logs "$MARIADB_LOG" 100
    else
        print_warning "MariaDB error log not found: $MARIADB_LOG"
        
        # Try alternative locations
        local alt_logs=(
            "/var/log/mysql/mysql.err"
            "/var/log/mysql/error.log"
            "/var/log/mysqld.log"
            "/var/log/mysql.log"
        )
        
        for log in "${alt_logs[@]}"; do
            if [ -f "$log" ]; then
                print_status "Found alternative log file: $log"
                analyze_logs "$log" 100
                break
            fi
        done
    fi
    
    echo ""
    
    # Check system logs
    print_status "Checking system logs for MariaDB entries..."
    if command -v journalctl >/dev/null 2>&1; then
        journalctl -u "$MARIADB_SERVICE" --no-pager -n 50 | grep -E "(ERROR|FATAL|CRITICAL|failed|error)" || echo "No errors found in system logs"
    else
        print_warning "journalctl not available"
    fi
    
    echo ""
    
    # Check syslog
    if [ -f "$SYSTEM_LOG" ]; then
        print_status "Checking syslog for MariaDB entries..."
        grep -i "mariadb\|mysql" "$SYSTEM_LOG" | tail -20 || echo "No MariaDB entries found in syslog"
    fi
}

# Function to check file permissions and ownership
check_file_permissions() {
    print_header "File Permissions Check"
    
    # Check common directories
    local dirs=(
        "/var/lib/mysql"
        "/var/log/mysql"
        "/etc/mysql"
        "/etc/mariadb"
        "/tmp"
    )
    
    for dir in "${dirs[@]}"; do
        check_permissions "$dir" "$(basename "$dir")"
        echo ""
    done
    
    # Check configuration files
    local configs=(
        "/etc/mysql/my.cnf"
        "/etc/mysql/mysql.conf.d/mysqld.cnf"
        "/etc/mariadb/my.cnf"
        "/etc/mariadb/mariadb.conf.d/50-server.cnf"
    )
    
    for config in "${configs[@]}"; do
        if [ -f "$config" ]; then
            print_status "Checking configuration file: $config"
            ls -la "$config"
            validate_config "$config"
            echo ""
        fi
    done
}

# Function to check network configuration
check_network_configuration() {
    print_header "Network Configuration Check"
    
    # Check if ports are in use
    check_conflicting_processes
    echo ""
    
    # Check network interfaces
    print_status "Checking network interfaces..."
    ip addr show | grep -E "(inet|UP)" | head -10
    
    # Check firewall status
    print_status "Checking firewall status..."
    if command -v ufw >/dev/null 2>&1; then
        ufw status | head -10
    elif command -v firewall-cmd >/dev/null 2>&1; then
        firewall-cmd --list-all | head -10
    else
        print_warning "No firewall management tool found"
    fi
}

# Function to provide common fixes
provide_common_fixes() {
    print_header "Common Fixes and Solutions"
    
    echo "Based on the analysis above, here are common solutions:"
    echo ""
    
    echo "1. If service is not starting:"
    echo "   sudo systemctl start mariadb"
    echo "   sudo systemctl enable mariadb"
    echo ""
    
    echo "2. If there are permission issues:"
    echo "   sudo chown -R mysql:mysql /var/lib/mysql"
    echo "   sudo chown -R mysql:mysql /var/log/mysql"
    echo "   sudo chmod 755 /var/lib/mysql"
    echo ""
    
    echo "3. If there are configuration issues:"
    echo "   sudo mysqld --validate-config"
    echo "   sudo mysqld --print-defaults"
    echo ""
    
    echo "4. If there are port conflicts:"
    echo "   sudo netstat -tlnp | grep 3306"
    echo "   sudo kill -9 [PID]  # Replace [PID] with actual process ID"
    echo ""
    
    echo "5. If there are disk space issues:"
    echo "   sudo apt-get clean"
    echo "   sudo journalctl --vacuum-time=7d"
    echo ""
    
    echo "6. If there are memory issues:"
    echo "   Check /etc/mysql/mysql.conf.d/mysqld.cnf for memory settings"
    echo "   Reduce innodb_buffer_pool_size if necessary"
    echo ""
    
    echo "7. If service is stuck:"
    echo "   sudo systemctl stop mariadb"
    echo "   sudo systemctl reset-failed mariadb"
    echo "   sudo systemctl start mariadb"
    echo ""
    
    echo "8. For detailed debugging:"
    echo "   sudo mysqld --verbose --help"
    echo "   sudo journalctl -u mariadb -f"
    echo ""
}

# Function to generate report
generate_report() {
    local report_file="$TEMP_DIR/mariadb_troubleshoot_report.txt"
    
    print_status "Generating detailed report: $report_file"
    
    {
        echo "MariaDB Startup Troubleshooting Report"
        echo "Generated: $(date)"
        echo "======================================"
        echo ""
        
        echo "System Information:"
        echo "-------------------"
        uname -a
        echo ""
        
        echo "Service Status:"
        echo "---------------"
        systemctl status mariadb --no-pager || systemctl status mysql --no-pager || echo "Service not found"
        echo ""
        
        echo "Recent Logs:"
        echo "------------"
        if [ -f "$MARIADB_LOG" ]; then
            tail -100 "$MARIADB_LOG"
        fi
        echo ""
        
        echo "System Resources:"
        echo "-----------------"
        df -h
        echo ""
        free -h
        echo ""
        
        echo "Process Information:"
        echo "-------------------"
        ps aux | grep -E "(mysql|mariadb)" | grep -v grep || echo "No MySQL/MariaDB processes found"
        echo ""
        
        echo "Network Information:"
        echo "-------------------"
        netstat -tlnp | grep 3306 || echo "No processes on port 3306"
        echo ""
        
    } > "$report_file"
    
    print_success "Report generated: $report_file"
    echo "You can view the full report with: cat $report_file"
}

# Main troubleshooting function
main_troubleshooting() {
    print_header "Starting MariaDB Troubleshooting"
    echo ""
    
    # Check system resources
    check_system_resources
    echo ""
    
    # Check service configuration
    check_service_configuration
    echo ""
    
    # Check file permissions
    check_file_permissions
    echo ""
    
    # Check network configuration
    check_network_configuration
    echo ""
    
    # Check log files
    check_log_files
    echo ""
    
    # Generate report
    generate_report
    echo ""
    
    # Provide common fixes
    provide_common_fixes
    echo ""
    
    print_header "Troubleshooting Complete"
    print_status "Check the report above for detailed information"
    print_status "Use the common fixes section for solutions"
    print_status "If issues persist, check the generated report: $TEMP_DIR/mariadb_troubleshoot_report.txt"
}

# Run main troubleshooting
main_troubleshooting

# Cleanup
print_debug "Cleaning up temporary files..."
# Keep the report file for user reference
print_status "Troubleshooting report saved to: $TEMP_DIR/mariadb_troubleshoot_report.txt"
print_status "You can delete it manually when no longer needed" 