#!/usr/bin/env bash
set -Eeuo pipefail
IFS=$'\n\t'

# Sort/archive TS|JS|SH|CJS|SQL into /misc/code/<EXT>, then mirror to SVN.
# - Interactive preview when run with no args (auto-continues after countdown)
# - Progress bar for copy/move
# - Spinner for SVN commit
#
# Defaults (override via env or at preview prompt):
#   ROOT=/var/www/orthodoxmetrics/prod
#   DEST_BASE=$ROOT/misc/code
#   DAYS=30            # <DAYS copy, >DAYS move
#   TIME_MODE=mtime    # or atime
#   YEAR=2025          # SVN year folder
#   SVN_URL_ROOT=svn://192.168.1.239/orthodoxmetrics/trunk/code
#   DRY_RUN=0
#   AUTO_CONTINUE_SECONDS=8   # preview timeout

ROOT="${ROOT:-/var/www/orthodoxmetrics/prod}"
DEST_BASE="${DEST_BASE:-$ROOT/misc/code}"
DAYS="${DAYS:-30}"
TIME_MODE="${TIME_MODE:-mtime}"   # mtime|atime
YEAR="${YEAR:-2025}"
SVN_URL_ROOT="${SVN_URL_ROOT:-svn://192.168.1.239/orthodoxmetrics/trunk/code}"
SVN_URL="$SVN_URL_ROOT/$YEAR"
SVN_WC="$DEST_BASE/.svn-wc-$YEAR"
DRY_RUN="${DRY_RUN:-0}"

LOG_DIR="$ROOT/ops/logs"
LOG_FILE="$LOG_DIR/om_sort_archive.log"

have()  { command -v "$1" >/dev/null 2>&1; }
say()   { printf "[%s] %s\n" "$(date +%F' '%T)" "$*" | tee -a "$LOG_FILE" >&2; }
die()   { say "ERROR: $*"; exit 1; }
doit()  { [[ "$DRY_RUN" == "1" ]] && say "DRY: $*" || eval "$@" | tee -a "$LOG_FILE" >/dev/null; }

# ---------- log rotation (~10MB, keep 5) ----------
rotate_logs() {
  mkdir -p "$LOG_DIR"
  [[ ! -f "$LOG_FILE" ]] && : >"$LOG_FILE"
  local sz; sz=$(stat -c %s "$LOG_FILE" 2>/dev/null || echo 0)
  if (( sz > 10*1024*1024 )); then
    for i in 5 4 3 2 1; do
      [[ -f "${LOG_FILE}.${i}" ]] && mv -f "${LOG_FILE}.${i}" "${LOG_FILE}.$((i+1))" || true
    done
    mv -f "$LOG_FILE" "${LOG_FILE}.1"
    : > "$LOG_FILE"
  fi
}
rotate_logs

# ---------- utilities ----------
ext_upper() { local e="${1##*.}"; echo "${e^^}"; }
dest_dir_for() {
  local U; U="$(ext_upper "$1")"
  case "$U" in TS|JS|SH|CJS|SQL) echo "$DEST_BASE/$U" ;; *) echo "" ;; esac
}
mk_dest_dirs() { for d in TS JS SH CJS SQL; do [[ "$DRY_RUN" == "1" ]] && echo "DRY: mkdir -p '$DEST_BASE/$d'" || mkdir -p "$DEST_BASE/$d"; done; }
lines_of() { [[ -s "$1" ]] && wc -l < "$1" | tr -d ' ' || echo 0; }
mtime_of() { stat -c %Y -- "$1"; }

copy_or_move() { local mode="$1" src="$2" dest="$3"; [[ "$mode" == "copy" ]] && doit "cp -a -- '$src' '$dest'" || doit "mv -f -- '$src' '$dest'"; }

handle_file() {
  local mode="$1" src="$2" dest_dir="$3"
  local base dest; base="$(basename "$src")"; dest="$dest_dir/$base"

  if [[ ! -e "$dest" ]]; then
    say "[$(printf '%5s' "$mode")] $src -> $dest"
    copy_or_move "$mode" "$src" "$dest"
    return
  fi

  local sl dl; sl="$(lines_of "$src")"; dl="$(lines_of "$dest")"
  if   (( sl > dl )); then say "[KEEP SRC] $base (src:$sl > dest:$dl)"; copy_or_move "$mode" "$src" "$dest"
  elif (( sl < dl )); then say "[KEEP DEST] $base (dest:$dl >= src:$sl)"; [[ "$mode" == "move" ]] && { say "[DELETE SRC] $src"; doit "rm -f -- '$src'"; }
  else
    local sm dm; sm="$(mtime_of "$src")"; dm="$(mtime_of "$dest")"
    if (( sm > dm )); then say "[TIE→NEWER] replace dest with src for $base"; copy_or_move "$mode" "$src" "$dest"
    else say "[TIE→KEEP DEST] $base"; [[ "$mode" == "move" ]] && { say "[DELETE SRC] $src"; doit "rm -f -- '$src'"; }
    fi
  fi
}

# ---------- find helpers ----------
time_field() { [[ "$TIME_MODE" == "atime" ]] && echo "-atime" || echo "-mtime"; }

find_copy_stream() {
  local tf; tf="$(time_field)"
  find "$ROOT" \( -type d \( -name node_modules -o -name dist -o -name build -o -name .git -o -name .next -o -name .cache -o -name coverage -o -name .turbo -o -name vendor -o -name tmp -o -name logs \) -prune \) -o \
    -path "$ROOT/front-end/src" -prune -o \
    -path "$DEST_BASE" -prune -o \
    -path "$SVN_WC" -prune -o \
    -type f \( -iname '*.ts' -o -iname '*.js' -o -iname '*.sh' -o -iname '*.cjs' -o -iname '*.sql' \) "$tf" "-$DAYS" -print0
}
find_move_stream() {
  local tf; tf="$(time_field)"
  find "$ROOT" \( -type d \( -name node_modules -o -name dist -o -name build -o -name .git -o -name .next -o -name .cache -o -name coverage -o -name .turbo -o -name vendor -o -name tmp -o -name logs \) -prune \) -o \
    -path "$ROOT/front-end/src" -prune -o \
    -path "$DEST_BASE" -prune -o \
    -path "$SVN_WC" -prune -o \
    -type f \( -iname '*.ts' -o -iname '*.js' -o -iname '*.sh' -o -iname '*.cjs' -o -iname '*.sql' \) "$tf" "+$DAYS" -print0
}

count_ext() {  # ext, cmp ('-' for copy window, '+' for move window)
  local ext="$1" cmp="$2" tf; tf="$(time_field)"
  find "$ROOT" \( -type d \( -name node_modules -o -name dist -o -name build -o -name .git -o -name .next -o -name .cache -o -name coverage -o -name .turbo -o -name vendor -o -name tmp -o -name logs \) -prune \) -o \
    -path "$ROOT/front-end/src" -prune -o \
    -path "$DEST_BASE" -prune -o \
    -path "$SVN_WC" -prune -o \
    -type f -iname "*.${ext}" "$tf" "${cmp}${DAYS}" -print | wc -l
}
count_all() {
  local cmp="$1" total=0 n
  for e in ts js sh cjs sql; do n=$(count_ext "$e" "$cmp"); total=$((total + n)); done
  echo "$total"
}

# ---------- progress UI ----------
PG_TOTAL=0
PG_COUNT=0
PG_WIDTH=40
progress_init() {
  PG_TOTAL="${1:-0}"
  PG_COUNT=0
  tput civis 2>/dev/null || true
  printf "\n"
  progress_draw "starting…"
}
progress_draw() {
  local msg="${1:-}"
  local total=$(( PG_TOTAL > 0 ? PG_TOTAL : 1 ))
  local pct=$(( PG_COUNT * 100 / total ))
  local filled=$(( pct * PG_WIDTH / 100 ))
  local empty=$(( PG_WIDTH - filled ))
  printf "\r[%.*s%*s] %3d%%  (%d/%d) %s" \
    "$filled" "########################################" \
    "$empty" "" \
    "$pct" "$PG_COUNT" "$PG_TOTAL" "$msg"
}
progress_tick() { local msg="${1:-}"; (( PG_COUNT++ )); progress_draw "$msg"; }
progress_done() { progress_draw "done."; printf "\n"; tput cnorm 2>/dev/null || true; }

# ---------- spinner (for SVN commit) ----------
with_spinner() {
  local label="$1"; shift
  local cmd=( "$@" )
  local spin='-\|/'; local i=0
  tput civis 2>/dev/null || true
  "${cmd[@]}" &
  local pid=$!
  while kill -0 "$pid" 2>/dev/null; do
    i=$(( (i+1) % 4 ))
    printf "\r[%c] %s" "${spin:$i:1}" "$label"
    sleep 0.1
  done
  wait "$pid"
  printf "\r[✓] %s\n" "$label"
  tput cnorm 2>/dev/null || true
}

# ---------- SVN helpers ----------
svn_flags() { local f="--non-interactive"; [[ -n "${SVN_USER:-}" ]] && f="$f --username \"${SVN_USER}\""; [[ -n "${SVN_PASS:-}" ]] && f="$f --password \"${SVN_PASS}\""; echo "$f"; }
svn_ensure_wc() {
  [[ "$DRY_RUN" == "1" ]] && { say "DRY: ensure SVN WC $SVN_WC (URL: $SVN_URL)"; return 0; }
  have svn || die "svn client not found"
  if ! svn info $(svn_flags) "$SVN_URL" >/dev/null 2>&1; then
    say "Creating remote SVN path: $SVN_URL"
    doit "svn mkdir $(svn_flags) \"$SVN_URL\" -m \"create year folder $YEAR for code archive\" || true"
  fi
  if [[ ! -d "$SVN_WC/.svn" ]]; then
    mkdir -p "$SVN_WC"
    say "Checking out $SVN_URL -> $SVN_WC"
    doit "svn checkout $(svn_flags) \"$SVN_URL\" \"$SVN_WC\""
  else
    say "Updating working copy: $SVN_WC"
    doit "svn cleanup \"$SVN_WC\""
    doit "svn update  $(svn_flags) \"$SVN_WC\""
  fi
  for d in TS JS SQL SH CJS; do
    if [[ ! -d "$SVN_WC/$d" ]]; then
      say "Creating SVN folder: $SVN_WC/$d"
      mkdir -p "$SVN_WC/$d"
      doit "svn add --parents \"$SVN_WC/$d\" || true"
    fi
  done
}
svn_lines_pick() { local s="$1" d="$2" sl dl; sl="$(lines_of "$s")"; dl="$(lines_of "$d")"; if   (( sl > dl )); then echo src; elif (( sl < dl )); then echo dest; else local sm dm; sm="$(mtime_of "$s")"; dm="$(mtime_of "$d")"; (( sm > dm )) && echo src || echo dest; fi; }
svn_sync_file() {
  local src="$1" svn_dest_dir="$2" base; base="$(basename "$src")"
  local dest="$svn_dest_dir/$base"
  if [[ ! -e "$dest" ]]; then
    say "[SVN ADD] $src -> $dest"
    doit "cp -a -- '$src' '$dest'"
    doit "svn add --force '$dest' || true"
  else
    case "$(svn_lines_pick "$src" "$dest")" in
      src)  say "[SVN UPDATE] $dest <= $src (longer/newer)"; doit "cp -a -- '$src' '$dest'";;
      dest) say "[SVN KEEP]   $dest (>= lines)";;
    esac
  fi
}
svn_commit_all() {
  local msg="$1"
  [[ "$DRY_RUN" == "1" ]] && { say "DRY: svn add/commit in $SVN_WC"; return 0; }
  doit "svn add --force \"$SVN_WC\" || true"
  with_spinner "SVN commit…" svn commit $(svn_flags) "$SVN_WC" -m "$msg" || true
}

# ---------- interactive preview ----------
if [[ $# -eq 0 && -z "${PREVIEW_DONE:-}" ]]; then
  clear || true
  echo "┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓"
  echo "┃  Sort & Archive Preview                                           ┃"
  echo "┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛"
  echo "Root: $ROOT"
  echo "Dest: $DEST_BASE/{TS,JS,SH,CJS,SQL}"
  echo "SVN : $SVN_URL"
  echo "Rule: <${DAYS}d → COPY   |   >${DAYS}d → MOVE   (using ${TIME_MODE})"
  echo

  # COPY counts
  ts=$(count_ext ts '-') ; js=$(count_ext js '-') ; shc=$(count_ext sh '-') ; cjs=$(count_ext cjs '-') ; sql=$(count_ext sql '-')
  copy_total=$((ts+js+shc+cjs+sql))
  printf "COPY (<%sd):  TS:%5d  JS:%5d  SH:%5d  CJS:%5d  SQL:%5d  | Total: %d\n" "$DAYS" "$ts" "$js" "$shc" "$cjs" "$sql" "$copy_total"

  # MOVE counts
  ts=$(count_ext ts '+') ; js=$(count_ext js '+') ; shc=$(count_ext sh '+') ; cjs=$(count_ext cjs '+') ; sql=$(count_ext sql '+')
  move_total=$((ts+js+shc+cjs+sql))
  printf "MOVE (>%sd):  TS:%5d  JS:%5d  SH:%5d  CJS:%5d  SQL:%5d  | Total: %d\n" "$DAYS" "$ts" "$js" "$shc" "$cjs" "$sql" "$move_total"

  echo
  TIMEOUT="${AUTO_CONTINUE_SECONDS:-8}"
  echo "Press **Enter** to continue with DEFAULTS (auto-continue in ${TIMEOUT}s):"
  echo "  DAYS=$DAYS TIME_MODE=$TIME_MODE YEAR=$YEAR DRY_RUN=0   ← default"
  echo "Or type overrides (env/args), e.g.:  DAYS=60 TIME_MODE=atime DRY_RUN=1"
  echo

  SCRIPT_PATH="$(readlink -f "$0" || echo "$0")"

  # countdown + optional input
  for s in $(seq "$TIMEOUT" -1 1); do
    printf "\rWaiting: %2ds  " "$s"
    read -r -t 1 user_args && break || true
  done
  printf "\r                \r"

  if [[ -n "${user_args:-}" ]]; then
    exec bash -lc "env PREVIEW_DONE=1 $user_args \"$SCRIPT_PATH\""
  else
    exec env PREVIEW_DONE=1 \
      ROOT="$ROOT" DEST_BASE="$DEST_BASE" DAYS="$DAYS" TIME_MODE="$TIME_MODE" YEAR="$YEAR" DRY_RUN=0 \
      "$SCRIPT_PATH"
  fi
fi

# ---------- main ----------
say "=== RUN START === ROOT=$ROOT DEST=$DEST_BASE DAYS=$DAYS TIME_MODE=$TIME_MODE YEAR=$YEAR DRY_RUN=$DRY_RUN"
mk_dest_dirs

# Pre-count for progress
COPY_COUNT=$(count_all '-')
MOVE_COUNT=$(count_all '+')
TOTAL_COUNT=$((COPY_COUNT + MOVE_COUNT))
progress_init "$TOTAL_COUNT"

say "Scanning recent files ($(time_field) -$DAYS) → COPY"
find_copy_stream | while IFS= read -r -d '' f; do
  ext_dir="$(dest_dir_for "$f")"; [[ -z "$ext_dir" ]] && continue
  handle_file "copy" "$f" "$ext_dir"
  progress_tick "copy"
done

say "Scanning old files ($(time_field) +$DAYS) → MOVE"
find_move_stream | while IFS= read -r -d '' f; do
  ext_dir="$(dest_dir_for "$f")"; [[ -z "$ext_dir" ]] && continue
  handle_file "move" "$f" "$ext_dir"
  progress_tick "move"
done

progress_done

say "Preparing SVN working copy…"
svn_ensure_wc
for E in TS JS SQL SH CJS; do
  src_dir="$DEST_BASE/$E"; [[ -d "$src_dir" ]] || continue
  say "SVN sync: $src_dir -> $SVN_WC/$E"
  while IFS= read -r -d '' file; do
    svn_sync_file "$file" "$SVN_WC/$E"
  done < <(find "$src_dir" -maxdepth 1 -type f -print0)
done

svn_commit_all "code archive sync: year=$YEAR window=${DAYS}d mode=$TIME_MODE $(date -u +'%Y-%m-%dT%H:%M:%SZ')"
say "=== RUN END ==="

