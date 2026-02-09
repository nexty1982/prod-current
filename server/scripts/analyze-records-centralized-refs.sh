#!/bin/bash
# Analyze records-centralized module references
# Finds all imports and requires for records-centralized features

set -euo pipefail

cd /var/www/orthodoxmetrics/prod

OUT="/tmp/records-centralized-refs-$(date +%Y%m%d_%H%M%S)"
mkdir -p "$OUT"

echo "=================================================="
echo "Analyzing records-centralized references"
echo "Output directory: $OUT"
echo "=================================================="
echo ""

# Find all import/require statements
echo "1. Searching for imports and requires..."
rg --no-heading --line-number --hidden --follow \
  --glob '!.git/**' \
  --glob '!**/node_modules/**' \
  --glob '!**/dist/**' \
  --glob '!**/.vite/**' \
  "from ['\"][^'\"]*records-centralized" front-end/src > "$OUT/imports-from.out" || true

rg --no-heading --line-number --hidden --follow \
  --glob '!.git/**' \
  --glob '!**/node_modules/**' \
  --glob '!**/dist/**' \
  --glob '!**/.vite/**' \
  "require\(['\"][^'\"]*records-centralized" front-end/src >> "$OUT/imports-from.out" || true

rg --no-heading --line-number --hidden --follow \
  --glob '!.git/**' \
  --glob '!**/node_modules/**' \
  --glob '!**/dist/**' \
  --glob '!**/.vite/**' \
  "@features/records-centralized|features/records-centralized" front-end/src >> "$OUT/imports-from.out" || true

echo "   Found $(wc -l < "$OUT/imports-from.out") import/require lines"

# Find all mentions in routing and components
echo "2. Searching for routing mentions..."
rg --no-heading --line-number --hidden --follow \
  --glob '!.git/**' \
  --glob '!**/node_modules/**' \
  --glob '!**/dist/**' \
  "records-centralized" front-end/src/components/routing front-end/src > "$OUT/mentions.out" || true

echo "   Found $(wc -l < "$OUT/mentions.out") routing mentions"

# Find server-side mentions
echo "3. Searching for server-side mentions..."
rg --no-heading --line-number --hidden --follow \
  --glob '!.git/**' \
  --glob '!**/node_modules/**' \
  --glob '!**/dist/**' \
  "records-centralized" server/src server/routes server/middleware > "$OUT/server-mentions.out" 2>/dev/null || true

echo "   Found $(wc -l < "$OUT/server-mentions.out") server mentions"

# Extract import specifiers
echo "4. Extracting import specifiers..."
OUT="$OUT" python3 - <<'PY'
import os, re, json, pathlib
out = os.environ["OUT"]
imports_path = pathlib.Path(out)/"imports-from.out"
text = imports_path.read_text(errors="ignore") if imports_path.exists() else ""
paths = []
for line in text.splitlines():
  m = re.search(r"""from\s+['"]([^'"]*records-centralized[^'"]*)['"]""", line)
  if m: paths.append(m.group(1))
  m = re.search(r"""require\(\s*['"]([^'"]*records-centralized[^'"]*)['"]\s*\)""", line)
  if m: paths.append(m.group(1))
uniq = sorted(set(paths))
(pathlib.Path(out)/"import-specifiers.json").write_text(json.dumps(uniq, indent=2))
print(f"   Found {len(uniq)} unique import specifiers")
for spec in uniq[:10]:
    print(f"     - {spec}")
if len(uniq) > 10:
    print(f"     ... and {len(uniq) - 10} more")
PY

# Resolve to filesystem paths
echo "5. Resolving to filesystem paths..."
OUT="$OUT" python3 - <<'PY'
import os, re, json, pathlib
out = pathlib.Path(os.environ["OUT"])
specs = json.loads((out/"import-specifiers.json").read_text())

# Normalize to possible filesystem candidates (best-effort)
cands = set()
for s in specs:
  s2 = s
  s2 = re.sub(r"^@features/", "front-end/src/features/", s2)
  s2 = re.sub(r"^@/", "front-end/src/", s2)
  if s2.startswith("features/"):
    s2 = "front-end/src/" + s2
  if "records-centralized" not in s2:
    continue
  
  # Try common suffixes
  for suf in ["", ".ts", ".tsx", ".js", ".jsx", "/index.ts", "/index.tsx", "/index.js", "/index.jsx"]:
    cands.add(s2 + suf)

existing = sorted([c for c in cands if pathlib.Path(c).exists()])
(out/"resolved-existing-paths.txt").write_text("\n".join(existing) + "\n")

print(f"   Found {len(existing)} existing module files:")
for path in existing[:15]:
    print(f"     ✓ {path}")
if len(existing) > 15:
    print(f"     ... and {len(existing) - 15} more")
PY

# Summary
echo ""
echo "=================================================="
echo "ANALYSIS COMPLETE"
echo "=================================================="
echo ""
echo "Results saved to: $OUT"
echo ""
echo "Files created:"
echo "  - imports-from.out          : All import/require lines"
echo "  - mentions.out              : All mentions in code"
echo "  - server-mentions.out       : Server-side mentions"
echo "  - import-specifiers.json    : Unique import paths (JSON)"
echo "  - resolved-existing-paths.txt : Resolved filesystem paths"
echo ""
echo "To view results:"
echo "  cat $OUT/import-specifiers.json"
echo "  cat $OUT/resolved-existing-paths.txt"
echo ""
echo "To see detailed usage:"
echo "  less $OUT/imports-from.out"
echo ""
