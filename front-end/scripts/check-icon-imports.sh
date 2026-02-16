#!/bin/bash
# Guard script to prevent direct lucide-react and @mui/icons-material imports in Records scope
# This ensures all Records pages use the canonical icon module at @/shared/ui/icons

RECORDS_PATH="src/features/records-centralized"
EXIT_CODE=0

echo "🔍 Checking Records scope for forbidden icon imports..."

# Check for direct lucide-react imports
LUCIDE_IMPORTS=$(grep -r "from ['\"]lucide-react['\"]" "$RECORDS_PATH" 2>/dev/null || true)
if [ -n "$LUCIDE_IMPORTS" ]; then
  echo "❌ ERROR: Found direct lucide-react imports in Records scope:"
  echo "$LUCIDE_IMPORTS"
  echo ""
  echo "   Use: import { IconName } from '@/shared/ui/icons';"
  echo "   Instead of: import { IconName } from 'lucide-react';"
  EXIT_CODE=1
fi

# Check for @mui/icons-material imports
MUI_IMPORTS=$(grep -r "from ['\"]@mui/icons-material['\"]" "$RECORDS_PATH" 2>/dev/null || true)
if [ -n "$MUI_IMPORTS" ]; then
  echo "❌ ERROR: Found @mui/icons-material imports in Records scope:"
  echo "$MUI_IMPORTS"
  echo ""
  echo "   Records pages must use lucide icons from '@/shared/ui/icons'"
  echo "   MUI icons are not allowed in Records scope."
  EXIT_CODE=1
fi

if [ $EXIT_CODE -eq 0 ]; then
  echo "✅ All Records files use canonical icon module correctly!"
fi

exit $EXIT_CODE
