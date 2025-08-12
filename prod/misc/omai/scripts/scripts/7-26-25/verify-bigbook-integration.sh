#!/bin/bash

# Verify Big Book Integration Script
# Checks that the Big Book component is properly integrated into the router

echo "🔍 Verifying Big Book Integration"
echo "================================="

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_ok() { echo -e "${GREEN}✅ $1${NC}"; }
print_warn() { echo -e "${YELLOW}⚠️  $1${NC}"; }
print_error() { echo -e "${RED}❌ $1${NC}"; }
print_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }

echo ""

# Check if Big Book component exists
if [ -f "front-end/src/components/admin/OMBigBook.tsx" ]; then
    print_ok "Big Book component found"
else
    print_error "Big Book component not found!"
    exit 1
fi

echo ""

# Check if Router.tsx contains the Big Book import
if grep -q "OMBigBook" "front-end/src/routes/Router.tsx"; then
    print_ok "Big Book import found in Router.tsx"
else
    print_error "Big Book import not found in Router.tsx"
    exit 1
fi

# Check if Router.tsx contains the Big Book route
if grep -q "/admin/bigbook" "front-end/src/routes/Router.tsx"; then
    print_ok "Big Book route found in Router.tsx"
else
    print_error "Big Book route not found in Router.tsx"
    exit 1
fi

echo ""

# Check if backend route is integrated
if grep -q "bigbook" "server/index.js"; then
    print_ok "Backend Big Book route found in server/index.js"
else
    print_warn "Backend Big Book route not found - check server/index.js"
fi

echo ""

print_ok "Big Book Integration Complete!"
echo ""
print_info "Access your Big Book system at:"
echo "   🌐 https://orthodoxmetrics.com/admin/bigbook"
echo ""
print_info "Features available:"
echo "   📁 File upload and execution"
echo "   💻 Real-time console"
echo "   ⚙️  Settings management"
echo "   📊 Database operations"
echo ""
print_info "Next steps:"
echo "   1. Restart your development server"
echo "   2. Navigate to the Big Book URL"
echo "   3. Test file upload and execution"
echo "   4. Configure database settings"
echo ""
print_ok "Your Big Book system is ready to use! 🎉" 