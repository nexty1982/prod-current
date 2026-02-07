#!/bin/bash
# find-duplicate-files-with-router-labels.sh
# Finds all duplicate filenames under front-end/src, reports line count + datestamp,
# and labels files that are referenced inside Router.tsx.

OUTPUT_FILE="duplicate-files-reference.txt"
TARGET_DIR="front-end/src"
ROUTER_FILE="front-end/src/routes/Router.tsx"

# ── 1. Build a list of canonical paths from Router.tsx ──────────────
# Extract every import('...<path>') from lazy() calls and every
# direct import ... from '...<path>' statement, resolve them
# relative to front-end/src/routes/ → front-end/src/, and store.
CANONICAL_LIST=$(mktemp)

# Lazy imports: import('../features/foo/Bar')  →  front-end/src/features/foo/Bar
grep -oP "import\(\s*['\"]\.\./(.*?)['\"]" "$ROUTER_FILE" \
  | sed "s|import(['\"]\\.\\.\/||;s|['\"]||g" \
  | sort -u \
  | while read -r rel; do
      echo "front-end/src/${rel}"
    done >> "$CANONICAL_LIST"

# Direct imports: import Foo from '../components/bar/Baz'
grep -oP "from\s+['\"]\.\./(.*?)['\"]" "$ROUTER_FILE" \
  | sed "s|from ['\"]\\.\\.\/||;s|['\"]||g" \
  | sort -u \
  | while read -r rel; do
      echo "front-end/src/${rel}"
    done >> "$CANONICAL_LIST"

# Also handle @/ alias  →  front-end/src/
grep -oP "from\s+['\"]@/(.*?)['\"]" "$ROUTER_FILE" \
  | sed "s|from ['\"]@/||;s|['\"]||g" \
  | sort -u \
  | while read -r rel; do
      echo "front-end/src/${rel}"
    done >> "$CANONICAL_LIST"

sort -u -o "$CANONICAL_LIST" "$CANONICAL_LIST"

# ── 2. Find duplicate filenames ────────────────────────────────────
DUP_NAMES=$(mktemp)

find "$TARGET_DIR" -type f -print0 \
  | xargs -0 -I{} basename {} \
  | sort \
  | uniq -d \
  > "$DUP_NAMES"

# ── 3. Generate the report ─────────────────────────────────────────
{
  echo "============================================================"
  echo "  DUPLICATE FILENAMES IN $TARGET_DIR"
  echo "  Generated: $(date '+%Y-%m-%d %H:%M:%S')"
  echo "============================================================"
  echo ""

  total_groups=0
  total_files=0
  total_routed=0
  total_not_routed=0

  while IFS= read -r name; do
    total_groups=$((total_groups + 1))
    echo "──────────────────────────────────────────────────────────"
    echo "  Filename: $name"
    echo "──────────────────────────────────────────────────────────"

    find "$TARGET_DIR" -type f -name "$name" -print0 | sort -z | while IFS= read -r -d '' filepath; do
      total_files=$((total_files + 1))
      lines=$(wc -l < "$filepath" 2>/dev/null || echo "0")
      datestamp=$(stat -f '%Sm' -t '%Y-%m-%d %H:%M:%S' "$filepath" 2>/dev/null \
                  || stat --format='%y' "$filepath" 2>/dev/null | cut -d'.' -f1)

      # Check if this file matches any canonical Router path.
      # Strip .tsx/.ts extension from filepath for matching since
      # Router imports omit the extension.
      filepath_no_ext="${filepath%.*}"
      routed="NOT ROUTED"
      while IFS= read -r canon; do
        if [ "$filepath_no_ext" = "$canon" ] || [ "$filepath" = "$canon" ]; then
          routed="✅ ROUTED (in Router.tsx)"
          break
        fi
      done < "$CANONICAL_LIST"

      printf "  %-70s\n" "$filepath"
      printf "      Lines: %5d  |  Modified: %s  |  %s\n\n" "$lines" "$datestamp" "$routed"
    done

  done < "$DUP_NAMES"

  echo ""
  echo "============================================================"
  echo "  SUMMARY"
  echo "============================================================"
  echo "  Duplicate filename groups: $total_groups"
  echo "  Total duplicate files:     (see above)"
  echo "============================================================"

} > "$OUTPUT_FILE"

rm -f "$DUP_NAMES" "$CANONICAL_LIST"

echo "✅ Done. Results written to $OUTPUT_FILE"
