#!/bin/bash
# 📸 Big Book Custom Components Screenshot Capture
# Automated visual verification with Puppeteer

echo "📸 Big Book Custom Components Screenshot Capture"
echo "==============================================="

# Configuration
BASE_URL=${1:-"http://localhost:3000"}
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUTPUT_DIR="$SCRIPT_DIR/../screenshots"

echo "🔧 Configuration:"
echo "   Base URL: $BASE_URL"
echo "   Output: $OUTPUT_DIR"
echo ""

# Check if Puppeteer is installed
echo "📦 Checking dependencies..."
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed"
    echo "   Please install Node.js to use screenshot capture"
    exit 1
fi

# Check if Puppeteer is available
if ! node -e "require('puppeteer')" 2>/dev/null; then
    echo "⚠️ Puppeteer not found. Installing..."
    cd "$SCRIPT_DIR/.."
    npm install puppeteer
    if [ $? -ne 0 ]; then
        echo "❌ Failed to install Puppeteer"
        echo "   Please run: npm install puppeteer"
        exit 1
    fi
    echo "✅ Puppeteer installed"
else
    echo "✅ Puppeteer found"
fi

# Create output directory
mkdir -p "$OUTPUT_DIR"

echo ""
echo "🚀 Starting screenshot capture..."
echo "   This will capture 3 screenshots:"
echo "   1. Big Book Custom Components Tab"
echo "   2. ParishMap Direct Access"
echo "   3. BigBook Component Viewer"
echo ""

# Execute screenshot capture
cd "$SCRIPT_DIR"
BASE_URL="$BASE_URL" node capture-bigbook-screenshots.js

RESULT=$?

echo ""
if [ $RESULT -eq 0 ]; then
    echo "🎉 Screenshot capture completed successfully!"
    echo ""
    echo "📁 Screenshots saved to: $OUTPUT_DIR"
    echo "📄 Check the generated report for details"
    echo ""
    echo "📋 Next steps:"
    echo "   1. Review the screenshots"
    echo "   2. Verify pages are accessible and working"
    echo "   3. Include screenshots in your documentation"
else
    echo "❌ Screenshot capture failed"
    echo ""
    echo "🔍 Troubleshooting:"
    echo "   1. Ensure the server is running at $BASE_URL"
    echo "   2. Check that you can access the pages manually"
    echo "   3. Verify login credentials if authentication is required"
    echo "   4. Check the error output above for specific issues"
fi

echo ""
echo "🔗 To capture with different URL:"
echo "   bash $0 https://orthodoxmetrics.com"

exit $RESULT 