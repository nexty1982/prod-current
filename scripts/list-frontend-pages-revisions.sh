#!/usr/bin/env bash
#
# list-frontend-pages-revisions.sh
#
# Lists all revisions (commits) that touched the frontend-pages directory
# in the nexty1982/prod-current repository across ALL branches (including
# deleted branches reachable via reflog), showing line-count differences
# between each consecutive revision.
#
# Usage:
#   chmod +x list-frontend-pages-revisions.sh
#   ./list-frontend-pages-revisions.sh [/path/to/repo]
#
# If no path is given, defaults to the current directory.
#
# Requirements: git, awk, sort, column (optional, for formatting)
#

set -euo pipefail

# ──────────────────────────────────────────────────────────
# Configuration
# ──────────────────────────────────────────────────────────
REPO_DIR="${1:-.}"
# Path inside the repo to the frontend-pages directory
TARGET_PATH="front-end/src/features/pages/frontend-pages"
# GitHub remote & repo identifier (for display / links)
GITHUB_REPO="nexty1982/prod-current"

# Colors (disable with NO_COLOR=1)
if [[ -z "${NO_COLOR:-}" ]]; then
    C_RESET="\033[0m"
    C_BOLD="\033[1m"
    C_CYAN="\033[36m"
    C_GREEN="\033[32m"
    C_RED="\033[31m"
    C_YELLOW="\033[33m"
    C_DIM="\033[2m"
else
    C_RESET="" C_BOLD="" C_CYAN="" C_GREEN="" C_RED="" C_YELLOW="" C_DIM=""
fi

# ──────────────────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────────────────
die()  { echo -e "${C_RED}ERROR:${C_RESET} $*" >&2; exit 1; }
info() { echo -e "${C_CYAN}▶${C_RESET} $*" >&2; }

# ──────────────────────────────────────────────────────────
# Validate
# ──────────────────────────────────────────────────────────
cd "$REPO_DIR" 2>/dev/null || die "Cannot cd to $REPO_DIR"
git rev-parse --is-inside-work-tree &>/dev/null || die "$REPO_DIR is not a git repository"

REMOTE_URL=$(git remote get-url origin 2>/dev/null || echo "unknown")
info "Repository : ${C_BOLD}${GITHUB_REPO}${C_RESET}"
info "Remote URL : ${REMOTE_URL}"
info "Target path: ${C_BOLD}${TARGET_PATH}${C_RESET}"
echo ""

# ──────────────────────────────────────────────────────────
# Step 1 – Gather ALL reachable refs
#   • all local branches
#   • all remote-tracking branches
#   • reflog entries (captures deleted branches still in reflog)
#   • stashes (may reference deleted branch work)
# ──────────────────────────────────────────────────────────
info "Collecting refs from all branches, remotes, and reflog …"

{
    # All branch tips (local + remote)
    git for-each-ref --format='%(objectname)' refs/heads/ refs/remotes/ 2>/dev/null

    # Every SHA the reflog still knows about (deleted branches live here)
    git reflog show --all --format='%H' 2>/dev/null || true

    # Stash refs
    git stash list --format='%H' 2>/dev/null || true
} | sort -u > /tmp/_all_refs_$$.txt

REF_COUNT=$(wc -l < /tmp/_all_refs_$$.txt | tr -d ' ')
info "Found ${C_BOLD}${REF_COUNT}${C_RESET} unique ref(s) to search"

# ──────────────────────────────────────────────────────────
# Step 2 – Get every commit that touched TARGET_PATH,
#           across all collected refs, deduplicated & sorted
#           by author date (oldest → newest).
# ──────────────────────────────────────────────────────────
info "Listing commits that touched ${C_BOLD}${TARGET_PATH}${C_RESET} …"
echo ""

# We pass all refs as starting points to git-log.
# --diff-filter=ACDMRT catches adds, copies, deletes, modifications, renames, type-changes.
# --follow doesn't work on directories, but -- <path> is fine.
REFS=$(cat /tmp/_all_refs_$$.txt | tr '\n' ' ')

# Build the commit list: hash | iso-date | author | subject | branch-hints
# Using %D to show any decoration (branch/tag names) for context.
git log \
    --all \
    --reflog \
    --format="%H" \
    --diff-filter=ACDMRT \
    -- "$TARGET_PATH" \
  | sort -u > /tmp/_commits_raw_$$.txt

# Also search from the collected refs (for truly orphaned reflog entries)
while IFS= read -r ref; do
    git log "$ref" \
        --format="%H" \
        --diff-filter=ACDMRT \
        -- "$TARGET_PATH" 2>/dev/null || true
done < /tmp/_all_refs_$$.txt >> /tmp/_commits_raw_$$.txt

sort -u /tmp/_commits_raw_$$.txt > /tmp/_commits_dedup_$$.txt

# Now re-sort by author date (oldest first) and get metadata
while IFS= read -r sha; do
    # author-date in epoch for sorting, then human-readable fields
    git log -1 --format="%at %H %aI %an %s" "$sha" 2>/dev/null
done < /tmp/_commits_dedup_$$.txt | sort -n -k1,1 > /tmp/_commits_sorted_$$.txt

COMMIT_COUNT=$(wc -l < /tmp/_commits_sorted_$$.txt | tr -d ' ')
info "Found ${C_BOLD}${COMMIT_COUNT}${C_RESET} commit(s) touching frontend-pages"
echo ""

if [[ "$COMMIT_COUNT" -eq 0 ]]; then
    echo "No commits found for ${TARGET_PATH}."
    rm -f /tmp/_*_$$.txt
    exit 0
fi

# ──────────────────────────────────────────────────────────
# Step 3 – Walk through commits, compute line-count diffs
# ──────────────────────────────────────────────────────────

# Header
printf "${C_BOLD}%-4s  %-12s  %-25s  %-20s  %8s  %8s  %8s  %8s  %-6s  %s${C_RESET}\n" \
    "#" "SHORT SHA" "DATE" "AUTHOR" "+LINES" "-LINES" "NET" "TOTAL" "FILES" "SUBJECT"
printf '%.0s─' {1..160}; echo ""

PREV_SHA=""
PREV_TOTAL=0
INDEX=0

while read -r _epoch SHA DATE AUTHOR SUBJECT_REST; do
    INDEX=$((INDEX + 1))
    AUTHOR_SHORT="${AUTHOR:0:20}"

    # Trim the subject (it's everything after the 4th field)
    SUBJECT=$(git log -1 --format="%s" "$SHA" 2>/dev/null)
    SUBJECT_TRUNC="${SUBJECT:0:60}"

    # ── Line-count stats for this commit vs its parent, scoped to TARGET_PATH ──
    # numstat gives: added  deleted  filename   (per file)
    if [[ -z "$PREV_SHA" ]]; then
        # First commit – diff against empty tree
        EMPTY_TREE=$(git hash-object -t tree /dev/null)
        STATS=$(git diff --numstat "$EMPTY_TREE" "$SHA" -- "$TARGET_PATH" 2>/dev/null || true)
    else
        STATS=$(git diff --numstat "$PREV_SHA" "$SHA" -- "$TARGET_PATH" 2>/dev/null || true)
    fi

    ADDED=0; DELETED=0; FILE_COUNT=0
    while IFS=$'\t' read -r a d _f; do
        # Skip binary files (shown as "-")
        [[ "$a" == "-" ]] && continue
        [[ -z "$a" ]] && continue
        ADDED=$((ADDED + a))
        DELETED=$((DELETED + d))
        FILE_COUNT=$((FILE_COUNT + 1))
    done <<< "$STATS"

    NET=$((ADDED - DELETED))

    # Total lines in TARGET_PATH at this revision
    TOTAL_LINES=$(git ls-tree -r --name-only "$SHA" -- "$TARGET_PATH" 2>/dev/null \
        | xargs -I{} git show "$SHA:{}" 2>/dev/null \
        | wc -l | tr -d ' ')

    # ── Color the net change ──
    if [[ $NET -gt 0 ]]; then
        NET_DISPLAY="${C_GREEN}+${NET}${C_RESET}"
    elif [[ $NET -lt 0 ]]; then
        NET_DISPLAY="${C_RED}${NET}${C_RESET}"
    else
        NET_DISPLAY="${C_DIM}0${C_RESET}"
    fi

    SHORT_SHA="${SHA:0:12}"
    GITHUB_URL="https://github.com/${GITHUB_REPO}/commit/${SHA}"

    # ── Which branch(es) contain this commit? ──
    BRANCHES=$(git branch -a --contains "$SHA" 2>/dev/null \
        | sed 's/^[* ]*//' | paste -sd ',' - | head -c 80)

    # Print the row
    printf "%-4s  ${C_YELLOW}%-12s${C_RESET}  %-25s  %-20s  ${C_GREEN}%+8d${C_RESET}  ${C_RED}%+8d${C_RESET}  %8b  %8s  %-6s  %s\n" \
        "$INDEX" "$SHORT_SHA" "$DATE" "$AUTHOR_SHORT" "$ADDED" "-$DELETED" "$NET_DISPLAY" "$TOTAL_LINES" "$FILE_COUNT" "$SUBJECT_TRUNC"

    # Print branch membership (dimmed, indented)
    if [[ -n "$BRANCHES" ]]; then
        printf "      ${C_DIM}branches: %s${C_RESET}\n" "$BRANCHES"
    fi

    PREV_SHA="$SHA"
    PREV_TOTAL="$TOTAL_LINES"

done < /tmp/_commits_sorted_$$.txt

# ──────────────────────────────────────────────────────────
# Summary
# ──────────────────────────────────────────────────────────
echo ""
printf '%.0s─' {1..160}; echo ""
info "Summary"
echo -e "  Total commits touching frontend-pages : ${C_BOLD}${COMMIT_COUNT}${C_RESET}"
echo -e "  Final line count at latest revision    : ${C_BOLD}${PREV_TOTAL}${C_RESET}"
echo -e "  GitHub path: https://github.com/${GITHUB_REPO}/tree/main/${TARGET_PATH}"
echo ""

# ──────────────────────────────────────────────────────────
# Optional: CSV export
# ──────────────────────────────────────────────────────────
CSV_FILE="/tmp/frontend-pages-revisions.csv"
info "Exporting CSV to ${C_BOLD}${CSV_FILE}${C_RESET} …"

echo "index,sha,date,author,lines_added,lines_deleted,net_change,total_lines,files_changed,subject" > "$CSV_FILE"

INDEX=0
PREV_SHA=""
while read -r _epoch SHA DATE AUTHOR _REST; do
    INDEX=$((INDEX + 1))
    SUBJECT=$(git log -1 --format="%s" "$SHA" 2>/dev/null | sed 's/,/;/g')

    if [[ -z "$PREV_SHA" ]]; then
        EMPTY_TREE=$(git hash-object -t tree /dev/null)
        STATS=$(git diff --numstat "$EMPTY_TREE" "$SHA" -- "$TARGET_PATH" 2>/dev/null || true)
    else
        STATS=$(git diff --numstat "$PREV_SHA" "$SHA" -- "$TARGET_PATH" 2>/dev/null || true)
    fi

    ADDED=0; DELETED=0; FILE_COUNT=0
    while IFS=$'\t' read -r a d _f; do
        [[ "$a" == "-" ]] && continue
        [[ -z "$a" ]] && continue
        ADDED=$((ADDED + a))
        DELETED=$((DELETED + d))
        FILE_COUNT=$((FILE_COUNT + 1))
    done <<< "$STATS"

    NET=$((ADDED - DELETED))
    TOTAL_LINES=$(git ls-tree -r --name-only "$SHA" -- "$TARGET_PATH" 2>/dev/null \
        | xargs -I{} git show "$SHA:{}" 2>/dev/null \
        | wc -l | tr -d ' ')

    echo "${INDEX},${SHA:0:12},${DATE},${AUTHOR},${ADDED},${DELETED},${NET},${TOTAL_LINES},${FILE_COUNT},${SUBJECT}" >> "$CSV_FILE"

    PREV_SHA="$SHA"
done < /tmp/_commits_sorted_$$.txt

info "CSV exported ✓"

# Cleanup
rm -f /tmp/_*_$$.txt

echo ""
echo -e "${C_GREEN}Done.${C_RESET}"