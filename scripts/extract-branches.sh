#!/bin/bash
cd /var/www/orthodoxmetrics/prod

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
DIM='\033[2m'
NC='\033[0m'

OUTPUT_BASE="/tmp/branch_extracts"

echo -e "${BOLD}======================================================${NC}"
echo -e "${BOLD}  OrthodoxMetrics — Branch Change Extractor${NC}"
echo -e "${BOLD}  Output: ${OUTPUT_BASE}/<branch_name>/${NC}"
echo -e "${BOLD}======================================================${NC}"
echo ""

# Get all branches except main, sorted by date
branches=()
while IFS= read -r branch; do
    if [[ -n "$branch" ]]; then
        branches+=("$branch")
    fi
done < <(git branch --format='%(refname:short)' | grep -v '^main$' | while read b; do
    timestamp=$(git log -1 --format='%ct' "$b" 2>/dev/null)
    echo "$timestamp $b"
done | sort -n | awk '{print $2}')

if [ ${#branches[@]} -eq 0 ]; then
    echo -e "${GREEN}No branches to extract.${NC}"
    exit 0
fi

echo -e "${CYAN}Extract all branches or pick one?${NC}"
echo -e "  ${BOLD}1)${NC} Extract ALL branches"
echo -e "  ${BOLD}2)${NC} Pick one"
echo ""
read -r choice

if [[ "$choice" == "2" ]]; then
    echo ""
    for i in "${!branches[@]}"; do
        branch="${branches[$i]}"
        ahead=$(git rev-list --count main.."$branch" 2>/dev/null)
        last_date=$(git log -1 --format='%ci' "$branch" 2>/dev/null | cut -d' ' -f1)
        last_msg=$(git log -1 --format='%s' "$branch" 2>/dev/null | head -c 50)

        if [[ "$ahead" -eq 0 ]]; then
            status="${DIM}(no changes)${NC}"
        else
            status="${GREEN}(${ahead} commits)${NC}"
        fi

        num=$((i + 1))
        printf "  ${BOLD}%2d)${NC} %s  %b\n" "$num" "$branch" "$status"
        printf "      ${DIM}%s — %s${NC}\n" "$last_date" "$last_msg"
    done
    echo ""
    echo -e "${CYAN}Enter branch number (or 'q' to quit):${NC}"
    read -r selection

    if [[ "$selection" == "q" || "$selection" == "Q" ]]; then
        exit 0
    fi

    if ! [[ "$selection" =~ ^[0-9]+$ ]] || [ "$selection" -lt 1 ] || [ "$selection" -gt ${#branches[@]} ]; then
        echo -e "${RED}❌ Invalid selection.${NC}"
        exit 1
    fi

    branches=("${branches[$((selection - 1))]}")
fi

echo ""

for branch in "${branches[@]}"; do
    ahead=$(git rev-list --count main.."$branch" 2>/dev/null)

    # Sanitize branch name for directory (replace / with __)
    dir_name=$(echo "$branch" | sed 's/\//__/g')
    output_dir="${OUTPUT_BASE}/${dir_name}"

    echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BOLD}📦 ${branch}${NC}"

    if [[ "$ahead" -eq 0 ]]; then
        echo -e "${DIM}   Skipping — no unique commits vs main.${NC}"
        echo ""
        continue
    fi

    echo -e "${CYAN}   ${ahead} commits ahead of main${NC}"
    echo -e "${CYAN}   Extracting to: ${output_dir}/${NC}"

    # Create output directory
    rm -rf "$output_dir"
    mkdir -p "$output_dir"
    mkdir -p "$output_dir/files"

    # ── 1. Commit log ──
    git log main.."$branch" --oneline > "$output_dir/commits.txt"
    git log main.."$branch" --format='%H %ci %s' > "$output_dir/commits-full.txt"
    echo -e "${GREEN}   ✅ commits.txt (${ahead} commits)${NC}"

    # ── 2. Full diff vs main ──
    git diff main..."$branch" > "$output_dir/full-diff.patch"
    echo -e "${GREEN}   ✅ full-diff.patch${NC}"

    # ── 3. File list with stats ──
    git diff main..."$branch" --stat > "$output_dir/changed-files-stat.txt"
    echo -e "${GREEN}   ✅ changed-files-stat.txt${NC}"

    # ── 4. List of changed file paths ──
    git diff main..."$branch" --name-status > "$output_dir/changed-files.txt"
    echo -e "${GREEN}   ✅ changed-files.txt${NC}"

    # ── 5. Extract the actual changed/added files at their branch state ──
    file_count=0
    while IFS=$'\t' read -r status filepath; do
        # Skip deleted files
        if [[ "$status" == "D" ]]; then
            continue
        fi

        # Handle renames (R100	old_path	new_path)
        if [[ "$status" == R* ]]; then
            filepath=$(echo "$filepath" | awk '{print $2}')
        fi

        # Create subdirectories
        filedir=$(dirname "$filepath")
        mkdir -p "$output_dir/files/$filedir"

        # Extract file content from the branch
        git show "$branch:$filepath" > "$output_dir/files/$filepath" 2>/dev/null
        if [ $? -eq 0 ]; then
            file_count=$((file_count + 1))
        fi
    done < <(git diff main..."$branch" --name-status)
    echo -e "${GREEN}   ✅ files/ (${file_count} files extracted at branch state)${NC}"

    # ── 6. Individual patches per commit ──
    mkdir -p "$output_dir/patches"
    patch_count=0
    while IFS= read -r hash; do
        msg=$(git log -1 --format='%s' "$hash" | sed 's/[^a-zA-Z0-9_-]/_/g' | head -c 60)
        padded=$(printf "%03d" $((patch_count + 1)))
        git format-patch -1 "$hash" --stdout > "$output_dir/patches/${padded}-${msg}.patch"
        patch_count=$((patch_count + 1))
    done < <(git rev-list --reverse main.."$branch")
    echo -e "${GREEN}   ✅ patches/ (${patch_count} individual patches)${NC}"

    # ── 7. Summary / README ──
    cat > "$output_dir/README.txt" << EOF
Branch: ${branch}
Extracted: $(date)
Commits ahead of main: ${ahead}

Directory contents:
  commits.txt           — one-line commit log
  commits-full.txt      — full commit hashes + dates + messages
  full-diff.patch       — complete diff vs main (can apply with: git apply full-diff.patch)
  changed-files.txt     — list of changed files with status (A=added, M=modified, D=deleted)
  changed-files-stat.txt — file change stats (insertions/deletions)
  files/                — actual file contents from the branch (current state)
  patches/              — individual patches per commit (in order, can apply with: git am patches/*.patch)

To apply all changes to another branch:
  git apply full-diff.patch

To replay commits with history:
  git am patches/*.patch
EOF
    echo -e "${GREEN}   ✅ README.txt${NC}"

    # ── Size summary ──
    dir_size=$(du -sh "$output_dir" | awk '{print $1}')
    echo -e "${GREEN}   📁 Total size: ${dir_size}${NC}"
    echo ""

done

# ── Final summary ──
echo -e "${BOLD}======================================================${NC}"
echo -e "${GREEN}  ✅ Extraction complete!${NC}"
echo -e "${GREEN}  Output: ${OUTPUT_BASE}/${NC}"
echo -e "${BOLD}======================================================${NC}"
echo ""
echo -e "${CYAN}Directory structure:${NC}"
ls -1 "$OUTPUT_BASE" | while read dir; do
    echo "  📂 $dir/"
done
echo ""
echo -e "${DIM}Each branch folder contains:${NC}"
echo -e "${DIM}  commits.txt         — commit log${NC}"
echo -e "${DIM}  full-diff.patch     — complete patch (git apply)${NC}"
echo -e "${DIM}  changed-files.txt   — what files changed${NC}"
echo -e "${DIM}  files/              — actual file contents from branch${NC}"
echo -e "${DIM}  patches/            — per-commit patches (git am)${NC}"
echo -e "${DIM}  README.txt          — how to use it all${NC}"
