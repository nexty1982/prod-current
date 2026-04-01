#!/bin/bash
set -e
cd /var/www/orthodoxmetrics/prod

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

prompt_continue() {
    local step_num=$1
    local next_step=$2
    echo ""
    echo -e "${GREEN}✅ Step ${step_num} complete.${NC}"
    echo -e "${CYAN}➡️  Move on to Step ${next_step}? (y/n)${NC}"
    read -r answer
    if [[ "$answer" != "y" && "$answer" != "Y" ]]; then
        echo -e "${YELLOW}⏸️  Paused. Re-run this script to continue from where you left off.${NC}"
        exit 0
    fi
}

prompt_continue_checkpoint() {
    local step_num=$1
    local next_step=$2
    local test_msg=$3
    echo ""
    echo -e "${GREEN}✅ Step ${step_num} complete.${NC}"
    echo -e "${YELLOW}============================================${NC}"
    echo -e "${YELLOW}🧪 FULL TEST CHECKPOINT${NC}"
    echo -e "${YELLOW}   ${test_msg}${NC}"
    echo -e "${YELLOW}============================================${NC}"
    echo -e "${CYAN}➡️  Tests pass? Move on to Step ${next_step}? (y/n)${NC}"
    read -r answer
    if [[ "$answer" != "y" && "$answer" != "Y" ]]; then
        echo -e "${YELLOW}⏸️  Paused. Fix issues, then re-run.${NC}"
        exit 0
    fi
}

do_merge() {
    local branch=$1
    local message=$2

    git checkout main
    git merge --no-ff "$branch" -m "$message"
    if [ $? -ne 0 ]; then
        echo ""
        echo -e "${RED}❌ CONFLICT DETECTED merging ${branch}${NC}"
        echo -e "${RED}   1. git status                    # see conflicted files${NC}"
        echo -e "${RED}   2. Edit files to resolve conflicts${NC}"
        echo -e "${RED}   3. git add .${NC}"
        echo -e "${RED}   4. git commit${NC}"
        echo -e "${RED}   5. npm run build${NC}"
        echo -e "${RED}   Then re-run this script.${NC}"
        exit 1
    fi
}

do_build() {
    echo ""
    echo -e "${CYAN}📦 Running build check...${NC}"
    npm run build
    if [ $? -ne 0 ]; then
        echo ""
        echo -e "${RED}❌ BUILD FAILED. Fix the build before continuing.${NC}"
        echo -e "${RED}   To undo the last merge: git revert -m 1 HEAD${NC}"
        exit 1
    fi
    echo -e "${GREEN}📦 Build passed.${NC}"
}

echo -e "${BOLD}======================================================${NC}"
echo -e "${BOLD}  OrthodoxMetrics Branch Merge — Master Script${NC}"
echo -e "${BOLD}  25 branches → main${NC}"
echo -e "${BOLD}======================================================${NC}"
echo ""

# ──────────────────────────────────────────────
# Step 1: Already done
# ──────────────────────────────────────────────
echo -e "${GREEN}✅ Step 1: feat/684-multi-agent-routing — already merged.${NC}"
echo -e "${CYAN}➡️  Start with Step 2? (y/n)${NC}"
read -r answer
if [[ "$answer" != "y" && "$answer" != "Y" ]]; then
    echo "Exiting."
    exit 0
fi

# ──────────────────────────────────────────────
# Step 2: Harden multi-agent
# ──────────────────────────────────────────────
echo ""
echo -e "${BOLD}🔀 Step 2: feat/685-harden-multi-agent (2 commits)${NC}"
do_merge "feat/685-harden-multi-agent" "Merge feat/685: harden multi-agent routing"
do_build
prompt_continue_checkpoint 2 3 "Multi-agent system complete (routing + hardening). Test agent routing, selection, execution."

# ──────────────────────────────────────────────
# Step 3: Workflow dashboard
# ──────────────────────────────────────────────
echo ""
echo -e "${BOLD}🔀 Step 3: feature/omsvc/2026-03-30/add-workflow-dashboard (1 commit)${NC}"
do_merge "feature/omsvc/2026-03-30/add-workflow-dashboard" "Merge: workflow execution dashboard"
do_build
prompt_continue 3 4

# ──────────────────────────────────────────────
# Step 4: Decision engine
# ──────────────────────────────────────────────
echo ""
echo -e "${BOLD}🔀 Step 4: feature/omsvc/2026-03-30/add-decision-engine (3 commits)${NC}"
do_merge "feature/omsvc/2026-03-30/add-decision-engine" "Merge: decision engine + workflow API routes"
do_build
prompt_continue 4 5

# ──────────────────────────────────────────────
# Step 5: Auto-execution engine
# ──────────────────────────────────────────────
echo ""
echo -e "${BOLD}🔀 Step 5: feature/omsvc/2026-03-30/add-auto-execution-engine (4 commits)${NC}"
do_merge "feature/omsvc/2026-03-30/add-auto-execution-engine" "Merge: policy-based auto-execution engine"
do_build
prompt_continue 5 6

# ──────────────────────────────────────────────
# Step 6: Workflow templates
# ──────────────────────────────────────────────
echo ""
echo -e "${BOLD}🔀 Step 6: feature/omsvc/2026-03-30/add-workflow-templates (5 commits)${NC}"
do_merge "feature/omsvc/2026-03-30/add-workflow-templates" "Merge: workflow template library"
do_build
prompt_continue 6 7

# ──────────────────────────────────────────────
# Step 7: Learning engine
# ──────────────────────────────────────────────
echo ""
echo -e "${BOLD}🔀 Step 7: feature/omsvc/2026-03-30/add-learning-engine (1 commit)${NC}"
do_merge "feature/omsvc/2026-03-30/add-learning-engine" "Merge: cross-workflow learning engine"
do_build
prompt_continue 7 8

# ──────────────────────────────────────────────
# Step 8: Harden learning severity
# ──────────────────────────────────────────────
echo ""
echo -e "${BOLD}🔀 Step 8: feature/omsvc/2026-03-30/harden-learning-severity (1 commit)${NC}"
do_merge "feature/omsvc/2026-03-30/harden-learning-severity" "Merge: learning engine severity integration"
do_build

echo ""
echo -e "${YELLOW}============================================${NC}"
echo -e "${YELLOW}🧪 FULL TEST CHECKPOINT — OMSVC STACK COMPLETE${NC}"
echo -e "${YELLOW}============================================${NC}"
echo -e "${YELLOW}   The entire workflow engine backend is now merged:${NC}"
echo -e "${YELLOW}     • Workflow dashboard${NC}"
echo -e "${YELLOW}     • Decision engine${NC}"
echo -e "${YELLOW}     • Auto-execution engine${NC}"
echo -e "${YELLOW}     • Workflow templates${NC}"
echo -e "${YELLOW}     • Learning engine + severity${NC}"
echo ""
echo -e "${BOLD}${RED}⚠️  STRONGLY RECOMMENDED: Before continuing, verify these exist:${NC}"
echo ""
echo -e "${CYAN}   1. Check new service files are present:${NC}"
echo "      ls -la server/src/services/agentRoutingService.js"
echo "      ls -la server/src/services/agentRegistryService.js"
echo "      ls -la server/src/services/multiAgentExecutionService.js"
echo "      ls -la server/src/services/resultSelectionService.js"
echo ""
echo -e "${CYAN}   2. Check workflow/decision/learning services:${NC}"
echo "      ls -la server/src/services/*workflow* server/src/services/*decision* server/src/services/*learning* server/src/services/*execution* 2>/dev/null"
echo ""
echo -e "${CYAN}   3. Check migrations exist:${NC}"
echo "      ls -la server/database/migrations/*agent* server/database/migrations/*workflow* 2>/dev/null"
echo ""
echo -e "${CYAN}   4. Check API routes are wired:${NC}"
echo "      grep -n 'workflow\|agent\|decision\|learning' server/src/index.ts"
echo ""
echo -e "${CYAN}   5. Start the app and verify endpoints respond:${NC}"
echo "      curl -s http://localhost:YOUR_PORT/api/workflows | head -c 200"
echo "      curl -s http://localhost:YOUR_PORT/api/agents | head -c 200"
echo ""
echo -e "${YELLOW}============================================${NC}"
echo -e "${CYAN}➡️  Everything verified? Move on to Step 9? (y/n)${NC}"
read -r answer
if [[ "$answer" != "y" && "$answer" != "Y" ]]; then
    echo -e "${YELLOW}⏸️  Paused. Verify the above, then re-run.${NC}"
    exit 0
fi

# ──────────────────────────────────────────────
# Step 9: Task runner UI (BIG — 27 commits)
# ──────────────────────────────────────────────
echo ""
echo -e "${BOLD}${YELLOW}🔀 Step 9: feature/omsvc/2026-03-28/add-task-runner-ui (27 commits)${NC}"
echo -e "${YELLOW}   ⚠️  LARGE MERGE — task runner UI + prompt workflow system${NC}"
do_merge "feature/omsvc/2026-03-28/add-task-runner-ui" "Merge: task runner UI + prompt workflow system"
do_build
prompt_continue_checkpoint 9 10 "Task runner UI is the frontend for the workflow engine. Test: task runner page, prompt workflows, multi-step planning."

# ──────────────────────────────────────────────
# Step 10: Harden workflow templates UI (BIG — 18 commits)
# ──────────────────────────────────────────────
echo ""
echo -e "${BOLD}${YELLOW}🔀 Step 10: enh/686-harden-workflow-templates (18 commits)${NC}"
echo -e "${YELLOW}   ⚠️  LARGE MERGE — UI contrast + admin page hardening${NC}"
do_merge "enh/686-harden-workflow-templates" "Merge enh/686: harden workflow templates + admin UI"
do_build
prompt_continue_checkpoint 10 11 "Admin UI hardening complete. Test: all admin pages — contrast, layout, hierarchy."

# ──────────────────────────────────────────────
# Step 11: State awareness badges
# ──────────────────────────────────────────────
echo ""
echo -e "${BOLD}🔀 Step 11: feature/nectarios-parsells/2026-03-31/state-awareness-menu-badges (1 commit)${NC}"
do_merge "feature/nectarios-parsells/2026-03-31/state-awareness-menu-badges" "Merge: sidebar menu state badges"
do_build
prompt_continue 11 12

# ──────────────────────────────────────────────
# Step 12: Manual prompt creation tool
# ──────────────────────────────────────────────
echo ""
echo -e "${BOLD}🔀 Step 12: feature/nectarios-parsells/2026-03-31/manual-prompt-creation-tool (1 commit)${NC}"
do_merge "feature/nectarios-parsells/2026-03-31/manual-prompt-creation-tool" "Merge: manual prompt creation tool"
do_build
prompt_continue 12 13

# ──────────────────────────────────────────────
# Step 13: Badge state manager UI
# ──────────────────────────────────────────────
echo ""
echo -e "${BOLD}🔀 Step 13: feature/nectarios-parsells/2026-03-31/badge-state-manager-ui (4 commits)${NC}"
do_merge "feature/nectarios-parsells/2026-03-31/badge-state-manager-ui" "Merge: badge state manager UI"
do_build
prompt_continue 13 14

# ──────────────────────────────────────────────
# Step 14: Branch hygiene audit
# ──────────────────────────────────────────────
echo ""
echo -e "${BOLD}🔀 Step 14: chore/omd-503/2026-03-31/orthodoxmetrics-branch-hygiene-audit (1 commit)${NC}"
do_merge "chore/omd-503/2026-03-31/orthodoxmetrics-branch-hygiene-audit" "Merge chore/omd-503: branch hygiene audit"
do_build

echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}🎉 WAVE 1 COMPLETE — 14 branches merged!${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo -e "${CYAN}📊 Pushing main to GitHub...${NC}"
git push origin main
echo -e "${GREEN}📊 Pushed.${NC}"
echo ""
echo -e "${CYAN}➡️  Continue to Wave 2? (2 large branches — 31 + 30 commits) (y/n)${NC}"
read -r answer
if [[ "$answer" != "y" && "$answer" != "Y" ]]; then
    echo -e "${YELLOW}⏸️  Paused after Wave 1. Re-run to continue.${NC}"
    exit 0
fi

# ──────────────────────────────────────────────
# WAVE 2
# ──────────────────────────────────────────────
echo ""
echo -e "${BOLD}======================================================${NC}"
echo -e "${BOLD}  WAVE 2 — Large Clean Branches${NC}"
echo -e "${BOLD}======================================================${NC}"

# ──────────────────────────────────────────────
# Step 15: Branch discipline standardization (31 commits)
# ──────────────────────────────────────────────
echo ""
echo -e "${BOLD}${YELLOW}🔀 Step 15: chore/omd-502/2026-03-31/branch-discipline-standardization (31 commits)${NC}"
echo -e "${YELLOW}   ⚠️  LARGE MERGE — branch naming + standardization refactor${NC}"
do_merge "chore/omd-502/2026-03-31/branch-discipline-standardization" "Merge chore/omd-502: branch discipline standardization"
do_build
prompt_continue_checkpoint 15 16 "Major refactor merged. Test: full app walkthrough, check nothing regressed."

# ──────────────────────────────────────────────
# Step 16: Orthodoxmetrics feature set (30 commits)
# ──────────────────────────────────────────────
echo ""
echo -e "${BOLD}${YELLOW}🔀 Step 16: feature/nectarios-parsells/2026-03-30/orthodoxmetrics (30 commits)${NC}"
echo -e "${YELLOW}   ⚠️  LARGE MERGE — orthodoxmetrics feature set + P-001${NC}"
do_merge "feature/nectarios-parsells/2026-03-30/orthodoxmetrics" "Merge: orthodoxmetrics feature set + branch discipline P-001"
do_build

echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}🎉 WAVE 2 COMPLETE!${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo -e "${CYAN}📊 Pushing main to GitHub...${NC}"
git push origin main
echo -e "${GREEN}📊 Pushed.${NC}"
echo ""
echo -e "${YELLOW}⚠️  Wave 3 contains DIVERGED branches (behind main).${NC}"
echo -e "${YELLOW}   Conflicts are likely. Each merge needs careful testing.${NC}"
echo -e "${CYAN}➡️  Continue to Wave 3? (y/n)${NC}"
read -r answer
if [[ "$answer" != "y" && "$answer" != "Y" ]]; then
    echo -e "${YELLOW}⏸️  Paused after Wave 2. Re-run to continue.${NC}"
    exit 0
fi

# ──────────────────────────────────────────────
# WAVE 3 — Diverged branches
# ──────────────────────────────────────────────
echo ""
echo -e "${BOLD}======================================================${NC}"
echo -e "${BOLD}  WAVE 3 — Diverged Branches (conflicts likely)${NC}"
echo -e "${BOLD}======================================================${NC}"

# ──────────────────────────────────────────────
# Step 17: OMAI auth bridge (5 ahead / 46 behind)
# ──────────────────────────────────────────────
echo ""
echo -e "${BOLD}${RED}🔀 Step 17: feature/nectarios-parsells/2026-03-24/omai-auth-bridge${NC}"
echo -e "${RED}   ⚠️  DIVERGED: 5 ahead / 46 behind main — conflicts possible${NC}"
do_merge "feature/nectarios-parsells/2026-03-24/omai-auth-bridge" "Merge: OMAI auth bridge"
do_build
prompt_continue_checkpoint 17 18 "Test: OMAI auth bridge, proxy prefix, token flow."

# ──────────────────────────────────────────────
# Step 18: Claude CLI EF (4 ahead / 46 behind)
# ──────────────────────────────────────────────
echo ""
echo -e "${BOLD}${RED}🔀 Step 18: EF_claude-cli_2026-03-24_632${NC}"
echo -e "${RED}   ⚠️  DIVERGED: 4 ahead / 46 behind — conflicts possible${NC}"
do_merge "EF_claude-cli_2026-03-24_632" "Merge: church-lifecycle retirement + onboarding"
do_build
prompt_continue_checkpoint 18 19 "Test: church-lifecycle changes, onboarding flow."

# ──────────────────────────────────────────────
# Step 19: Session management (15 ahead / 46 behind)
# ──────────────────────────────────────────────
echo ""
echo -e "${BOLD}${RED}🔀 Step 19: NF_claude-cli_2026-03-24${NC}"
echo -e "${RED}   ⚠️  DIVERGED: 15 ahead / 46 behind — HIGHEST conflict risk${NC}"
do_merge "NF_claude-cli_2026-03-24" "Merge: session management system + tracking middleware"
do_build

echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}🎉 WAVE 3 COMPLETE!${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo -e "${CYAN}📊 Pushing main to GitHub...${NC}"
git push origin main
echo -e "${GREEN}📊 Pushed.${NC}"
echo ""
echo -e "${CYAN}➡️  Continue to Step 20 — inspect login-redesign branch? (y/n)${NC}"
read -r answer
if [[ "$answer" != "y" && "$answer" != "Y" ]]; then
    echo -e "${YELLOW}⏸️  Paused after Wave 3. Re-run to continue.${NC}"
    exit 0
fi

# ──────────────────────────────────────────────
# Step 20: Inspect login-redesign (57 ahead / 70 behind)
# ──────────────────────────────────────────────
echo ""
echo -e "${BOLD}======================================================${NC}"
echo -e "${BOLD}  Step 20: Inspect login-redesign-homepage-style${NC}"
echo -e "${BOLD}  57 ahead / 70 behind — MASSIVELY diverged (Feb 26)${NC}"
echo -e "${BOLD}======================================================${NC}"
echo ""
echo -e "${CYAN}=== Unique commits not in main ===${NC}"
git log main..feature/nectarios-parsells/2026-02-26/login-redesign-homepage-style --oneline
echo ""
echo -e "${CYAN}=== Files changed ===${NC}"
git diff main...feature/nectarios-parsells/2026-02-26/login-redesign-homepage-style --stat
echo ""
echo -e "${YELLOW}============================================${NC}"
echo -e "${YELLOW}📋 DECISION POINT:${NC}"
echo -e "${YELLOW}   A) Merge it (risky — many conflicts expected)${NC}"
echo -e "${YELLOW}   B) Cherry-pick specific commits${NC}"
echo -e "${YELLOW}   C) Skip — this work has been superseded${NC}"
echo -e "${YELLOW}============================================${NC}"
echo -e "${CYAN}   Attempt full merge? (y/n)${NC}"
read -r answer
if [[ "$answer" == "y" || "$answer" == "Y" ]]; then
    echo ""
    echo -e "${RED}   ⚠️  Attempting merge — conflicts are very likely...${NC}"
    do_merge "feature/nectarios-parsells/2026-02-26/login-redesign-homepage-style" "Merge: login redesign + homepage style (Feb 26)"
    do_build
    echo -e "${GREEN}✅ Step 20 complete — login redesign merged.${NC}"
    git push origin main
else
    echo -e "${YELLOW}   Skipping login-redesign. Branch preserved for cherry-picking later.${NC}"
fi

echo ""
echo -e "${CYAN}➡️  Continue to Step 21 — final cleanup? (y/n)${NC}"
read -r answer
if [[ "$answer" != "y" && "$answer" != "Y" ]]; then
    echo -e "${YELLOW}⏸️  Paused before cleanup. Re-run to continue.${NC}"
    exit 0
fi

# ──────────────────────────────────────────────
# Step 21: Final cleanup
# ──────────────────────────────────────────────
echo ""
echo -e "${BOLD}======================================================${NC}"
echo -e "${BOLD}  Step 21: Final Cleanup${NC}"
echo -e "${BOLD}======================================================${NC}"

echo ""
echo -e "${CYAN}=== Deleting no-op branches (identical to main) ===${NC}"
git branch -d feature/nectarios-parsells/2026-03-31/repo-operations-branch-infra-status 2>/dev/null && echo "  Deleted: repo-operations-branch-infra-status" || echo "  Already gone: repo-operations-branch-infra-status"
git branch -d fix/omd-503/2026-03-31/start-work-button-noop 2>/dev/null && echo "  Deleted: start-work-button-noop" || echo "  Already gone: start-work-button-noop"

echo ""
echo -e "${CYAN}=== Deleting stale recovery branch ===${NC}"
git branch -D recovery 2>/dev/null && echo "  Deleted: recovery" || echo "  Already gone: recovery"

echo ""
echo -e "${CYAN}=== Deleting all merged local branches ===${NC}"
git branch --merged main | grep -v '^\*\|main' | while read branch; do
    git branch -d "$branch" 2>/dev/null && echo "  Deleted: $branch"
done

echo ""
echo -e "${CYAN}=== Cleaning up stale remote-only branches ===${NC}"
for remote_branch in BF_claude-cli_2026-03-25 NF_claude-cli_2026-03-25 PA_claude-cli_2026-03-25 om-dev-03-2026 EF_claude-cli_2026-03-24; do
    git push origin --delete "$remote_branch" 2>/dev/null && echo "  Deleted remote: $remote_branch" || true
done

echo ""
echo -e "${CYAN}=== Deleting all remaining merged remote branches ===${NC}"
git branch --merged main -r | grep origin/ | grep -v 'origin/main' | sed 's/origin\///' | while read branch; do
    git push origin --delete "$branch" 2>/dev/null && echo "  Deleted remote: $branch" || true
done

echo ""
echo -e "${CYAN}=== Final push ===${NC}"
git push origin main

echo ""
echo -e "${CYAN}=== Final state ===${NC}"
echo "Local branches:"
git branch
echo ""
echo "Remote branches:"
git branch -r

echo ""
echo -e "${GREEN}======================================================${NC}"
echo -e "${GREEN}  🎉 ALL DONE!${NC}"
echo -e "${GREEN}======================================================${NC}"
echo -e "${GREEN}  All completed work is merged into main.${NC}"
echo -e "${GREEN}  All stale branches are removed.${NC}"
echo -e "${GREEN}  Repository is clean.${NC}"
echo -e "${GREEN}======================================================${NC}"
