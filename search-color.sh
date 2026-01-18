#!/bin/bash

# Script to search for a specific color code in all non-binary files
# Usage: ./search-color.sh /path/to/directory

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

echo "Searching for color code: $COLOR"
echo "Directory: $1"
echo "----------------------------------------"
echo ""

# Use grep to search recursively, excluding binary files
# -r: recursive
# -n: show line numbers
# -H: show filename (always, even for single file)
# -i: case insensitive (in case of variations)
# -I: skip binary files
# --color=always: highlight matches
# -E: extended regex (for better pattern matching)

grep -rnIH --color=always -E "$COLOR|#2C5AA0|#2c5aa0" "$1" 2>/dev/null

# Check exit status
if [ $? -eq 0 ]; then
    echo ""
    echo "----------------------------------------"
    echo "Search completed. Found matches above."
else
    echo ""
    echo "----------------------------------------"
    echo "No matches found for $COLOR"
fi

