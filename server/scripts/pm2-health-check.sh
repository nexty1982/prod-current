#!/bin/bash
###############################################################################
# PM2 Health Check & Alert Script
# Monitors critical PM2 processes and sends alerts when they go offline
###############################################################################

STATE_FILE="/tmp/pm2-health-state.txt"
LOG_FILE="/var/www/orthodoxmetrics/prod/logs/pm2-health-check.log"

# Critical processes to monitor
CRITICAL_PROCESSES=("orthodox-backend" "om-librarian")

# Get current timestamp
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

# Function to log messages
log_message() {
    echo "[$TIMESTAMP] $1" | tee -a "$LOG_FILE"
}

# Check PM2 status
pm2_output=$(pm2 jlist 2>&1)
if [ $? -ne 0 ]; then
    log_message "❌ ERROR: Cannot connect to PM2"
    exit 1
fi

# Load previous state
declare -A previous_state
if [ -f "$STATE_FILE" ]; then
    while IFS='=' read -r key value; do
        previous_state["$key"]="$value"
    done < "$STATE_FILE"
fi

# Current state
declare -A current_state
offline_count=0

# Check each critical process
for process in "${CRITICAL_PROCESSES[@]}"; do
    status=$(echo "$pm2_output" | jq -r ".[] | select(.name==\"$process\") | .pm2_env.status" 2>/dev/null)
    restarts=$(echo "$pm2_output" | jq -r ".[] | select(.name==\"$process\") | .pm2_env.restart_time" 2>/dev/null)
    
    if [ -z "$status" ]; then
        status="not_found"
        restarts=0
    fi
    
    current_state["$process"]="$status"
    current_state["${process}_restarts"]="$restarts"
    
    # Check if process went offline
    prev_status="${previous_state[$process]}"
    if [ "$prev_status" == "online" ] && [ "$status" != "online" ]; then
        log_message "🚨 ALERT: $process went OFFLINE! (was: $prev_status, now: $status)"
        ((offline_count++))
    fi
    
    # Check if process is missing
    if [ "$status" == "not_found" ] && [ ! -z "$prev_status" ]; then
        log_message "🚨 ALERT: $process is MISSING from PM2!"
        ((offline_count++))
    fi
    
    # Check for excessive restarts
    prev_restarts="${previous_state[${process}_restarts]:-0}"
    if [ "$restarts" -gt "$prev_restarts" ] && [ "$restarts" -gt 10 ]; then
        log_message "⚠️  WARNING: $process has restarted $restarts times"
    fi
    
    log_message "✓ $process: $status (restarts: $restarts)"
done

# Save current state
> "$STATE_FILE"
for key in "${!current_state[@]}"; do
    echo "$key=${current_state[$key]}" >> "$STATE_FILE"
done

if [ $offline_count -gt 0 ]; then
    log_message "❌ Health check FAILED: $offline_count process(es) offline"
    exit 1
else
    log_message "✅ Health check PASSED: All processes online"
fi
