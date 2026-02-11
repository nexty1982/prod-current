#!/bin/bash
#
# om-md - Extract source code from a directory into a markdown file
#
# Usage:
#   om-md <directory_path> [output_file]
#
# Examples:
#   om-md /var/www/orthodoxmetrics/prod/front-end/src/devel-tools/refactor-console
#     # Creates: docs/OM-MD/01-26-2026/refactor-console.md
#   om-md /var/www/orthodoxmetrics/prod/front-end/src/components custom-output.md
#     # Creates: custom-output.md (override)
#
# By default, output files are created in docs/OM-MD/MM-DD-YYYY/<directory_name>.md
# The date directory (MM-DD-YYYY) is automatically created based on the current date.

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Function to print usage
usage() {
    echo "Usage: $0 <directory_path> [output_file]"
    echo ""
    echo "Extract source code from a directory into a markdown file."
    echo ""
    echo "Arguments:"
    echo "  directory_path  Path to the directory to extract source code from"
    echo "  output_file     Optional. Override output file path (default: docs/OM-MD/MM-DD-YYYY/<directory_name>.md)"
    echo ""
    echo "Examples:"
    echo "  $0 /var/www/orthodoxmetrics/prod/front-end/src/devel-tools/refactor-console"
    echo "    # Creates: docs/OM-MD/01-26-2026/refactor-console.md"
    echo "  $0 /var/www/orthodoxmetrics/prod/front-end/src/components custom-output.md"
    echo "    # Creates: custom-output.md (override)"
    exit 1
}

# Check if directory path is provided
if [ $# -lt 1 ]; then
    echo -e "${RED}Error: Directory path is required${NC}"
    usage
fi

SOURCE_DIR="$1"
OUTPUT_FILE_OVERRIDE="${2:-}"

# Validate source directory
if [ ! -d "$SOURCE_DIR" ]; then
    echo -e "${RED}Error: Directory does not exist: $SOURCE_DIR${NC}"
    exit 1
fi

# Get absolute path
SOURCE_DIR=$(cd "$SOURCE_DIR" && pwd)

# Extract directory name for default output filename
DIR_NAME=$(basename "$SOURCE_DIR")

# Determine output file location
# Default: Z:\docs\OM-MD\MM-DD-YYYY\filename.md
# On Linux: /var/www/orthodoxmetrics/prod/docs/OM-MD/MM-DD-YYYY/filename.md
if [ -z "$OUTPUT_FILE_OVERRIDE" ]; then
    # Get actual script location (resolve symlinks)
    SCRIPT_SOURCE="${BASH_SOURCE[0]}"
    while [ -L "$SCRIPT_SOURCE" ]; do
        SCRIPT_DIR="$(cd -P "$(dirname "$SCRIPT_SOURCE")" && pwd)"
        SCRIPT_SOURCE="$(readlink "$SCRIPT_SOURCE")"
        [[ $SCRIPT_SOURCE != /* ]] && SCRIPT_SOURCE="$SCRIPT_DIR/$SCRIPT_SOURCE"
    done
    SCRIPT_DIR="$(cd -P "$(dirname "$SCRIPT_SOURCE")" && pwd)"
    
    # Get project root (script is in tools/om-md/, so go up 2 levels)
    # tools/om-md -> tools -> project root
    PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && cd ".." && pwd)"
    
    # Verify we're in the right place (check for docs directory)
    if [ ! -d "$PROJECT_ROOT/docs" ]; then
        # Fallback: try to find project root by looking for docs directory
        CURRENT_DIR="$PROJECT_ROOT"
        while [ "$CURRENT_DIR" != "/" ]; do
            if [ -d "$CURRENT_DIR/docs" ]; then
                PROJECT_ROOT="$CURRENT_DIR"
                break
            fi
            CURRENT_DIR="$(dirname "$CURRENT_DIR")"
        done
    fi
    
    # Final verification
    if [ ! -d "$PROJECT_ROOT/docs" ]; then
        echo -e "${RED}Error: Could not find project root (looking for docs/ directory)${NC}"
        echo -e "${RED}Current PROJECT_ROOT: $PROJECT_ROOT${NC}"
        exit 1
    fi
    
    # Create date directory path (MM-DD-YYYY format)
    DATE_DIR=$(date +%m-%d-%Y)
    OUTPUT_BASE_DIR="$PROJECT_ROOT/docs/OM-MD/$DATE_DIR"
    
    # Create date directory if it doesn't exist
    mkdir -p "$OUTPUT_BASE_DIR"
    
    # Output filename
    OUTPUT_FILE="$OUTPUT_BASE_DIR/${DIR_NAME}.md"
    
    # If output file exists, add timestamp to filename
    if [ -f "$OUTPUT_FILE" ]; then
        TIMESTAMP=$(date +%H%M%S)
        OUTPUT_FILE="$OUTPUT_BASE_DIR/${DIR_NAME}_${TIMESTAMP}.md"
        echo -e "${YELLOW}Warning: Output file exists, using: $OUTPUT_FILE${NC}"
    fi
else
    # Use override if provided
    OUTPUT_FILE="$OUTPUT_FILE_OVERRIDE"
    # Get absolute path for output file (if relative, make it relative to current directory)
    if [[ "$OUTPUT_FILE" != /* ]]; then
        OUTPUT_FILE="$(pwd)/$OUTPUT_FILE"
    fi
    # Create output directory if it doesn't exist
    OUTPUT_DIR=$(dirname "$OUTPUT_FILE")
    mkdir -p "$OUTPUT_DIR"
fi

echo -e "${CYAN}Extracting source code from: $SOURCE_DIR${NC}"
echo -e "${CYAN}Output file: $OUTPUT_FILE${NC}"

# Common source code file extensions
SOURCE_EXTENSIONS=(
    "*.ts" "*.tsx" "*.js" "*.jsx" "*.py" "*.java" "*.cpp" "*.c" "*.h" "*.hpp"
    "*.cs" "*.go" "*.rs" "*.rb" "*.php" "*.swift" "*.kt" "*.scala"
    "*.vue" "*.svelte" "*.jsx" "*.mjs" "*.cjs"
    "*.sql" "*.sh" "*.bash"
    "*.css" "*.scss" "*.sass" "*.less"
    "*.json" "*.yaml" "*.yml" "*.toml" "*.xml"
    "*.html" "*.htm"
    "*.md" "*.txt"
)

# Start markdown file
{
    echo "# Source Code Extraction: $DIR_NAME"
    echo ""
    echo "**Extracted from:** \`$SOURCE_DIR\`"
    echo "**Generated:** $(date -u +"%Y-%m-%d %H:%M:%S UTC")"
    echo ""
    echo "---"
    echo ""

    # Find all source files
    FILES=()
    for ext in "${SOURCE_EXTENSIONS[@]}"; do
        while IFS= read -r -d '' file; do
            FILES+=("$file")
        done < <(find "$SOURCE_DIR" -type f -iname "$ext" -print0 2>/dev/null || true)
    done

    # Sort files for consistent output
    IFS=$'\n' FILES=($(printf '%s\n' "${FILES[@]}" | sort))

    TOTAL_FILES=${#FILES[@]}

    if [ $TOTAL_FILES -eq 0 ]; then
        echo "**No source files found in the specified directory.**"
    else
        echo "**Total files:** $TOTAL_FILES"
        echo ""
        echo "## Table of Contents"
        echo ""
        
        # Generate table of contents
        for file in "${FILES[@]}"; do
            RELATIVE_PATH="${file#$SOURCE_DIR/}"
            # Escape special characters for markdown links
            LINK_TEXT=$(echo "$RELATIVE_PATH" | sed 's/\[/\\[/g; s/\]/\\]/g')
            LINK_ANCHOR=$(echo "$RELATIVE_PATH" | sed 's/[^a-zA-Z0-9]/-/g' | tr '[:upper:]' '[:lower:]')
            echo "- [$LINK_TEXT](#$LINK_ANCHOR)"
        done
        
        echo ""
        echo "---"
        echo ""

        # Process each file
        FILE_NUM=1
        for file in "${FILES[@]}"; do
            RELATIVE_PATH="${file#$SOURCE_DIR/}"
            
            echo "## File: \`$RELATIVE_PATH\`"
            echo ""
            
            # Get file info
            FILE_SIZE=$(stat -f%z "$file" 2>/dev/null || stat -c%s "$file" 2>/dev/null || echo "unknown")
            FILE_LINES=$(wc -l < "$file" 2>/dev/null || echo "0")
            
            echo "**Size:** $FILE_SIZE bytes | **Lines:** $FILE_LINES"
            echo ""
            
            # Determine language for syntax highlighting
            EXTENSION="${file##*.}"
            case "$EXTENSION" in
                ts|tsx) LANG="typescript" ;;
                js|jsx|mjs|cjs) LANG="javascript" ;;
                py) LANG="python" ;;
                java) LANG="java" ;;
                cpp|cxx|cc) LANG="cpp" ;;
                c|h) LANG="c" ;;
                cs) LANG="csharp" ;;
                go) LANG="go" ;;
                rs) LANG="rust" ;;
                rb) LANG="ruby" ;;
                php) LANG="php" ;;
                swift) LANG="swift" ;;
                kt) LANG="kotlin" ;;
                scala) LANG="scala" ;;
                vue) LANG="vue" ;;
                svelte) LANG="svelte" ;;
                sql) LANG="sql" ;;
                sh|bash) LANG="bash" ;;
                css) LANG="css" ;;
                scss|sass) LANG="scss" ;;
                less) LANG="less" ;;
                json) LANG="json" ;;
                yaml|yml) LANG="yaml" ;;
                toml) LANG="toml" ;;
                xml) LANG="xml" ;;
                html|htm) LANG="html" ;;
                md) LANG="markdown" ;;
                txt) LANG="text" ;;
                *) LANG="text" ;;
            esac
            
            echo "\`\`\`$LANG"
            
            # Read and output file content
            # Handle binary files gracefully
            if file "$file" | grep -q "text"; then
                cat "$file"
            else
                echo "# Binary file - content not displayed"
            fi
            
            echo "\`\`\`"
            echo ""
            echo "---"
            echo ""
            
            FILE_NUM=$((FILE_NUM + 1))
        done
        
        echo ""
        echo "---"
        echo ""
        echo "**Extraction complete.**"
        echo ""
        echo "Generated by \`om-md\` on $(date -u +"%Y-%m-%d %H:%M:%S UTC")"
    fi
} > "$OUTPUT_FILE"

echo -e "${GREEN}✓ Successfully extracted $TOTAL_FILES files to: $OUTPUT_FILE${NC}"
