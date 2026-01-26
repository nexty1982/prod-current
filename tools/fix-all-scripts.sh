#!/bin/bash
#
# Fix line endings for all scripts in the project
# Run this on Linux to fix Windows CRLF line endings
#
# Usage:
#   ./tools/fix-all-scripts.sh
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "Fixing line endings for all scripts in: $PROJECT_ROOT"
echo ""

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

# Directories to check
DIRS=(
    "tools"
    "scripts"
    "server"
)

TOTAL_FIXED=0

for dir in "${DIRS[@]}"; do
    DIR_PATH="$PROJECT_ROOT/$dir"
    if [ -d "$DIR_PATH" ]; then
        echo "Checking: $dir/"
        FIXED=0
        while IFS= read -r -d '' file; do
            # Check if file has CRLF
            if file "$file" | grep -q "CRLF\|CR line"; then
                echo "  Fixing: ${file#$PROJECT_ROOT/}"
                sed -i 's/\r$//' "$file"
                FIXED=$((FIXED + 1))
                TOTAL_FIXED=$((TOTAL_FIXED + 1))
            fi
        done < <(find "$DIR_PATH" -type f \( -name "*.sh" -o -name "*.bash" -o -name "*.py" -o -name "*.js" \) "${FIND_EXCLUDE[@]}" -print0 2>/dev/null || true)
        
        if [ $FIXED -gt 0 ]; then
            echo "  Fixed $FIXED files"
        else
            echo "  No files needed fixing"
        fi
        echo ""
    fi
done

echo "Total files fixed: $TOTAL_FIXED"
echo ""
echo "All scripts should now use Unix LF line endings."
echo ""
echo "Note: Excluded directories: ${EXCLUDE_DIRS[*]}"
