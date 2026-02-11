#!/bin/bash

# --- 1. Paths & Config ---
PROD_DIR="/var/www/orthodoxmetrics/prod"
BACKEND_DIR="$PROD_DIR/server"
LIBRARIAN_SCRIPT="./server/src/agents/omLibrarian.js"
LOG_DIR="$BACKEND_DIR/logs"

mkdir -p "$LOG_DIR"

# --- 2. Flag Handling ---
if [[ "$1" == "--fresh" ]]; then
    echo "🧹 --fresh flag detected. Clearing old logs..."
    rm -f "$LOG_DIR"/*.log
fi

# --- 3. Cleanup ---
echo "🛑 Killing PM2 and clearing Port 3001..."
pm2 kill > /dev/null 2>&1
lsof -ti:3001 | xargs kill -9 2>/dev/null
sleep 1

# --- 4. Environment Injection ---
if [ -f "$BACKEND_DIR/.env" ]; then
    echo "📄 Loading environment variables..."
    export $(grep -v '^#' "$BACKEND_DIR/.env" | xargs)
fi
export NODE_ENV=production

# --- 5. Launch OM-Librarian (Background) ---
echo "🤖 Starting OM-Librarian in background..."
cd "$PROD_DIR"
node "$LIBRARIAN_SCRIPT" 2>&1 | \
awk '{ print "[LIBRARIAN] " strftime("[%H:%M:%S]"), $0; fflush() }' >> "$LOG_DIR/om-librarian-debug.log" &
LIBRARIAN_PID=$!

# Ensure Librarian dies when you Ctrl+C the script
trap "kill $LIBRARIAN_PID; echo 'Stopping Librarian...'; exit" SIGINT SIGTERM

# --- 6. Launch Backend (Foreground) ---
echo "🚀 Starting Backend (TS-Mode)..."
echo "-----------------------------------------------------"
cd "$BACKEND_DIR"

npx ts-node -r source-map-support/register --transpile-only src/index.ts 2>&1 | \
awk '{ print "[BACKEND]   " strftime("[%H:%M:%S]"), $0; fflush() }' | \
tee -a "$LOG_DIR/debug.log"
