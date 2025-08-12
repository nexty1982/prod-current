#!/bin/bash

echo "🔧 Fixing Frontend Build Issues"
echo "==============================="

cd front-end

echo "1. Cleaning node_modules and package-lock.json..."
rm -rf node_modules package-lock.json

echo "2. Installing dependencies with legacy peer deps..."
npm install --legacy-peer-deps

echo "3. Checking for Vite installation..."
if ! command -v vite &> /dev/null; then
    echo "   Vite not found globally, installing locally..."
    npm install --save-dev vite@latest
fi

echo "4. Building with increased memory allocation..."
export NODE_OPTIONS="--max-old-space-size=4096"
npm run build

echo "5. Verifying build output..."
if [ -d "dist" ]; then
    echo "   ✅ Build successful! dist/ directory created."
    ls -la dist/
else
    echo "   ❌ Build failed! Check the error messages above."
    exit 1
fi

echo ""
echo "🎉 Frontend build fix completed!"
echo "The build should now work without dependency conflicts." 