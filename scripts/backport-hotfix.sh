#!/bin/bash
# scripts/backport-hotfix.sh
# Backport Automation Script for Emergency Hotfix Loop
# Usage: ./scripts/backport-hotfix.sh [commit_hash]
# If no commit provided, uses HEAD of main

set -e

echo "=== OrthodoxMetrics Hotfix Backport Script ==="

# 1. Ensure we are starting from a clean main branch
echo "Switching to main branch..."
git checkout main
git pull origin main

# 2. Identify the hotfix commit (argument or most recent)
if [ -n "$1" ]; then
    HOTFIX_COMMIT="$1"
else
    HOTFIX_COMMIT=$(git rev-parse HEAD)
fi
SHORT_HASH=$(git rev-parse --short "$HOTFIX_COMMIT")
echo "Identified Hotfix Commit: $HOTFIX_COMMIT ($SHORT_HASH)"

# Show commit info
echo "Commit details:"
git log --oneline -1 "$HOTFIX_COMMIT"

# 3. Switch to dev and sync
echo ""
echo "Switching to dev branch..."
git checkout dev
git pull origin dev

# 4. Check if commit already exists in dev
if git merge-base --is-ancestor "$HOTFIX_COMMIT" HEAD 2>/dev/null; then
    echo "✅ Commit $SHORT_HASH already exists in dev branch. Nothing to do."
    exit 0
fi

# 5. Cherry-pick the fix
echo ""
echo "Backporting $SHORT_HASH to dev..."
if git cherry-pick "$HOTFIX_COMMIT"; then
    echo ""
    read -p "Push to origin/dev? (y/n): " CONFIRM
    if [ "$CONFIRM" = "y" ] || [ "$CONFIRM" = "Y" ]; then
        git push origin dev
        echo "✅ Hotfix successfully backported to dev and pushed."
    else
        echo "✅ Hotfix cherry-picked locally. Run 'git push origin dev' when ready."
    fi
else
    echo ""
    echo "❌ Conflict detected! Please resolve manually:"
    echo "   1. Fix conflicts in affected files"
    echo "   2. git add <resolved-files>"
    echo "   3. git cherry-pick --continue"
    echo "   4. git push origin dev"
    exit 1
fi

echo ""
echo "=== Backport Complete ==="
