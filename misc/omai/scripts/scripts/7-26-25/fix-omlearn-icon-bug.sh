#!/bin/bash

echo "=== Fixing OMLearn Schedule Icon Bug ==="
echo "Date: $(date)"
echo "Description: Fixed incorrect Schedule icon reference in OMLearnDashboard.tsx"

echo ""
echo "Bug Details:"
echo "- Schedule was imported as PendingIcon but referenced directly as Schedule"
echo "- This caused a compilation error preventing OMLearn from working"
echo "- Fixed by using PendingIcon consistently"

echo ""
echo "=== Rebuilding Frontend ==="

cd front-end || {
    echo "Error: Could not change to front-end directory"
    exit 1
}

echo "Installing dependencies with legacy peer deps flag..."
NODE_OPTIONS="--max-old-space-size=4096" npm install --legacy-peer-deps

if [ $? -ne 0 ]; then
    echo "Error: npm install failed"
    exit 1
fi

echo "Building frontend with memory optimization..."
NODE_OPTIONS="--max-old-space-size=4096" npm run build

if [ $? -eq 0 ]; then
    echo ""
    echo "=== OMLearn Bug Fix Complete ==="
    echo "✅ Successfully fixed Schedule icon reference in OMLearnDashboard"
    echo "✅ Frontend rebuild completed"
    echo ""
    echo "Next steps:"
    echo "1. Restart the server to load the updated build"
    echo "2. Test https://orthodoxmetrics.com/bigbook/omlearn"
    echo "3. Verify the dashboard loads without errors"
else
    echo ""
    echo "❌ Frontend build failed"
    echo "Please check the build output for errors"
    exit 1
fi 