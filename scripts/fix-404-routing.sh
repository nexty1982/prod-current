#!/bin/bash

# Fix 404 Routing Issue - Deploy Updated Nginx Configurations
# This script deploys the fixed nginx configurations to resolve unauthenticated user 404 issues

set -e

echo "🔧 Fixing 404 Routing Issue for Unauthenticated Users"
echo "======================================================"
echo ""

PROD_DIR="/var/www/orthodoxmetrics/prod"
CONFIG_DIR="${PROD_DIR}/config"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running as root or with sudo
if [ "$EUID" -ne 0 ]; then 
    echo -e "${YELLOW}⚠️  This script requires sudo privileges${NC}"
    echo "Please run: sudo $0"
    exit 1
fi

echo "📋 Problem Identified:"
echo "   - External nginx was intercepting ALL 404 errors"
echo "   - Showing /updating.html for routing requests"
echo "   - Preventing React Router from handling SPA routes"
echo ""

echo "✅ Solution Applied:"
echo "   - Only intercept 502, 503, 504 (backend errors)"
echo "   - Allow 404 to pass through for SPA routing"
echo "   - Fixed try_files directives in internal nginx"
echo ""

# Step 1: Deploy Internal Nginx (.239)
echo "📦 Step 1: Deploying Internal Nginx Configuration (.239)"
echo "   Source: ${CONFIG_DIR}/nginx-internal-239.conf"
echo "   Target: /etc/nginx/sites-available/orthodoxmetrics.com"

if [ -f "${CONFIG_DIR}/nginx-internal-239.conf" ]; then
    cp "${CONFIG_DIR}/nginx-internal-239.conf" /etc/nginx/sites-available/orthodoxmetrics.com
    echo -e "   ${GREEN}✓${NC} Internal nginx config copied"
else
    echo -e "   ${RED}✗${NC} Config file not found!"
    exit 1
fi

# Step 2: Test Nginx Configuration
echo ""
echo "🧪 Step 2: Testing Nginx Configuration"
if nginx -t 2>&1 | grep -q "syntax is ok"; then
    echo -e "   ${GREEN}✓${NC} Nginx configuration is valid"
else
    echo -e "   ${RED}✗${NC} Nginx configuration has errors:"
    nginx -t
    exit 1
fi

# Step 3: Reload Nginx on .239
echo ""
echo "🔄 Step 3: Reloading Nginx on .239"
systemctl reload nginx
if [ $? -eq 0 ]; then
    echo -e "   ${GREEN}✓${NC} Nginx reloaded successfully on .239"
else
    echo -e "   ${RED}✗${NC} Failed to reload nginx"
    exit 1
fi

# Step 4: Deploy to External Server (.221)
echo ""
echo "📦 Step 4: Deploying to External Server (.221)"
echo "   You need to deploy the updated config to the external proxy server"
echo ""
echo "   Run on the .221 server:"
echo "   ${YELLOW}sudo scp user@192.168.1.239:${CONFIG_DIR}/nginx-external-221.conf /etc/nginx/sites-available/orthodoxmetrics.com${NC}"
echo "   ${YELLOW}sudo nginx -t && sudo systemctl reload nginx${NC}"
echo ""

# Step 5: Verify
echo ""
echo "✅ Deployment Complete on .239"
echo ""
echo "📝 Next Steps:"
echo "   1. Deploy config to .221 external server (see commands above)"
echo "   2. Test: curl -I https://orthodoxmetrics.com"
echo "   3. Open browser in incognito: https://orthodoxmetrics.com"
echo "   4. Should redirect to /auth/login2 (not 404!)"
echo ""
echo "🔍 Verification:"
echo "   Before fix: https://orthodoxmetrics.com → 404 or updating.html"
echo "   After fix:  https://orthodoxmetrics.com → /auth/login2"
echo ""

echo -e "${GREEN}Done!${NC}"
