#!/bin/bash
# review-conversations.sh — Extract and review conversation logs by date range using claude CLI
#
# Usage:
#   ./scripts/review-conversations.sh                          # Review current month (default)
#   ./scripts/review-conversations.sh 2026-02-01 2026-02-16   # Review specific date range
#   ./scripts/review-conversations.sh 2026-02-01 2026-02-16 --summary-only  # Just extract, no claude
#
# Output: Generates a consolidated summary file, then optionally pipes to claude for AI review.

set -uo pipefail

PROD_DIR="/var/www/orthodoxmetrics/prod"
CONV_DIRS=("$PROD_DIR/c0" "$PROD_DIR/c1" "$PROD_DIR/c2" "$PROD_DIR/c3" "$PROD_DIR/ws")
OUTPUT_DIR="$PROD_DIR/reports"
CLAUDE_BIN="/home/next/.local/bin/claude"

# Parse arguments
START_DATE="${1:-$(date +%Y-%m-01)}"
END_DATE="${2:-$(date +%Y-%m-%d)}"
SUMMARY_ONLY="${3:-}"

# Validate dates
if ! date -d "$START_DATE" &>/dev/null; then
  echo "Error: Invalid start date '$START_DATE'" >&2; exit 1
fi
if ! date -d "$END_DATE" &>/dev/null; then
  echo "Error: Invalid end date '$END_DATE'" >&2; exit 1
fi

echo "=== Conversation Review: $START_DATE to $END_DATE ==="
echo ""

# Find all .md files, filter by date extracted from filename (claude-conversation-YYYY-MM-DD-*)
TMPFILE=$(mktemp)
for dir in "${CONV_DIRS[@]}"; do
  [ -d "$dir" ] || continue
  find "$dir" -maxdepth 3 -name "*.md" 2>/dev/null >> "$TMPFILE"
done

# Filter: extract YYYY-MM-DD from filename, keep if within range
MATCHED_FILES=()
while IFS= read -r file; do
  [ -z "$file" ] && continue
  fname=$(basename "$file")
  # Extract date from filename (claude-conversation-YYYY-MM-DD-*)
  fdate=$(echo "$fname" | grep -oE '[0-9]{4}-[0-9]{2}-[0-9]{2}' | head -1)
  [ -z "$fdate" ] && continue
  # Compare dates as strings (YYYY-MM-DD sorts lexicographically)
  if [ "$fdate" \> "$START_DATE" ] || [ "$fdate" = "$START_DATE" ]; then
    if [ "$fdate" \< "$END_DATE" ] || [ "$fdate" = "$END_DATE" ]; then
      MATCHED_FILES+=("$file")
    fi
  fi
done < "$TMPFILE"
rm -f "$TMPFILE"

# Sort matched files by date in filename
IFS=$'\n' MATCHED_FILES=($(printf '%s\n' "${MATCHED_FILES[@]}" | sort)); unset IFS

FILE_COUNT=${#MATCHED_FILES[@]}
echo "Found $FILE_COUNT conversation file(s)"

if [ "$FILE_COUNT" -eq 0 ]; then
  echo "No conversations found in date range."
  exit 0
fi

# Create output directory
mkdir -p "$OUTPUT_DIR"
REPORT_FILE="$OUTPUT_DIR/conversation-review-${START_DATE}-to-${END_DATE}.md"

# Extract summaries from each conversation
echo "Extracting summaries..."
echo ""

{
  echo "# Conversation Review Report"
  echo "## Date Range: $START_DATE to $END_DATE"
  echo "## Generated: $(date '+%Y-%m-%d %H:%M:%S')"
  echo "## Total Conversations: $FILE_COUNT"
  echo ""
  echo "---"
  echo ""

  idx=0
  for file in "${MATCHED_FILES[@]}"; do
    idx=$((idx + 1))
    basename_f=$(basename "$file")
    # Determine source dir — handle nested paths like c3/.claude/projects/...
    rel="${file#$PROD_DIR/}"
    source_dir="${rel%%/*}"

    # Extract date from file content
    file_date=$(grep -m1 '^Date:' "$file" 2>/dev/null | sed 's/^Date:\s*//' || echo "unknown")

    # Get file size
    file_size=$(stat --printf='%s' "$file" 2>/dev/null || echo 0)
    file_size_h=$(numfmt --to=iec "$file_size" 2>/dev/null || echo "${file_size}B")

    # Detect format
    if grep -q '## 👤 User' "$file" 2>/dev/null; then
      format="standard"
    elif grep -q '### User Input' "$file" 2>/dev/null; then
      format="cascade"
    else
      format="unknown"
    fi

    # Extract first user message (the objective/request) — trimmed to 400 chars
    if [ "$format" = "standard" ]; then
      first_msg=$(sed -n '/^## 👤 User/{n;:a;/^---/q;/^## 🤖/q;p;n;ba}' "$file" 2>/dev/null | head -8 | tr '\n' ' ' | sed 's/  */ /g' | cut -c1-400)
    elif [ "$format" = "cascade" ]; then
      first_msg=$(sed -n '/^### User Input/{n;:a;/^### /q;p;n;ba}' "$file" 2>/dev/null | head -8 | tr '\n' ' ' | sed 's/  */ /g' | cut -c1-400)
    else
      first_msg=""
    fi

    # Count messages
    if [ "$format" = "standard" ]; then
      user_msgs=$(grep -c '^## 👤 User' "$file" 2>/dev/null || echo 0)
      asst_msgs=$(grep -c '^## 🤖 Claude' "$file" 2>/dev/null || echo 0)
    elif [ "$format" = "cascade" ]; then
      user_msgs=$(grep -c '^### User Input' "$file" 2>/dev/null || echo 0)
      asst_msgs=$(grep -c '^### Planner Response' "$file" 2>/dev/null || echo 0)
    else
      user_msgs="?"
      asst_msgs="?"
    fi

    # Extract unique source file paths edited (look for common edit patterns)
    files_touched=$(grep -oE '`/?[a-zA-Z0-9_./-]+\.(tsx?|jsx?|css|json|sql|py|sh|js)`' "$file" 2>/dev/null \
      | sed 's/`//g' | sort -u | head -15 | tr '\n' ', ' | sed 's/,$//')

    # Extract key actions from assistant messages (created, fixed, added, implemented, updated)
    key_actions=$(grep -oiE '(created?|fixed|added|implemented|updated|refactored|deployed|configured|resolved|built|installed|migrated|removed|deleted) [^.]{10,80}' "$file" 2>/dev/null \
      | sort -u | head -8 | sed 's/^/  - /')

    # Classify conversation type
    bugfix_hits=$(grep -ciE '\b(fix(ed|ing)?|bug|crash|broken|error|regression|issue)\b' "$file" 2>/dev/null | tail -1 || echo 0)
    bugfix_hits=${bugfix_hits//[^0-9]/}; bugfix_hits=${bugfix_hits:-0}
    feature_hits=$(grep -ciE '\b(implement(ed)?|feature|new .{3,20}(page|component|endpoint|tab|dialog)|build|creat(ed|ing))\b' "$file" 2>/dev/null | tail -1 || echo 0)
    feature_hits=${feature_hits//[^0-9]/}; feature_hits=${feature_hits:-0}
    if [ "$bugfix_hits" -gt 10 ] && [ "$bugfix_hits" -gt "$feature_hits" ]; then
      conv_type="🐛 Bug Fix"
    elif [ "$feature_hits" -gt 10 ]; then
      conv_type="✨ Feature"
    else
      conv_type="🔧 General"
    fi

    echo "### $idx. $basename_f"
    echo "- **Type**: $conv_type | **Source**: $source_dir | **Date**: $file_date | **Size**: $file_size_h"
    echo "- **Messages**: $user_msgs user, $asst_msgs assistant"
    if [ -n "$first_msg" ]; then
      echo "- **Objective**: $first_msg"
    fi
    if [ -n "$files_touched" ]; then
      echo "- **Files**: $files_touched"
    fi
    if [ -n "$key_actions" ]; then
      echo "- **Key actions**:"
      echo "$key_actions"
    fi
    echo ""
  done

} > "$REPORT_FILE"

echo "Report saved to: $REPORT_FILE"
echo "  Size: $(du -h "$REPORT_FILE" | cut -f1)"
echo ""

# If summary-only, stop here
if [ "$SUMMARY_ONLY" = "--summary-only" ]; then
  echo "Summary-only mode — skipping claude review."
  exit 0
fi

# Check if claude is available
if [ ! -x "$CLAUDE_BIN" ]; then
  echo "Warning: claude CLI not found at $CLAUDE_BIN"
  echo "Report file is ready for manual review: $REPORT_FILE"
  exit 0
fi

REVIEW_OUTPUT="$OUTPUT_DIR/claude-review-${START_DATE}-to-${END_DATE}.md"

echo "Sending to claude for AI review..."
echo ""

cat "$REPORT_FILE" | "$CLAUDE_BIN" -p \
  --model sonnet \
  "You are reviewing a development conversation log report for the OrthodoxMetrics web application.

Analyze the conversation summaries and produce a structured review with these sections:

## Executive Summary
Brief overview of what was accomplished in this period.

## Features & Enhancements
List all features built or enhanced, grouped by area (frontend, backend, DevOps, etc).

## Bug Fixes & Issues Resolved
List bugs fixed and issues resolved.

## Architectural Decisions
Notable technical decisions made.

## Files Most Frequently Modified
Which files/areas saw the most activity.

## Patterns & Observations
- Recurring themes or problem areas
- Areas that needed repeated fixes (potential tech debt)
- Workflow efficiency observations

## Recommendations
- Suggested follow-ups or improvements
- Areas that may need attention

## Statistics
- Total conversations reviewed
- Estimated features vs bug fixes ratio
- Most active development areas

Be concise but thorough. Focus on actionable insights." > "$REVIEW_OUTPUT" 2>&1

echo "Claude review saved to: $REVIEW_OUTPUT"
echo ""
echo "=== Done ==="
