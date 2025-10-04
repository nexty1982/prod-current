#!/bin/bash
# create-getall-fix-branch.sh - Create branch, stage, commit, and push for getAll fix

set -Eeuo pipefail
cd "$(git rev-parse --show-toplevel)"

TASK_ID="${TASK_ID:-fix/church-mgmt-getAll-$(date +%Y%m%d)}"
ISSUE_REF="${ISSUE_REF:-}"

echo "🚀 Creating branch: $TASK_ID"
echo "📝 Issue reference: ${ISSUE_REF:-N/A}"

# Fetch latest changes and create branch  
git fetch --all --prune
git checkout -b "$TASK_ID"

# Stage all changes
git add -A

# Check if there are any changes to commit
if git diff --cached --quiet; then
    echo "⚠️  No changes to commit. Make your changes first, then run this script."
    exit 1
fi

# Render the template with env vars
echo "📋 Preparing commit message..."
TASK_ID="$TASK_ID" ISSUE_REF="$ISSUE_REF" envsubst < .github/.commit-templates/getall-fix.md > .git/COMMIT_EDITMSG

# Commit and push
git commit -F .git/COMMIT_EDITMSG
git push -u origin "$TASK_ID"

echo "✅ Branch created, committed, and pushed successfully!"
echo "🔗 Branch: $TASK_ID"
echo "📝 Task ID: $TASK_ID"
echo "🐛 Issue: ${ISSUE_REF:-N/A}"
