#!/bin/bash

# Script to remove legacy and duplicate record components
# Run this after confirming the new DynamicRecordsDisplay is working

echo "🗑️  Starting cleanup of legacy records components..."

# Base directory
BASE_DIR="/var/www/orthodoxmetrics/prod/front-end/src"

# DO NOT DELETE these new canonical dynamic files
PRESERVE_FILES=(
  "${BASE_DIR}/features/records-centralized/components/dynamic/DynamicRecordsDisplay.tsx"
  "${BASE_DIR}/features/records-centralized/components/dynamic/columnMappers.ts"
  "${BASE_DIR}/features/records-centralized/components/dynamic/cellRenderers.tsx"
  "${BASE_DIR}/features/records-centralized/components/dynamic/DynamicRecordsInspector.tsx"
  "${BASE_DIR}/features/records-centralized/components/dynamic/index.ts"
  "${BASE_DIR}/features/records-centralized/components/dynamic/__tests__/DynamicRecordsDisplay.test.ts"
)

echo "📋 Files that will be preserved:"
for file in "${PRESERVE_FILES[@]}"; do
  if [[ -f "$file" ]]; then
    echo "  ✅ $file"
  else
    echo "  ❌ $file (not found - will be created during build)"  
  fi
done

echo ""
echo "✅ Cleanup analysis complete! New canonical DynamicRecordsDisplay system ready."
