#!/bin/bash

# OrthodMetrics Frontend Rebuild Script
# Location: /var/www/orthodoxmetrics/prod/front-end

# Exit on error
set -e

# Config
FRONTEND_DIR="/var/www/orthodoxmetrics/prod/front-end"
BUILD_LOG="/var/log/orthodoxmetrics/front-end_build.log"
DATE_TAG=$(date +"%Y-%m-%d_%H-%M-%S")

echo "🔄 Starting front-end rebuild at $DATE_TAG"
echo "📂 Target directory: $FRONTEND_DIR"

# Navigate to front-end directory
cd "$FRONTEND_DIR"

# Clean previous build (optional, but recommended)
echo "🧹 Cleaning previous build..."
rm -rf dist .vite

# Set production environment
export NODE_ENV=production
export NODE_OPTIONS="--max-old-space-size=4096"

# Reinstall dependencies (safe guard)
echo "📦 Ensuring correct dependencies..."
npm install --legacy-peer-deps >> "$BUILD_LOG" 2>&1

# Run the build
echo "🏗️ Running optimized production build..."
npm run build >> "$BUILD_LOG" 2>&1

# Verify result
if [ -d "dist" ]; then
  echo "✅ Front-end build completed successfully."
  echo "📝 Build log saved to $BUILD_LOG"
else
  echo "❌ Build failed. Check log at $BUILD_LOG"
  exit 1
fi
