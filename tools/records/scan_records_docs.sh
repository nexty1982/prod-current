#!/bin/bash
#
# Records Discovery Script
# Scans repository for Records-related documentation and code files
#
# Requirements:
# - bash
# - ripgrep (rg) - script will fail if missing
# - find, sed, awk, sort, xargs (standard Unix tools)
#
# Usage:
#   ./tools/records/scan_records_docs.sh
#
# Output:
#   docs/records/discovery/<timestamp>/

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check for ripgrep
if ! command -v rg &> /dev/null; then
    echo -e "${RED}ERROR: ripgrep (rg) is required but not installed.${NC}"
    echo "Install with: sudo apt-get install ripgrep"
    echo "Or: brew install ripgrep"
    exit 1
fi

# Get script directory and repo root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$REPO_ROOT"

# Create timestamp
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
OUTPUT_DIR="docs/records/discovery/$TIMESTAMP"
mkdir -p "$OUTPUT_DIR"

echo -e "${GREEN}=== Records Discovery Script ===${NC}"
echo "Repository root: $REPO_ROOT"
echo "Output directory: $OUTPUT_DIR"
echo ""

# Phase 1: Scan for Records-related .md files
echo -e "${YELLOW}Phase 1: Scanning for Records documentation (.md files)...${NC}"

# Keywords to search for in .md files
KEYWORDS=(
    "records"
    "/apps/records"
    "records-centralized"
    "records.old"
    "baptism"
    "marriage"
    "funeral"
    "death"
    "clergy"
    "ChurchRecords"
    "RecordsPageWrapper"
)

# Find all .md files, excluding node_modules, dist, build, .git
MD_FILES=$(find . -type f -name "*.md" \
    -not -path "*/node_modules/*" \
    -not -path "*/dist/*" \
    -not -path "*/build/*" \
    -not -path "*/.git/*" \
    -not -path "*/\.next/*" \
    -not -path "*/\.cache/*" \
    2>/dev/null | sort)

# Count keyword hits per file using ripgrep (more efficient)
echo "Scanning $(echo "$MD_FILES" | wc -l) markdown files..."

# Use ripgrep to find files containing any keyword, then count hits
TEMP_MATCHES=$(mktemp 2>/dev/null || echo "/tmp/records_scan_$$.tmp")
trap "rm -f $TEMP_MATCHES" EXIT INT TERM

# Build regex pattern from keywords (escape special chars)
KEYWORD_PATTERN=$(IFS='|'; echo "${KEYWORDS[*]}")

# Find all matching files with ripgrep, excluding common dirs
rg -il "$KEYWORD_PATTERN" --type markdown . 2>/dev/null | \
    grep -vE "(node_modules|dist|build|\.git|\.next|\.cache)" | sort > "$TEMP_MATCHES" || true

# Count hits per file
declare -A FILE_HITS
declare -A FILE_KEYWORDS

while IFS= read -r file; do
    if [ -f "$file" ] && [ -r "$file" ]; then
        hit_count=0
        matched_keywords=()
        
        # Use ripgrep to count each keyword
        for keyword in "${KEYWORDS[@]}"; do
            # Count matches - get line count and normalize
            match_result=$(rg -io "$keyword" "$file" 2>/dev/null || true)
            if [ -z "$match_result" ]; then
                count=0
            else
                # Count lines - wc -l returns number with newline
                raw_count=$(echo "$match_result" | wc -l)
                # Strip all whitespace and convert to integer safely
                clean_count=$(echo "$raw_count" | tr -d '[:space:]')
                # Default to 0 if empty, otherwise use arithmetic expansion
                if [ -z "$clean_count" ]; then
                    count=0
                else
                    count=$((clean_count + 0))  # This ensures it's numeric
                fi
            fi
            # Only add if count is valid and > 0
            if [ "${count:-0}" -gt 0 ] 2>/dev/null; then
                hit_count=$((hit_count + count))
                matched_keywords+=("$keyword:$count")
            fi
        done
        
        if [ "${hit_count:-0}" -gt 0 ]; then
            FILE_HITS["$file"]=$hit_count
            FILE_KEYWORDS["$file"]=$(IFS=','; echo "${matched_keywords[*]}")
        fi
    fi
done < "$TEMP_MATCHES"

# Write all matching files
echo "Found ${#FILE_HITS[@]} matching markdown files"
{
    for file in "${!FILE_HITS[@]}"; do
        echo "$file"
    done | sort
} > "$OUTPUT_DIR/records_md_files.txt"

# Write ranked files (sorted by hit count)
{
    for file in "${!FILE_HITS[@]}"; do
        echo "${FILE_HITS[$file]}|$file|${FILE_KEYWORDS[$file]}"
    done | sort -t'|' -k1 -rn | head -100
} > "$OUTPUT_DIR/records_md_ranked.txt"

echo "  ✓ Generated records_md_files.txt"
echo "  ✓ Generated records_md_ranked.txt"
echo ""

# Phase 2: Scan for Records code files
echo -e "${YELLOW}Phase 2: Scanning for Records code files...${NC}"

# Code keywords
CODE_KEYWORDS=(
    "Baptism"
    "Marriage"
    "Funeral"
    "ChurchRecords"
    "/apps/records"
    "record_type"
    "church_id"
    "RecordsPageWrapper"
    "records-centralized"
    "records.old"
    "ag-grid"
    "Advanced Grid"
)

# Search in frontend
echo "  Scanning frontend (front-end/src/**)..."
FRONTEND_DIRS=(
    "front-end/src"
    "frontend/src"
)

# Search in backend
echo "  Scanning backend (server/src/**)..."
BACKEND_DIRS=(
    "server/src"
    "server/routes"
)

# Combined search for code hits
CODE_HITS_FILE="$OUTPUT_DIR/records_code_hits.txt"
COMPONENTS_FILE="$OUTPUT_DIR/records_components.txt"
API_HITS_FILE="$OUTPUT_DIR/records_api_hits.txt"

> "$CODE_HITS_FILE"
> "$COMPONENTS_FILE"
> "$API_HITS_FILE"

# Search for code keywords (more efficient batch approach)
echo "    Searching for code keywords..."

# Build combined pattern
CODE_PATTERN=$(IFS='|'; echo "${CODE_KEYWORDS[*]}")

# Search frontend
for dir in "${FRONTEND_DIRS[@]}"; do
    if [ -d "$dir" ]; then
        rg -i -n -C 2 "$CODE_PATTERN" \
           --type-add 'frontend:*.{tsx,ts,jsx,js}' \
           --type frontend \
           "$dir" 2>/dev/null >> "$CODE_HITS_FILE" || true
    fi
done

# Search backend
for dir in "${BACKEND_DIRS[@]}"; do
    if [ -d "$dir" ]; then
        rg -i -n -C 2 "$CODE_PATTERN" \
           --type-add 'backend:*.{ts,js}' \
           --type backend \
           "$dir" 2>/dev/null >> "$CODE_HITS_FILE" || true
    fi
done

# Sort and deduplicate
sort -u "$CODE_HITS_FILE" -o "$CODE_HITS_FILE"

# Find Records components/pages
echo "  Identifying Records components..."
for dir in "${FRONTEND_DIRS[@]}"; do
    if [ -d "$dir" ]; then
        rg -i -l "(Baptism|Marriage|Funeral).*Page|RecordsPageWrapper|ChurchRecords" \
           "$dir" 2>/dev/null >> "$COMPONENTS_FILE" || true
    fi
done
sort -u "$COMPONENTS_FILE" -o "$COMPONENTS_FILE"

# Find Records API routes/services
echo "  Identifying Records API routes..."
for dir in "${BACKEND_DIRS[@]}"; do
    if [ -d "$dir" ]; then
        rg -i -l "(baptism|marriage|funeral).*record|record.*route|records.*api" \
           "$dir" 2>/dev/null >> "$API_HITS_FILE" || true
    fi
done
sort -u "$API_HITS_FILE" -o "$API_HITS_FILE"

echo "  ✓ Generated records_code_hits.txt ($(wc -l < "$CODE_HITS_FILE" | tr -d ' ') lines)"
echo "  ✓ Generated records_components.txt ($(wc -l < "$COMPONENTS_FILE" | tr -d ' ') files)"
echo "  ✓ Generated records_api_hits.txt ($(wc -l < "$API_HITS_FILE" | tr -d ' ') files)"
echo ""

# Generate summary statistics
SUMMARY_FILE="$OUTPUT_DIR/summary.txt"
{
    echo "Records Discovery Summary"
    echo "Generated: $(date)"
    echo ""
    echo "Documentation Files:"
    echo "  Total matching .md files: ${file_count:-0}"
    echo ""
    echo "Code Files:"
    echo "  Code hits: $(wc -l < "$CODE_HITS_FILE" | tr -d ' ')"
    echo "  Components: $(wc -l < "$COMPONENTS_FILE" | tr -d ' ')"
    echo "  API routes: $(wc -l < "$API_HITS_FILE" | tr -d ' ')"
    echo ""
    echo "Top 10 Ranked Documentation Files:"
    head -10 "$OUTPUT_DIR/records_md_ranked.txt" | while IFS='|' read -r count file keywords; do
        echo "  [$count hits] $file"
    done
} > "$SUMMARY_FILE"

echo -e "${GREEN}=== Discovery Complete ===${NC}"
echo ""
echo "Output directory: $OUTPUT_DIR"
echo ""
echo "Generated files:"
echo "  - records_md_files.txt (all matching .md files)"
echo "  - records_md_ranked.txt (ranked by keyword hits)"
echo "  - records_code_hits.txt (code search results with context)"
echo "  - records_components.txt (Records component files)"
echo "  - records_api_hits.txt (Records API route files)"
echo "  - summary.txt (discovery summary)"
echo ""
