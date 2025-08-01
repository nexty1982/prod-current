#!/bin/bash
# 📸 Simple Big Book Screenshot Capture CLI
# Usage: ./screenshot-bigbook.sh [URL]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
URL=${1:-"http://localhost:3000"}

echo "📸 Capturing Big Book Custom Components Screenshots"
echo "URL: $URL"
echo ""

# Deploy system first
echo "🚀 Step 1: Deploy system..."
echo "   Restarting backend..."
pm2 restart orthodox-backend 2>/dev/null || echo "   ⚠️ PM2 restart failed (may not be available)"

echo "   Rebuilding frontend..."
cd "$SCRIPT_DIR/../front-end"
NODE_OPTIONS="--max-old-space-size=4096" npm run build

# Wait for system to be ready
echo "   ⏳ Waiting for system to be ready..."
sleep 5

# Capture screenshots
echo ""
echo "📸 Step 2: Capture screenshots..."
cd "$SCRIPT_DIR"
bash capture-bigbook-screenshots.sh "$URL"

echo ""
echo "✅ Complete! Check the screenshots/ directory for results." 