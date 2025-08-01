#!/bin/bash

# 🔧 Fix Tool Availability Check in runner.sh
# ===========================================
# Fixes the "too many arguments" error in tool checking

RUNNER_FILE="/var/www/orthodoxmetrics/prod/tasks/runner.sh"

echo "🔧 Fixing tool availability check in runner.sh..."
echo "================================================="

# Create backup
cp "$RUNNER_FILE" "$RUNNER_FILE.backup"
echo "✅ Created backup: $RUNNER_FILE.backup"

# Fix the tool availability check logic
sed -i 's/if \[ -d "$TASK_ROOT\/node" \] && \[ $HAS_NODE \];/if [ -d "$TASK_ROOT\/node" ] \&\& command -v node \&> \/dev\/null;/g' "$RUNNER_FILE"
sed -i 's/elif \[ ! $HAS_NODE \];/elif ! command -v node \&> \/dev\/null;/g' "$RUNNER_FILE"

sed -i 's/if \[ -d "$TASK_ROOT\/npm" \] && \[ $HAS_NPM \];/if [ -d "$TASK_ROOT\/npm" ] \&\& command -v npm \&> \/dev\/null;/g' "$RUNNER_FILE"
sed -i 's/elif \[ ! $HAS_NPM \];/elif ! command -v npm \&> \/dev\/null;/g' "$RUNNER_FILE"

sed -i 's/if \[ -d "$TASK_ROOT\/pm2" \] && \[ $HAS_PM2 \];/if [ -d "$TASK_ROOT\/pm2" ] \&\& command -v pm2 \&> \/dev\/null;/g' "$RUNNER_FILE"
sed -i 's/elif \[ ! $HAS_PM2 \];/elif ! command -v pm2 \&> \/dev\/null;/g' "$RUNNER_FILE"

echo "✅ Fixed tool availability checks"

# Test the runner to verify the fix
echo ""
echo "🧪 Testing the fixed runner..."
bash "$RUNNER_FILE"

echo ""
echo "✅ Runner fix completed!"
echo "📄 Backup available at: $RUNNER_FILE.backup" 