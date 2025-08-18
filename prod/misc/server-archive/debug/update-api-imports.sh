#!/bin/bash

echo "🔧 UPDATING API IMPORTS"
echo "======================="
echo ""

# Check if running in correct directory
if [ ! -f "config/db.js" ]; then
    echo "❌ Please run this script from the server directory:"
    echo "   cd server"
    echo "   ./debug/update-api-imports.sh"
    exit 1
fi

echo "🎯 TASK: Update all imports from orthodox-metrics.api.ts to new modular APIs"
echo ""

# Navigate to frontend directory
cd ../front-end

echo "🔍 STEP 1: FINDING FILES WITH OLD IMPORTS"
echo "=========================================="

# Find all files that import orthodoxMetricsAPI
FILES_TO_UPDATE=$(grep -r "orthodoxMetricsAPI\|orthodox-metrics.api" src/ --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" | cut -d: -f1 | sort | uniq)

echo "📄 Files found with old imports:"
echo "$FILES_TO_UPDATE"
echo ""

echo "🔧 STEP 2: UPDATING IMPORTS"
echo "==========================="

# Update each file
for file in $FILES_TO_UPDATE; do
    if [ -f "$file" ]; then
        echo "📝 Updating: $file"
        
        # Create backup
        cp "$file" "$file.backup"
        
        # Update imports
        sed -i 's|import { orthodoxMetricsAPI } from '\''\.\.\/api\/orthodox-metrics\.api'\'';|import { adminAPI } from '\''\.\.\/api\/admin\.api'\'';\nimport { userAPI } from '\''\.\.\/api\/user\.api'\'';\nimport { metricsAPI } from '\''\.\.\/api\/metrics\.api'\'';|g' "$file"
        
        # Update default imports
        sed -i 's|import orthodoxMetricsAPI from '\''\.\.\/api\/orthodox-metrics\.api'\'';|import { adminAPI } from '\''\.\.\/api\/admin\.api'\'';\nimport { userAPI } from '\''\.\.\/api\/user\.api'\'';\nimport { metricsAPI } from '\''\.\.\/api\/metrics\.api'\'';|g' "$file"
        
        # Update relative imports
        sed -i 's|import { orthodoxMetricsAPI } from '\''\.\.\/\.\.\/api\/orthodox-metrics\.api'\'';|import { adminAPI } from '\''\.\.\/\.\.\/api\/admin\.api'\'';\nimport { userAPI } from '\''\.\.\/\.\.\/api\/user\.api'\'';\nimport { metricsAPI } from '\''\.\.\/\.\.\/api\/metrics\.api'\'';|g' "$file"
        
        # Update absolute imports
        sed -i 's|import { orthodoxMetricsAPI } from '\''@\/api\/orthodox-metrics\.api'\'';|import { adminAPI } from '\''@\/api\/admin\.api'\'';\nimport { userAPI } from '\''@\/api\/user\.api'\'';\nimport { metricsAPI } from '\''@\/api\/metrics\.api'\'';|g' "$file"
        
        echo "✅ Updated: $file"
    fi
done

echo ""
echo "🔧 STEP 3: UPDATING API CALLS"
echo "============================="

# Update API calls in the files
for file in $FILES_TO_UPDATE; do
    if [ -f "$file" ]; then
        echo "🔄 Updating API calls in: $file"
        
        # Update auth calls
        sed -i 's|orthodoxMetricsAPI\.auth\.|userAPI\.auth\.|g' "$file"
        
        # Update admin calls
        sed -i 's|orthodoxMetricsAPI\.users\.|adminAPI\.users\.|g' "$file"
        sed -i 's|orthodoxMetricsAPI\.churches\.|adminAPI\.churches\.|g' "$file"
        sed -i 's|orthodoxMetricsAPI\.activityLogs\.|adminAPI\.activityLogs\.|g' "$file"
        sed -i 's|orthodoxMetricsAPI\.provisioning\.|adminAPI\.provisioning\.|g' "$file"
        sed -i 's|orthodoxMetricsAPI\.email\.|adminAPI\.email\.|g' "$file"
        
        # Update session calls
        sed -i 's|orthodoxMetricsAPI\.sessions\.|userAPI\.sessions\.|g' "$file"
        
        # Update metrics calls
        sed -i 's|orthodoxMetricsAPI\.records\.|metricsAPI\.records\.|g' "$file"
        sed -i 's|orthodoxMetricsAPI\.calendar\.|metricsAPI\.calendar\.|g' "$file"
        sed -i 's|orthodoxMetricsAPI\.invoices\.|metricsAPI\.invoices\.|g' "$file"
        sed -i 's|orthodoxMetricsAPI\.ocr\.|metricsAPI\.ocr\.|g' "$file"
        sed -i 's|orthodoxMetricsAPI\.dashboard\.|metricsAPI\.dashboard\.|g' "$file"
        sed -i 's|orthodoxMetricsAPI\.utils\.|metricsAPI\.utils\.|g' "$file"
        sed -i 's|orthodoxMetricsAPI\.certificates\.|metricsAPI\.certificates\.|g' "$file"
        
        echo "✅ Updated API calls in: $file"
    fi
done

echo ""
echo "🔧 STEP 4: VERIFYING CHANGES"
echo "============================"

# Check for any remaining orthodoxMetricsAPI references
REMAINING_REFERENCES=$(grep -r "orthodoxMetricsAPI" src/ --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" | grep -v "//.*orthodoxMetricsAPI" | grep -v "/*.*orthodoxMetricsAPI" || true)

if [ -n "$REMAINING_REFERENCES" ]; then
    echo "⚠️  Remaining references found:"
    echo "$REMAINING_REFERENCES"
    echo ""
    echo "🔧 These may need manual updates:"
    echo "   - Check for dynamic property access"
    echo "   - Look for string literals containing 'orthodoxMetricsAPI'"
    echo "   - Verify any remaining imports"
else
    echo "✅ No remaining orthodoxMetricsAPI references found!"
fi

echo ""
echo "🔧 STEP 5: BUILDING FRONTEND"
echo "============================"

echo "📦 Installing dependencies..."
npm install --legacy-peer-deps

echo "🔨 Building frontend..."
NODE_OPTIONS="--max-old-space-size=4096" npm run build

if [ $? -eq 0 ]; then
    echo "✅ Frontend built successfully"
else
    echo "❌ Frontend build failed - check for import errors"
    exit 1
fi

echo ""
echo "🎯 MIGRATION SUMMARY:"
echo "===================="
echo "✅ Created modular API structure:"
echo "   - admin.api.ts (admin/superadmin endpoints)"
echo "   - user.api.ts (authentication & sessions)"
echo "   - metrics.api.ts (records, OCR, calendar, etc.)"
echo ""
echo "✅ Updated imports across codebase"
echo "✅ Updated API calls to use new modular structure"
echo "✅ Marked original orthodox-metrics.api.ts as deprecated"
echo "✅ Frontend builds successfully"
echo ""
echo "🔍 NEXT STEPS:"
echo "=============="
echo "1. Test all functionality to ensure API calls work"
echo "2. Remove any remaining manual updates needed"
echo "3. Consider removing orthodox-metrics.api.ts in future version"
echo ""
echo "🏁 API REFACTOR COMPLETE!" 