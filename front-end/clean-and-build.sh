#!/bin/bash

# Clean and build script for Grid2 fix
echo "=== Cleaning Vite cache and building front-end ==="

# Navigate to frontend directory
cd /var/www/orthodoxmetrics/prod/front-end 2>/dev/null \
  || { echo "Error: Frontend directory not found"; exit 1; }

echo "Current directory: $(pwd)"

# Clean Vite cache
echo "Cleaning Vite cache..."
rm -rf node_modules/.vite 2>/dev/null || true
rm -rf .vite 2>/dev/null || true
echo "✓ Vite cache cleaned"

# Run the build with memory optimization
echo "Starting build with memory optimization..."
export NODE_OPTIONS="--max-old-space-size=4096"

# Run build
npm run build

# Check exit code
BUILD_EXIT_CODE=$?

if [ $BUILD_EXIT_CODE -eq 0 ]; then
    echo "✅ Build completed successfully!"
    echo "Grid2 import issues have been resolved."
else
    echo "❌ Build failed with exit code: $BUILD_EXIT_CODE"
    echo "Please check the error messages above."
    exit 1
fi
