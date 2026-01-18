#!/bin/bash

# Enhanced script to search for a specific color code in all non-binary files
# Usage: ./search-color-verbose.sh /path/to/directory

# Check if directory argument is provided
if [ -z "$1" ]; then
    echo "Usage: $0 <directory_path>"
    echo "Example: $0 /var/www/orthodoxmetrics/prod/front-end/src"
    exit 1
fi

# Check if directory exists
if [ ! -d "$1" ]; then
    echo "Error: Directory '$1' does not exist"
    exit 1
fi

# Color to search for
COLOR="#2c5aa0"

echo "========================================"
echo "Color Code Search Tool"
echo "========================================"
echo "Searching for: $COLOR"
echo "Directory: $1"
echo "Started at: $(date)"
echo "========================================"
echo ""

# Count total files searched
TOTAL_FILES=$(find "$1" -type f ! -name "*.png" ! -name "*.jpg" ! -name "*.jpeg" ! -name "*.gif" ! -name "*.ico" ! -name "*.svg" ! -name "*.woff" ! -name "*.woff2" ! -name "*.ttf" ! -name "*.eot" ! -name "*.otf" ! -name "*.pdf" ! -name "*.zip" ! -name "*.tar" ! -name "*.gz" 2>/dev/null | wc -l)

echo "Scanning $TOTAL_FILES files..."
echo ""

# Use grep to search recursively, excluding binary files
# -r: recursive
# -n: show line numbers
# -H: show filename (always)
# -i: case insensitive
# -I: skip binary files
# --color=always: highlight matches
# --exclude-dir: exclude common directories
# --include: only search specific file types (optional, commented out for broader search)

MATCHES=$(grep -rnIH --color=always \
    --exclude-dir=node_modules \
    --exclude-dir=.git \
    --exclude-dir=dist \
    --exclude-dir=build \
    --exclude-dir=.next \
    --exclude-dir=.cache \
    -E "$COLOR|#2C5AA0|#2c5aa0" \
    "$1" 2>/dev/null)

# Count matches
MATCH_COUNT=$(echo "$MATCHES" | grep -c . || echo "0")

if [ -n "$MATCHES" ] && [ "$MATCH_COUNT" -gt 0 ]; then
    echo "$MATCHES"
    echo ""
    echo "========================================"
    echo "Found $MATCH_COUNT match(es)"
    echo "========================================"
    
    # Show summary by file
    echo ""
    echo "Summary by file:"
    echo "$MATCHES" | cut -d: -f1 | sort | uniq -c | sort -rn
else
    echo "No matches found for $COLOR"
    echo ""
    echo "========================================"
    echo "Search completed with no matches"
    echo "========================================"
fi

echo ""
echo "Completed at: $(date)"

