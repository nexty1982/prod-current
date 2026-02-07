#!/bin/bash
# cleanup-broken-refs-and-empty-dirs.sh
# 1. Reports broken Router.tsx references (files that don't exist)
# 2. Finds and removes empty directories under front-end/src

TARGET="front-end/src"
ROUTER="$TARGET/routes/Router.tsx"

echo "============================================================"
echo "  FULL CLEANUP REPORT: $TARGET"
echo "  $(date '+%Y-%m-%d %H:%M:%S')"
echo "============================================================"

# ── 1. Check for broken Router.tsx imports ─────────────────────────
echo ""
echo "── BROKEN ROUTER.tsx IMPORTS ──────────────────────────────"
echo ""

broken_count=0

# Extract all relative import paths from Router.tsx
grep -oP "from\s+['\"]\.\./(.*?)['\"]" "$ROUTER" | sed "s|from ['\"]../||;s|['\"]||g" | sort -u | while read -r rel; do
    full="$TARGET/$rel"
    # Check with .tsx, .ts, .js, /index.tsx, /index.ts extensions
    found=false
    for ext in "" ".tsx" ".ts" ".js" "/index.tsx" "/index.ts"; do
        if [ -e "${full}${ext}" ]; then
            found=true
            break
        fi
    done
    if [ "$found" = "false" ]; then
        printf "  BROKEN: %-60s\n" "$TARGET/$rel"
        broken_count=$((broken_count + 1))
    fi
done

grep -oP "import\(\s*['\"]\.\./(.*?)['\"]" "$ROUTER" | sed "s|import(['\"]../||;s|['\"]||g" | sort -u | while read -r rel; do
    full="$TARGET/$rel"
    found=false
    for ext in "" ".tsx" ".ts" ".js" "/index.tsx" "/index.ts"; do
        if [ -e "${full}${ext}" ]; then
            found=true
            break
        fi
    done
    if [ "$found" = "false" ]; then
        printf "  BROKEN: %-60s\n" "$TARGET/$rel"
    fi
done

# ── 2. Find empty directories ─────────────────────────────────────
echo ""
echo "── EMPTY DIRECTORIES ──────────────────────────────────────"
echo ""

empty_count=0
while IFS= read -r dir; do
    depth=$(echo "$dir" | sed "s|${TARGET}/||" | tr '/' '\n' | wc -l)
    printf "  EMPTY: %-60s  (depth: %d)\n" "$dir" "$depth"
    empty_count=$((empty_count + 1))
done < <(find "$TARGET" -type d -empty | sort)

echo ""
echo "  Total empty directories: $empty_count"

# ── 3. Optional cleanup ───────────────────────────────────────────
echo ""
echo "============================================================"
if [ "$empty_count" -gt 0 ]; then
    read -p "Remove all empty directories? (y/N) " confirm
    if [ "$confirm" = "y" ]; then
        find "$TARGET" -type d -empty -delete -print | sed 's/^/  Removed: /'
        echo ""
        echo "  ✅ Empty directories removed."
    fi
fi

echo ""
echo "  NOTE: Broken Router.tsx imports need manual fixing."
echo "  The Router.tsx references files that no longer exist."
echo "  These imports will cause build failures."
echo "============================================================"
