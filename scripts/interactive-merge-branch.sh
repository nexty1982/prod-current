#!/bin/bash
cd /var/www/orthodoxmetrics/prod

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
DIM='\033[2m'
NC='\033[0m'

main_loop() {
    echo -e "${BOLD}======================================================${NC}"
    echo -e "${BOLD}  OrthodoxMetrics — Branch Merge Tool${NC}"
    echo -e "${BOLD}======================================================${NC}"
    echo ""

    # Make sure we're on main
    current_branch=$(git branch --show-current)
    if [[ "$current_branch" != "main" ]]; then
        echo -e "${YELLOW}⚠️  Currently on '${current_branch}', switching to main...${NC}"
        git checkout main
        echo ""
    fi

    # Pull latest main
    echo -e "${CYAN}📥 Pulling latest main...${NC}"
    git pull origin main 2>/dev/null
    echo ""

    # Get all branches except main, sorted by last commit date (oldest first)
    branches=()
    while IFS= read -r line; do
        branch=$(echo "$line" | sed 's/^[* ]*//' | xargs)
        if [[ -n "$branch" ]]; then
            branches+=("$branch")
        fi
    done < <(git branch --format='%(refname:short)' | grep -v '^main$' | while read b; do
        timestamp=$(git log -1 --format='%ct' "$b" 2>/dev/null)
        echo "$timestamp $b"
    done | sort -n | awk '{print $2}')

    if [ ${#branches[@]} -eq 0 ]; then
        echo -e "${GREEN}======================================================${NC}"
        echo -e "${GREEN}  🎉 No branches remaining — main is the only branch!${NC}"
        echo -e "${GREEN}======================================================${NC}"
        return 1
    fi

    # Display branches with status, sorted oldest first
    echo -e "${BOLD}Available branches (${#branches[@]} remaining) — sorted oldest → newest:${NC}"
    echo ""
    for i in "${!branches[@]}"; do
        branch="${branches[$i]}"
        ahead=$(git rev-list --count main.."$branch" 2>/dev/null)
        behind=$(git rev-list --count "$branch"..main 2>/dev/null)
        last_date=$(git log -1 --format='%ci' "$branch" 2>/dev/null | cut -d' ' -f1)
        last_msg=$(git log -1 --format='%s' "$branch" 2>/dev/null | head -c 60)

        # Color code by status
        if [[ "$ahead" -eq 0 && "$behind" -eq 0 ]]; then
            status="${DIM}[0 ahead / 0 behind — identical to main]${NC}"
            marker="${DIM}⚪${NC}"
        elif [[ "$ahead" -eq 0 ]]; then
            status="${DIM}[0 ahead / ${behind} behind — no unique work]${NC}"
            marker="${DIM}⚪${NC}"
        elif [[ "$behind" -eq 0 ]]; then
            status="${GREEN}[${ahead} ahead / 0 behind — clean merge]${NC}"
            marker="${GREEN}🟢${NC}"
        elif [[ "$behind" -gt 30 ]]; then
            status="${RED}[${ahead} ahead / ${behind} behind — high conflict risk]${NC}"
            marker="${RED}🔴${NC}"
        else
            status="${YELLOW}[${ahead} ahead / ${behind} behind — conflicts possible]${NC}"
            marker="${YELLOW}🟡${NC}"
        fi

        num=$((i + 1))
        printf "  %b ${BOLD}%2d)${NC} %s\n" "$marker" "$num" "$branch"
        printf "      %b\n" "$status"
        printf "      ${DIM}%s — %s${NC}\n" "$last_date" "$last_msg"
        echo ""
    done

    echo -e "${DIM}   🟢 = clean merge   🟡 = conflicts possible   🔴 = high risk   ⚪ = nothing to merge${NC}"
    echo ""

    # Recommend oldest with actual work
    recommended=""
    for i in "${!branches[@]}"; do
        branch="${branches[$i]}"
        ahead=$(git rev-list --count main.."$branch" 2>/dev/null)
        if [[ "$ahead" -gt 0 ]]; then
            recommended=$((i + 1))
            recommended_name="$branch"
            break
        fi
    done

    if [[ -n "$recommended" ]]; then
        echo -e "${CYAN}💡 Recommended next: #${recommended} (${recommended_name}) — oldest branch with work to merge${NC}"
        echo ""
    fi

    # Prompt for selection
    echo -e "${CYAN}Enter branch number to merge (or 'q' to quit):${NC}"
    read -r selection

    if [[ "$selection" == "q" || "$selection" == "Q" ]]; then
        echo "Exiting."
        return 1
    fi

    # Validate selection
    if ! [[ "$selection" =~ ^[0-9]+$ ]] || [ "$selection" -lt 1 ] || [ "$selection" -gt ${#branches[@]} ]; then
        echo -e "${RED}❌ Invalid selection.${NC}"
        return 0
    fi

    selected="${branches[$((selection - 1))]}"
    echo ""
    echo -e "${BOLD}Selected: ${selected}${NC}"

    # Show branch details
    ahead=$(git rev-list --count main.."$selected" 2>/dev/null)
    behind=$(git rev-list --count "$selected"..main 2>/dev/null)

    if [[ "$ahead" -eq 0 ]]; then
        echo -e "${YELLOW}⚠️  This branch has 0 commits ahead of main — nothing to merge.${NC}"
        echo -e "${CYAN}   Delete this branch anyway? (y/n)${NC}"
        read -r answer
        if [[ "$answer" == "y" || "$answer" == "Y" ]]; then
            git branch -D "$selected" 2>/dev/null && echo -e "${GREEN}  ✅ Deleted local: $selected${NC}"
            git push origin --delete "$selected" 2>/dev/null && echo -e "${GREEN}  ✅ Deleted remote: $selected${NC}" || echo -e "${DIM}  ℹ️  No remote branch to delete.${NC}"
            echo ""
        fi
        return 0
    fi

    echo ""
    echo -e "${CYAN}=== Commits to be merged (${ahead}) ===${NC}"
    git log main.."$selected" --oneline
    echo ""
    echo -e "${CYAN}=== Files changed ===${NC}"
    git diff main..."$selected" --stat
    echo ""

    if [[ "$behind" -gt 30 ]]; then
        echo -e "${RED}🔴 HIGH RISK: This branch is ${behind} commits behind main.${NC}"
        echo -e "${RED}   Heavy conflicts are likely. Consider cherry-picking instead.${NC}"
        echo -e "${RED}   To cherry-pick: git cherry-pick <commit-hash>${NC}"
        echo ""
    elif [[ "$behind" -gt 0 ]]; then
        echo -e "${YELLOW}⚠️  WARNING: This branch is ${behind} commits behind main.${NC}"
        echo -e "${YELLOW}   Merge conflicts are possible.${NC}"
        echo ""
    fi

    echo -e "${CYAN}Proceed with merge? (y/n)${NC}"
    read -r answer
    if [[ "$answer" != "y" && "$answer" != "Y" ]]; then
        echo "Cancelled."
        return 0
    fi

    # ── Merge ──
    echo ""
    echo -e "${BOLD}🔀 Merging ${selected} into main...${NC}"
    git merge --no-ff "$selected" -m "Merge: $selected"

    if [ $? -ne 0 ]; then
        echo ""
        echo -e "${RED}============================================${NC}"
        echo -e "${RED}❌ MERGE CONFLICT${NC}"
        echo -e "${RED}============================================${NC}"
        echo ""
        echo -e "${RED}   Conflicted files:${NC}"
        git diff --name-only --diff-filter=U
        echo ""
        echo -e "${RED}   To resolve:${NC}"
        echo -e "${RED}     1. Edit the conflicted files above${NC}"
        echo -e "${RED}     2. git add .${NC}"
        echo -e "${RED}     3. git commit${NC}"
        echo -e "${RED}     4. npm run build${NC}"
        echo -e "${RED}     5. Re-run this script to clean up${NC}"
        echo ""
        echo -e "${RED}   To abort the merge:${NC}"
        echo -e "${RED}     git merge --abort${NC}"
        echo -e "${RED}============================================${NC}"
        return 1
    fi

    echo -e "${GREEN}✅ Merge successful.${NC}"

    # Show merge summary
    echo ""
    echo -e "${CYAN}=== Merge summary ===${NC}"
    git diff --stat HEAD~1..HEAD
    echo ""

    # ── Build ──
    echo -e "${CYAN}📦 Running build check...${NC}"
    npm run build

    if [ $? -ne 0 ]; then
        echo ""
        echo -e "${RED}============================================${NC}"
        echo -e "${RED}❌ BUILD FAILED${NC}"
        echo -e "${RED}============================================${NC}"
        echo -e "${RED}   Options:${NC}"
        echo -e "${RED}     • Fix the build, then run cleanup manually:${NC}"
        echo -e "${RED}         git branch -d $selected${NC}"
        echo -e "${RED}         git push origin --delete $selected${NC}"
        echo -e "${RED}         git push origin main${NC}"
        echo -e "${RED}     • Or revert the merge:${NC}"
        echo -e "${RED}         git revert -m 1 HEAD${NC}"
        echo -e "${RED}============================================${NC}"
        return 1
    fi

    echo -e "${GREEN}📦 Build passed.${NC}"

    # ── Cleanup ──
    echo ""
    echo -e "${CYAN}🧹 Cleaning up branch...${NC}"

    # Delete local branch
    git branch -d "$selected" 2>/dev/null && echo -e "${GREEN}  ✅ Deleted local branch: $selected${NC}" || \
    git branch -D "$selected" 2>/dev/null && echo -e "${GREEN}  ✅ Force-deleted local branch: $selected${NC}"

    # Delete remote branch
    git push origin --delete "$selected" 2>/dev/null && echo -e "${GREEN}  ✅ Deleted remote branch: $selected${NC}" || echo -e "${DIM}  ℹ️  No remote branch found.${NC}"

    # Push main
    echo ""
    echo -e "${CYAN}📊 Pushing main to GitHub...${NC}"
    git push origin main
    echo -e "${GREEN}📊 Pushed.${NC}"

    # ── Summary ──
    remaining=$(git branch | grep -v '^\*\|main' | wc -l | xargs)
    echo ""
    echo -e "${GREEN}======================================================${NC}"
    echo -e "${GREEN}  ✅ DONE${NC}"
    echo -e "${GREEN}  Merged:  ${selected}${NC}"
    echo -e "${GREEN}  Branch deleted locally and on GitHub.${NC}"
    echo -e "${GREEN}  Main pushed to origin.${NC}"
    echo -e "${GREEN}  📋 Remaining branches: ${remaining}${NC}"
    echo -e "${GREEN}======================================================${NC}"
    echo ""

    return 0
}

# ── Run the loop ──
while true; do
    main_loop
    exit_code=$?

    if [ $exit_code -ne 0 ]; then
        break
    fi

    echo -e "${CYAN}Continue to next branch? (y/n)${NC}"
    read -r answer
    if [[ "$answer" != "y" && "$answer" != "Y" ]]; then
        echo ""
        echo -e "${GREEN}Done. Run this script again anytime to continue.${NC}"
        break
    fi

    echo ""
    echo ""
done
