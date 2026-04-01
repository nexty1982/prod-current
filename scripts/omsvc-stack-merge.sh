#!/bin/bash
set -e
cd /var/www/orthodoxmetrics/prod

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

echo -e "${BOLD}======================================================${NC}"
echo -e "${BOLD}  Merging OMSVC Workflow Engine Stack (7 branches)${NC}"
echo -e "${BOLD}======================================================${NC}"
echo ""

git checkout main

# Ordered oldest → newest, foundation → features → hardening
omsvc_branches=(
    "feature/omsvc/2026-03-30/add-workflow-dashboard"
    "feature/omsvc/2026-03-30/add-decision-engine"
    "feature/omsvc/2026-03-30/add-auto-execution-engine"
    "feature/omsvc/2026-03-30/add-workflow-templates"
    "feature/omsvc/2026-03-30/add-learning-engine"
    "feature/omsvc/2026-03-30/harden-learning-severity"
    "feature/omsvc/2026-03-28/add-task-runner-ui"
)

total=${#omsvc_branches[@]}
merged=0
failed=""

for i in "${!omsvc_branches[@]}"; do
    branch="${omsvc_branches[$i]}"
    step=$((i + 1))

    echo -e "${BOLD}[${step}/${total}] 🔀 ${branch}${NC}"

    git merge --no-ff "$branch" -m "Merge: $branch"

    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ CONFLICT on ${branch}${NC}"
        echo -e "${RED}   Resolve, then re-run this script.${NC}"
        echo ""
        git diff --name-only --diff-filter=U
        exit 1
    fi

    # Show what came in
    echo -e "${CYAN}   $(git diff --stat HEAD~1..HEAD | tail -1)${NC}"

    merged=$((merged + 1))
    echo -e "${GREEN}   ✅ Merged${NC}"
    echo ""
done

# ── Build ──
echo -e "${BOLD}======================================================${NC}"
echo -e "${CYAN}📦 Running build check on complete OMSVC stack...${NC}"
echo -e "${BOLD}======================================================${NC}"
npm run build

if [ $? -ne 0 ]; then
    echo ""
    echo -e "${RED}❌ BUILD FAILED after merging OMSVC stack.${NC}"
    echo -e "${RED}   To find which merge broke it, revert one at a time:${NC}"
    echo -e "${RED}     git revert -m 1 HEAD${NC}"
    echo -e "${RED}     npm run build${NC}"
    echo -e "${RED}   Repeat until build passes to find the culprit.${NC}"
    exit 1
fi

echo -e "${GREEN}📦 Build passed.${NC}"
echo ""

# ── Cleanup ──
echo -e "${CYAN}🧹 Cleaning up all 7 branches...${NC}"
for branch in "${omsvc_branches[@]}"; do
    git branch -d "$branch" 2>/dev/null && echo -e "${GREEN}  ✅ Deleted local: $branch${NC}" || true
    git push origin --delete "$branch" 2>/dev/null && echo -e "${GREEN}  ✅ Deleted remote: $branch${NC}" || true
done

echo ""
echo -e "${CYAN}📊 Pushing main to GitHub...${NC}"
git push origin main
echo -e "${GREEN}📊 Pushed.${NC}"

# ── Summary ──
remaining=$(git branch | grep -v '^\*\|main' | wc -l | xargs)
echo ""
echo -e "${GREEN}======================================================${NC}"
echo -e "${GREEN}  ✅ OMSVC STACK COMPLETE — 7 branches merged${NC}"
echo -e "${GREEN}======================================================${NC}"
echo -e "${GREEN}  • Workflow dashboard${NC}"
echo -e "${GREEN}  • Decision engine${NC}"
echo -e "${GREEN}  • Auto-execution engine${NC}"
echo -e "${GREEN}  • Workflow templates${NC}"
echo -e "${GREEN}  • Learning engine${NC}"
echo -e "${GREEN}  • Learning severity hardening${NC}"
echo -e "${GREEN}  • Task runner UI${NC}"
echo -e "${GREEN}${NC}"
echo -e "${GREEN}  📋 Remaining branches: ${remaining}${NC}"
echo -e "${GREEN}======================================================${NC}"
