#!/bin/bash
# remove-orphaned-duplicates.sh
# All files below have 0 imports outside the old Router.tsx

ORPHANS=(
  "front-end/src/features/records/apps/church-management/RecordsPageWrapper.tsx"
  "front-end/src/features/records/EnhancedRecordsGrid.tsx"
  "front-end/src/features/records/apps/records-ui/index.tsx"
  "front-end/src/components/apps/chat/FriendsList.tsx"
  "front-end/src/features/admin/logs/LoggerDashboard.tsx"
  "front-end/src/tools/SiteStructureVisualizer.tsx"
  "front-end/src/components/ui-tools/omtrace/OmtraceConsole.tsx"
  "front-end/src/components/headlines/HeadlineSourcePicker.tsx"
  "front-end/src/tools/om-deps/OM-deps.tsx"
  "front-end/src/features/admin/admin/PermissionsManagement.tsx"
  "front-end/src/features/router-menu-studio/RouterMenuStudioPage.tsx"
  "front-end/src/features/church/apps/church-management/ChurchSetupWizard.tsx"
  "front-end/src/features/admin/admin/BuildConsole.tsx"
  "front-end/src/modules/OMLearn/OMLearn.tsx"
)

echo "=== Orphaned Duplicate Files (NOT ROUTED, 0 includes) ==="
echo "Generated: $(date '+%Y-%m-%d %H:%M:%S')"
echo ""

for f in "${ORPHANS[@]}"; do
  if [ -f "$f" ]; then
    lines=$(wc -l < "$f")
    depth=$(echo "$f" | sed 's|front-end/src/||' | tr '/' '\n' | wc -l)
    echo "  REMOVE: $f"
    echo "    Lines: $lines | Depth: $depth | Includes: 0"
  else
    echo "  ALREADY GONE: $f"
  fi
done

echo ""
read -p "Delete all orphans? (y/N) " confirm
if [ "$confirm" = "y" ]; then
  for f in "${ORPHANS[@]}"; do
    [ -f "$f" ] && rm -v "$f"
  done
  echo "✅ Cleanup complete."
else
  echo "Aborted."
fi
