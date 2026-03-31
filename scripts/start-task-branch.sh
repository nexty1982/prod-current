#!/usr/bin/env bash
set -Eeuo pipefail
# ============================================================================
# start-task-branch.sh — Create a task-scoped branch from current main
# ============================================================================
#
# Authoritative Branch Naming Standard:
#   <type>/<work-item-id>/<yyyy-mm-dd>/<slug>
#
# Usage:
#   ./scripts/start-task-branch.sh <type> <description> [options]
#
# Arguments:
#   type          Branch type: feature | fix | chore
#   description   Short description (will be slugified)
#
# Options:
#   --owner <name>    Owner identifier (default: git user or whoami)
#   --item <id>       OM Daily item ID (used as owner, e.g. omd-412)
#   --repo <target>   Which repo: orthodoxmetrics (default) or omai
#   --no-push         Don't push to origin (local-only branch)
#
# Examples:
#   ./scripts/start-task-branch.sh feature work-session-tracking --item omd-412
#   ./scripts/start-task-branch.sh fix session-cookie-issue --item omd-413
#   ./scripts/start-task-branch.sh chore update-deps --owner claude-cli
#   ./scripts/start-task-branch.sh feature improve-ocr --repo omai --item omd-500
#
# ============================================================================

# ── Color codes ─────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

# ── Repo paths ──────────────────────────────────────────────────────────────
declare -A REPO_PATHS=(
  [orthodoxmetrics]="/var/www/orthodoxmetrics/prod"
  [omai]="/var/www/omai"
)

# ── Authoritative type mapping ──────────────────────────────────────────────
# Only three branch types are supported for new branches.
# Long-form names are used directly as the branch prefix.
declare -A TYPE_TO_PREFIX=(
  [feature]=feature
  [fix]=fix
  [chore]=chore
)

# ── Parse arguments ────────────────────────────────────────────────────────

usage() {
  echo -e "${BOLD}start-task-branch.sh${NC} — Create a task-scoped branch from main"
  echo ""
  echo -e "${BOLD}Usage:${NC}"
  echo "  ./scripts/start-task-branch.sh <type> <description> [options]"
  echo ""
  echo -e "${BOLD}Types:${NC}"
  echo "  feature    New functionality or capability"
  echo "  fix        Bug fix or correction"
  echo "  chore      Maintenance, refactoring, docs, migrations, tooling"
  echo ""
  echo -e "${BOLD}Options:${NC}"
  echo "  --owner <name>    Owner identifier (default: git user or whoami)"
  echo "  --item <id>       OM Daily item ID (e.g. omd-412, used as owner)"
  echo "  --repo <target>   Target repo: orthodoxmetrics (default) or omai"
  echo "  --no-push         Don't push branch to origin"
  echo "  -h, --help        Show this help"
  echo ""
  echo -e "${BOLD}Branch format:${NC}"
  echo "  <type>/<work-item-id>/<yyyy-mm-dd>/<slug>"
  echo ""
  echo -e "${BOLD}Examples:${NC}"
  echo "  ./scripts/start-task-branch.sh feature work-session-tracking --item omd-412"
  echo "  ./scripts/start-task-branch.sh fix session-cookie-issue --item omd-413"
  echo "  ./scripts/start-task-branch.sh chore update-deps --owner claude-cli"
  exit 0
}

BRANCH_TYPE=""
DESCRIPTION=""
OWNER=""
ITEM_ID=""
REPO_TARGET="orthodoxmetrics"
DO_PUSH=true

while [[ $# -gt 0 ]]; do
  case "$1" in
    -h|--help) usage ;;
    --owner)   OWNER="$2"; shift 2 ;;
    --item)    ITEM_ID="$2"; shift 2 ;;
    --repo)    REPO_TARGET="$2"; shift 2 ;;
    --no-push) DO_PUSH=false; shift ;;
    -*)
      echo -e "${RED}✗ Unknown option: $1${NC}" >&2
      echo "  Run with --help for usage" >&2
      exit 1
      ;;
    *)
      if [[ -z "$BRANCH_TYPE" ]]; then
        BRANCH_TYPE="$1"
      elif [[ -z "$DESCRIPTION" ]]; then
        DESCRIPTION="$1"
      else
        echo -e "${RED}✗ Unexpected argument: $1${NC}" >&2
        exit 1
      fi
      shift
      ;;
  esac
done

# ── Validate arguments ─────────────────────────────────────────────────────

if [[ -z "$BRANCH_TYPE" || -z "$DESCRIPTION" ]]; then
  echo -e "${RED}✗ Both <type> and <description> are required.${NC}" >&2
  echo "" >&2
  echo "  Usage: ./scripts/start-task-branch.sh <type> <description>" >&2
  echo "  Types: feature | fix | chore" >&2
  exit 1
fi

PREFIX="${TYPE_TO_PREFIX[$BRANCH_TYPE]:-}"
if [[ -z "$PREFIX" ]]; then
  echo -e "${RED}✗ Invalid branch type: $BRANCH_TYPE${NC}" >&2
  echo "  Valid types: ${!TYPE_TO_PREFIX[*]}" >&2
  exit 1
fi

REPO_DIR="${REPO_PATHS[$REPO_TARGET]:-}"
if [[ -z "$REPO_DIR" ]]; then
  echo -e "${RED}✗ Unknown repo: $REPO_TARGET${NC}" >&2
  echo "  Valid repos: ${!REPO_PATHS[*]}" >&2
  exit 1
fi

if [[ ! -d "$REPO_DIR/.git" ]]; then
  echo -e "${RED}✗ Not a git repository: $REPO_DIR${NC}" >&2
  exit 1
fi

# ── Determine owner ────────────────────────────────────────────────────────

if [[ -n "$ITEM_ID" ]]; then
  # Item ID takes precedence as the owner segment
  # Normalize: plain numbers become omd-NNN, omd-NNN passes through
  if [[ "$ITEM_ID" =~ ^[0-9]+$ ]]; then
    OWNER="omd-${ITEM_ID}"
  else
    OWNER=$(echo "$ITEM_ID" | tr '[:upper:]' '[:lower:]')
  fi
elif [[ -z "$OWNER" ]]; then
  # Default: git user.name slugified, or whoami
  OWNER=$(cd "$REPO_DIR" && git config user.name 2>/dev/null \
    | tr '[:upper:]' '[:lower:]' | tr ' ' '-' | tr -cd 'a-z0-9-' || echo "")
  [[ -z "$OWNER" ]] && OWNER=$(whoami | tr '[:upper:]' '[:lower:]')
fi

# ── Slugify description ────────────────────────────────────────────────────

SLUG=$(echo "$DESCRIPTION" \
  | tr '[:upper:]' '[:lower:]' \
  | tr ' _' '-' \
  | tr -cd 'a-z0-9-' \
  | sed 's/--*/-/g; s/^-//; s/-$//')

if [[ -z "$SLUG" ]]; then
  echo -e "${RED}✗ Description produced an empty slug after sanitization.${NC}" >&2
  exit 1
fi

# ── Build branch name ──────────────────────────────────────────────────────

TODAY=$(date +%Y-%m-%d)
BRANCH_NAME="${PREFIX}/${OWNER}/${TODAY}/${SLUG}"

echo -e "\n${BOLD}${CYAN}▶ Task Branch Setup${NC}"
echo -e "${CYAN}───────────────────────────────────────────────────────────────${NC}"
echo -e "  Repo:        ${BOLD}$REPO_TARGET${NC} ($REPO_DIR)"
echo -e "  Type:        $BRANCH_TYPE → ${BOLD}$PREFIX${NC}"
echo -e "  Owner:       ${BOLD}$OWNER${NC}"
echo -e "  Date:        $TODAY"
echo -e "  Description: $SLUG"
echo -e "  Branch:      ${GREEN}${BOLD}$BRANCH_NAME${NC}"
echo ""

cd "$REPO_DIR"

# ── Pre-flight checks ──────────────────────────────────────────────────────

# 1. Working tree must be clean
if [[ -n "$(git status --porcelain 2>/dev/null)" ]]; then
  echo -e "${RED}✗ Working tree is dirty. Commit or stash changes first.${NC}" >&2
  echo "" >&2
  git status --short | head -10 >&2
  DIRTY_COUNT=$(git status --porcelain | wc -l | tr -d ' ')
  if [[ $DIRTY_COUNT -gt 10 ]]; then
    echo -e "  ... and $((DIRTY_COUNT - 10)) more" >&2
  fi
  echo "" >&2
  echo -e "  ${CYAN}→${NC} Commit: git add -A && git commit -m \"your message\"" >&2
  echo -e "  ${CYAN}→${NC} Stash:  git stash push -m \"before new task\"" >&2
  exit 1
fi

# 2. Check branch doesn't already exist
if git rev-parse --verify "$BRANCH_NAME" &>/dev/null; then
  echo -e "${RED}✗ Branch '$BRANCH_NAME' already exists locally.${NC}" >&2
  echo -e "  ${CYAN}→${NC} Check out: git checkout $BRANCH_NAME" >&2
  echo -e "  ${CYAN}→${NC} Or use a more specific slug" >&2
  exit 1
fi

if git ls-remote --heads origin "$BRANCH_NAME" 2>/dev/null | grep -q .; then
  echo -e "${RED}✗ Branch '$BRANCH_NAME' already exists on origin.${NC}" >&2
  echo -e "  ${CYAN}→${NC} Check out: git checkout -b $BRANCH_NAME origin/$BRANCH_NAME" >&2
  echo -e "  ${CYAN}→${NC} Or use a more specific slug" >&2
  exit 1
fi

# ── Fetch and sync ──────────────────────────────────────────────────────────

echo -e "${CYAN}→${NC} Fetching origin and pruning stale refs..."
git fetch origin --prune --quiet 2>/dev/null

echo -e "${CYAN}→${NC} Syncing local main with origin/main..."
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null)

if [[ "$CURRENT_BRANCH" == "main" ]]; then
  # Already on main — pull ff-only
  if ! git pull --ff-only origin main --quiet 2>/dev/null; then
    echo -e "${RED}✗ Cannot fast-forward main. Local main has diverged from origin.${NC}" >&2
    echo -e "  ${CYAN}→${NC} Resolve manually: git reset --hard origin/main (destructive)" >&2
    exit 1
  fi
else
  # Update main ref without switching
  git fetch origin main:main 2>/dev/null || true
fi

# ── Create branch ──────────────────────────────────────────────────────────

echo -e "${CYAN}→${NC} Creating branch from main..."
git checkout -b "$BRANCH_NAME" main --quiet 2>/dev/null

if [[ "$DO_PUSH" == "true" ]]; then
  echo -e "${CYAN}→${NC} Pushing to origin with tracking..."
  if git push -u origin "$BRANCH_NAME" --quiet 2>/dev/null; then
    echo -e "${GREEN}✓${NC} Pushed and tracking origin/$BRANCH_NAME"
  else
    echo -e "${YELLOW}⚠${NC} Push failed — branch created locally only"
    echo -e "  ${CYAN}→${NC} Push manually: git push -u origin $BRANCH_NAME"
  fi
else
  echo -e "${GREEN}✓${NC} Branch created locally (--no-push)"
fi

# ── Done ───────────────────────────────────────────────────────────────────

echo ""
echo -e "${GREEN}${BOLD}✓ Ready to work on: $BRANCH_NAME${NC}"
echo ""
echo -e "  ${CYAN}Next steps:${NC}"
echo -e "    1. Make your changes"
echo -e "    2. Commit: git add <files> && git commit -m \"description\""
echo -e "    3. Deploy: ./scripts/om-deploy.sh"
echo ""
