set -Eeuo pipefail
cd "$(git rev-parse --show-toplevel)"

echo "=============================="
echo "RECORDS FORENSIC SCAN"
echo "=============================="
echo

echo "== Large TSX files (>50KB) =="
find . -type f -name "*.tsx" -size +50k -print | sort
echo

echo "== Record-related TSX filenames =="
find . -type f \( \
  -iname "*record*.tsx" -o \
  -iname "*baptism*.tsx" -o \
  -iname "*marriage*.tsx" -o \
  -iname "*funeral*.tsx" \
\) | sort
echo

echo "== AG Grid usage (AGGridReact) =="
grep -RIn "AGGridReact" . --include="*.tsx" || true
echo

echo "== Column Definitions (columnDefs) =="
grep -RIn "columnDefs" . --include="*.ts" --include="*.tsx" || true
echo

echo "== Record / Template / Config keywords =="
grep -RIn "RecordTableConfig\|templateProfile\|recordType\|LiveTableBuilder" . \
  --include="*.ts" --include="*.tsx" || true
echo

echo "== Git history: record-related TSX changes =="
git log --all --name-status -- \
  "*record*.tsx" \
  "*baptism*.tsx" \
  "*marriage*.tsx" \
  "*funeral*.tsx" || true
echo

echo "== Largest files ever committed (top 50) =="
git rev-list --all | while read c; do
  git ls-tree -r --long "$c"
done | sort -k4 -n | tail -50

echo
echo "=============================="
echo "SCAN COMPLETE"
echo "=============================="

