#!/usr/bin/env bash
#
# test-omd-1302.sh — Verify the PR #826 / OMD-1302 test plan.
#
# Clones the repo into a scratch dir at a chosen ref, then runs the five
# checks from the PR's test plan and stores results to disk.
#
# Usage:
#   ./server/scripts/test-omd-1302.sh [-r <git-ref>] [-e <path-to-real-.env>] \
#                                     [-o <output-dir>] [-u <repo-url>] [-s] [-h]
#
# Options:
#   -r  Git ref to test (branch, tag, or SHA). Default: PR #826 branch.
#   -e  Path to a real front-end/.env for var-name parity comparison.
#       Default: /var/www/orthodoxmetrics/prod/front-end/.env
#   -o  Output directory for results. Default: /tmp/omd-1302-test-<ts>
#   -u  Repo URL to clone. Default: current repo's origin remote.
#   -s  Skip the npm ci + npm run build steps (fast mode).
#   -h  Print this help.
#
# Exit codes:
#   0  All checks passed
#   1  One or more checks failed
#   2  Script-level error (bad args, tool missing, clone failed, etc.)

set -u
set -o pipefail

# ------------------------------------------------------------------------
# Defaults
# ------------------------------------------------------------------------
DEFAULT_REF="chore/1302-phase-4-un-ignore-server-scripts-commit-front-end"
DEFAULT_ENV="/var/www/orthodoxmetrics/prod/front-end/.env"
EXPECTED_SCRIPT_COUNT=16

REF="$DEFAULT_REF"
REAL_ENV="$DEFAULT_ENV"
OUTPUT_DIR=""
REPO_URL=""
SKIP_BUILD=0

# ------------------------------------------------------------------------
# Arg parsing
# ------------------------------------------------------------------------
usage() {
  sed -n '2,25p' "$0" | sed 's/^# \{0,1\}//'
  exit 0
}

while getopts ":r:e:o:u:sh" opt; do
  case "$opt" in
    r) REF="$OPTARG" ;;
    e) REAL_ENV="$OPTARG" ;;
    o) OUTPUT_DIR="$OPTARG" ;;
    u) REPO_URL="$OPTARG" ;;
    s) SKIP_BUILD=1 ;;
    h) usage ;;
    \?) echo "Unknown option: -$OPTARG" >&2; exit 2 ;;
    :)  echo "Option -$OPTARG requires an argument" >&2; exit 2 ;;
  esac
done

# Resolve repo URL if not given — read from the CWD's origin remote.
if [ -z "$REPO_URL" ]; then
  REPO_URL="$(git -C "$(dirname "$0")/../.." remote get-url origin 2>/dev/null || true)"
fi
if [ -z "$REPO_URL" ]; then
  echo "ERROR: could not determine repo URL. Pass -u <url>." >&2
  exit 2
fi

# ------------------------------------------------------------------------
# Output setup
# ------------------------------------------------------------------------
TS="$(date +%Y%m%d-%H%M%S)"
if [ -z "$OUTPUT_DIR" ]; then
  OUTPUT_DIR="/tmp/omd-1302-test-$TS"
fi
mkdir -p "$OUTPUT_DIR"

LOG_FILE="$OUTPUT_DIR/results.log"
JSON_FILE="$OUTPUT_DIR/results.json"
SUMMARY_FILE="$OUTPUT_DIR/summary.txt"
CLONE_DIR="$OUTPUT_DIR/clone"

# Color helpers (TTY only)
if [ -t 1 ]; then
  C_RED=$'\033[31m'; C_GREEN=$'\033[32m'; C_YELLOW=$'\033[33m'
  C_CYAN=$'\033[36m'; C_BOLD=$'\033[1m'; C_RESET=$'\033[0m'
else
  C_RED=""; C_GREEN=""; C_YELLOW=""; C_CYAN=""; C_BOLD=""; C_RESET=""
fi

log()  { printf '%s\n' "$*" | tee -a "$LOG_FILE"; }
info() { printf '%s[INFO]%s  %s\n' "$C_CYAN" "$C_RESET" "$*" | tee -a "$LOG_FILE"; }
pass() { printf '%s[PASS]%s  %s\n' "$C_GREEN" "$C_RESET" "$*" | tee -a "$LOG_FILE"; }
fail() { printf '%s[FAIL]%s  %s\n' "$C_RED" "$C_RESET" "$*" | tee -a "$LOG_FILE"; }
warn() { printf '%s[WARN]%s  %s\n' "$C_YELLOW" "$C_RESET" "$*" | tee -a "$LOG_FILE"; }

# Result accumulator — one line per check, for the JSON summary.
RESULTS_TMP="$OUTPUT_DIR/.results.tmp"
: > "$RESULTS_TMP"

record() {
  # record <id> <name> <pass|fail|skip> <message>
  local id="$1" name="$2" status="$3" msg="${4:-}"
  printf '%s\t%s\t%s\t%s\n' "$id" "$name" "$status" "$msg" >> "$RESULTS_TMP"
}

# JSON-escape a string (handles quotes, backslashes, newlines).
json_escape() {
  python3 -c 'import json,sys; print(json.dumps(sys.stdin.read().rstrip("\n")))'
}

# ------------------------------------------------------------------------
# Preflight
# ------------------------------------------------------------------------
for tool in git python3 node npm; do
  if ! command -v "$tool" >/dev/null 2>&1; then
    echo "ERROR: required tool '$tool' not on PATH" >&2
    exit 2
  fi
done

info "OMD-1302 test plan runner"
info "ref:        $REF"
info "repo:       $REPO_URL"
info "real .env:  $REAL_ENV"
info "output:     $OUTPUT_DIR"
info "skip build: $SKIP_BUILD"
log  ""

# ------------------------------------------------------------------------
# Clone
# ------------------------------------------------------------------------
info "Cloning $REPO_URL @ $REF into $CLONE_DIR"
if ! git clone --quiet --branch "$REF" --single-branch --depth 50 \
      "$REPO_URL" "$CLONE_DIR" >>"$LOG_FILE" 2>&1; then
  fail "git clone failed — see $LOG_FILE"
  record clone "fresh clone" fail "git clone failed"
  exit 2
fi
pass "clone succeeded"
CLONED_SHA="$(git -C "$CLONE_DIR" rev-parse HEAD)"
info "HEAD: $CLONED_SHA"
log ""

# ------------------------------------------------------------------------
# Check 1: server/scripts/ populated with expected count of files
# ------------------------------------------------------------------------
info "Check 1: server/scripts/ populated ($EXPECTED_SCRIPT_COUNT files expected)"
if [ ! -d "$CLONE_DIR/server/scripts" ]; then
  fail "server/scripts/ directory missing from clone"
  record 1 "server/scripts populated" fail "directory missing"
else
  ACTUAL_COUNT="$(find "$CLONE_DIR/server/scripts" -maxdepth 1 -type f -name '*.js' | wc -l | tr -d ' ')"
  find "$CLONE_DIR/server/scripts" -maxdepth 1 -type f -name '*.js' -printf '  %f\n' \
    | sort >> "$LOG_FILE"
  if [ "$ACTUAL_COUNT" = "$EXPECTED_SCRIPT_COUNT" ]; then
    pass "server/scripts/ has $ACTUAL_COUNT .js files (expected $EXPECTED_SCRIPT_COUNT)"
    record 1 "server/scripts populated" pass "$ACTUAL_COUNT files"
  else
    fail "server/scripts/ has $ACTUAL_COUNT .js files, expected $EXPECTED_SCRIPT_COUNT"
    record 1 "server/scripts populated" fail "$ACTUAL_COUNT files (expected $EXPECTED_SCRIPT_COUNT)"
  fi
fi
log ""

# ------------------------------------------------------------------------
# Check 2: front-end/.env.example exists and var names match real .env
# ------------------------------------------------------------------------
info "Check 2: front-end/.env.example exists and matches current .env var names"
EXAMPLE_PATH="$CLONE_DIR/front-end/.env.example"
if [ ! -f "$EXAMPLE_PATH" ]; then
  fail "$EXAMPLE_PATH missing"
  record 2 ".env.example var parity" fail "file missing"
elif [ ! -f "$REAL_ENV" ]; then
  warn "real .env not found at $REAL_ENV — existence-only check"
  # Still ok for the plan's existence requirement.
  pass ".env.example exists (parity skipped — no reference .env)"
  record 2 ".env.example var parity" skip "example exists; no reference .env at $REAL_ENV"
else
  # Extract var names (strip inline comments, leading whitespace, 'export ').
  extract_vars() {
    grep -E '^[[:space:]]*(export[[:space:]]+)?[A-Za-z_][A-Za-z0-9_]*=' "$1" \
      | sed -E 's/^[[:space:]]*(export[[:space:]]+)?//' \
      | cut -d= -f1 \
      | sort -u
  }
  EXAMPLE_VARS="$OUTPUT_DIR/.vars-example.txt"
  REAL_VARS="$OUTPUT_DIR/.vars-real.txt"
  extract_vars "$EXAMPLE_PATH" > "$EXAMPLE_VARS"
  extract_vars "$REAL_ENV"     > "$REAL_VARS"

  MISSING_IN_EXAMPLE="$(comm -23 "$REAL_VARS" "$EXAMPLE_VARS" | tr '\n' ',' | sed 's/,$//')"
  EXTRA_IN_EXAMPLE="$(comm -13 "$REAL_VARS" "$EXAMPLE_VARS" | tr '\n' ',' | sed 's/,$//')"

  {
    echo "  example vars ($(wc -l < "$EXAMPLE_VARS" | tr -d ' ')):"
    sed 's/^/    /' "$EXAMPLE_VARS"
    echo "  real vars ($(wc -l < "$REAL_VARS" | tr -d ' ')):"
    sed 's/^/    /' "$REAL_VARS"
  } >> "$LOG_FILE"

  if [ -z "$MISSING_IN_EXAMPLE" ] && [ -z "$EXTRA_IN_EXAMPLE" ]; then
    pass ".env.example var names match $REAL_ENV exactly"
    record 2 ".env.example var parity" pass "exact match"
  else
    MSG=""
    [ -n "$MISSING_IN_EXAMPLE" ] && MSG="missing in example: $MISSING_IN_EXAMPLE"
    [ -n "$EXTRA_IN_EXAMPLE" ] && MSG="$MSG; extra in example: $EXTRA_IN_EXAMPLE"
    fail ".env.example var names do not match: $MSG"
    record 2 ".env.example var parity" fail "$MSG"
  fi
fi
log ""

# ------------------------------------------------------------------------
# Check 3: git check-ignore server/scripts/build-copy.js returns empty
# ------------------------------------------------------------------------
info "Check 3: git check-ignore -v server/scripts/build-copy.js (should match nothing)"
CI3_OUT="$(git -C "$CLONE_DIR" check-ignore -v server/scripts/build-copy.js 2>&1 || true)"
# check-ignore exit codes: 0=ignored (match), 1=not ignored (no match).
if [ -z "$CI3_OUT" ]; then
  pass "server/scripts/build-copy.js is NOT ignored (no gitignore rule matches)"
  record 3 "build-copy.js not ignored" pass "no match"
else
  fail "server/scripts/build-copy.js matched a gitignore rule: $CI3_OUT"
  record 3 "build-copy.js not ignored" fail "$CI3_OUT"
fi
log ""

# ------------------------------------------------------------------------
# Check 4: git check-ignore server/scripts/backups/ returns a match
# ------------------------------------------------------------------------
info "Check 4: git check-ignore -v server/scripts/backups/ (should match)"
# Trailing slash matters — 'backups/' is a directory-only rule, so without
# the slash git won't match it when the dir doesn't exist on disk.
CI4_OUT="$(git -C "$CLONE_DIR" check-ignore -v 'server/scripts/backups/' 2>&1 || true)"
if [ -n "$CI4_OUT" ]; then
  pass "server/scripts/backups/ IS ignored — $CI4_OUT"
  record 4 "backups/ still ignored" pass "$CI4_OUT"
else
  fail "server/scripts/backups/ was NOT matched by any gitignore rule (expected to be ignored)"
  record 4 "backups/ still ignored" fail "no match"
fi
log ""

# ------------------------------------------------------------------------
# Check 5 & 6: npm run build on server/ and front-end/
# ------------------------------------------------------------------------
if [ "$SKIP_BUILD" = "1" ]; then
  warn "skipping npm build steps (-s given)"
  record 5 "server build"    skip "skipped via -s"
  record 6 "front-end build" skip "skipped via -s"
else
  # Front-end build needs a real .env (VITE_* vars are baked in). Copy one
  # in from the reference if available, else fall back to .env.example.
  if [ -f "$REAL_ENV" ]; then
    cp "$REAL_ENV" "$CLONE_DIR/front-end/.env"
    info "copied reference .env into front-end/ for build"
  elif [ -f "$CLONE_DIR/front-end/.env.example" ]; then
    cp "$CLONE_DIR/front-end/.env.example" "$CLONE_DIR/front-end/.env"
    warn "no reference .env — using .env.example placeholders for build"
  fi

  run_build() {
    # run_build <id> <label> <subdir>
    local id="$1" label="$2" sub="$3"
    info "Check $id: npm ci && npm run build in $sub/"
    local build_log="$OUTPUT_DIR/build-$sub.log"
    (
      cd "$CLONE_DIR/$sub" \
      && npm ci --no-audit --no-fund \
      && npm run build
    ) >"$build_log" 2>&1
    local rc=$?
    if [ $rc -eq 0 ]; then
      pass "$label build succeeded (log: $build_log)"
      record "$id" "$label build" pass "rc=0"
    else
      fail "$label build FAILED (rc=$rc, log: $build_log)"
      # Tail the last 20 lines into the main log for quick inspection.
      {
        echo "---- tail of $build_log ----"
        tail -n 20 "$build_log"
        echo "----"
      } >> "$LOG_FILE"
      record "$id" "$label build" fail "rc=$rc — see $build_log"
    fi
  }

  run_build 5 "server"    server
  run_build 6 "front-end" front-end
fi
log ""

# ------------------------------------------------------------------------
# Summary + JSON
# ------------------------------------------------------------------------
TOTAL=0; PASSED=0; FAILED=0; SKIPPED=0
while IFS=$'\t' read -r id name status msg; do
  TOTAL=$((TOTAL + 1))
  case "$status" in
    pass) PASSED=$((PASSED + 1)) ;;
    fail) FAILED=$((FAILED + 1)) ;;
    skip) SKIPPED=$((SKIPPED + 1)) ;;
  esac
done < "$RESULTS_TMP"

{
  echo "OMD-1302 test plan — summary"
  echo "============================"
  echo "Timestamp:  $TS"
  echo "Ref:        $REF"
  echo "SHA:        $CLONED_SHA"
  echo "Total:      $TOTAL"
  echo "Passed:     $PASSED"
  echo "Failed:     $FAILED"
  echo "Skipped:    $SKIPPED"
  echo ""
  echo "Per-check results:"
  printf '  %-3s %-30s %-6s %s\n' "ID" "NAME" "STATUS" "MESSAGE"
  while IFS=$'\t' read -r id name status msg; do
    printf '  %-3s %-30s %-6s %s\n' "$id" "$name" "$status" "$msg"
  done < "$RESULTS_TMP"
} | tee "$SUMMARY_FILE" >> "$LOG_FILE"

# Build JSON via python for robust escaping.
python3 - "$RESULTS_TMP" "$TS" "$REF" "$CLONED_SHA" "$TOTAL" "$PASSED" "$FAILED" "$SKIPPED" > "$JSON_FILE" <<'PY'
import json, sys
tmp, ts, ref, sha, total, passed, failed, skipped = sys.argv[1:9]
checks = []
with open(tmp) as f:
    for line in f:
        parts = line.rstrip('\n').split('\t')
        if len(parts) < 4:
            continue
        cid, name, status, msg = parts[0], parts[1], parts[2], parts[3]
        checks.append({"id": cid, "name": name, "status": status, "message": msg})
out = {
    "timestamp": ts,
    "ref": ref,
    "sha": sha,
    "totals": {
        "total": int(total),
        "passed": int(passed),
        "failed": int(failed),
        "skipped": int(skipped),
    },
    "checks": checks,
}
json.dump(out, sys.stdout, indent=2)
sys.stdout.write('\n')
PY

rm -f "$RESULTS_TMP"

log ""
info "Results:"
info "  log:     $LOG_FILE"
info "  summary: $SUMMARY_FILE"
info "  json:    $JSON_FILE"

if [ "$FAILED" -gt 0 ]; then
  printf '%s%sOVERALL: FAIL%s  (%d/%d passed, %d skipped)\n' \
    "$C_BOLD" "$C_RED" "$C_RESET" "$PASSED" "$TOTAL" "$SKIPPED"
  exit 1
fi

printf '%s%sOVERALL: PASS%s  (%d/%d passed, %d skipped)\n' \
  "$C_BOLD" "$C_GREEN" "$C_RESET" "$PASSED" "$TOTAL" "$SKIPPED"
exit 0
