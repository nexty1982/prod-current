#!/usr/bin/env bash
set -Eeuo pipefail
cd "$(git rev-parse --show-toplevel)"

: "${ROOT:=/var/www/refactored-prod/prod}"
: "${SRC_DIR:=server/src}"
: "${DRY_RUN:=0}"
: "${BRANCH:=chore/dedupe-server-src}"
: "${REPORT:=/tmp/dedupe_report_$(date +%s).csv}"

command -v rg >/dev/null || { echo "ripgrep (rg) is required"; exit 1; }
command -v sed >/dev/null || { echo "sed is required"; exit 1; }
command -v sha256sum >/dev/null || { echo "sha256sum is required"; exit 1; }
git rev-parse --git-dir >/dev/null 2>&1 || { echo "Run inside a Git repo"; exit 1; }
git update-index -q --refresh

if ! git rev-parse --verify -q "$BRANCH" >/dev/null; then
  git checkout -b "$BRANCH"
else
  git checkout "$BRANCH"
fi

mapfile -t FILES < <(find "$SRC_DIR" -type f \( -name '*.js' -o -name '*.cjs' -o -name '*.mjs' -o -name '*.ts' -o -name '*.tsx' -o -name '*.json' \) -print)

declare -A GROUPS
for f in "${FILES[@]}"; do
  base="$(basename "$f")"
  GROUPS["$base"]+="${GROUPS[$base]:+|}$f"
done

echo "basename,choice,fullpath,size,mtime,sha256" > "$REPORT"

declare -A CANONICAL
declare -A DUPLIST

for base in "${!GROUPS[@]}"; do
  IFS='|' read -r -a paths <<< "${GROUPS[$base]}"
  if (( ${#paths[@]} <= 1 )); then
    continue
  fi

  best=""
  best_size=-1
  best_mtime=-1

  declare -A META_SIZE
  declare -A META_MTIME
  declare -A META_SHA

  for p in "${paths[@]}"; do
    sz=$(stat -c '%s' "$p")
    mt=$(stat -c '%Y' "$p")
    sh=$(sha256sum "$p" | awk '{print $1}')
    META_SIZE["$p"]="$sz"
    META_MTIME["$p"]="$mt"
    META_SHA["$p"]="$sh"
    if (( sz > best_size || (sz == best_size && mt > best_mtime) )); then
      best="$p"; best_size="$sz"; best_mtime="$mt"
    fi
  done

  CANONICAL["$base"]="$best"
  DUPLIST["$base"]="${paths[*]}"

  for p in "${paths[@]}"; do
    choice=$([ "$p" = "$best" ] && echo CANONICAL || echo DUPLICATE)
    echo "$base,$choice,$p,${META_SIZE[$p]},${META_MTIME[$p]},${META_SHA[$p]}" >> "$REPORT"
  done
done

if [ ${#CANONICAL[@]} -eq 0 ]; then
  echo "No duplicate basenames found under $SRC_DIR"
  echo "Report written to: $REPORT"
  exit 0
fi

fix_refs() {
  local from_abs="$1"
  local to_abs="$2"
  local from_rel="${from_abs#server/src/}"
  local to_rel="${to_abs#server/src/}"
  strip_ext() { case "$1" in *.ts|*.tsx|*.js|*.mjs|*.cjs) echo "${1%.*}" ;; *) echo "$1" ;; esac; }
  local from_rel_noext; from_rel_noext="$(strip_ext "$from_rel")"
  local to_rel_noext;   to_rel_noext="$(strip_ext "$to_rel")"
  local SCOPE="$ROOT"
  declare -a patterns_from=(
    "server/src/${from_rel}"
    "server/src/${from_rel_noext}"
    "@/${from_rel}"
    "@/${from_rel_noext}"
  )
  declare -a patterns_to=(
    "server/src/${to_rel}"
    "server/src/${to_rel_noext}"
    "@/${to_rel}"
    "@/${to_rel_noext}"
  )
  for i in "${!patterns_from[@]}"; do
    local FROM="${patterns_from[$i]}"
    local TO="${patterns_to[$i]}"
    if ! rg -Il --hidden --no-ignore -g '!**/.git/**' -g '!**/node_modules/**' -e "$(printf '%s' "$FROM" | sed 's/[.[\*^$()+?{}|]/\\&/g')" "$SCOPE" >/tmp/_hits.$$ 2>/dev/null; then
      continue
    fi
    echo "Updating references: '$FROM' -> '$TO'"
    if [ "$DRY_RUN" = "1" ]; then
      cat /tmp/_hits.$$
    else
      while IFS= read -r file; do
        sed -i -E "s|$(printf '%s' "$FROM" | sed 's/[.[\*^$()+?{}|]/\\&/g')|$TO|g" "$file"
      done </tmp/_hits.$$
      git add -A
    fi
    rm -f /tmp/_hits.$$
  done
}

for base in "${!DUPLIST[@]}"; do
  canonical="${CANONICAL[$base]}"
  IFS=' ' read -r -a group <<< "${DUPLIST[$base]}"
  for p in "${group[@]}"; do
    [ "$p" = "$canonical" ] && continue
    from_abs="${p#./}"
    to_abs="${canonical#./}"
    fix_refs "$from_abs" "$to_abs"
  done
done

echo "Report written to: $REPORT"

if [ "$DRY_RUN" = "1" ]; then
  echo "DRY_RUN=1 -> no files modified"
  exit 0
fi

if ! git diff --quiet --cached; then
  git commit -m "chore(dedupe): unify imports to canonical files in $SRC_DIR; report: $REPORT"
  echo "Committed changes on branch: $BRANCH"
else
  echo "No changes to commit."
fi

echo "Done."
