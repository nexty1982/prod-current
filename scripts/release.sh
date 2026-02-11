#!/bin/bash
# Usage: ./scripts/release.sh 1.1.0

# 1. Clean the input version (removes '-local' or '-dev' if accidentally passed)
INPUT_VERSION=$1
NEW_VERSION=$(echo "$INPUT_VERSION" | sed 's/-local//g; s/-dev//g')

if [ -z "$NEW_VERSION" ]; then
    echo "Error: Please specify a version (e.g., ./scripts/release.sh 1.1.0)"
    exit 1
fi

# Safety Check: Ensure we are starting from 'dev'
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "dev" ]; then
    echo "❌ Error: Releases must be started from the 'dev' branch."
    exit 1
fi

echo "🚀 Starting Milestone Release: $NEW_VERSION (Cleaned from: $INPUT_VERSION)"

# 2. Update all package.json files (Root, Server, Frontend)
echo "Updating package.json files..."
npm version "$NEW_VERSION" --no-git-tag-version
(cd server && npm version "$NEW_VERSION" --no-git-tag-version)
(cd front-end && npm version "$NEW_VERSION" --no-git-tag-version)

# 3. Update MariaDB
# This ensures MariaDB NEVER stores a '-local' version string.
echo "Syncing official version to MariaDB..."
mariadb -u "$DB_USER" -p"$DB_PASS" -e "UPDATE system_info SET version_string='$NEW_VERSION' WHERE id=1;" orthodox_metrics

# 4. Git Operations
git add .
git commit -m "release: milestone $NEW_VERSION"

echo "Merging dev into main..."
git checkout main
git pull origin main # Ensure main is up to date
git merge dev --no-ff -m "Merge milestone $NEW_VERSION into main"
git tag -a "v$NEW_VERSION" -m "Milestone $NEW_VERSION"

# 5. Final Rebuild & Push
echo "Rebuilding Frontend to sync Git SHA..."
(cd front-end && npm run build)

echo "Pushing to remote..."
git push origin main --tags
git checkout dev # Return to dev for next cycle

echo "✅ Release $NEW_VERSION complete and merged to main."
echo "Running om-version.sh to verify..."
./om-version.sh
