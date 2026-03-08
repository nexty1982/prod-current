#!/bin/bash
# om-snapshot.sh — Local snapshot system for uncommitted work
# Prevents loss of uncommitted changes during branch operations or AI sessions
#
# Usage:
#   om-snapshot.sh save [label]     — Save snapshot of all uncommitted changes
#   om-snapshot.sh list             — List all saved snapshots
#   om-snapshot.sh diff <id>        — Show diff between snapshot and current working tree
#   om-snapshot.sh review <id>      — Interactive file-by-file review of a snapshot
#   om-snapshot.sh restore <id>     — Restore snapshot (with confirmation per file)
#   om-snapshot.sh auto             — Auto-save (called by hooks/cron)
#   om-snapshot.sh cleanup [days]   — Remove snapshots older than N days (default: 30)

set -euo pipefail

PROJECT_ROOT="/var/www/orthodoxmetrics/prod"
SNAPSHOT_DIR="$PROJECT_ROOT/.snapshots"
MAX_AUTO_SNAPSHOTS=50

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color
BOLD='\033[1m'

mkdir -p "$SNAPSHOT_DIR"

# ─── Helpers ───────────────────────────────────────────────────────────────────

snapshot_id() {
  date +%Y%m%d-%H%M%S
}

get_branch() {
  git -C "$PROJECT_ROOT" rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown"
}

get_short_hash() {
  git -C "$PROJECT_ROOT" rev-parse --short HEAD 2>/dev/null || echo "unknown"
}

count_changes() {
  local dir="$1"
  find "$dir" -type f | wc -l
}

# ─── SAVE ──────────────────────────────────────────────────────────────────────

cmd_save() {
  local label="${1:-manual}"
  local id
  id=$(snapshot_id)
  local snap_dir="$SNAPSHOT_DIR/$id"
  local branch
  branch=$(get_branch)
  local commit_hash
  commit_hash=$(get_short_hash)

  # Check if there are any changes to save
  cd "$PROJECT_ROOT"
  local changed_files
  changed_files=$(git diff --name-only HEAD 2>/dev/null; git ls-files --others --exclude-standard 2>/dev/null)

  if [ -z "$changed_files" ]; then
    echo -e "${YELLOW}No uncommitted changes to snapshot.${NC}"
    return 0
  fi

  mkdir -p "$snap_dir/files"

  # Save metadata
  cat > "$snap_dir/metadata.txt" <<EOF
id=$id
label=$label
branch=$branch
commit=$commit_hash
timestamp=$(date -Iseconds)
user=$(whoami)
file_count=$(echo "$changed_files" | wc -l)
EOF

  # Save the file list
  echo "$changed_files" > "$snap_dir/filelist.txt"

  # Save each changed file with its directory structure
  while IFS= read -r file; do
    if [ -f "$PROJECT_ROOT/$file" ]; then
      mkdir -p "$snap_dir/files/$(dirname "$file")"
      cp "$PROJECT_ROOT/$file" "$snap_dir/files/$file"
    fi
  done <<< "$changed_files"

  # Save the unified diff
  git -C "$PROJECT_ROOT" diff HEAD > "$snap_dir/changes.patch" 2>/dev/null || true

  local file_count
  file_count=$(echo "$changed_files" | wc -l)

  echo -e "${GREEN}Snapshot saved:${NC} $id"
  echo -e "  Label:   ${CYAN}$label${NC}"
  echo -e "  Branch:  ${BLUE}$branch${NC} @ $commit_hash"
  echo -e "  Files:   ${BOLD}$file_count${NC} changed"
  echo -e "  Path:    $snap_dir"

  # Prune old auto snapshots
  local auto_count
  auto_count=$(ls -d "$SNAPSHOT_DIR"/*/metadata.txt 2>/dev/null | xargs grep -l "label=auto" 2>/dev/null | wc -l)
  if [ "$auto_count" -gt "$MAX_AUTO_SNAPSHOTS" ]; then
    local to_remove=$((auto_count - MAX_AUTO_SNAPSHOTS))
    ls -d "$SNAPSHOT_DIR"/*/metadata.txt 2>/dev/null | xargs grep -l "label=auto" | sort | head -n "$to_remove" | while read -r meta; do
      rm -rf "$(dirname "$meta")"
    done
    echo -e "${YELLOW}Pruned $to_remove old auto-snapshots${NC}"
  fi
}

# ─── LIST ──────────────────────────────────────────────────────────────────────

cmd_list() {
  echo -e "${BOLD}Saved snapshots:${NC}"
  echo ""
  printf "  ${BOLD}%-20s %-12s %-40s %-10s %s${NC}\n" "ID" "LABEL" "BRANCH" "FILES" "TIME"
  echo "  $(printf '%.0s─' {1..100})"

  for meta in $(ls -d "$SNAPSHOT_DIR"/*/metadata.txt 2>/dev/null | sort -r); do
    local dir
    dir=$(dirname "$meta")
    local id label branch file_count timestamp
    id=$(grep '^id=' "$meta" | cut -d= -f2)
    label=$(grep '^label=' "$meta" | cut -d= -f2)
    branch=$(grep '^branch=' "$meta" | cut -d= -f2)
    file_count=$(grep '^file_count=' "$meta" | cut -d= -f2)
    timestamp=$(grep '^timestamp=' "$meta" | cut -d= -f2- | cut -dT -f2 | cut -d+ -f1 | cut -c1-5)

    local label_color="$CYAN"
    [ "$label" = "auto" ] && label_color="$YELLOW"
    [ "$label" = "pre-branch-switch" ] && label_color="$RED"

    printf "  %-20s ${label_color}%-12s${NC} %-40s %-10s %s\n" "$id" "$label" "$branch" "$file_count" "$timestamp"
  done

  echo ""
  local total
  total=$(ls -d "$SNAPSHOT_DIR"/*/metadata.txt 2>/dev/null | wc -l)
  echo -e "  ${BOLD}Total: $total snapshots${NC}"
}

# ─── DIFF ──────────────────────────────────────────────────────────────────────

cmd_diff() {
  local id="$1"
  local snap_dir="$SNAPSHOT_DIR/$id"

  if [ ! -d "$snap_dir" ]; then
    # Try partial match
    local matches
    matches=$(ls -d "$SNAPSHOT_DIR"/"$id"* 2>/dev/null | head -1)
    if [ -n "$matches" ]; then
      snap_dir="$matches"
      id=$(basename "$snap_dir")
    else
      echo -e "${RED}Snapshot not found: $id${NC}"
      return 1
    fi
  fi

  echo -e "${BOLD}Snapshot: $id${NC}"
  source "$snap_dir/metadata.txt" 2>/dev/null || true
  echo -e "  Branch: ${BLUE}$branch${NC} @ $commit"
  echo -e "  Label:  ${CYAN}$label${NC}"
  echo ""

  echo -e "${BOLD}File comparison (snapshot vs current):${NC}"
  echo ""

  while IFS= read -r file; do
    local snap_file="$snap_dir/files/$file"
    local curr_file="$PROJECT_ROOT/$file"

    if [ ! -f "$snap_file" ]; then
      # File was untracked/deleted in snapshot
      if [ -f "$curr_file" ]; then
        echo -e "  ${YELLOW}[CURRENT ONLY]${NC}  $file"
      fi
    elif [ ! -f "$curr_file" ]; then
      echo -e "  ${RED}[MISSING]${NC}       $file  (exists in snapshot, missing now)"
    else
      local snap_size curr_size
      snap_size=$(wc -l < "$snap_file" 2>/dev/null || echo 0)
      curr_size=$(wc -l < "$curr_file" 2>/dev/null || echo 0)

      if diff -q "$snap_file" "$curr_file" > /dev/null 2>&1; then
        echo -e "  ${GREEN}[IDENTICAL]${NC}     $file"
      else
        local changes
        changes=$(diff "$snap_file" "$curr_file" 2>/dev/null | grep -c '^[<>]' || true)
        echo -e "  ${RED}[DIFFERS]${NC}       $file  (${snap_size}L snap vs ${curr_size}L current, ~${changes} line changes)"
      fi
    fi
  done < "$snap_dir/filelist.txt"
}

# ─── REVIEW ────────────────────────────────────────────────────────────────────

cmd_review() {
  local id="$1"
  local snap_dir="$SNAPSHOT_DIR/$id"

  if [ ! -d "$snap_dir" ]; then
    local matches
    matches=$(ls -d "$SNAPSHOT_DIR"/"$id"* 2>/dev/null | head -1)
    if [ -n "$matches" ]; then
      snap_dir="$matches"
      id=$(basename "$snap_dir")
    else
      echo -e "${RED}Snapshot not found: $id${NC}"
      return 1
    fi
  fi

  echo -e "${BOLD}Interactive review of snapshot: $id${NC}"
  echo ""

  local differing_files=()

  while IFS= read -r file; do
    local snap_file="$snap_dir/files/$file"
    local curr_file="$PROJECT_ROOT/$file"

    if [ -f "$snap_file" ] && [ -f "$curr_file" ]; then
      if ! diff -q "$snap_file" "$curr_file" > /dev/null 2>&1; then
        differing_files+=("$file")
      fi
    elif [ -f "$snap_file" ] && [ ! -f "$curr_file" ]; then
      differing_files+=("$file")
    fi
  done < "$snap_dir/filelist.txt"

  if [ ${#differing_files[@]} -eq 0 ]; then
    echo -e "${GREEN}All files match! Nothing to review.${NC}"
    return 0
  fi

  echo -e "Found ${BOLD}${#differing_files[@]}${NC} files that differ."
  echo ""

  local i=1
  for file in "${differing_files[@]}"; do
    echo -e "${BOLD}[$i/${#differing_files[@]}]${NC} ${CYAN}$file${NC}"
    local snap_file="$snap_dir/files/$file"
    local curr_file="$PROJECT_ROOT/$file"

    if [ ! -f "$curr_file" ]; then
      echo -e "  ${RED}File is MISSING from current working tree${NC}"
      local snap_lines
      snap_lines=$(wc -l < "$snap_file")
      echo -e "  Snapshot version: ${snap_lines} lines"
    else
      diff --color=always "$curr_file" "$snap_file" | head -60 || true
      echo ""
      echo -e "  ${YELLOW}(showing first 60 lines of diff — left=current, right=snapshot)${NC}"
    fi

    echo ""
    echo -e "  ${BOLD}[s]${NC}kip  ${BOLD}[r]${NC}estore from snapshot  ${BOLD}[f]${NC}ull diff  ${BOLD}[q]${NC}uit"
    read -rp "  Action: " action

    case "$action" in
      r|R|restore)
        if [ -f "$snap_file" ]; then
          mkdir -p "$(dirname "$curr_file")"
          cp "$snap_file" "$curr_file"
          echo -e "  ${GREEN}Restored: $file${NC}"
        fi
        ;;
      f|F|full)
        if [ -f "$curr_file" ]; then
          diff --color=always "$curr_file" "$snap_file" || true
        else
          cat "$snap_file"
        fi
        echo ""
        echo -e "  ${BOLD}[r]${NC}estore  ${BOLD}[s]${NC}kip"
        read -rp "  Action: " action2
        if [ "$action2" = "r" ] || [ "$action2" = "R" ]; then
          mkdir -p "$(dirname "$curr_file")"
          cp "$snap_file" "$curr_file"
          echo -e "  ${GREEN}Restored: $file${NC}"
        fi
        ;;
      q|Q|quit)
        echo -e "${YELLOW}Review aborted.${NC}"
        return 0
        ;;
      *)
        echo -e "  ${YELLOW}Skipped${NC}"
        ;;
    esac

    echo ""
    ((i++))
  done

  echo -e "${GREEN}Review complete.${NC}"
}

# ─── RESTORE ───────────────────────────────────────────────────────────────────

cmd_restore() {
  local id="$1"
  local snap_dir="$SNAPSHOT_DIR/$id"

  if [ ! -d "$snap_dir" ]; then
    local matches
    matches=$(ls -d "$SNAPSHOT_DIR"/"$id"* 2>/dev/null | head -1)
    if [ -n "$matches" ]; then
      snap_dir="$matches"
      id=$(basename "$snap_dir")
    else
      echo -e "${RED}Snapshot not found: $id${NC}"
      return 1
    fi
  fi

  echo -e "${BOLD}Restore snapshot: $id${NC}"
  echo ""

  # First save current state as a snapshot
  echo -e "${YELLOW}Saving current state before restore...${NC}"
  cmd_save "pre-restore-$id"
  echo ""

  # Show what will be restored
  cmd_diff "$id"
  echo ""

  echo -e "${RED}${BOLD}This will overwrite the files listed as [DIFFERS] or [MISSING] above.${NC}"
  read -rp "Proceed? (y/N): " confirm

  if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
    echo -e "${YELLOW}Restore cancelled.${NC}"
    return 0
  fi

  local restored=0
  local skipped=0

  while IFS= read -r file; do
    local snap_file="$snap_dir/files/$file"
    local curr_file="$PROJECT_ROOT/$file"

    if [ -f "$snap_file" ]; then
      if [ -f "$curr_file" ] && diff -q "$snap_file" "$curr_file" > /dev/null 2>&1; then
        ((skipped++))
        continue
      fi
      mkdir -p "$(dirname "$curr_file")"
      cp "$snap_file" "$curr_file"
      echo -e "  ${GREEN}Restored:${NC} $file"
      ((restored++))
    fi
  done < "$snap_dir/filelist.txt"

  echo ""
  echo -e "${GREEN}Restored $restored files${NC} ($skipped unchanged/skipped)"
}

# ─── AUTO ──────────────────────────────────────────────────────────────────────

cmd_auto() {
  # Silent auto-save for hooks/cron
  cd "$PROJECT_ROOT"
  local changed_files
  changed_files=$(git diff --name-only HEAD 2>/dev/null; git ls-files --others --exclude-standard 2>/dev/null)

  if [ -z "$changed_files" ]; then
    exit 0
  fi

  cmd_save "auto"
}

# ─── CLEANUP ───────────────────────────────────────────────────────────────────

cmd_cleanup() {
  local days="${1:-30}"
  local removed=0

  echo -e "${BOLD}Cleaning up snapshots older than $days days...${NC}"

  for dir in "$SNAPSHOT_DIR"/*/; do
    [ -d "$dir" ] || continue
    local meta="$dir/metadata.txt"
    [ -f "$meta" ] || continue

    if [ "$(find "$meta" -mtime +"$days" 2>/dev/null)" ]; then
      local id
      id=$(basename "$dir")
      rm -rf "$dir"
      echo -e "  ${RED}Removed:${NC} $id"
      ((removed++))
    fi
  done

  echo -e "${GREEN}Removed $removed old snapshots.${NC}"
}

# ─── MAIN ──────────────────────────────────────────────────────────────────────

cmd="${1:-help}"
shift || true

case "$cmd" in
  save)    cmd_save "$@" ;;
  list|ls) cmd_list ;;
  diff)    cmd_diff "$@" ;;
  review)  cmd_review "$@" ;;
  restore) cmd_restore "$@" ;;
  auto)    cmd_auto ;;
  cleanup) cmd_cleanup "$@" ;;
  help|*)
    echo "om-snapshot — Local snapshot system for uncommitted work"
    echo ""
    echo "Usage:"
    echo "  om-snapshot.sh save [label]     Save current uncommitted changes"
    echo "  om-snapshot.sh list             List all saved snapshots"
    echo "  om-snapshot.sh diff <id>        Compare snapshot vs current"
    echo "  om-snapshot.sh review <id>      Interactive file-by-file review + restore"
    echo "  om-snapshot.sh restore <id>     Restore entire snapshot (with confirmation)"
    echo "  om-snapshot.sh auto             Silent auto-save (for hooks/cron)"
    echo "  om-snapshot.sh cleanup [days]   Remove snapshots older than N days"
    ;;
esac
