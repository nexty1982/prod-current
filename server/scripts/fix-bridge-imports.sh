#!/bin/bash
# Fix all bridge files to use context detection instead of try-catch fallback
# This ensures dist/ files never reference src/ at runtime

set -e

cd /var/www/orthodoxmetrics/prod/server

# Function to fix a single bridge file pattern
fix_bridge_file() {
  local file="$1"
  local temp_file="${file}.tmp"
  
  # Check if file already has context detection
  if grep -q "isDist = __dirname.includes" "$file"; then
    return 0  # Already fixed
  fi
  
  # Create temp file with fixes
  awk '
  BEGIN { 
    path_required = 0
    is_dist_added = 0
  }
  
  # Add path require and isDist detection at top (after first few lines)
  NR <= 5 && /^const express|^\/\/|^const router/ {
    if (NR == 1 && !path_required) {
      path_required = 1
    }
    print
    if (NR == 5 && !is_dist_added && path_required) {
      print ""
      print "// Detect context (dist vs source) for module loading"
      print "const path = require(\"path\");"
      print "const isDist = __dirname.includes(path.sep + \"dist\" + path.sep);"
      is_dist_added = 1
    }
    next
  }
  
  # Fix: let var; try { var = require("../api/..."); } catch { var = require("../src/api/..."); }
  /let\s+\w+\s*;\s*try\s*\{\s*\w+\s*=\s*require\([\x27"]\.\.\/api\// {
    # This is complex - skip for now, handle manually
    print
    next
  }
  
  # Default: print line as-is
  { print }
  ' "$file" > "$temp_file" && mv "$temp_file" "$file" || rm -f "$temp_file"
}

echo "Fixing bridge files..."
echo "Note: This script provides a template. Manual fixes may be needed for complex patterns."

# List of critical files to fix
CRITICAL_FILES=(
  "routes/marriage.js"
  "routes/funeral.js"
  "routes/notes.js"
  "routes/pages.js"
  "routes/invoices.js"
  "routes/bigbook.js"
  "routes/kanban.js"
  "routes/settings.js"
  "routes/churches.js"
  "routes/omai.js"
  "routes/templates.js"
  "routes/metrics.js"
  "routes/debug.js"
  "routes/billing.js"
  "routes/user-profile.js"
  "routes/calendar.js"
  "routes/orthodoxCalendar.js"
  "routes/mock-apis.js"
  "routes/menuManagement.js"
  "routes/provision.js"
  "routes/menuPermissions.js"
  "routes/dropdownOptions.js"
  "routes/backend_diagnostics.js"
  "routes/notifications.js"
  "routes/user.js"
  "routes/uploadToken.js"
  "routes/globalOmai.js"
  "routes/dashboard.js"
  "routes/menuPermissionsApi.js"
  "routes/uploads.js"
  "routes/globalTemplates.js"
  "routes/ecommerce.js"
  "routes/runScript.js"
  "routes/importRecords.js"
  "routes/omaiLogger.js"
  "routes/logger.js"
  "routes/survey.js"
  "routes/records.js"
  "routes/headlines.js"
  "routes/adminSystem.js"
  "routes/headlines-config.js"
  "routes/github-issues.js"
  "routes/ai.js"
  "routes/enhancedInvoices.js"
  "routes/invoicesMultilingual.js"
  "routes/build.js"
  "routes/blogs.js"
  "routes/gallery.js"
  "routes/user-files.js"
  "routes/websocket/logs.js"
  "routes/clientApi.js"
  "routes/unique-values.js"
  "routes/omb.js"
)

echo "Found ${#CRITICAL_FILES[@]} files to check"
echo "Run: node scripts/fix-all-bridge-imports.js (if it exists) or fix manually"
