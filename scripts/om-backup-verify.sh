#!/bin/bash
# om-backup-verify.sh — Compare working tree against borg backups
# Allows reviewing and selectively restoring files from daily backups
#
# Usage:
#   om-backup-verify.sh list                    — List available borg archives
#   om-backup-verify.sh diff [archive]          — Show all diffs vs an archive (default: latest)
#   om-backup-verify.sh review [archive]        — Interactive file-by-file review
#   om-backup-verify.sh restore <file> [archive] — Restore a specific file from archive
#   om-backup-verify.sh extract [archive]       — Extract archive to /tmp for manual comparison

set -euo pipefail

PROJECT_ROOT="/var/www/orthodoxmetrics/prod"
BORG_REPO="/var/backups/OM/repo"
BORG_PREFIX="var/www/orthodoxmetrics/prod"
EXTRACT_BASE="/tmp/borg-verify"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'
BOLD='\033[1m'

needs_sudo() {
  if [ "$(id -u)" -ne 0 ]; then
    echo -e "${RED}This command requires sudo.${NC}"
    echo "  sudo $0 $*"
    exit 1
  fi
}

# ─── LIST ──────────────────────────────────────────────────────────────────────

cmd_list() {
  needs_sudo
  echo -e "${BOLD}Available borg archives:${NC}"
  echo ""
  borg list "$BORG_REPO" --format '{archive:40s} {time}{NL}' 2>/dev/null
}

# ─── Get latest archive name ──────────────────────────────────────────────────

get_archive() {
  local archive="${1:-}"
  if [ -z "$archive" ]; then
    archive=$(borg list "$BORG_REPO" --last 1 --format '{archive}' 2>/dev/null)
  fi
  echo "$archive"
}

# ─── EXTRACT ───────────────────────────────────────────────────────────────────

cmd_extract() {
  needs_sudo
  local archive
  archive=$(get_archive "${1:-}")

  local extract_dir="$EXTRACT_BASE/$archive"

  if [ -d "$extract_dir/$BORG_PREFIX" ]; then
    echo -e "${YELLOW}Archive already extracted at: $extract_dir${NC}"
  else
    echo -e "Extracting ${CYAN}$archive${NC} to $extract_dir ..."
    mkdir -p "$extract_dir"
    cd "$extract_dir"
    borg extract "$BORG_REPO::$archive" \
      "$BORG_PREFIX/front-end/src" \
      "$BORG_PREFIX/server/src" 2>/dev/null
    echo -e "${GREEN}Extraction complete.${NC}"
  fi

  echo "$extract_dir/$BORG_PREFIX"
}

# ─── DIFF ──────────────────────────────────────────────────────────────────────

cmd_diff() {
  needs_sudo
  local archive
  archive=$(get_archive "${1:-}")

  echo -e "${BOLD}Comparing current working tree vs borg archive: ${CYAN}$archive${NC}"
  echo ""

  local backup_root
  backup_root=$(cmd_extract "$archive")

  echo ""
  echo -e "${BOLD}=== Files that DIFFER ===${NC}"
  echo ""

  local diff_count=0
  local missing_count=0
  local identical_count=0

  # Compare frontend
  while IFS= read -r line; do
    if echo "$line" | grep -q 'differ$'; then
      local curr_file backup_file
      curr_file=$(echo "$line" | sed 's/^Files \(.*\) and .*/\1/')
      backup_file=$(echo "$line" | sed 's/^Files .* and \(.*\) differ$/\1/')
      local rel_path="${curr_file#$PROJECT_ROOT/}"

      local curr_lines backup_lines
      curr_lines=$(wc -l < "$curr_file" 2>/dev/null || echo 0)
      backup_lines=$(wc -l < "$backup_file" 2>/dev/null || echo 0)
      local change_lines
      change_lines=$(diff "$curr_file" "$backup_file" 2>/dev/null | grep -c '^[<>]' || true)

      echo -e "  ${RED}[DIFFERS]${NC}  $rel_path"
      echo -e "           current: ${curr_lines}L  backup: ${backup_lines}L  (~${change_lines} line changes)"
      ((diff_count++))
    fi
  done < <(diff -rq "$PROJECT_ROOT/front-end/src/" "$backup_root/front-end/src/" 2>/dev/null | grep -v '.DS_Store' | grep -v '.idea' | grep -v '\.txt ' | grep 'differ$' || true)

  while IFS= read -r line; do
    if echo "$line" | grep -q 'differ$'; then
      local curr_file backup_file
      curr_file=$(echo "$line" | sed 's/^Files \(.*\) and .*/\1/')
      backup_file=$(echo "$line" | sed 's/^Files .* and \(.*\) differ$/\1/')
      local rel_path="${curr_file#$PROJECT_ROOT/}"

      local curr_lines backup_lines
      curr_lines=$(wc -l < "$curr_file" 2>/dev/null || echo 0)
      backup_lines=$(wc -l < "$backup_file" 2>/dev/null || echo 0)
      local change_lines
      change_lines=$(diff "$curr_file" "$backup_file" 2>/dev/null | grep -c '^[<>]' || true)

      echo -e "  ${RED}[DIFFERS]${NC}  $rel_path"
      echo -e "           current: ${curr_lines}L  backup: ${backup_lines}L  (~${change_lines} line changes)"
      ((diff_count++))
    fi
  done < <(diff -rq "$PROJECT_ROOT/server/src/" "$backup_root/server/src/" 2>/dev/null | grep -v '.DS_Store' | grep 'differ$' || true)

  echo ""
  echo -e "${BOLD}=== Files ONLY in backup (missing from current) ===${NC}"
  echo ""

  while IFS= read -r line; do
    if echo "$line" | grep -q "Only in $backup_root"; then
      local dir file
      dir=$(echo "$line" | sed "s/Only in \(.*\): .*/\1/")
      file=$(echo "$line" | sed "s/Only in .*: //")
      local rel_path="${dir#$backup_root/}/$file"
      echo -e "  ${RED}[MISSING]${NC}  $rel_path"
      ((missing_count++))
    fi
  done < <(diff -rq "$PROJECT_ROOT/front-end/src/" "$backup_root/front-end/src/" 2>/dev/null | grep -v '.DS_Store' | grep "Only in $backup_root" || true; diff -rq "$PROJECT_ROOT/server/src/" "$backup_root/server/src/" 2>/dev/null | grep -v '.DS_Store' | grep "Only in $backup_root" || true)

  echo ""
  echo -e "${BOLD}=== Files ONLY in current (new since backup) ===${NC}"
  echo ""

  local new_count=0
  while IFS= read -r line; do
    if echo "$line" | grep -q "Only in $PROJECT_ROOT"; then
      local dir file
      dir=$(echo "$line" | sed "s/Only in \(.*\): .*/\1/")
      file=$(echo "$line" | sed "s/Only in .*: //")
      local rel_path="${dir#$PROJECT_ROOT/}/$file"
      echo -e "  ${GREEN}[NEW]${NC}      $rel_path"
      ((new_count++))
    fi
  done < <(diff -rq "$PROJECT_ROOT/front-end/src/" "$backup_root/front-end/src/" 2>/dev/null | grep -v '.DS_Store' | grep "Only in $PROJECT_ROOT" || true; diff -rq "$PROJECT_ROOT/server/src/" "$backup_root/server/src/" 2>/dev/null | grep -v '.DS_Store' | grep "Only in $PROJECT_ROOT" || true)

  echo ""
  echo -e "${BOLD}Summary:${NC}"
  echo -e "  ${RED}$diff_count${NC} files differ"
  echo -e "  ${RED}$missing_count${NC} files missing from current (exist in backup)"
  echo -e "  ${GREEN}$new_count${NC} new files (not in backup)"
}

# ─── REVIEW ────────────────────────────────────────────────────────────────────

cmd_review() {
  needs_sudo
  local archive
  archive=$(get_archive "${1:-}")

  echo -e "${BOLD}Interactive review vs borg archive: ${CYAN}$archive${NC}"
  echo ""

  local backup_root
  backup_root=$(cmd_extract "$archive")

  # Collect all differing and missing files
  local -a review_files=()
  local -a review_types=()

  # Differing files
  while IFS= read -r line; do
    if echo "$line" | grep -q 'differ$'; then
      local curr_file
      curr_file=$(echo "$line" | sed 's/^Files \(.*\) and .*/\1/')
      local rel_path="${curr_file#$PROJECT_ROOT/}"
      review_files+=("$rel_path")
      review_types+=("DIFFERS")
    fi
  done < <(diff -rq "$PROJECT_ROOT/front-end/src/" "$backup_root/front-end/src/" 2>/dev/null | grep -v '.DS_Store' | grep -v '.idea' | grep -v '\.txt ' | grep 'differ$' || true; diff -rq "$PROJECT_ROOT/server/src/" "$backup_root/server/src/" 2>/dev/null | grep -v '.DS_Store' | grep 'differ$' || true)

  # Missing files
  while IFS= read -r line; do
    if echo "$line" | grep -q "Only in $backup_root"; then
      local dir file
      dir=$(echo "$line" | sed "s/Only in \(.*\): .*/\1/")
      file=$(echo "$line" | sed "s/Only in .*: //")
      local rel_path="${dir#$backup_root/}/$file"
      review_files+=("$rel_path")
      review_types+=("MISSING")
    fi
  done < <(diff -rq "$PROJECT_ROOT/front-end/src/" "$backup_root/front-end/src/" 2>/dev/null | grep -v '.DS_Store' | grep "Only in $backup_root" || true; diff -rq "$PROJECT_ROOT/server/src/" "$backup_root/server/src/" 2>/dev/null | grep -v '.DS_Store' | grep "Only in $backup_root" || true)

  if [ ${#review_files[@]} -eq 0 ]; then
    echo -e "${GREEN}Everything matches! No differences found.${NC}"
    return 0
  fi

  echo -e "Found ${BOLD}${#review_files[@]}${NC} files to review."
  echo ""

  local restored=0
  local skipped=0

  for i in "${!review_files[@]}"; do
    local file="${review_files[$i]}"
    local type="${review_types[$i]}"
    local num=$((i + 1))

    echo -e "${BOLD}[$num/${#review_files[@]}]${NC} ${CYAN}$file${NC} — ${RED}$type${NC}"

    local backup_file="$backup_root/$file"
    local curr_file="$PROJECT_ROOT/$file"

    if [ "$type" = "MISSING" ]; then
      if [ -f "$backup_file" ]; then
        local lines
        lines=$(wc -l < "$backup_file")
        echo -e "  File exists in backup ($lines lines) but not in current tree."
      elif [ -d "$backup_file" ]; then
        echo -e "  Directory exists in backup but not in current tree."
      fi
    else
      # Show compact diff
      diff --color=always "$curr_file" "$backup_file" 2>/dev/null | head -40 || true
      echo -e "  ${YELLOW}(first 40 lines — current < | backup >)${NC}"
    fi

    echo ""
    echo -e "  ${BOLD}[s]${NC}kip  ${BOLD}[r]${NC}estore from backup  ${BOLD}[f]${NC}ull diff  ${BOLD}[q]${NC}uit"
    read -rp "  Action: " action

    case "$action" in
      r|R|restore)
        if [ -f "$backup_file" ]; then
          mkdir -p "$(dirname "$curr_file")"
          cp "$backup_file" "$curr_file"
          chown next:www-data "$curr_file" 2>/dev/null || true
          echo -e "  ${GREEN}Restored: $file${NC}"
          ((restored++))
        elif [ -d "$backup_file" ]; then
          cp -r "$backup_file" "$curr_file"
          chown -R next:www-data "$curr_file" 2>/dev/null || true
          echo -e "  ${GREEN}Restored directory: $file${NC}"
          ((restored++))
        fi
        ;;
      f|F|full)
        if [ -f "$curr_file" ] && [ -f "$backup_file" ]; then
          diff --color=always "$curr_file" "$backup_file" || true
        elif [ -f "$backup_file" ]; then
          cat "$backup_file"
        fi
        echo ""
        echo -e "  ${BOLD}[r]${NC}estore  ${BOLD}[s]${NC}kip"
        read -rp "  Action: " action2
        if [ "$action2" = "r" ] || [ "$action2" = "R" ]; then
          mkdir -p "$(dirname "$curr_file")"
          cp "$backup_file" "$curr_file"
          chown next:www-data "$curr_file" 2>/dev/null || true
          echo -e "  ${GREEN}Restored: $file${NC}"
          ((restored++))
        else
          ((skipped++))
        fi
        ;;
      q|Q|quit)
        echo -e "${YELLOW}Review aborted.${NC}"
        echo -e "  Restored: $restored  Skipped: $skipped"
        return 0
        ;;
      *)
        ((skipped++))
        echo -e "  ${YELLOW}Skipped${NC}"
        ;;
    esac

    echo ""
  done

  echo -e "${GREEN}Review complete.${NC}  Restored: $restored  Skipped: $skipped"
}

# ─── RESTORE SINGLE FILE ──────────────────────────────────────────────────────

cmd_restore_file() {
  needs_sudo
  local file="$1"
  local archive
  archive=$(get_archive "${2:-}")

  local backup_root
  backup_root=$(cmd_extract "$archive")

  local backup_file="$backup_root/$file"
  local curr_file="$PROJECT_ROOT/$file"

  if [ ! -f "$backup_file" ]; then
    echo -e "${RED}File not found in archive: $file${NC}"
    return 1
  fi

  if [ -f "$curr_file" ]; then
    echo -e "${BOLD}Current vs backup diff for: ${CYAN}$file${NC}"
    diff --color=always "$curr_file" "$backup_file" || true
    echo ""
  else
    echo -e "${YELLOW}File does not exist in current tree. Backup version:${NC}"
    wc -l "$backup_file"
  fi

  read -rp "Restore this file from backup? (y/N): " confirm
  if [ "$confirm" = "y" ] || [ "$confirm" = "Y" ]; then
    mkdir -p "$(dirname "$curr_file")"
    cp "$backup_file" "$curr_file"
    chown next:www-data "$curr_file" 2>/dev/null || true
    echo -e "${GREEN}Restored: $file${NC}"
  else
    echo -e "${YELLOW}Cancelled.${NC}"
  fi
}

# ─── MAIN ──────────────────────────────────────────────────────────────────────

cmd="${1:-help}"
shift || true

case "$cmd" in
  list|ls)   cmd_list ;;
  diff)      cmd_diff "$@" ;;
  review)    cmd_review "$@" ;;
  restore)   cmd_restore_file "$@" ;;
  extract)   cmd_extract "$@" ;;
  help|*)
    echo "om-backup-verify — Compare and restore from borg backups"
    echo ""
    echo "Usage:"
    echo "  sudo om-backup-verify.sh list                      List borg archives"
    echo "  sudo om-backup-verify.sh diff [archive]            Show all diffs (default: latest)"
    echo "  sudo om-backup-verify.sh review [archive]          Interactive review + restore"
    echo "  sudo om-backup-verify.sh restore <file> [archive]  Restore a single file"
    echo "  sudo om-backup-verify.sh extract [archive]         Extract to /tmp for manual review"
    ;;
esac
