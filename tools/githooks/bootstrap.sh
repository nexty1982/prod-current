#!/usr/bin/env bash
set -Eeuo pipefail
cd "$(git rev-parse --show-toplevel)"

# Bootstrap governance files and install local hooks.
# This script is safe: it only writes deterministic text files and copies hooks into .git/hooks.

write_file() {
  local path="$1"
  local tmp
  tmp="$(mktemp)"
  cat > "$tmp"
  mkdir -p "$(dirname "$path")"
  if [[ -f "$path" ]] && cmp -s "$tmp" "$path"; then
    rm -f "$tmp"
    echo "unchanged: $path"
    return 0
  fi
  mv -f "$tmp" "$path"
  echo "updated:   $path"
}

chmod_x() {
  local path="$1"
  chmod +x "$path"
  echo "chmod +x:  $path"
}

echo "==> Ensuring repo-tracked hooks exist and are executable"
chmod_x "tools/githooks/pre-commit"
chmod_x "tools/githooks/commit-msg"
chmod_x "tools/githooks/install.sh"

echo "==> Installing local hooks into .git/hooks"
bash tools/githooks/install.sh

echo "==> Writing GitHub workflow for PR branch validation"
write_file ".github/workflows/branch-validation.yml" <<'YML'
name: Branch Validation

on:
  pull_request:
    branches: [ dev ]

jobs:
  validate-branch:
    runs-on: ubuntu-latest
    steps:
      - name: Validate Branch Name
        run: |
          BRANCH="${{ github.head_ref }}"
          if [[ ! "$BRANCH" =~ ^(feature|bugfix|patch)/(blue|green|yellow)/[0-9]{4}-[0-9]{2}-[0-9]{2}/.+$ ]]; then
            echo "❌ Invalid branch naming convention."
            echo "Expected: {type}/{agentColor}/{yyyy-mm-dd}/{short-scope}"
            exit 1
          fi
          echo "✅ Branch name valid."
YML

echo
echo "✅ Bootstrap complete."
echo "Next:"
echo "  1) git status"
echo "  2) create a properly named branch"
echo "  3) commit governance files"
