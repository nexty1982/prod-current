#!/usr/bin/env bash
# ============================================================================
# branch-enforce.sh — Shared branch discipline enforcement library
# ============================================================================
#
# Authoritative Branch Naming Standard:
#
#   <type>/<work-item-id>/<yyyy-mm-dd>/<slug>
#
#   Accepted types:  feature, fix, chore
#   Work item ID:    omd-NNN, username slug, or agent tool name
#   Date:            ISO date of branch creation
#   Slug:            kebab-case description
#
#   Examples:
#     feature/omd-412/2026-03-31/work-session-foundation
#     fix/omd-413/2026-03-31/header-timer-layout
#     chore/omd-502/2026-03-31/branch-discipline-standardization
#
# Legacy compatibility:
#   Branches using older naming conventions (feat/, enh/, ref/, mig/, spike/,
#   docs/, feature/<user>/<date>/<slug>) are recognized and allowed with a
#   deprecation warning during a migration period. New branches must use the
#   authoritative standard above.
#
# Source this file from deploy scripts to enforce task-scoped branch usage.
# All functions are prefixed with be_ to avoid collisions.
#
# Usage:
#   source "$(dirname "$0")/lib/branch-enforce.sh"
#   be_init "/var/www/orthodoxmetrics/prod" "orthodoxmetrics"
#   be_enforce_all           # runs all checks, exits on failure
#   be_generate_deploy_metadata "all" "legacy" > .last-deploy.json
#
# Override flags (set before calling be_enforce_all):
#   BE_ALLOW_MAIN=true       — permit deploy from main
#   BE_SKIP_SCOPE_CHECK=true — suppress stale/diverse commit warnings
#   BE_SKIP_DIRTY_CHECK=true — skip clean-tree check (caller handles commit prompt)
#   BE_ALLOW_LEGACY=true     — suppress legacy branch warnings (auto-set when detected)
# ============================================================================

# ── Configuration ───────────────────────────────────────────────────────────

# Authoritative branch prefixes — the ONLY types for new branches
BE_STANDARD_PREFIXES="feature|fix|chore"

# Full authoritative pattern: <type>/<work-item-id>/<yyyy-mm-dd>/<slug>
BE_BRANCH_PATTERN="^(${BE_STANDARD_PREFIXES})/[a-z0-9][a-z0-9-]*/[0-9]{4}-[0-9]{2}-[0-9]{2}/[a-z0-9][a-z0-9-]*$"

# Legacy patterns — recognized with deprecation warning during migration
# Short-form prefixes from P-001 era (feat/enh/ref/mig/spike/docs)
BE_LEGACY_SHORT_PATTERN="^(feat|enh|ref|mig|spike|docs)/[a-z0-9][a-z0-9-]*/[0-9]{4}-[0-9]{2}-[0-9]{2}/[a-z0-9][a-z0-9-]*$"

# OM Daily legacy format: <prefix>/<id>-<slug> (no date segment)
BE_LEGACY_OMDAILY_PATTERN="^(feat|enh|fix|ref|mig|chore|spike|docs)/[0-9]+-[a-z0-9][a-z0-9-]*$"

# Pre-P-001 human format: feature/<username>/<date>/<slug> (valid, already long-form)
# This is actually compatible with the standard — no special handling needed

# Ancient agent formats: EF_claude-cli_2026-03-24, NF_windsurf_2026-03-24, etc.
BE_LEGACY_AGENT_PATTERN="^(EF|NF|BF|PA)_[a-z0-9-]+_[0-9]{4}-[0-9]{2}-[0-9]{2}"

# Staleness threshold in days
BE_STALE_DAYS=7

# ── State (populated by be_init) ───────────────────────────────────────────

_BE_REPO_DIR=""
_BE_REPO_NAME=""
_BE_BRANCH=""
_BE_COMMIT=""
_BE_COMMIT_FULL=""
_BE_MERGE_BASE=""
_BE_AHEAD_COUNT=0
_BE_INITIALIZED=false
_BE_BRANCH_CLASS=""  # "standard", "legacy", or "invalid"

# ── Color codes ─────────────────────────────────────────────────────────────

_BE_RED='\033[0;31m'
_BE_GREEN='\033[0;32m'
_BE_YELLOW='\033[1;33m'
_BE_CYAN='\033[0;36m'
_BE_BOLD='\033[1m'
_BE_NC='\033[0m'

# ── Internal helpers ────────────────────────────────────────────────────────

_be_fail() {
  echo -e "${_BE_RED}✗ BRANCH ENFORCEMENT:${_BE_NC} $1" >&2
  if [[ -n "${2:-}" ]]; then
    echo -e "  ${_BE_CYAN}→${_BE_NC} $2" >&2
  fi
  return 1
}

_be_warn() {
  echo -e "${_BE_YELLOW}⚠ BRANCH ENFORCEMENT:${_BE_NC} $1" >&2
}

_be_info() {
  echo -e "${_BE_CYAN}ℹ${_BE_NC} $1" >&2
}

_be_ok() {
  echo -e "${_BE_GREEN}✓${_BE_NC} $1" >&2
}

# ── Initialization ──────────────────────────────────────────────────────────

# be_init <repo_dir> <repo_name>
#   Must be called before any other be_ function.
#   Populates branch, commit, merge-base, and ahead-count state.
be_init() {
  _BE_REPO_DIR="$1"
  _BE_REPO_NAME="${2:-$(basename "$1")}"

  if [[ ! -d "$_BE_REPO_DIR/.git" && ! -f "$_BE_REPO_DIR/.git" ]]; then
    _be_fail "Not a git repository: $_BE_REPO_DIR"
    exit 1
  fi

  cd "$_BE_REPO_DIR" || exit 1

  _BE_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "HEAD")
  _BE_COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
  _BE_COMMIT_FULL=$(git rev-parse HEAD 2>/dev/null || echo "unknown")
  _BE_BRANCH_CLASS=""

  # Fetch origin to ensure merge-base is accurate
  git fetch origin main --quiet 2>/dev/null || true

  # Compute merge-base and ahead count (safe even if on main)
  if [[ "$_BE_BRANCH" != "main" && "$_BE_BRANCH" != "HEAD" ]]; then
    _BE_MERGE_BASE=$(git merge-base HEAD origin/main 2>/dev/null || echo "")
    if [[ -n "$_BE_MERGE_BASE" ]]; then
      _BE_AHEAD_COUNT=$(git rev-list --count "${_BE_MERGE_BASE}..HEAD" 2>/dev/null || echo "0")
    fi
  fi

  _BE_INITIALIZED=true
}

# ── Accessor functions ──────────────────────────────────────────────────────

be_branch()       { echo "$_BE_BRANCH"; }
be_commit()       { echo "$_BE_COMMIT"; }
be_commit_full()  { echo "$_BE_COMMIT_FULL"; }
be_merge_base()   { echo "$_BE_MERGE_BASE"; }
be_ahead_count()  { echo "$_BE_AHEAD_COUNT"; }
be_repo_name()    { echo "$_BE_REPO_NAME"; }
be_repo_dir()     { echo "$_BE_REPO_DIR"; }
be_branch_class() { echo "$_BE_BRANCH_CLASS"; }

# ── Validation functions ───────────────────────────────────────────────────

# be_check_not_main
#   Fails if current branch is main or detached HEAD.
#   Respects BE_ALLOW_MAIN=true override.
be_check_not_main() {
  if [[ "${BE_ALLOW_MAIN:-false}" == "true" ]]; then
    if [[ "$_BE_BRANCH" == "main" || "$_BE_BRANCH" == "HEAD" ]]; then
      _be_warn "Deploying from '$_BE_BRANCH' (--allow-main override active)"
    fi
    return 0
  fi

  if [[ "$_BE_BRANCH" == "main" ]]; then
    _be_fail \
      "Cannot deploy from 'main'. Create a task branch first." \
      "Run: ./scripts/start-task-branch.sh <type> <description>"
    return 1
  fi

  if [[ "$_BE_BRANCH" == "HEAD" ]]; then
    _be_fail \
      "Detached HEAD — cannot deploy without a named branch." \
      "Run: ./scripts/start-task-branch.sh <type> <description>"
    return 1
  fi

  _be_ok "Branch: $_BE_BRANCH (not main)"
  return 0
}

# be_validate_branch_pattern
#   Checks branch name against authoritative standard and legacy patterns.
#   Standard branches pass cleanly.
#   Legacy branches pass with a deprecation warning.
#   Invalid branches fail with remediation instructions.
be_validate_branch_pattern() {
  if [[ "${BE_ALLOW_MAIN:-false}" == "true" && "$_BE_BRANCH" == "main" ]]; then
    return 0  # skip pattern check when main is explicitly allowed
  fi

  # ── Check authoritative standard first ──
  if [[ "$_BE_BRANCH" =~ $BE_BRANCH_PATTERN ]]; then
    _BE_BRANCH_CLASS="standard"
    _be_ok "Branch name matches authoritative standard"
    return 0
  fi

  # ── Check legacy patterns ──
  local legacy_reason=""

  if [[ "$_BE_BRANCH" =~ $BE_LEGACY_SHORT_PATTERN ]]; then
    legacy_reason="uses short-form prefix '${BASH_REMATCH[1]}' instead of long-form"
  elif [[ "$_BE_BRANCH" =~ $BE_LEGACY_OMDAILY_PATTERN ]]; then
    legacy_reason="uses OM Daily legacy format (missing date segment)"
  elif [[ "$_BE_BRANCH" =~ $BE_LEGACY_AGENT_PATTERN ]]; then
    legacy_reason="uses pre-standardization agent format"
  fi

  if [[ -n "$legacy_reason" ]]; then
    _BE_BRANCH_CLASS="legacy"
    _be_warn "Legacy branch format detected: $_BE_BRANCH"
    echo -e "  ${_BE_YELLOW}↳${_BE_NC} This branch $legacy_reason." >&2
    echo -e "  ${_BE_YELLOW}↳${_BE_NC} Allowed temporarily — new branches must use the standard format:" >&2
    echo -e "  ${_BE_CYAN}  feature/<work-item-id>/<date>/<slug>${_BE_NC}" >&2
    echo -e "  ${_BE_CYAN}  fix/<work-item-id>/<date>/<slug>${_BE_NC}" >&2
    echo -e "  ${_BE_CYAN}  chore/<work-item-id>/<date>/<slug>${_BE_NC}" >&2
    echo "" >&2
    return 0
  fi

  # ── No match — invalid branch ──
  _BE_BRANCH_CLASS="invalid"
  _be_fail \
    "Branch '$_BE_BRANCH' does not match any accepted naming convention." \
    "Required format: <type>/<work-item-id>/<yyyy-mm-dd>/<slug>"
  echo "" >&2
  echo -e "  ${_BE_BOLD}Accepted types:${_BE_NC} feature, fix, chore" >&2
  echo -e "  ${_BE_BOLD}Work item ID:${_BE_NC}   omd-NNN, username, or agent tool name" >&2
  echo "" >&2
  echo -e "  ${_BE_BOLD}Examples:${_BE_NC}" >&2
  echo -e "    feature/omd-412/$(date +%Y-%m-%d)/work-session-foundation" >&2
  echo -e "    fix/omd-413/$(date +%Y-%m-%d)/header-timer-layout" >&2
  echo -e "    chore/omd-502/$(date +%Y-%m-%d)/branch-discipline-standardization" >&2
  echo "" >&2
  echo -e "  ${_BE_CYAN}→${_BE_NC} Create one: ./scripts/start-task-branch.sh <type> <description>" >&2
  return 1
}

# be_check_clean_tree
#   Fails if working tree has uncommitted changes.
#   Respects BE_SKIP_DIRTY_CHECK=true (when caller handles commit prompt).
be_check_clean_tree() {
  if [[ "${BE_SKIP_DIRTY_CHECK:-false}" == "true" ]]; then
    return 0
  fi

  local status
  status=$(git status --porcelain 2>/dev/null)
  if [[ -z "$status" ]]; then
    _be_ok "Working tree is clean"
    return 0
  fi

  local count
  count=$(echo "$status" | wc -l | tr -d ' ')
  _be_fail \
    "Working tree has $count uncommitted change(s)." \
    "Commit or stash changes before deploying."
  echo "" >&2
  git status --short | head -10 >&2
  if [[ $count -gt 10 ]]; then
    echo -e "  ... and $((count - 10)) more" >&2
  fi
  return 1
}

# be_check_has_unique_commits
#   Fails if branch has no commits ahead of origin/main.
be_check_has_unique_commits() {
  if [[ "${BE_ALLOW_MAIN:-false}" == "true" && "$_BE_BRANCH" == "main" ]]; then
    return 0  # main always has its own history
  fi

  if [[ -z "$_BE_MERGE_BASE" ]]; then
    _be_fail \
      "Cannot determine merge-base with origin/main." \
      "Ensure origin/main is fetched: git fetch origin main"
    return 1
  fi

  if [[ "$_BE_AHEAD_COUNT" -eq 0 ]]; then
    _be_fail \
      "Branch '$_BE_BRANCH' has no unique commits vs origin/main." \
      "Nothing to deploy — make changes and commit first."
    return 1
  fi

  _be_ok "Branch has $_BE_AHEAD_COUNT commit(s) ahead of origin/main"
  return 0
}

# be_check_branch_scope
#   Warns (does not fail) if branch appears stale or overloaded.
#   Respects BE_SKIP_SCOPE_CHECK=true.
be_check_branch_scope() {
  if [[ "${BE_SKIP_SCOPE_CHECK:-false}" == "true" ]]; then
    return 0
  fi

  # --- Staleness check: extract date from branch name ---
  local branch_date
  branch_date=$(echo "$_BE_BRANCH" | grep -oP '\d{4}-\d{2}-\d{2}' | head -1 || true)
  if [[ -n "$branch_date" ]]; then
    local branch_epoch today_epoch age_days
    branch_epoch=$(date -d "$branch_date" +%s 2>/dev/null || echo "0")
    today_epoch=$(date +%s)
    if [[ "$branch_epoch" -gt 0 ]]; then
      age_days=$(( (today_epoch - branch_epoch) / 86400 ))
      if [[ "$age_days" -gt "$BE_STALE_DAYS" ]]; then
        _be_warn "Branch is ${age_days} days old (created $branch_date). Consider starting a fresh branch for new work."
      fi
    fi
  fi

  # --- Scope diversity check: look at commit subject word patterns ---
  if [[ "$_BE_AHEAD_COUNT" -gt 10 ]]; then
    _be_warn "Branch has $_BE_AHEAD_COUNT commits ahead of main — may contain mixed work. Review before deploying."
  fi

  return 0
}

# ── Aggregate enforcement ──────────────────────────────────────────────────

# be_enforce_all
#   Runs all checks in sequence. Exits on first hard failure.
#   Call after be_init.
be_enforce_all() {
  if [[ "$_BE_INITIALIZED" != "true" ]]; then
    _be_fail "be_init() must be called before be_enforce_all()"
    exit 1
  fi

  echo -e "\n${_BE_BOLD}${_BE_CYAN}▶ Branch Enforcement${_BE_NC}" >&2
  echo -e "${_BE_CYAN}───────────────────────────────────────────────────────────────${_BE_NC}" >&2

  be_check_not_main      || exit 1
  be_validate_branch_pattern || exit 1
  be_check_clean_tree    || exit 1
  be_check_has_unique_commits || exit 1
  be_check_branch_scope  # warnings only, never fails

  echo "" >&2
  return 0
}

# ── Deploy Metadata Generation ─────────────────────────────────────────────

# be_generate_deploy_metadata <deploy_target> <deploy_mode>
#   Outputs JSON to stdout. Caller should redirect to file.
be_generate_deploy_metadata() {
  local deploy_target="${1:-all}"
  local deploy_mode="${2:-legacy}"
  local deploy_id
  deploy_id=$(cat /proc/sys/kernel/random/uuid 2>/dev/null || uuidgen 2>/dev/null || echo "$(date +%s)-$$")

  # Extract branch components
  local branch_type="" branch_owner="" branch_date="" branch_slug=""
  if [[ "$_BE_BRANCH" =~ ^([a-z]+)/([a-z0-9-]+)/([0-9]{4}-[0-9]{2}-[0-9]{2})/(.+)$ ]]; then
    branch_type="${BASH_REMATCH[1]}"
    branch_owner="${BASH_REMATCH[2]}"
    branch_date="${BASH_REMATCH[3]}"
    branch_slug="${BASH_REMATCH[4]}"
  fi

  # Build commit list JSON array
  local commits_json="[]"
  if [[ -n "$_BE_MERGE_BASE" ]]; then
    commits_json=$(git log "${_BE_MERGE_BASE}..HEAD" --format='{"sha":"%H","short_sha":"%h","subject":"%s","author":"%aN","date":"%aI"}' 2>/dev/null \
      | sed 's/\\/\\\\/g' \
      | awk 'BEGIN{printf "["} NR>1{printf ","} {print} END{printf "]"}' 2>/dev/null || echo "[]")
  fi

  # Build changed files list
  local changed_files_json="[]"
  if [[ -n "$_BE_MERGE_BASE" ]]; then
    changed_files_json=$(git diff --name-only "${_BE_MERGE_BASE}..HEAD" 2>/dev/null \
      | awk 'BEGIN{printf "["} NR>1{printf ","} {printf "\"%s\"", $0} END{printf "]"}' 2>/dev/null || echo "[]")
  fi

  # Diff stat
  local diff_stat=""
  if [[ -n "$_BE_MERGE_BASE" ]]; then
    diff_stat=$(git diff --stat "${_BE_MERGE_BASE}..HEAD" 2>/dev/null | tail -1 | tr -s ' ' || echo "")
  fi

  # Overrides used
  local overrides_json="{"
  local first_override=true
  if [[ "${BE_ALLOW_MAIN:-false}" == "true" ]]; then
    overrides_json+="\"allow_main\":true"
    first_override=false
  fi
  if [[ "${BE_SKIP_SCOPE_CHECK:-false}" == "true" ]]; then
    [[ "$first_override" == "false" ]] && overrides_json+=","
    overrides_json+="\"skip_scope_check\":true"
    first_override=false
  fi
  if [[ "${BE_SKIP_DIRTY_CHECK:-false}" == "true" ]]; then
    [[ "$first_override" == "false" ]] && overrides_json+=","
    overrides_json+="\"skip_dirty_check\":true"
  fi
  overrides_json+="}"

  cat <<EOJSON
{
  "deploy_id": "$deploy_id",
  "repo": "$_BE_REPO_NAME",
  "branch": "$_BE_BRANCH",
  "branch_class": "$_BE_BRANCH_CLASS",
  "branch_type": "$branch_type",
  "branch_owner": "$branch_owner",
  "branch_date": "$branch_date",
  "branch_slug": "$branch_slug",
  "merge_base": "${_BE_MERGE_BASE:-null}",
  "head_commit": "$_BE_COMMIT_FULL",
  "head_commit_short": "$_BE_COMMIT",
  "commit_count": $_BE_AHEAD_COUNT,
  "commits": $commits_json,
  "changed_files": $changed_files_json,
  "diff_stat": "$(echo "$diff_stat" | sed 's/"/\\"/g')",
  "deployed_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "deployed_by": "$(whoami)",
  "deploy_target": "$deploy_target",
  "deploy_mode": "$deploy_mode",
  "overrides": $overrides_json
}
EOJSON
}

# be_print_change_summary
#   Prints a human-readable summary of changes vs origin/main.
be_print_change_summary() {
  if [[ -z "$_BE_MERGE_BASE" ]]; then
    _be_info "No merge-base available — skipping change summary"
    return 0
  fi

  echo -e "\n${_BE_BOLD}${_BE_CYAN}▶ Change Summary${_BE_NC}" >&2
  echo -e "${_BE_CYAN}───────────────────────────────────────────────────────────────${_BE_NC}" >&2
  echo -e "  Branch:     ${_BE_BOLD}$_BE_BRANCH${_BE_NC}" >&2
  if [[ "$_BE_BRANCH_CLASS" == "legacy" ]]; then
    echo -e "  Format:     ${_BE_YELLOW}legacy (migration required for new work)${_BE_NC}" >&2
  fi
  echo -e "  Merge base: ${_BE_MERGE_BASE:0:12}" >&2
  echo -e "  Commits:    $_BE_AHEAD_COUNT" >&2
  echo "" >&2

  # Commit list (most recent first, limited to 15)
  echo -e "  ${_BE_BOLD}Recent commits:${_BE_NC}" >&2
  git log "${_BE_MERGE_BASE}..HEAD" --oneline | head -15 | while IFS= read -r line; do
    echo -e "    ${_BE_GREEN}•${_BE_NC} $line" >&2
  done
  if [[ "$_BE_AHEAD_COUNT" -gt 15 ]]; then
    echo -e "    ... and $((_BE_AHEAD_COUNT - 15)) more" >&2
  fi
  echo "" >&2

  # Diff stat
  echo -e "  ${_BE_BOLD}Diff stat:${_BE_NC}" >&2
  git diff --stat "${_BE_MERGE_BASE}..HEAD" 2>/dev/null | tail -5 | while IFS= read -r line; do
    echo -e "    $line" >&2
  done
  echo "" >&2
}

# be_save_deploy_metadata <deploy_target> <deploy_mode>
#   Generates and writes deploy metadata to .last-deploy.json in repo root.
#   Also appends to deploy-history/ if directory exists.
be_save_deploy_metadata() {
  local deploy_target="${1:-all}"
  local deploy_mode="${2:-legacy}"
  local metadata_file="$_BE_REPO_DIR/.last-deploy.json"
  local history_dir="$_BE_REPO_DIR/deploy-history"

  be_generate_deploy_metadata "$deploy_target" "$deploy_mode" > "$metadata_file"
  _be_ok "Deploy metadata written to $metadata_file"

  # Append to history if directory exists
  if [[ -d "$history_dir" ]]; then
    local timestamp
    timestamp=$(date +%Y%m%d-%H%M%S)
    cp "$metadata_file" "$history_dir/deploy-${timestamp}.json"
    _be_info "Deploy history saved to $history_dir/deploy-${timestamp}.json"
  fi
}
