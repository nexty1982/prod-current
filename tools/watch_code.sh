#!/bin/bash

# Define paths
SERVER_DIR="/var/www/orthodoxmetrics/prod/server"
FRONTEND_DIR="/var/www/orthodoxmetrics/prod/front-end"
LOG_FILE="/var/www/orthodoxmetrics/prod/watch"

# Regex for exclusions
# Excludes: node_modules, dist, and any directory starting with dist-
EXCLUDE_REGEX='node_modules|/dist(/|$)|/dist-.*(/|$)'

echo "Watching code base... (Logging to $LOG_FILE)"
echo "Press [CTRL+C] to stop."

# Start inotifywait
# -m: monitor mode (don't exit after one event)
# -r: recursive
# -e: events to watch (modify, create, delete, move)
# --format: how the output is written to the log
inotifywait -m -r \
    --exclude "$EXCLUDE_REGEX" \
    -e modify,create,delete,moved_to,moved_from \
    --timefmt '%Y-%m-%d %H:%M:%S' \
    --format '%T %w%f %e' \
    "$SERVER_DIR" "$FRONTEND_DIR" | tee -a "$LOG_FILE"
