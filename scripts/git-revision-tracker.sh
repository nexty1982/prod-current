#!/usr/bin/env bash
#
# git-revision-tracker.sh
#
# A general-purpose tool for listing revisions that touched any file or
# directory inside a git repository, showing line-count differences
# between each consecutive revision.
#
# Features:
#   • Filesystem scan mode:  finds .git repos under a search root
#     (max depth configurable, default 3)
#   • Works with ANY file or directory you specify
#   • Covers all branches, remotes, reflog (deleted branches)
#   • Auto-resolves absolute paths → repo-relative paths
#   • CSV export
#
# ──────────────────────────────────────────────────────────
# Usage:
#
#   ./git-revision-tracker.sh <search-root> <target-path> [max-depth]
#
# Arguments:
#   search-root   The filesystem path to begin scanning for git repos.
#                 Can be "/" to scan the entire filesystem.
#                 Can also be a git repo directory directly.
#   target-path   The file or directory to track revisions for.
#                 Can be absolute (will be converted to repo-relative)
#                 or already repo-relative.
#   max-depth     (Optional) Maximum directory depth when scanning for
#                 .git folders. Default: 3
#
# Examples:
#
#   # Scan from / for git repos, track a specific directory
#   ./git-revision-tracker.sh / /var/www/orthodoxmetrics/prod/features/pages/frontend-pages
#
#   # Scan from /home, track a single file, max depth 5
#   ./git-revision-tracker.sh /home /home/me/project/src/App.tsx 5
#
#   # Point directly at a known repo, track a relative path
#   ./git-revision-tracker.sh /var/www/orthodoxmetrics/prod front-end/src/features/pages/frontend-pages
#
#   # Track a single file inside the repo
#   ./git-revision-tracker.sh . front-end/src/routes/Router.tsx
#
# ──────────────────────────────────────────────────────────

set -euo pipefail

# ──────────────────────────────────────────────────────────
# Arguments
# ──────────────────────────────────────────────────────────
SEARCH_ROOT="${1:-.}"
TARGET_INPUT="${2:-}"
MAX_DEPTH="${3:-3}"

# ──────────────────────────────────────────────────────────
# Colors (disable with NO_COLOR=1)
# ──────────────────────────────────────────────────────────
if [[ -z "${NO_COLOR:-}" ]] && [[ -t 1 ]]; then
    C_RESET="\033[0m"; C_BOLD="\033[1m"; C_CYAN="\033[36m"
    C_GREEN="\033[32m"; C_RED="\033[31m"; C_YELLOW="\033[33m"
    C_DIM="\033[2m";    C_MAGENTA="\033[35m"; C_WHITE="\033[97m"
    C_BG_BLUE="\033[44m"; C_UNDERLINE="\033[4m"
else
    C_RESET=""; C_BOLD=""; C_CYAN=""; C_GREEN=""; C_RED=""
    C_YELLOW=""; C_DIM=""; C_MAGENTA=""; C_WHITE=""
    C_BG_BLUE=""; C_UNDERLINE=""
fi

# ──────────────────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────────────────
die()     { echo -e "${C_RED}✖ ERROR:${C_RESET} $*" >&2; exit 1; }
info()    { echo -e "${C_CYAN}▶${C_RESET} $*" >&2; }
success() { echo -e "${C_GREEN}✔${C_RESET} $*" >&2; }
warn()    { echo -e "${C_YELLOW}⚠${C_RESET} $*" >&2; }
header()  { echo -e "\n${C_BG_BLUE}${C_WHITE}${C_BOLD}  $*  ${C_RESET}\n" >&2; }
separator() { printf '%.0s─' $(seq 1 "${1:-120}"); echo ""; }

usage() {
    cat <<'EOF'
Usage: ./git-revision-tracker.sh <search-root> <target-path> [max-depth]

Arguments:
  search-root   Filesystem path to scan for git repos (e.g. / or /home or .)
  target-path   File or directory to track (absolute or repo-relative)
  max-depth     Max depth for .git folder scan (default: 3)

Examples:
  ./git-revision-tracker.sh / /var/www/myapp/src/components
  ./git-revision-tracker.sh /home /home/me/project/src/App.tsx 5
  ./git-revision-tracker.sh . front-end/src/features/pages/frontend-pages
EOF
    exit 1
}

[[ -z "$TARGET_INPUT" ]] && usage

# ──────────────────────────────────────────────────────────
# Phase 1: Discover Git Repositories
# ──────────────────────────────────────────────────────────
header "PHASE 1 — Git Repository Discovery"

SEARCH_ROOT=$(realpath "$SEARCH_ROOT" 2>/dev/null || echo "$SEARCH_ROOT")

# Check if search-root is itself a git repo (fast path)
if git -C "$SEARCH_ROOT" rev-parse --is-inside-work-tree &>/dev/null; then
    REPO_ROOT=$(git -C "$SEARCH_ROOT" rev-parse --show-toplevel 2>/dev/null)
    info "Search root ${C_BOLD}${SEARCH_ROOT}${C_RESET} is already inside a git repository"
    info "Repository : ${C_BOLD}${REPO_ROOT}${C_RESET}"
    SELECTED_REPO="$REPO_ROOT"
else
    info "Scanning ${C_BOLD}${SEARCH_ROOT}${C_RESET} for git repositories (max depth: ${MAX_DEPTH}) …"
    info "This may take a moment on large filesystems …"
    echo ""

    # Find all .git directories, extract parent (the repo root)
    # Exclude common noisy paths for performance
    mapfile -t FOUND_REPOS < <(
        find "$SEARCH_ROOT" \
            -maxdepth "$MAX_DEPTH" \
            -name ".git" \
            -type d \
            ! -path "*/node_modules/*" \
            ! -path "*/.cache/*" \
            ! -path "*/vendor/*" \
            ! -path "*/.local/*" \
            ! -path "*/snap/*" \
            2>/dev/null \
        | while read -r gitdir; do
            dirname "$gitdir"
        done | sort -u
    )

    if [[ ${#FOUND_REPOS[@]} -eq 0 ]]; then
        die "No git repositories found under ${SEARCH_ROOT} (depth ≤ ${MAX_DEPTH}).\n    Try increasing max-depth or check the path."
    fi

    echo -e "${C_BOLD}Found ${#FOUND_REPOS[@]} git repository/repositories:${C_RESET}"
    echo ""

    IDX=0
    for repo in "${FOUND_REPOS[@]}"; do
        IDX=$((IDX + 1))
        # Try to get the remote URL for identification
        REMOTE=$(git -C "$repo" remote get-url origin 2>/dev/null || echo "(no remote)")
        # Get branch count
        BRANCH_COUNT=$(git -C "$repo" branch -a 2>/dev/null | wc -l | tr -d ' ')
        printf "  ${C_YELLOW}[%2d]${C_RESET}  %-60s  ${C_DIM}%s${C_RESET}  ${C_DIM}(%s branches)${C_RESET}\n" \
            "$IDX" "$repo" "$REMOTE" "$BRANCH_COUNT"
    done
    echo ""

    # ── Auto-select if target path is inside exactly one repo ──
    AUTO_MATCH=""
    ABS_TARGET=$(realpath "$TARGET_INPUT" 2>/dev/null || echo "$TARGET_INPUT")
    for repo in "${FOUND_REPOS[@]}"; do
        ABS_REPO=$(realpath "$repo" 2>/dev/null || echo "$repo")
        if [[ "$ABS_TARGET" == "$ABS_REPO"* ]]; then
            if [[ -n "$AUTO_MATCH" ]]; then
                AUTO_MATCH=""  # ambiguous — more than one match
                break
            fi
            AUTO_MATCH="$repo"
        fi
    done

    if [[ -n "$AUTO_MATCH" ]]; then
        success "Auto-selected repository: ${C_BOLD}${AUTO_MATCH}${C_RESET} (target path is inside it)"
        SELECTED_REPO="$AUTO_MATCH"
    elif [[ ${#FOUND_REPOS[@]} -eq 1 ]]; then
        SELECTED_REPO="${FOUND_REPOS[0]}"
        success "Only one repository found — auto-selected: ${C_BOLD}${SELECTED_REPO}${C_RESET}"
    else
        # Interactive selection
        while true; do
            echo -ne "${C_CYAN}Select a repository [1-${#FOUND_REPOS[@]}]:${C_RESET} "
            read -r CHOICE
            if [[ "$CHOICE" =~ ^[0-9]+$ ]] && (( CHOICE >= 1 && CHOICE <= ${#FOUND_REPOS[@]} )); then
                SELECTED_REPO="${FOUND_REPOS[$((CHOICE - 1))]}"
                break
            fi
            warn "Invalid selection. Enter a number between 1 and ${#FOUND_REPOS[@]}."
        done
    fi
fi

# Resolve to absolute
SELECTED_REPO=$(realpath "$SELECTED_REPO" 2>/dev/null || echo "$SELECTED_REPO")
cd "$SELECTED_REPO" || die "Cannot cd to ${SELECTED_REPO}"
git rev-parse --is-inside-work-tree &>/dev/null || die "${SELECTED_REPO} is not a git repository"

# ──────────────────────────────────────────────────────────
# Phase 2: Resolve Target Path
# ──────────────────────────────────────────────────────────
header "PHASE 2 — Target Path Resolution"

# Determine if the target path is absolute and inside the repo
ABS_TARGET=$(realpath "$TARGET_INPUT" 2>/dev/null || echo "$TARGET_INPUT")

if [[ "$ABS_TARGET" == "$SELECTED_REPO"* ]]; then
    # Strip the repo root prefix to get the repo-relative path
    TARGET_PATH="${ABS_TARGET#"$SELECTED_REPO"}"
    TARGET_PATH="${TARGET_PATH#/}"  # remove leading slash
    if [[ -z "$TARGET_PATH" ]]; then
        TARGET_PATH="."
    fi
    info "Resolved absolute path → repo-relative: ${C_BOLD}${TARGET_PATH}${C_RESET}"
elif [[ "$TARGET_INPUT" == /* ]]; then
    # Absolute path but not inside repo — try as-is (user might know what they're doing)
    warn "Target ${TARGET_INPUT} doesn't appear to be inside ${SELECTED_REPO}"
    warn "Attempting to use it as a repo-relative path anyway …"
    TARGET_PATH="${TARGET_INPUT#/}"
else
    # Already relative
    TARGET_PATH="$TARGET_INPUT"
fi

# Determine target type for display
TARGET_TYPE="unknown"
if git ls-tree -d HEAD -- "$TARGET_PATH" &>/dev/null && \
   [[ -n "$(git ls-tree -d HEAD -- "$TARGET_PATH" 2>/dev/null)" ]]; then
    TARGET_TYPE="directory"
elif git ls-tree HEAD -- "$TARGET_PATH" &>/dev/null && \
     [[ -n "$(git ls-tree HEAD -- "$TARGET_PATH" 2>/dev/null)" ]]; then
    TARGET_TYPE="file"
else
    # It might exist in other branches / history but not HEAD
    warn "Target not found in HEAD — it may exist in other branches or history"
    TARGET_TYPE="historic"
fi

REMOTE_URL=$(git remote get-url origin 2>/dev/null || echo "unknown")
# Try to extract GitHub owner/repo from remote URL
GITHUB_REPO=""
if [[ "$REMOTE_URL" =~ github\.com[:/]([^/]+/[^/.]+) ]]; then
    GITHUB_REPO="${BASH_REMATCH[1]}"
    GITHUB_REPO="${GITHUB_REPO%.git}"
fi

info "Repository  : ${C_BOLD}${SELECTED_REPO}${C_RESET}"
info "Remote      : ${REMOTE_URL}"
[[ -n "$GITHUB_REPO" ]] && info "GitHub      : ${C_BOLD}${GITHUB_REPO}${C_RESET}"
info "Target path : ${C_BOLD}${TARGET_PATH}${C_RESET}  (${TARGET_TYPE})"
echo ""

# ──────────────────────────────────────────────────────────
# Phase 3: Collect All Refs (branches, remotes, reflog)
# ──────────────────────────────────────────────────────────
header "PHASE 3 — Collecting Refs (All Branches + Reflog)"

TMPDIR=$(mktemp -d "${TMPDIR:-/tmp}/git-rev-tracker.XXXXXX")
trap 'rm -rf "$TMPDIR"' EXIT

{
    # All branch tips (local + remote)
    git for-each-ref --format='%(objectname)' refs/heads/ refs/remotes/ 2>/dev/null

    # Every SHA the reflog still knows about (deleted branches live here)
    git reflog show --all --format='%H' 2>/dev/null || true

    # Stash refs
    git stash list --format='%H' 2>/dev/null || true
} | sort -u > "$TMPDIR/all_refs.txt"

REF_COUNT=$(wc -l < "$TMPDIR/all_refs.txt" | tr -d ' ')
info "Unique refs collected: ${C_BOLD}${REF_COUNT}${C_RESET} (local + remote + reflog + stash)"

# Show branch breakdown
LOCAL_BRANCHES=$(git for-each-ref --format='%(refname:short)' refs/heads/ 2>/dev/null | wc -l | tr -d ' ')
REMOTE_BRANCHES=$(git for-each-ref --format='%(refname:short)' refs/remotes/ 2>/dev/null | wc -l | tr -d ' ')
REFLOG_ENTRIES=$(git reflog show --all --format='%H' 2>/dev/null | wc -l | tr -d ' ')
info "  Local branches  : ${LOCAL_BRANCHES}"
info "  Remote branches : ${REMOTE_BRANCHES}"
info "  Reflog entries  : ${REFLOG_ENTRIES} (includes deleted branch history)"

# ──────────────────────────────────────────────────────────
# Phase 4: Discover Commits Touching the Target
# ──────────────────────────────────────────────────────────
header "PHASE 4 — Discovering Commits"

info "Searching for commits that modified ${C_BOLD}${TARGET_PATH}${C_RESET} …"

# Primary: --all --reflog covers most
git log \
    --all \
    --reflog \
    --format="%H" \
    --diff-filter=ACDMRT \
    -- "$TARGET_PATH" 2>/dev/null \
  | sort -u > "$TMPDIR/commits_primary.txt"

PRIMARY_COUNT=$(wc -l < "$TMPDIR/commits_primary.txt" | tr -d ' ')
info "  From --all --reflog : ${PRIMARY_COUNT} commit(s)"

# Secondary: iterate orphaned reflog SHAs for truly lost branches
SECONDARY_COUNT=0
if [[ "$REF_COUNT" -le 5000 ]]; then
    while IFS= read -r ref; do
        git log "$ref" \
            --format="%H" \
            --diff-filter=ACDMRT \
            -- "$TARGET_PATH" 2>/dev/null || true
    done < "$TMPDIR/all_refs.txt" >> "$TMPDIR/commits_primary.txt"
    sort -u "$TMPDIR/commits_primary.txt" > "$TMPDIR/commits_dedup.txt"
    SECONDARY_COUNT=$(( $(wc -l < "$TMPDIR/commits_dedup.txt" | tr -d ' ') - PRIMARY_COUNT ))
    [[ $SECONDARY_COUNT -lt 0 ]] && SECONDARY_COUNT=0
    info "  From orphan refs    : +${SECONDARY_COUNT} commit(s)"
else
    warn "Skipping per-ref scan (${REF_COUNT} refs — too many, would be slow)"
    cp "$TMPDIR/commits_primary.txt" "$TMPDIR/commits_dedup.txt"
fi

# Sort by author date (oldest → newest) with metadata
while IFS= read -r sha; do
    git log -1 --format="%at %H %aI %aN" "$sha" 2>/dev/null || true
done < "$TMPDIR/commits_dedup.txt" | sort -n -k1,1 > "$TMPDIR/commits_sorted.txt"

COMMIT_COUNT=$(wc -l < "$TMPDIR/commits_sorted.txt" | tr -d ' ')
echo ""
success "Total unique commits: ${C_BOLD}${COMMIT_COUNT}${C_RESET}"

if [[ "$COMMIT_COUNT" -eq 0 ]]; then
    warn "No commits found touching ${TARGET_PATH} in any branch or reflog."
    warn "Check that the path is correct relative to the repo root."
    echo ""
    echo "Repo root contents (top-level):"
    git ls-tree --name-only HEAD | head -20
    exit 0
fi

# ──────────────────────────────────────────────────────────
# Phase 5: Revision Table with Line-Count Diffs
# ──────────────────────────────────────────────────────────
header "PHASE 5 — Revision History with Line Diffs"

info "Target: ${C_BOLD}${TARGET_PATH}${C_RESET}  (${TARGET_TYPE})"
info "Commits: ${COMMIT_COUNT}"
[[ -n "$GITHUB_REPO" ]] && info "GitHub: https://github.com/${GITHUB_REPO}"
echo ""

# ── Count lines helper ──
# For a directory: count all lines in all files under it at a given SHA
# For a single file: count lines of that file at a given SHA
count_lines_at_rev() {
    local sha="$1" path="$2"
    local count=0
    if [[ "$TARGET_TYPE" == "file" ]]; then
        count=$(git show "${sha}:${path}" 2>/dev/null | wc -l | tr -d ' ')
    else
        # directory — enumerate and cat all files
        count=$(git ls-tree -r --name-only "$sha" -- "$path" 2>/dev/null \
            | while IFS= read -r f; do
                git show "${sha}:${f}" 2>/dev/null
            done | wc -l | tr -d ' ')
    fi
    echo "$count"
}

# ── Table header ──
printf "${C_BOLD}%-5s  %-12s  %-25s  %-22s  %8s  %8s  %8s  %8s  %-6s  %s${C_RESET}\n" \
    "#" "SHA" "DATE" "AUTHOR" "+ADDED" "-DELETED" "NET" "TOTAL" "FILES" "SUBJECT"
separator 160

PREV_SHA=""
PREV_TOTAL=0
INDEX=0
EMPTY_TREE=$(git hash-object -t tree /dev/null)

# Also prepare CSV
CSV_FILE="${TMPDIR}/revisions.csv"
echo "index,sha,date,author,lines_added,lines_deleted,net_change,total_lines,files_changed,branches,subject" > "$CSV_FILE"

while read -r _epoch SHA DATE AUTHOR_REST; do
    INDEX=$((INDEX + 1))

    # Extract author (may have spaces) — re-read from git for accuracy
    AUTHOR=$(git log -1 --format="%aN" "$SHA" 2>/dev/null)
    AUTHOR_SHORT="${AUTHOR:0:22}"
    SUBJECT=$(git log -1 --format="%s" "$SHA" 2>/dev/null)
    SUBJECT_TRUNC="${SUBJECT:0:55}"

    # ── Diff stats scoped to target path ──
    if [[ -z "$PREV_SHA" ]]; then
        STATS=$(git diff --numstat "$EMPTY_TREE" "$SHA" -- "$TARGET_PATH" 2>/dev/null || true)
    else
        STATS=$(git diff --numstat "$PREV_SHA" "$SHA" -- "$TARGET_PATH" 2>/dev/null || true)
    fi

    ADDED=0; DELETED=0; FILE_COUNT=0
    while IFS=$'\t' read -r a d _f; do
        [[ "$a" == "-" ]] && continue   # binary
        [[ -z "$a" ]] && continue
        ADDED=$((ADDED + a))
        DELETED=$((DELETED + d))
        FILE_COUNT=$((FILE_COUNT + 1))
    done <<< "$STATS"

    NET=$((ADDED - DELETED))

    # ── Total lines at this revision ──
    TOTAL_LINES=$(count_lines_at_rev "$SHA" "$TARGET_PATH")

    # ── Net change color ──
    if [[ $NET -gt 0 ]]; then
        NET_DISPLAY="${C_GREEN}+${NET}${C_RESET}"
    elif [[ $NET -lt 0 ]]; then
        NET_DISPLAY="${C_RED}${NET}${C_RESET}"
    else
        NET_DISPLAY="${C_DIM}0${C_RESET}"
    fi

    SHORT_SHA="${SHA:0:12}"

    # ── Which branch(es) contain this commit? ──
    BRANCHES=$(git branch -a --contains "$SHA" 2>/dev/null \
        | sed 's/^[* ]*//' | paste -sd ',' - | head -c 80)

    # ── Print row ──
    printf "%-5s  ${C_YELLOW}%-12s${C_RESET}  %-25s  %-22s  ${C_GREEN}%+8d${C_RESET}  ${C_RED}%+8d${C_RESET}  %8b  %8s  %-6s  %s\n" \
        "$INDEX" "$SHORT_SHA" "$DATE" "$AUTHOR_SHORT" "$ADDED" "-$DELETED" "$NET_DISPLAY" "$TOTAL_LINES" "$FILE_COUNT" "$SUBJECT_TRUNC"

    # Branch membership (dimmed)
    if [[ -n "$BRANCHES" ]]; then
        printf "       ${C_DIM}↳ branches: %s${C_RESET}\n" "$BRANCHES"
    fi

    # ── Delta from previous total ──
    if [[ $INDEX -gt 1 ]]; then
        DELTA=$((TOTAL_LINES - PREV_TOTAL))
        if [[ $DELTA -gt 0 ]]; then
            printf "       ${C_DIM}↳ total Δ from prev: ${C_GREEN}+%d${C_RESET}${C_DIM} lines (was %d → now %d)${C_RESET}\n" \
                "$DELTA" "$PREV_TOTAL" "$TOTAL_LINES"
        elif [[ $DELTA -lt 0 ]]; then
            printf "       ${C_DIM}↳ total Δ from prev: ${C_RED}%d${C_RESET}${C_DIM} lines (was %d → now %d)${C_RESET}\n" \
                "$DELTA" "$PREV_TOTAL" "$TOTAL_LINES"
        fi
    fi

    # CSV row (escape commas in subject)
    CSV_SUBJECT=$(echo "$SUBJECT" | sed 's/,/;/g')
    CSV_BRANCHES=$(echo "$BRANCHES" | sed 's/,/;/g')
    echo "${INDEX},${SHORT_SHA},${DATE},${AUTHOR},${ADDED},${DELETED},${NET},${TOTAL_LINES},${FILE_COUNT},${CSV_BRANCHES},${CSV_SUBJECT}" >> "$CSV_FILE"

    PREV_SHA="$SHA"
    PREV_TOTAL="$TOTAL_LINES"

done < "$TMPDIR/commits_sorted.txt"

# ──────────────────────────────────────────────────────────
# Phase 6: Summary & Export
# ──────────────────────────────────────────────────────────
header "PHASE 6 — Summary"

separator 120
echo ""
echo -e "  ${C_BOLD}Repository${C_RESET}       : ${SELECTED_REPO}"
echo -e "  ${C_BOLD}Remote${C_RESET}           : ${REMOTE_URL}"
[[ -n "$GITHUB_REPO" ]] && \
echo -e "  ${C_BOLD}GitHub${C_RESET}           : https://github.com/${GITHUB_REPO}"
echo -e "  ${C_BOLD}Target${C_RESET}           : ${TARGET_PATH}  (${TARGET_TYPE})"
echo -e "  ${C_BOLD}Total commits${C_RESET}    : ${COMMIT_COUNT}"
echo -e "  ${C_BOLD}Local branches${C_RESET}   : ${LOCAL_BRANCHES}"
echo -e "  ${C_BOLD}Remote branches${C_RESET}  : ${REMOTE_BRANCHES}"
echo -e "  ${C_BOLD}Reflog entries${C_RESET}   : ${REFLOG_ENTRIES}"
echo -e "  ${C_BOLD}Final line count${C_RESET} : ${PREV_TOTAL}"
echo ""

# Copy CSV to a user-friendly location
EXPORT_NAME="git-revision-tracker-$(date +%Y%m%d-%H%M%S).csv"
EXPORT_PATH="${HOME}/${EXPORT_NAME}"
cp "$CSV_FILE" "$EXPORT_PATH" 2>/dev/null && \
    success "CSV exported → ${C_BOLD}${EXPORT_PATH}${C_RESET}" || \
    warn "Could not copy CSV to home directory. Available at: ${CSV_FILE}"

# ── Optional: per-file breakdown at latest revision ──
if [[ "$TARGET_TYPE" != "file" && -n "$PREV_SHA" ]]; then
    echo ""
    echo -e "${C_BOLD}Per-file breakdown at latest revision (${PREV_SHA:0:12}):${C_RESET}"
    separator 80
    printf "  ${C_BOLD}%-8s  %s${C_RESET}\n" "LINES" "FILE"

    git ls-tree -r --name-only "$PREV_SHA" -- "$TARGET_PATH" 2>/dev/null \
    | while IFS= read -r filepath; do
        FLINES=$(git show "${PREV_SHA}:${filepath}" 2>/dev/null | wc -l | tr -d ' ')
        printf "  %-8s  %s\n" "$FLINES" "$filepath"
    done | sort -rn

    echo ""
fi

echo -e "${C_GREEN}${C_BOLD}Done.${C_RESET}"