#!/bin/bash
#
# Fix Images Serving - OrthodoxMetrics
# 
# This script:
# 1. Creates missing misc directory
# 2. Adds Nginx location block for /images/
# 3. Reloads Nginx
#

set -e

REPO_ROOT="/var/www/orthodoxmetrics/prod"
NGINX_CONFIG="/etc/nginx/sites-enabled/orthodoxmetrics.com"
IMAGES_ROOT="${REPO_ROOT}/front-end/dist/images"

echo "🔧 Fixing Images Serving for OrthodoxMetrics"
echo ""

# Step 1: Create missing misc directory
echo "Step 1: Creating missing misc directory..."
mkdir -p "${REPO_ROOT}/front-end/public/images/misc"
mkdir -p "${REPO_ROOT}/front-end/dist/images/misc"
touch "${REPO_ROOT}/front-end/public/images/misc/.gitkeep"
echo "✅ Created misc directories"

# Step 2: Check if Nginx config exists
if [ ! -f "$NGINX_CONFIG" ]; then
    echo "❌ Nginx config not found at: $NGINX_CONFIG"
    echo "   Please create it manually or run this script on the server"
    exit 1
fi

# Step 3: Check if /images/ location block already exists
if grep -q "location.*/images/" "$NGINX_CONFIG"; then
    echo "⚠️  Nginx config already has a /images/ location block"
    echo "   Checking if it's correct..."
    
    if grep -q "location.*^~.*/images/" "$NGINX_CONFIG"; then
        echo "✅ Found location ^~ /images/ block"
        if grep -q "alias.*dist/images" "$NGINX_CONFIG"; then
            echo "✅ Location block points to dist/images (correct)"
            echo ""
            echo "📋 Current /images/ location block:"
            grep -A 10 "location.*^~.*/images/" "$NGINX_CONFIG" | head -15
            echo ""
            echo "✅ Nginx config looks correct. Testing..."
        else
            echo "⚠️  Location block exists but may not point to dist/images"
            echo "   Please verify manually"
        fi
    else
        echo "⚠️  Found /images/ location but may not use ^~ prefix"
        echo "   This could cause conflicts. Please review manually"
    fi
else
    echo "Step 2: Adding /images/ location block to Nginx config..."
    
    # Backup config
    cp "$NGINX_CONFIG" "${NGINX_CONFIG}.backup.$(date +%Y%m%d_%H%M%S)"
    echo "✅ Backed up config to ${NGINX_CONFIG}.backup.*"
    
    # Find the main location / block and insert before it
    # We'll add the /images/ block right before the main proxy location
    if grep -q "location /" "$NGINX_CONFIG"; then
        # Create temp file with new location block
        TEMP_FILE=$(mktemp)
        
        # Insert /images/ location block before "location /"
        awk '
            /^[[:space:]]*location[[:space:]]+\// {
                # Insert /images/ block before location /
                print "    # Serve /images/* directly from dist (bypass backend)"
                print "    location ^~ /images/ {"
                print "        alias '"${IMAGES_ROOT}"'/;"
                print "        expires 30d;"
                print "        add_header Cache-Control \"public, immutable\";"
                print ""
                print "        # Ensure correct content types"
                print "        types {"
                print "            image/png png;"
                print "            image/jpeg jpg jpeg;"
                print "            image/svg+xml svg;"
                print "            image/webp webp;"
                print "            image/gif gif;"
                print "        }"
                print "        default_type image/png;"
                print "    }"
                print ""
            }
            { print }
        ' "$NGINX_CONFIG" > "$TEMP_FILE"
        
        mv "$TEMP_FILE" "$NGINX_CONFIG"
        echo "✅ Added /images/ location block to Nginx config"
    else
        echo "⚠️  Could not find 'location /' block in config"
        echo "   Please add the following manually BEFORE the main location / block:"
        echo ""
        echo "    location ^~ /images/ {"
        echo "        alias ${IMAGES_ROOT}/;"
        echo "        expires 30d;"
        echo "        add_header Cache-Control \"public, immutable\";"
        echo ""
        echo "        types {"
        echo "            image/png png;"
        echo "            image/jpeg jpg jpeg;"
        echo "            image/svg+xml svg;"
        echo "            image/webp webp;"
        echo "            image/gif gif;"
        echo "        }"
        echo "        default_type image/png;"
        echo "    }"
        echo ""
    fi
fi

# Step 4: Test Nginx config
echo ""
echo "Step 3: Testing Nginx configuration..."
if nginx -t 2>&1 | grep -q "syntax is ok"; then
    echo "✅ Nginx config syntax is valid"
    
    # Reload Nginx
    echo ""
    echo "Step 4: Reloading Nginx..."
    if systemctl reload nginx 2>&1; then
        echo "✅ Nginx reloaded successfully"
    else
        echo "⚠️  Nginx reload failed. Please run manually: sudo systemctl reload nginx"
    fi
else
    echo "❌ Nginx config syntax error!"
    echo "   Please fix the config before reloading"
    exit 1
fi

echo ""
echo "✅ Images serving fix complete!"
echo ""
echo "📋 Verification steps:"
echo "   1. Test: curl -I https://orthodoxmetrics.com/images/logos/biz-logo.png"
echo "   2. Should return: HTTP/1.1 200 OK and Content-Type: image/png"
echo "   3. Run: node scripts/check-gallery-directories.mjs"
echo ""
