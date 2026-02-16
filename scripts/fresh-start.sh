#!/bin/bash
#
# fresh-start.sh
# ==============
# Resets the prod-current GitHub repository using local files
# from /var/www/orthodoxmetrics/prod as the single source of truth.
#
# DIRECTIONS:
# 1. Copy this script to your server (e.g., ~/fresh-start.sh)
# 2. Make it executable:  chmod +x ~/fresh-start.sh
# 3. Run it:              ~/fresh-start.sh
#
# The script will pause at critical checkpoints and ask you to
# confirm before proceeding. You can exit at any time with Ctrl+C.
#
# PREREQUISITES:
# - git is installed on the server
# - You have push access to git@github.com:nexty1982/prod-current.git
#   (SSH key configured) OR update the REMOTE_URL below to use HTTPS.
#

set -e  # Exit immediately on any error

# ============================================================
# CONFIGURATION — Edit these if needed
# ============================================================
PROJECT_DIR="/var/www/orthodoxmetrics/prod"
BACKUP_DIR="/var/www/orthodoxmetrics/prod-backup-$(date +%Y%m%d%H%M%S)"
REMOTE_URL="git@github.com:nexty1982/prod-current.git"
BRANCH_NAME="main"
COMMIT_MESSAGE="Fresh start: initialize repository from production files"

# ============================================================
# HELPER FUNCTIONS
# ============================================================
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

info()    { echo -e "${CYAN}[INFO]${NC} $1"; }
success() { echo -e "${GREEN}[OK]${NC} $1"; }
warn()    { echo -e "${YELLOW}[WARNING]${NC} $1"; }
error()   { echo -e "${RED}[ERROR]${NC} $1"; }

pause_and_confirm() {
    echo ""
    echo -e "${YELLOW}──────────────────────────────────────────${NC}"
    echo -e "${YELLOW}  $1${NC}"
    echo -e "${YELLOW}──────────────────────────────────────────${NC}"
    read -r -p "Continue? (y/n): " answer
    if [[ "$answer" != "y" && "$answer" != "Y" ]]; then
        echo "Aborted by user."
        exit 0
    fi
    echo ""
}

# ============================================================
# PRE-FLIGHT CHECKS
# ============================================================
echo ""
echo "========================================"
echo "  PROD-CURRENT FRESH START SCRIPT"
echo "========================================"
echo ""
info "Project directory : $PROJECT_DIR"
info "Backup directory  : $BACKUP_DIR"
info "Remote URL        : $REMOTE_URL"
info "Branch name       : $BRANCH_NAME"
echo ""

# Verify project directory exists
if [ ! -d "$PROJECT_DIR" ]; then
    error "Project directory does not exist: $PROJECT_DIR"
    exit 1
fi

# Verify .gitignore exists
if [ ! -f "$PROJECT_DIR/.gitignore" ]; then
    warn ".gitignore not found in $PROJECT_DIR"
    pause_and_confirm "No .gitignore found. ALL files will be committed. Continue anyway?"
else
    success ".gitignore found"
fi

# Verify git is installed
if ! command -v git &> /dev/null; then
    error "git is not installed. Please install git first."
    exit 1
fi
success "git is installed ($(git --version))"

pause_and_confirm "STEP 1: Create a full backup of $PROJECT_DIR?"

# ============================================================
# STEP 1: BACKUP
# ============================================================
info "Creating backup at $BACKUP_DIR ..."
cp -a "$PROJECT_DIR" "$BACKUP_DIR"
success "Backup created at $BACKUP_DIR"
echo ""
info "Backup contents (top-level):"
ls -la "$BACKUP_DIR/" | head -20

pause_and_confirm "STEP 2: Review .gitignore and important files?"

# ============================================================
# STEP 2: REVIEW IMPORTANT FILES
# ============================================================
cd "$PROJECT_DIR"

echo ""
info "=== .gitignore contents ==="
echo "---"
if [ -f .gitignore ]; then
    cat .gitignore
else
    warn "(no .gitignore found)"
fi
echo "---"

echo ""
info "=== Dotfiles in project root ==="
ls -la .env* .htaccess* .editorconfig .prettierrc* .eslintrc* 2>/dev/null || echo "(none found)"

echo ""
info "=== Current git remotes (if any) ==="
if [ -d .git ]; then
    git remote -v 2>/dev/null || echo "(no remotes configured)"
    echo ""
    info "=== Current branches ==="
    git branch -a 2>/dev/null || echo "(no branches)"
else
    warn "No .git directory found — already clean or not a git repo"
fi

pause_and_confirm "STEP 3: DELETE all git history and reinitialize? (THIS CANNOT BE UNDONE)"

# ============================================================
# STEP 3: REMOVE OLD GIT HISTORY & REINITIALIZE
# ============================================================
cd "$PROJECT_DIR"

if [ -d .git ]; then
    info "Removing old .git directory..."
    rm -rf .git
    success "Old git history removed"
else
    info "No .git directory to remove — skipping"
fi

info "Initializing fresh git repository..."
git init
git branch -M "$BRANCH_NAME"
success "Fresh repository initialized on branch '$BRANCH_NAME'"

pause_and_confirm "STEP 4: Stage all files and review before committing?"

# ============================================================
# STEP 4: STAGE, REVIEW, AND COMMIT
# ============================================================
cd "$PROJECT_DIR"

info "Staging all files (respecting .gitignore)..."
git add .

echo ""
info "=== FILES THAT WILL BE COMMITTED ==="
echo "─────────────────────────────────────"
git status
echo "─────────────────────────────────────"
echo ""
warn "REVIEW THE LIST ABOVE CAREFULLY."
warn "Look for files that should NOT be committed:"
warn "  - .env (secrets/credentials)"
warn "  - vendor/ or node_modules/"
warn "  - Log files, cache files, database dumps"
echo ""
warn "If you see something wrong:"
warn "  1. Press 'n' to abort"
warn "  2. Edit your .gitignore"
warn "  3. Run this script again"

pause_and_confirm "STEP 4b: Everything look good? Commit these files?"

info "Committing..."
git commit -m "$COMMIT_MESSAGE"
success "Commit created"
echo ""
git log --oneline

pause_and_confirm "STEP 5: Connect remote and FORCE-PUSH to GitHub? (Overwrites remote history)"

# ============================================================
# STEP 5: CONNECT REMOTE & FORCE-PUSH
# ============================================================
cd "$PROJECT_DIR"

info "Adding remote origin: $REMOTE_URL"
git remote add origin "$REMOTE_URL"
git remote -v

echo ""
info "Force-pushing to origin/$BRANCH_NAME..."
git push --force origin "$BRANCH_NAME"
success "Force-push complete!"

pause_and_confirm "STEP 6: List and delete old remote branches?"

# ============================================================
# STEP 6: DELETE OLD REMOTE BRANCHES
# ============================================================
cd "$PROJECT_DIR"

info "Fetching list of remote branches..."
REMOTE_BRANCHES=$(git ls-remote --heads origin | awk '{print $2}' | sed 's|refs/heads/||')

echo ""
info "Remote branches found:"
echo "$REMOTE_BRANCHES"
echo ""

# Filter out the main branch and delete the rest
BRANCHES_TO_DELETE=""
for branch in $REMOTE_BRANCHES; do
    if [ "$branch" != "$BRANCH_NAME" ]; then
        BRANCHES_TO_DELETE="$BRANCHES_TO_DELETE $branch"
    fi
done

if [ -z "$BRANCHES_TO_DELETE" ]; then
    success "No old branches to delete — only '$BRANCH_NAME' exists"
else
    warn "The following branches will be DELETED from GitHub:"
    for branch in $BRANCHES_TO_DELETE; do
        echo "  - $branch"
    done
    echo ""
    read -r -p "Delete these branches? (y/n): " answer
    if [[ "$answer" == "y" || "$answer" == "Y" ]]; then
        for branch in $BRANCHES_TO_DELETE; do
            info "Deleting remote branch: $branch"
            git push origin --delete "$branch" 2>/dev/null && \
                success "Deleted: $branch" || \
                warn "Could not delete: $branch (may already be gone)"
        done
    else
        info "Skipping branch deletion"
    fi
fi

# ============================================================
# STEP 7: FINAL VERIFICATION
# ============================================================
echo ""
echo "========================================"
echo "  FINAL VERIFICATION"
echo "========================================"
echo ""

cd "$PROJECT_DIR"

info "=== Commit history ==="
git log --oneline
echo ""

info "=== Local branches ==="
git branch -a
echo ""

info "=== Remote ==="
git remote -v
echo ""

info "=== Round-trip test ==="
git pull origin "$BRANCH_NAME"
echo ""

# ============================================================
# DONE
# ============================================================
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  ALL DONE! Repository has been reset.${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
info "Your backup is still at: $BACKUP_DIR"
info "Once you've verified everything works, you can remove it with:"
echo "  rm -rf $BACKUP_DIR"
echo ""
info "Remember to set '$BRANCH_NAME' as the default branch on GitHub:"
echo "  https://github.com/nexty1982/prod-current/settings/branches"
echo ""