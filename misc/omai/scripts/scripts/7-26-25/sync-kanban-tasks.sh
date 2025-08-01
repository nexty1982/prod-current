#!/bin/bash

# BigBook ⇄ Kanban Board Task Sync Script
# Version: 1.0.0
# Description: Full synchronization between task_*.md files and dev Kanban board

echo "=== BigBook ⇄ Kanban Task Sync ==="
echo "Date: $(date)"
echo "Synchronizing task files with dev Kanban board"

# Set script options
set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
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

# Configuration
PROD_ROOT="/var/www/orthodox-church-mgmt/orthodoxmetrics/prod"
LOG_FILE="/var/log/omai/bigbook-kanban-sync.log"
API_BASE="http://localhost:3000/api/admin/kanban-sync"
SYNC_MODE="${1:-full}"  # full, tasks-only, kanban-only, status, test

# Check if running as authorized user
if [[ $USER != "root" && $USER != "www-data" ]]; then
    print_warning "Running as user: $USER. Ensure you have proper permissions."
fi

# Navigate to production directory
print_status "Working in: $PROD_ROOT"
cd "$PROD_ROOT" || {
    print_error "Could not change to production directory"
    exit 1
}

# Function to check if server is running
check_server() {
    print_status "Checking if server is running..."
    
    if curl -s --max-time 5 "$API_BASE/status" >/dev/null 2>&1; then
        print_success "Server is running and API is accessible"
        return 0
    else
        print_error "Server is not running or API is not accessible"
        print_status "Please start the server before running sync"
        return 1
    fi
}

# Function to perform API call with authentication
api_call() {
    local method="$1"
    local endpoint="$2"
    local data="$3"
    local session_cookie="$4"
    
    local curl_opts=(-s -X "$method" --max-time 30)
    
    if [[ -n "$session_cookie" ]]; then
        curl_opts+=(--cookie "$session_cookie")
    fi
    
    if [[ -n "$data" ]]; then
        curl_opts+=(--header "Content-Type: application/json" --data "$data")
    fi
    
    curl "${curl_opts[@]}" "$API_BASE$endpoint"
}

# Function to get sync status
get_sync_status() {
    print_status "Getting sync status..."
    
    local response=$(api_call "GET" "/status")
    local success=$(echo "$response" | jq -r '.success // false' 2>/dev/null)
    
    if [[ "$success" == "true" ]]; then
        echo "$response" | jq -r '.status' 2>/dev/null
        return 0
    else
        print_error "Failed to get sync status"
        echo "$response" | jq -r '.error // "Unknown error"' 2>/dev/null
        return 1
    fi
}

# Function to perform full sync
perform_full_sync() {
    print_status "Initiating full bidirectional sync..."
    
    local response=$(api_call "POST" "/full-sync")
    local success=$(echo "$response" | jq -r '.success // false' 2>/dev/null)
    
    if [[ "$success" == "true" ]]; then
        local result=$(echo "$response" | jq -r '.result' 2>/dev/null)
        
        # Extract sync statistics
        local tasks_discovered=$(echo "$result" | jq -r '.tasks.discovered // 0' 2>/dev/null)
        local tasks_synced=$(echo "$result" | jq -r '.tasks.synced // 0' 2>/dev/null)
        local tasks_created=$(echo "$result" | jq -r '.tasks.created // 0' 2>/dev/null)
        local tasks_updated=$(echo "$result" | jq -r '.tasks.updated // 0' 2>/dev/null)
        local kanban_cards=$(echo "$result" | jq -r '.kanban.cards // 0' 2>/dev/null)
        local kanban_synced=$(echo "$result" | jq -r '.kanban.synced // 0' 2>/dev/null)
        local kanban_orphaned=$(echo "$result" | jq -r '.kanban.orphaned // 0' 2>/dev/null)
        
        print_success "Full sync completed successfully!"
        echo ""
        echo "📊 Sync Results:"
        echo "  Tasks discovered: $tasks_discovered"
        echo "  Tasks synced: $tasks_synced (Created: $tasks_created, Updated: $tasks_updated)"
        echo "  Kanban cards: $kanban_cards"
        echo "  Kanban synced: $kanban_synced"
        echo "  Orphaned cards cleaned: $kanban_orphaned"
        echo ""
        
        # Check for errors
        local task_errors=$(echo "$result" | jq -r '.tasks.errors | length' 2>/dev/null)
        local kanban_errors=$(echo "$result" | jq -r '.kanban.errors | length' 2>/dev/null)
        
        if [[ "$task_errors" -gt 0 || "$kanban_errors" -gt 0 ]]; then
            print_warning "Sync completed with $task_errors task errors and $kanban_errors kanban errors"
            echo "Check sync logs for details: $LOG_FILE"
        fi
        
        return 0
    else
        local error=$(echo "$response" | jq -r '.error // "Unknown error"' 2>/dev/null)
        print_error "Full sync failed: $error"
        return 1
    fi
}

# Function to get task statistics
get_task_statistics() {
    print_status "Getting task and sync statistics..."
    
    local response=$(api_call "GET" "/statistics")
    local success=$(echo "$response" | jq -r '.success // false' 2>/dev/null)
    
    if [[ "$success" == "true" ]]; then
        local stats=$(echo "$response" | jq -r '.statistics' 2>/dev/null)
        
        # Task statistics
        local total_tasks=$(echo "$stats" | jq -r '.tasks.total // 0' 2>/dev/null)
        local synced_tasks=$(echo "$stats" | jq -r '.tasks.syncStatus.synced // 0' 2>/dev/null)
        local unsynced_tasks=$(echo "$stats" | jq -r '.tasks.syncStatus.unsynced // 0' 2>/dev/null)
        local bigbook_tasks=$(echo "$stats" | jq -r '.tasks.locations.bigBook // 0' 2>/dev/null)
        
        # Kanban statistics  
        local total_cards=$(echo "$stats" | jq -r '.kanban.totalCards // 0' 2>/dev/null)
        local linked_cards=$(echo "$stats" | jq -r '.kanban.syncedTasks // 0' 2>/dev/null)
        
        # Sync health
        local health_score=$(echo "$stats" | jq -r '.syncHealth.score // 0' 2>/dev/null)
        local health_status=$(echo "$stats" | jq -r '.syncHealth.status // "unknown"' 2>/dev/null)
        
        echo ""
        echo "📈 Task Statistics:"
        echo "  Total tasks: $total_tasks"
        echo "  Synced: $synced_tasks"
        echo "  Unsynced: $unsynced_tasks"
        echo "  In Big Book: $bigbook_tasks"
        echo ""
        echo "📋 Kanban Statistics:"
        echo "  Total cards: $total_cards" 
        echo "  Linked to tasks: $linked_cards"
        echo ""
        echo "🏥 Sync Health:"
        echo "  Score: $health_score/100 ($health_status)"
        echo ""
        
        return 0
    else
        local error=$(echo "$response" | jq -r '.error // "Unknown error"' 2>/dev/null)
        print_error "Failed to get statistics: $error"
        return 1
    fi
}

# Function to detect and report conflicts
check_conflicts() {
    print_status "Checking for sync conflicts..."
    
    local response=$(api_call "GET" "/conflicts")
    local success=$(echo "$response" | jq -r '.success // false' 2>/dev/null)
    
    if [[ "$success" == "true" ]]; then
        local conflicts=$(echo "$response" | jq -r '.conflicts' 2>/dev/null)
        local conflict_count=$(echo "$response" | jq -r '.count // 0' 2>/dev/null)
        
        if [[ "$conflict_count" -eq 0 ]]; then
            print_success "No sync conflicts detected"
        else
            print_warning "Found $conflict_count sync conflicts:"
            echo ""
            
            # Display conflict details
            echo "$conflicts" | jq -r '.[] | "  Task: \(.taskFile) (ID: \(.taskId))\n  Card: \(.cardId)\n  Differences: \(.differences | length)\n"' 2>/dev/null
            
            echo "Use 'sync-kanban-tasks.sh resolve' to resolve conflicts"
        fi
        
        return 0
    else
        local error=$(echo "$response" | jq -r '.error // "Unknown error"' 2>/dev/null)
        print_error "Failed to check conflicts: $error"
        return 1
    fi
}

# Function to test sync functionality
test_sync() {
    print_status "Testing sync functionality..."
    
    local response=$(api_call "POST" "/test")
    local success=$(echo "$response" | jq -r '.success // false' 2>/dev/null)
    
    if [[ "$success" == "true" ]]; then
        local task_id=$(echo "$response" | jq -r '.task.id // "unknown"' 2>/dev/null)
        local card_id=$(echo "$response" | jq -r '.syncResult.card.id // "unknown"' 2>/dev/null)
        
        print_success "Test sync completed successfully!"
        echo "  Created test task: $task_id"
        echo "  Synced to Kanban card: $card_id"
        echo "  Test task file created in Big Book"
        
        return 0
    else
        local error=$(echo "$response" | jq -r '.error // "Unknown error"' 2>/dev/null)
        print_error "Test sync failed: $error"
        return 1
    fi
}

# Function to show sync logs
show_logs() {
    local limit="${1:-20}"
    
    print_status "Showing last $limit sync log entries..."
    
    local response=$(api_call "GET" "/logs?limit=$limit")
    local success=$(echo "$response" | jq -r '.success // false' 2>/dev/null)
    
    if [[ "$success" == "true" ]]; then
        local logs=$(echo "$response" | jq -r '.logs' 2>/dev/null)
        local log_count=$(echo "$response" | jq -r '.count // 0' 2>/dev/null)
        
        if [[ "$log_count" -eq 0 ]]; then
            print_warning "No sync logs found"
        else
            echo ""
            echo "📄 Recent Sync Logs ($log_count entries):"
            echo ""
            
            echo "$logs" | jq -r '.[] | "[\(.timestamp // "unknown")] [\(.level)] \(.message)"' 2>/dev/null | head -n "$limit"
        fi
        
        return 0
    else
        local error=$(echo "$response" | jq -r '.error // "Unknown error"' 2>/dev/null)
        print_error "Failed to get logs: $error"
        return 1
    fi
}

# Function to export sync data
export_data() {
    local output_file="${1:-bigbook-kanban-export-$(date +%Y%m%d-%H%M%S).json}"
    
    print_status "Exporting sync data to: $output_file"
    
    local response=$(api_call "GET" "/export")
    local success=$(echo "$response" | jq -r '.success // false' 2>/dev/null)
    
    if [[ "$success" == "true" ]]; then
        echo "$response" | jq '.data' > "$output_file"
        print_success "Sync data exported successfully"
        echo "  File: $output_file"
        echo "  Size: $(du -h "$output_file" | cut -f1)"
        
        return 0
    else
        local error=$(echo "$response" | jq -r '.error // "Unknown error"' 2>/dev/null)
        print_error "Failed to export data: $error"
        return 1
    fi
}

# Function to show usage
show_usage() {
    echo "BigBook ⇄ Kanban Task Sync Script"
    echo ""
    echo "Usage: $0 [command] [options]"
    echo ""
    echo "Commands:"
    echo "  full          Perform full bidirectional sync (default)"
    echo "  status        Show sync status and statistics"
    echo "  conflicts     Check for sync conflicts"
    echo "  test          Test sync functionality with sample data"
    echo "  logs [limit]  Show recent sync logs (default: 20)"
    echo "  export [file] Export all sync data to JSON file"
    echo "  help          Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                    # Full sync"
    echo "  $0 status             # Show status"
    echo "  $0 logs 50            # Show last 50 log entries"
    echo "  $0 export backup.json # Export to specific file"
    echo ""
    echo "Environment Variables:"
    echo "  API_BASE - Override API base URL (default: http://localhost:3000/api/admin/kanban-sync)"
    echo ""
    echo "Files:"
    echo "  Config: $PROD_ROOT/config/kanban-sync.json"
    echo "  Logs: $LOG_FILE"
    echo ""
}

# Function to check dependencies
check_dependencies() {
    local missing_deps=()
    
    # Check for required tools
    if ! command -v jq &> /dev/null; then
        missing_deps+=("jq")
    fi
    
    if ! command -v curl &> /dev/null; then
        missing_deps+=("curl")
    fi
    
    if [[ ${#missing_deps[@]} -gt 0 ]]; then
        print_error "Missing required dependencies: ${missing_deps[*]}"
        echo "Please install missing dependencies:"
        echo "  Ubuntu/Debian: sudo apt-get install ${missing_deps[*]}"
        echo "  CentOS/RHEL: sudo yum install ${missing_deps[*]}"
        return 1
    fi
    
    return 0
}

# Function to validate environment
validate_environment() {
    print_status "Validating environment..."
    
    # Check if we're in the right directory
    if [[ ! -f "package.json" ]]; then
        print_error "package.json not found. Are you in the correct directory?"
        return 1
    fi
    
    # Check if log directory exists
    local log_dir=$(dirname "$LOG_FILE")
    if [[ ! -d "$log_dir" ]]; then
        print_status "Creating log directory: $log_dir"
        mkdir -p "$log_dir" 2>/dev/null || {
            print_error "Could not create log directory: $log_dir"
            return 1
        }
    fi
    
    print_success "Environment validation passed"
    return 0
}

# Main execution
main() {
    echo ""
    
    # Check dependencies first
    if ! check_dependencies; then
        exit 1
    fi
    
    # Validate environment
    if ! validate_environment; then
        exit 1
    fi
    
    # Check if server is running (except for help command)
    if [[ "$SYNC_MODE" != "help" ]]; then
        if ! check_server; then
            exit 1
        fi
    fi
    
    # Execute based on mode
    case "$SYNC_MODE" in
        "full")
            get_sync_status
            echo ""
            perform_full_sync
            echo ""
            get_task_statistics
            echo ""
            check_conflicts
            ;;
        "status")
            get_sync_status
            echo ""
            get_task_statistics
            ;;
        "conflicts")
            check_conflicts
            ;;
        "test")
            test_sync
            ;;
        "logs")
            show_logs "${2:-20}"
            ;;
        "export")
            export_data "$2"
            ;;
        "help"|"--help"|"-h")
            show_usage
            ;;
        *)
            print_error "Unknown command: $SYNC_MODE"
            echo ""
            show_usage
            exit 1
            ;;
    esac
}

# Trap signals for cleanup
trap 'print_warning "Sync interrupted by user"; exit 130' INT TERM

# Run main function
main "$@"

exit_code=$?

echo ""
if [[ $exit_code -eq 0 ]]; then
    print_success "Sync script completed successfully"
else
    print_error "Sync script completed with errors (exit code: $exit_code)"
fi

echo "Timestamp: $(date)"
echo "Log file: $LOG_FILE"
echo ""

exit $exit_code 