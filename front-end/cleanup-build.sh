#!/bin/bash
# Build Artifacts Cleanup Script
# Removes all build artifacts and cache files

echo "🧹 Cleaning Build Artifacts..."
echo "================================"

# Remove dist directories
echo "Removing dist directories..."
rm -rf dist/
rm -rf dist-beta/
rm -rf dist-staging/
rm -rf dist-dev/
rm -rf dist-experimental/
rm -rf dist-ssr/

# Remove build cache
echo "Removing build cache..."
rm -rf node_modules/.vite
rm -rf node_modules/.cache
rm -rf .vite
rm -rf .cache

# Remove source maps if any
echo "Removing source maps..."
find . -name "*.map" -type f -not -path "./node_modules/*" -not -path "./.git/*" -delete 2>/dev/null || true

echo ""
echo "✅ Build cleanup complete!"
echo ""
echo "To rebuild:"
echo "  npm run build        # Production build"
echo "  npm run build:dev    # Development build"
echo "  npm run dev          # Development server (no build needed)"

