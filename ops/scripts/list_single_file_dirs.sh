#!/usr/bin/env bash
set -Eeuo pipefail
cd "$(git rev-parse --show-toplevel)"
START_DIR="${1:-.}"
find "$START_DIR" -type d -print0 | while IFS= read -r -d '' dir; do
  file_count=$(find "$dir" -maxdepth 1 -type f | wc -l)
  subdir_count=$(find "$dir" -maxdepth 1 -type d | sed '1d' | wc -l)
  if [ "$file_count" -eq 1 ] && [ "$subdir_count" -eq 0 ]; then
    printf '%s\n' "$dir"
  fi
done
