#!/bin/bash
#
# Fix line endings for all scripts in a directory
# Converts Windows CRLF to Unix LF
#
# Usage:
#   ./fix-line-endings.sh [directory]
#   ./fix-line-endings.sh  (fixes current directory)
#

set -euo pipefail

TARGET_DIR="${1:-.}"

if [ ! -d "$TARGET_DIR" ]; then
    echo "Error: Directory does not exist: $TARGET_DIR"
    exit 1
fi

echo "Fixing line endings in: $TARGET_DIR"

# Directories to exclude (generated/binary directories that shouldn't be touched)
EXCLUDE_DIRS=(
    "dist"
    "node_modules"
    "images"
    "build"
    ".git"
    ".next"
    ".nuxt"
    ".cache"
    "coverage"
    ".nyc_output"
    "vendor"
    "bower_components"
    ".venv"
    "venv"
    "env"
    ".env"
    "__pycache__"
    ".pytest_cache"
    ".mypy_cache"
    "target"
    ".idea"
    ".vscode"
    ".vs"
    "bin"
    "obj"
    ".gradle"
    "out"
    "tmp"
    "temp"
    ".tmp"
    ".temp"
)

# Build find exclude arguments
FIND_EXCLUDE=()
for exclude_dir in "${EXCLUDE_DIRS[@]}"; do
    FIND_EXCLUDE+=(-not -path "*/$exclude_dir/*")
done

# Find all script files (excluding generated/binary directories)
FIXED=0
while IFS= read -r -d '' file; do
    # Check if file has CRLF
    if file "$file" | grep -q "CRLF\|CR line"; then
        echo "Fixing: $file"
        # Convert CRLF to LF
        sed -i 's/\r$//' "$file"
        FIXED=$((FIXED + 1))
    fi
done < <(find "$TARGET_DIR" -type f \( -name "*.sh" -o -name "*.bash" -o -name "*.py" -o -name "*.js" \) "${FIND_EXCLUDE[@]}" -print0 2>/dev/null || true)

echo "Fixed $FIXED files"
echo ""
echo "Note: Excluded directories: ${EXCLUDE_DIRS[*]}"
