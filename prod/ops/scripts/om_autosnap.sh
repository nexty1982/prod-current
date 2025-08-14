#!/usr/bin/env bash
set -euo pipefail

ROOT="/var/www/orthodoxmetrics"
cd "$ROOT"

DATE=$(date +%Y%m%d)
BRANCH="auto-$DATE"
NOW=$(date +%H:%M)
MSG_TAG="⏱️ AutoSnap $NOW"

# Ensure on correct base branch
git checkout main || git checkout master || true

# Create daily branch if not exists
if ! git rev-parse --verify "$BRANCH" >/dev/null 2>&1; then
  git checkout -b "$BRANCH"
else
  git checkout "$BRANCH"
fi

# Stage all changes
git add -A

# Skip commit if no changes
if git diff --cached --quiet; then
  echo "$MSG_TAG — No changes"
  exit 0
fi

# Generate diff stats to find active folders
TOP=$(git diff --cached --name-only | cut -d/ -f2 | sort | uniq -c | sort -nr | head -1 | awk '{print $2}')

# Build commit message
MSG="$MSG_TAG — Activity in /$TOP"

# Commit and log
git commit -m "$MSG"
echo "$MSG"
