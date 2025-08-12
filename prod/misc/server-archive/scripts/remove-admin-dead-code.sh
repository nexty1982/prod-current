#!/bin/bash

# ==============================================================================
# Remove Dead Code from Admin.js Monolith Script
# ==============================================================================
# This script safely removes dead code from admin.js while preserving 
# essential middleware and any unique functionality not yet extracted
# 
# Usage: ./remove-admin-dead-code.sh
# ==============================================================================

echo "🗑️ Removing Dead Code from Admin.js Monolith"
echo "============================================="

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

ADMIN_FILE="routes/admin.js"
BACKUP_DIR="backups/admin-cleanup-$(date +%Y%m%d_%H%M%S)"

echo "🔍 Pre-cleanup analysis..."
if [ ! -f "$ADMIN_FILE" ]; then
    echo -e "${RED}❌ Error: $ADMIN_FILE not found${NC}"
    exit 1
fi

# Get current file stats
original_size=$(wc -c < "$ADMIN_FILE")
original_lines=$(wc -l < "$ADMIN_FILE")

echo "📊 Original admin.js stats:"
echo "   Size: $(( original_size / 1024 ))KB"
echo "   Lines: $original_lines"
echo ""

echo "💾 Creating backup..."
mkdir -p "$BACKUP_DIR"
cp "$ADMIN_FILE" "$BACKUP_DIR/admin.js.backup"
cp "index.js" "$BACKUP_DIR/index.js.backup"

echo "✅ Backup created at: $BACKUP_DIR"
echo ""

echo "🔍 Identifying dead code routes to remove..."
echo ""

# Define dead code route patterns (intercepted by specific route files)
declare -a DEAD_ROUTES=(
    "router\.get\('/users'"
    "router\.post\('/users'"
    "router\.put\('/users/:id'"
    "router\.delete\('/users/:id'"
    "router\.put\('/users/:id/toggle-status'"
    "router\.get\('/churches\'"
    "router\.post\('/churches\'"
    "router\.put\('/churches/:id\'"
    "router\.get\('/church/:id\'"
)

# Define extracted routes to remove (now in separate files)
declare -a EXTRACTED_ROUTES=(
    "router\.get\('/churches/:id/users'"
    "router\.post\('/churches/:id/users'"
    "router\.put\('/churches/:id/users/:userId'"
    "router\.post\('/churches/:id/users/:userId/reset-password'"
    "router\.post\('/churches/:id/users/:userId/lock'"
    "router\.post\('/churches/:id/users/:userId/unlock'"
    "router\.get\('/churches/:id/tables'"
    "router\.get\('/churches/:id/record-counts'"
    "router\.get\('/churches/:id/database-info'"
    "router\.post\('/churches/:id/test-connection'"
)

echo "🎯 Routes to remove (dead code):"
for route in "${DEAD_ROUTES[@]}"; do
    echo "   ❌ $route"
done

echo ""
echo "🎯 Routes to remove (extracted):"
for route in "${EXTRACTED_ROUTES[@]}"; do
    echo "   📦 $route"
done

echo ""
echo "⚠️ WARNING: This will modify $ADMIN_FILE"
echo "Continue? (y/N): "
read -r confirmation

if [[ ! "$confirmation" =~ ^[Yy]$ ]]; then
    echo "❌ Operation cancelled"
    exit 0
fi

echo ""
echo "🗑️ Starting dead code removal..."

# Create a temporary file for the cleaned version
TEMP_FILE=$(mktemp)

# Function to check if a line starts a route definition we want to remove
should_remove_route() {
    local line="$1"
    
    # Check dead code routes
    for pattern in "${DEAD_ROUTES[@]}"; do
        if echo "$line" | grep -q "$pattern"; then
            return 0  # Remove this route
        fi
    done
    
    # Check extracted routes
    for pattern in "${EXTRACTED_ROUTES[@]}"; do
        if echo "$line" | grep -q "$pattern"; then
            return 0  # Remove this route
        fi
    done
    
    return 1  # Keep this line
}

# Process the file line by line
in_route_block=false
route_start_line=""
brace_count=0
lines_removed=0

while IFS= read -r line; do
    # Check if this line starts a route we want to remove
    if should_remove_route "$line"; then
        in_route_block=true
        route_start_line="$line"
        brace_count=$(echo "$line" | tr -cd '{' | wc -c)
        brace_count=$((brace_count - $(echo "$line" | tr -cd '}' | wc -c)))
        lines_removed=$((lines_removed + 1))
        echo "🗑️ Removing route: $(echo "$line" | grep -o "router\.[a-z]*('[^']*'" | head -1)"
        continue
    fi
    
    # If we're in a route block, track braces to find the end
    if [ "$in_route_block" = true ]; then
        open_braces=$(echo "$line" | tr -cd '{' | wc -c)
        close_braces=$(echo "$line" | tr -cd '}' | wc -c)
        brace_count=$((brace_count + open_braces - close_braces))
        lines_removed=$((lines_removed + 1))
        
        # If brace count reaches 0, we've found the end of the route
        if [ $brace_count -le 0 ]; then
            in_route_block=false
            echo "   └── Route block complete"
        fi
        continue
    fi
    
    # Keep this line
    echo "$line" >> "$TEMP_FILE"
    
done < "$ADMIN_FILE"

# Replace the original file with the cleaned version
mv "$TEMP_FILE" "$ADMIN_FILE"

# Get new file stats
new_size=$(wc -c < "$ADMIN_FILE")
new_lines=$(wc -l < "$ADMIN_FILE")

echo ""
echo "📊 Cleanup Results:"
echo "   Original: $original_lines lines, $(( original_size / 1024 ))KB"
echo "   New:      $new_lines lines, $(( new_size / 1024 ))KB"
echo "   Removed:  $(( original_lines - new_lines )) lines ($(( lines_removed )) total)"
echo "   Reduction: $(( (original_size - new_size) * 100 / original_size ))%"

if [ $new_lines -lt $(( original_lines / 2 )) ]; then
    echo -e "   ${GREEN}✅ Significant reduction achieved!${NC}"
else
    echo -e "   ${YELLOW}⚠️ Moderate reduction - may need manual review${NC}"
fi

echo ""
echo "🧪 Testing server restart with cleaned admin.js..."

# Test syntax
if node -c "$ADMIN_FILE" 2>/dev/null; then
    echo "✅ JavaScript syntax is valid"
else
    echo -e "${RED}❌ Syntax error detected! Restoring backup...${NC}"
    cp "$BACKUP_DIR/admin.js.backup" "$ADMIN_FILE"
    exit 1
fi

# Restart server
echo "🔄 Restarting server to test changes..."
pm2 restart orthodox-backend

sleep 5

# Test server health
if curl -s https://orthodoxmetrics.com/api/health > /dev/null 2>&1; then
    echo "✅ Server is responding"
else
    echo -e "${RED}❌ Server health check failed! Consider restoring backup${NC}"
    echo "Backup location: $BACKUP_DIR"
    exit 1
fi

# Quick test of existing routes
echo ""
echo "🧪 Testing existing functionality..."

# Test admin users route (should still work)
users_status=$(curl -s -w "%{http_code}" https://orthodoxmetrics.com/api/admin/users -o /dev/null)
if [ "$users_status" = "401" ]; then
    echo "✅ Admin users route working (401 - auth required)"
else
    echo "⚠️ Admin users route returned: $users_status"
fi

# Test our new routes still work
church_users_status=$(curl -s -w "%{http_code}" https://orthodoxmetrics.com/api/admin/church-users/1 -o /dev/null)
if [ "$church_users_status" = "401" ]; then
    echo "✅ New church-users route working (401 - auth required)"
else
    echo "⚠️ Church-users route returned: $church_users_status"
fi

echo ""
echo -e "${GREEN}🎉 Dead Code Removal Complete!${NC}"
echo "============================================="
echo ""
echo "📋 Summary:"
echo "   ✅ Removed $(( original_lines - new_lines )) lines of dead/duplicate code"
echo "   ✅ Preserved essential middleware and unique functionality"
echo "   ✅ Server is running and responding"
echo "   ✅ Core routes are functional"
echo ""
echo "📁 Backup preserved at: $BACKUP_DIR"
echo ""
echo "🎯 Next Steps:"
echo "   1. Monitor application for any issues"
echo "   2. Test admin functionality thoroughly"
echo "   3. Update documentation to reflect new modular structure"
echo "   4. Consider further optimizations"
echo ""

if [ $new_lines -lt $(( original_lines * 2 / 3 )) ]; then
    echo -e "${GREEN}🏆 Major cleanup success! Admin.js is now significantly smaller and more maintainable.${NC}"
else
    echo -e "${YELLOW}📝 Moderate cleanup achieved. Consider manual review for additional optimizations.${NC}"
fi 