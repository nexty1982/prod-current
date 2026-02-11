#!/bin/bash
# cleanup-not-routed-duplicates.sh
# Removes NOT ROUTED duplicate files within front-end/src
# that have 0 includes and a routed canonical counterpart.

cd "$(git rev-parse --show-toplevel)" || exit 1

NOT_ROUTED=(
  "front-end/src/features/records-centralized/apps/church-management/RecordsPageWrapper.tsx"
  "front-end/src/features/records-centralized/EnhancedRecordsGrid.tsx"
  "front-end/src/components/apps/chat/FriendsList.tsx"
)

CANONICAL=(
  "front-end/src/features/records/apps/church-management/RecordsPageWrapper.tsx"
  "front-end/src/features/records/EnhancedRecordsGrid.tsx"
  "front-end/src/features/social/friends/FriendsList.tsx"
)

echo "============================================================"
echo "  NOT ROUTED Duplicates in front-end/src"
echo "  $(date '+%Y-%m-%d %H:%M:%S')"
echo "============================================================"
echo ""

for i in "${!NOT_ROUTED[@]}"; do
  nr="${NOT_ROUTED[$i]}"
  can="${CANONICAL[$i]}"

  if [ -f "$nr" ]; then
    lines=$(wc -l < "$nr")
    depth=$(echo "$nr" | sed 's|front-end/src/||' | awk -F'/' '{print NF}')
    # Count real imports (excluding tree listings, build artifacts)
    includes=$(grep -rn "$(echo "$nr" | sed 's|front-end/src/||;s|\.tsx$||')" \
      front-end/src/ --include="*.ts" --include="*.tsx" 2>/dev/null | wc -l)

    echo "  NOT ROUTED: $nr"
    echo "    Lines: $lines | Depth: $depth | Includes: $includes"
    echo "    Canonical: $can"
    echo ""
  else
    echo "  ALREADY GONE: $nr"
    echo ""
  fi
done

echo "------------------------------------------------------------"
read -p "Remove all NOT ROUTED files above? (y/N) " confirm
if [ "$confirm" = "y" ]; then
  for nr in "${NOT_ROUTED[@]}"; do
    [ -f "$nr" ] && rm -v "$nr"
  done

  # Clean up empty parent directories
  for nr in "${NOT_ROUTED[@]}"; do
    dir=$(dirname "$nr")
    while [ "$dir" != "front-end/src" ] && [ -d "$dir" ] && [ -z "$(ls -A "$dir")" ]; do
      rmdir -v "$dir"
      dir=$(dirname "$dir")
    done
  done

  echo ""
  echo "✅ Cleanup complete. Run 'npm run build' in front-end/ to verify."
else
  echo "Aborted."
fi
