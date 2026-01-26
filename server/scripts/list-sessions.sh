#!/bin/bash

# Session Management Script
# Lists all sessions from the orthodoxmetrics_db.sessions table

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Load environment variables
if [ -f .env.production ]; then
    source .env.production
elif [ -f .env.development ]; then
    source .env.development
elif [ -f .env ]; then
    source .env
fi

# Database connection variables
DB_HOST="${DB_HOST:-localhost}"
DB_USER="${DB_USER:-root}"
DB_PASS="${DB_PASSWORD:-${DB_PASS:-Summerof2025@!}}"
DB_NAME="${DB_NAME:-orthodoxmetrics_db}"

# Function to print header
print_header() {
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}"
}

# Function to list all sessions
list_all_sessions() {
    print_header "Express-Session Sessions"
    
    local session_result=$(mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" -e "
        SELECT 
            session_id as 'Session ID',
            FROM_UNIXTIME(expires) as 'Expires',
            CASE 
                WHEN FROM_UNIXTIME(expires) > NOW() THEN 'Active'
                ELSE 'Expired'
            END as 'Status',
            TIMESTAMPDIFF(MINUTE, NOW(), FROM_UNIXTIME(expires)) as 'Minutes Until Expiry',
            CHAR_LENGTH(data) as 'Data Size (bytes)'
        FROM sessions
        ORDER BY expires DESC
        LIMIT 50;
    " 2>/dev/null)
    
    if [ $? -ne 0 ]; then
        echo -e "${RED}Error: Failed to connect to database${NC}"
        exit 1
    fi
    
    if [ -z "$session_result" ] || [ "$(echo "$session_result" | wc -l)" -le 1 ]; then
        echo -e "${YELLOW}No express-session sessions found.${NC}"
    else
        echo "$session_result"
    fi
    
    echo ""
    print_header "JWT Refresh Token Sessions (Active Users)"
    
    local jwt_result=$(mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" -e "
        SELECT 
            rt.user_id as 'User ID',
            u.email as 'Email',
            CONCAT(u.first_name, ' ', u.last_name) as 'Name',
            u.role as 'Role',
            rt.expires_at as 'Expires At',
            TIMESTAMPDIFF(MINUTE, NOW(), rt.expires_at) as 'Minutes Until Expiry',
            rt.ip_address as 'IP Address',
            rt.user_agent as 'User Agent'
        FROM refresh_tokens rt
        JOIN users u ON rt.user_id = u.id
        WHERE rt.expires_at > NOW()
        ORDER BY rt.expires_at DESC
        LIMIT 50;
    " 2>/dev/null)
    
    if [ $? -ne 0 ]; then
        echo -e "${RED}Error: Failed to query refresh tokens${NC}"
        exit 1
    fi
    
    if [ -z "$jwt_result" ] || [ "$(echo "$jwt_result" | wc -l)" -le 1 ]; then
        echo -e "${YELLOW}No active JWT sessions found.${NC}"
    else
        echo "$jwt_result"
    fi
}

# Function to list active sessions only
list_active_sessions() {
    print_header "Active Express-Session Sessions"
    
    local session_result=$(mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" -e "
        SELECT 
            s.session_id as 'Session ID',
            FROM_UNIXTIME(s.expires) as 'Expires',
            TIMESTAMPDIFF(MINUTE, NOW(), FROM_UNIXTIME(s.expires)) as 'Minutes Until Expiry',
            CHAR_LENGTH(s.data) as 'Data Size (bytes)',
            JSON_EXTRACT(s.data, '$.user.email') as 'User Email',
            JSON_EXTRACT(s.data, '$.user.role') as 'User Role',
            JSON_EXTRACT(s.data, '$.user.id') as 'User ID'
        FROM sessions s
        WHERE FROM_UNIXTIME(s.expires) > NOW()
        ORDER BY s.expires DESC;
    " 2>/dev/null)
    
    if [ $? -ne 0 ]; then
        echo -e "${RED}Error: Failed to connect to database${NC}"
        exit 1
    fi
    
    if [ -z "$session_result" ] || [ "$(echo "$session_result" | wc -l)" -le 1 ]; then
        echo -e "${YELLOW}No active express-session sessions found.${NC}"
    else
        echo "$session_result"
    fi
    
    echo ""
    print_header "Active JWT Refresh Token Sessions"
    
    local jwt_result=$(mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" -e "
        SELECT 
            rt.user_id as 'User ID',
            u.email as 'Email',
            CONCAT(u.first_name, ' ', u.last_name) as 'Name',
            u.role as 'Role',
            rt.expires_at as 'Expires At',
            TIMESTAMPDIFF(MINUTE, NOW(), rt.expires_at) as 'Minutes Until Expiry',
            rt.ip_address as 'IP Address'
        FROM refresh_tokens rt
        JOIN users u ON rt.user_id = u.id
        WHERE rt.expires_at > NOW()
        ORDER BY rt.expires_at DESC;
    " 2>/dev/null)
    
    if [ $? -ne 0 ]; then
        echo -e "${RED}Error: Failed to query refresh tokens${NC}"
        exit 1
    fi
    
    if [ -z "$jwt_result" ] || [ "$(echo "$jwt_result" | wc -l)" -le 1 ]; then
        echo -e "${YELLOW}No active JWT sessions found.${NC}"
    else
        echo "$jwt_result"
    fi
}

# Function to show session statistics
show_stats() {
    print_header "Session Statistics"
    
    mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" -e "
        SELECT 
            COUNT(*) as 'Total Sessions',
            SUM(CASE WHEN FROM_UNIXTIME(expires) > NOW() THEN 1 ELSE 0 END) as 'Active Sessions',
            SUM(CASE WHEN FROM_UNIXTIME(expires) <= NOW() THEN 1 ELSE 0 END) as 'Expired Sessions',
            AVG(CHAR_LENGTH(data)) as 'Avg Session Size (bytes)',
            MIN(FROM_UNIXTIME(expires)) as 'Oldest Session',
            MAX(FROM_UNIXTIME(expires)) as 'Newest Session'
        FROM sessions;
    " 2>/dev/null
    
    if [ $? -ne 0 ]; then
        echo -e "${RED}Error: Failed to connect to database${NC}"
        exit 1
    fi
}

# Function to show detailed session info
show_session_detail() {
    local SESSION_ID=$1
    
    if [ -z "$SESSION_ID" ]; then
        echo -e "${RED}Error: Session ID required${NC}"
        echo "Usage: $0 detail <session_id>"
        exit 1
    fi
    
    print_header "Session Detail: $SESSION_ID"
    
    mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" -e "
        SELECT 
            session_id as 'Session ID',
            FROM_UNIXTIME(expires) as 'Expires',
            CASE 
                WHEN FROM_UNIXTIME(expires) > NOW() THEN 'Active'
                ELSE 'Expired'
            END as 'Status',
            TIMESTAMPDIFF(MINUTE, NOW(), FROM_UNIXTIME(expires)) as 'Minutes Until Expiry',
            CHAR_LENGTH(data) as 'Data Size (bytes)',
            data as 'Session Data (JSON)'
        FROM sessions
        WHERE session_id = '$SESSION_ID';
    " 2>/dev/null
    
    if [ $? -ne 0 ]; then
        echo -e "${RED}Error: Failed to connect to database${NC}"
        exit 1
    fi
}

# Function to show sessions by user
show_user_sessions() {
    local USER_EMAIL=$1
    
    if [ -z "$USER_EMAIL" ]; then
        echo -e "${RED}Error: User email required${NC}"
        echo "Usage: $0 user <email>"
        exit 1
    fi
    
    print_header "Sessions for User: $USER_EMAIL"
    
    mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" -e "
        SELECT 
            s.session_id as 'Session ID',
            FROM_UNIXTIME(s.expires) as 'Expires',
            CASE 
                WHEN FROM_UNIXTIME(s.expires) > NOW() THEN 'Active'
                ELSE 'Expired'
            END as 'Status',
            TIMESTAMPDIFF(MINUTE, NOW(), FROM_UNIXTIME(s.expires)) as 'Minutes Until Expiry',
            JSON_EXTRACT(s.data, '$.user.role') as 'Role',
            JSON_EXTRACT(s.data, '$.user.id') as 'User ID'
        FROM sessions s
        WHERE JSON_EXTRACT(s.data, '$.user.email') = '$USER_EMAIL'
        ORDER BY s.expires DESC;
    " 2>/dev/null
    
    if [ $? -ne 0 ]; then
        echo -e "${RED}Error: Failed to connect to database${NC}"
        exit 1
    fi
}

# Function to delete expired sessions
cleanup_expired() {
    print_header "Cleaning Up Expired Sessions"
    
    local COUNT=$(mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" -sN -e "
        SELECT COUNT(*) FROM sessions WHERE FROM_UNIXTIME(expires) <= NOW();
    " 2>/dev/null)
    
    if [ -z "$COUNT" ] || [ "$COUNT" = "0" ]; then
        echo -e "${GREEN}No expired sessions to clean up${NC}"
        return
    fi
    
    echo -e "${YELLOW}Found $COUNT expired session(s)${NC}"
    read -p "Delete expired sessions? (y/N): " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" -e "
            DELETE FROM sessions WHERE FROM_UNIXTIME(expires) <= NOW();
        " 2>/dev/null
        
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}Successfully deleted $COUNT expired session(s)${NC}"
        else
            echo -e "${RED}Error: Failed to delete expired sessions${NC}"
            exit 1
        fi
    else
        echo -e "${YELLOW}Cancelled${NC}"
    fi
}

# Function to show help
show_help() {
    echo "Session Management Script"
    echo ""
    echo "Usage: $0 [command] [options]"
    echo ""
    echo "Commands:"
    echo "  all              List all sessions (default)"
    echo "  active           List only active sessions"
    echo "  stats            Show session statistics"
    echo "  detail <id>      Show detailed information for a specific session"
    echo "  user <email>     Show all sessions for a specific user"
    echo "  cleanup          Delete expired sessions (with confirmation)"
    echo "  help             Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                    # List all sessions"
    echo "  $0 active              # List active sessions"
    echo "  $0 stats               # Show statistics"
    echo "  $0 detail abc123      # Show session detail"
    echo "  $0 user admin@example.com  # Show user sessions"
    echo "  $0 cleanup             # Clean up expired sessions"
}

# Main script logic
COMMAND=${1:-all}

case "$COMMAND" in
    all)
        list_all_sessions
        ;;
    active)
        list_active_sessions
        ;;
    stats)
        show_stats
        ;;
    detail)
        show_session_detail "$2"
        ;;
    user)
        show_user_sessions "$2"
        ;;
    cleanup)
        cleanup_expired
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        echo -e "${RED}Unknown command: $COMMAND${NC}"
        echo ""
        show_help
        exit 1
        ;;
esac

