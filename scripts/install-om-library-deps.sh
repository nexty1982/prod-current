#!/bin/bash
# Install required packages for OM-Library system

cd /var/www/orthodoxmetrics/prod/server

echo "Installing OM-Library dependencies..."

# Check if already installed
if npm list slugify fuse.js 2>/dev/null | grep -q "slugify@" && npm list slugify fuse.js 2>/dev/null | grep -q "fuse.js@"; then
  echo "✅ Dependencies already installed"
else
  npm install slugify@1.6.6 fuse.js@7.0.0
  echo "✅ Dependencies installed"
fi

# Note: chokidar and fs-extra already in package.json

echo ""
echo "📚 OM-Library Dependencies:"
echo "  ✅ slugify    - Filename normalization"
echo "  ✅ fuse.js    - Fuzzy search"
echo "  ✅ chokidar   - File watching (already installed)"
echo "  ✅ fs-extra   - File operations (already installed)"
echo ""
echo "Next steps:"
echo "  1. Create library directories:"
echo "     mkdir -p front-end/public/docs/library/{technical,ops,recovery}"
echo ""
echo "  2. Start the om-librarian agent:"
echo "     pm2 start ecosystem.config.js --only om-librarian"
echo ""
echo "  3. Check status:"
echo "     pm2 list"
echo "     pm2 logs om-librarian"
echo ""
echo "  4. Access UI:"
echo "     http://yourdomain.com/church/om-library"
