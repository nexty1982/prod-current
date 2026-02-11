#!/usr/bin/env bash
set -Eeuo pipefail
cd "$(git rev-parse --show-toplevel)"

install_one() {
  local src="$1"
  local dst="$2"
  if [[ ! -f "$src" ]]; then
    echo "❌ missing: $src"
    exit 1
  fi
  mkdir -p "$(dirname "$dst")"
  cp -f "$src" "$dst"
  chmod +x "$dst"
  echo "installed: $dst"
}

install_one "tools/githooks/pre-commit" ".git/hooks/pre-commit"
install_one "tools/githooks/commit-msg" ".git/hooks/commit-msg"

echo "✅ Git hooks installed into .git/hooks"
