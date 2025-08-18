#!/bin/bash

BASE_DIR="/var/www/orthodmetrics/dev"
LOG_FILE="$BASE_DIR/cleanup.log"

echo "=== Directory Cleanup Log ===" > "$LOG_FILE"
echo "Starting cleanup at $(date)" >> "$LOG_FILE"
echo "" >> "$LOG_FILE"

# Ensure required directories exist
echo "1. Ensuring required directories exist..." >> "$LOG_FILE"
mkdir -p "$BASE_DIR/misc" 2>/dev/null
echo "✓ misc/ directory ready" >> "$LOG_FILE"

# Directories to move to misc/
DIRS_TO_MOVE=("omai" "tasks" "docs" "debug" "uploads" "public" "sample-questionnaires" "ai")

echo "" >> "$LOG_FILE"
echo "2. Moving directories to misc/..." >> "$LOG_FILE"

for dir in "${DIRS_TO_MOVE[@]}"; do
    if [ -d "$BASE_DIR/$dir" ]; then
        if [ ! -d "$BASE_DIR/misc/$dir" ]; then
            mv "$BASE_DIR/$dir" "$BASE_DIR/misc/" 2>/dev/null
            if [ $? -eq 0 ]; then
                echo "✓ Moved $dir/ to misc/" >> "$LOG_FILE"
            else
                echo "✗ Failed to move $dir/" >> "$LOG_FILE"
            fi
        else
            echo "⚠ Skipped $dir/ - already exists in misc/" >> "$LOG_FILE"
        fi
    else
        echo "- $dir/ not found" >> "$LOG_FILE"
    fi
done

# Files to move to misc/
FILES_TO_MOVE=("build.config.json" "ecosystem.config.dev.js" "cleanup-dev.sh" "VERSION")

echo "" >> "$LOG_FILE"
echo "3. Moving files to misc/..." >> "$LOG_FILE"

for file in "${FILES_TO_MOVE[@]}"; do
    if [ -f "$BASE_DIR/$file" ]; then
        if [ ! -f "$BASE_DIR/misc/$file" ]; then
            mv "$BASE_DIR/$file" "$BASE_DIR/misc/" 2>/dev/null
            if [ $? -eq 0 ]; then
                echo "✓ Moved $file to misc/" >> "$LOG_FILE"
            else
                echo "✗ Failed to move $file" >> "$LOG_FILE"
            fi
        else
            echo "⚠ Skipped $file - already exists in misc/" >> "$LOG_FILE"
        fi
    else
        echo "- $file not found" >> "$LOG_FILE"
    fi
done

echo "" >> "$LOG_FILE"
echo "4. Final directory structure:" >> "$LOG_FILE"
echo "├── front-end/" >> "$LOG_FILE"
echo "├── server/" >> "$LOG_FILE"
echo "└── misc/" >> "$LOG_FILE"
ls -1 "$BASE_DIR/misc/" 2>/dev/null | sed 's/^/    ├── /' >> "$LOG_FILE"

echo "" >> "$LOG_FILE"
echo "Cleanup completed at $(date)" >> "$LOG_FILE"
