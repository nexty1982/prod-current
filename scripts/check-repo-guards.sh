#!/usr/bin/env bash
set -Eeuo pipefail
cd "$(git rev-parse --show-toplevel)"

FIX_MODE=false
if [[ "${1:-}" == "--fix" ]]; then
  FIX_MODE=true
fi

# Check for invalid prod/ paths
if git ls-files | grep -q '^prod/'; then
  echo "ERROR: Tracked paths under 'prod/' detected. Repo layout is invalid."
  git ls-files | grep '^prod/' | head -n 200
  exit 1
fi

# Find docs outside of /docs
bad_docs="$(git ls-files | grep -E '(^|/)docs/' | grep -vE '^docs/' || true)"
allowed='^(front-end/docs/README\.md|front-end/public/docs/README\.md|server/docs/README\.md)$'
bad_docs="$(echo "${bad_docs}" | grep -Ev "${allowed}" || true)"

if [ -n "${bad_docs}" ]; then
  if [ "$FIX_MODE" = true ]; then
    echo "AUTO-FIX: Relocating misplaced docs to /docs..."

    echo "${bad_docs}" | while IFS= read -r file; do
      [ -z "$file" ] && continue

      # Extract just the filename or create a sensible subpath
      # e.g., front-end/dist-backup/docs/foo.md -> docs/relocated/front-end/foo.md
      filename="$(basename "$file")"
      parent_context="$(dirname "$file" | sed 's|/docs.*||' | tr '/' '-')"

      # Target path
      target_dir="docs/relocated/${parent_context}"
      target_path="${target_dir}/${filename}"

      # Create target directory
      mkdir -p "$target_dir"

      # If file exists on disk, move it
      if [ -f "$file" ]; then
        mv "$file" "$target_path"
        echo "  Moved: $file -> $target_path"
      fi

      # Remove from git tracking at old location
      git rm --cached -f "$file" 2>/dev/null || true

      # Add at new location if it exists
      if [ -f "$target_path" ]; then
        git add "$target_path"
      fi
    done

    echo "AUTO-FIX complete. Review changes with 'git status' and commit."
  else
    echo "ERROR: Documentation must live under repo-root /docs only."
    echo "Run with --fix to auto-relocate: scripts/check-repo-guards.sh --fix"
    echo ""
    echo "${bad_docs}" | head -n 200
    exit 1
  fi
fi

echo "Repo guard checks passed."
