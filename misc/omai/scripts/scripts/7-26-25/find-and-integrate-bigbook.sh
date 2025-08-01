#!/bin/bash

# Find and Integrate Big Book Component Script
# Helps locate the admin settings page and guides integration

echo "🔍 Finding Admin Settings Page for Big Book Integration"
echo "======================================================"

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

# Search for potential admin settings files
print_info "Searching for admin settings files..."

POTENTIAL_FILES=(
    "front-end/src/pages/admin/Settings.tsx"
    "front-end/src/pages/Settings.tsx"
    "front-end/src/components/admin/Settings.tsx"
    "front-end/src/views/admin/Settings.tsx"
    "front-end/src/layouts/admin/Settings.tsx"
)

FOUND_FILES=()

for file in "${POTENTIAL_FILES[@]}"; do
    if [ -f "$file" ]; then
        FOUND_FILES+=("$file")
        print_ok "Found: $file"
    fi
done

echo ""

if [ ${#FOUND_FILES[@]} -eq 0 ]; then
    print_warn "No admin settings files found in common locations"
    print_info "Let's search for files that might contain admin settings..."
    
    # Search for files containing "Settings" or "admin"
    echo "Searching for files with 'Settings' or 'admin' in the name..."
    
    # Find all .tsx files and check for admin/settings content
    find front-end/src -name "*.tsx" -type f | while read -r file; do
        if grep -l -i "settings\|admin" "$file" > /dev/null 2>&1; then
            echo "Potential file: $file"
        fi
    done
    
    echo ""
    print_info "Please manually locate your admin settings page and run this script again"
    exit 1
fi

echo ""

# Show integration instructions for found files
print_info "Integration Instructions:"
echo ""

for file in "${FOUND_FILES[@]}"; do
    echo "📁 File: $file"
    echo ""
    print_info "1. Add this import at the top of the file:"
    echo "   import OMBigBook from '@/components/admin/OMBigBook';"
    echo ""
    print_info "2. Find the TabsList section and add:"
    echo "   <TabsTrigger value=\"bigbook\">OM Big Book</TabsTrigger>"
    echo ""
    print_info "3. Find the TabsContent section and add:"
    echo "   <TabsContent value=\"bigbook\">"
    echo "     <OMBigBook />"
    echo "   </TabsContent>"
    echo ""
    echo "---"
    echo ""
done

print_info "After making these changes:"
echo "1. Save the file"
echo "2. Restart your development server"
echo "3. Navigate to your admin settings page"
echo "4. Look for the 'OM Big Book' tab"
echo ""

print_ok "Big Book component is ready for integration!" 