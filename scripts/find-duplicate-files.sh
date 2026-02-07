#!/bin/bash
# find-duplicate-files.sh
# Finds all duplicate filenames under front-end/src and reports
# the full path, line count, and last-modified datestamp for each.

OUTPUT_FILE="refactor-src-duplicate-files-reference.txt"
TARGET_DIR="refactor-src/"

echo "=== Duplicate Filenames in $TARGET_DIR ===" > "$OUTPUT_FILE"
echo "Generated on: $(date '+%Y-%m-%d %H:%M:%S')" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

# 1. Collect all files, extract just the filename, find duplicates
find "$TARGET_DIR" -type f -print0 \
  | xargs -0 -I{} basename {} \
  | sort \
  | uniq -d \
  > /tmp/dup_names.txt

# 2. For each duplicate name, list every occurrence with line count & datestamp
while IFS= read -r name; do
  echo "──────────────────────────────────────────" >> "$OUTPUT_FILE"
  echo "Filename: $name" >> "$OUTPUT_FILE"
  echo "──────────────────────────────────────────" >> "$OUTPUT_FILE"

  find "$TARGET_DIR" -type f -name "$name" -print0 | while IFS= read -r -d '' filepath; do
    lines=$(wc -l < "$filepath")
    datestamp=$(stat -f '%Sm' -t '%Y-%m-%d %H:%M:%S' "$filepath" 2>/dev/null \
                || stat --format='%y' "$filepath" 2>/dev/null | cut -d'.' -f1)
    printf "  %-60s  Lines: %5d  Modified: %s\n" "$filepath" "$lines" "$datestamp" >> "$OUTPUT_FILE"
  done

  echo "" >> "$OUTPUT_FILE"
done < /tmp/dup_names.txt

rm -f /tmp/dup_names.txt

echo "Done. Results written to $OUTPUT_FILE"
