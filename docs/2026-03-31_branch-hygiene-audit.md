# OrthodoxMetrics Branch Hygiene Audit

**Date:** 2026-03-31
**Branch:** `chore/omd-503/2026-03-31/orthodoxmetrics-branch-hygiene-audit`
**Work Item:** REPO-BRANCH-HYGIENE-AUDIT

---

## 1. Current-State Analysis

### 1.1 OM Deploy Script (`scripts/om-deploy.sh`) — Branch Handling

The OM deploy script (927 lines) has **branch validation** but **zero branch cleanup**:

- **Lines 261-275**: Validates branch name against `^feature/<username>/<date>/<description>$`
- **Lines 278-320**: If on `main` or detached HEAD, interactively prompts to create a feature branch
- **Lines 323-356**: If branch name doesn't match, interactively prompts to create a new one
- **Lines 358-400**: If working tree is dirty, interactively prompts to commit
- **Lines 900-927**: Deployment completion — logs success, no branch cleanup

**Key finding:** `om-deploy.sh` only validates the *current* branch's naming convention. It never:
- Runs `git fetch --prune`
- Checks for stale/merged local branches
- Deletes any branches
- Sources the shared `branch-enforce.sh` library

### 1.2 OMAI Deploy Script (`scripts/omai-deploy.sh`) — Branch Handling

The OMAI deploy script sources the shared `branch-enforce.sh` library (491 lines):

- **Line 107**: `source "$SCRIPT_DIR/lib/branch-enforce.sh"`
- **Line 119**: `be_init "$ROOT" "omai"` — fetches origin/main, computes merge-base
- **Lines 125-128**: Runs `be_validate_branch_pattern`, `be_check_has_unique_commits`, `be_check_branch_scope`

**Key finding:** OMAI also has **no post-deploy branch cleanup**. But OMAI stays clean because:
- It has lower branch churn (only 2 local branches: `main` + 1 feature)
- Its `complete-work` endpoint (`om-daily.js:2119-2126`) explicitly deletes local + remote branches after merge
- Work is typically completed through the OM Daily pipeline lifecycle

### 1.3 Branch Creation Paths for OrthodoxMetrics

| Path | Creates Branches | Deletes Branches |
|------|-----------------|-----------------|
| `om-deploy.sh` interactive prompt | Yes (feature/<user>/<date>/<slug>) | **No** |
| OM Daily `start-work` endpoint | Yes (via `createTaskBranch`) | **No** |
| OM Daily `complete-work` endpoint | No | **Yes** (local + remote after ff-merge) |
| Repo Ops `mergeToMain()` in `repoService.js` | No | **Yes** (local + remote after ff-merge) |
| Repo Ops `DELETE /api/ops/git/branch/:name` | No | **Yes** (with classification guard) |
| Manual `git checkout -b` by agents/humans | Yes (any name) | **No** |

### 1.4 Root Cause: Why Branches Accumulate

**Primary cause:** Branches created by `start-work` or manually are only cleaned up if the work goes through `complete-work` or Repo Ops `mergeToMain()`. If work is:
- Abandoned
- Merged via GitHub PR (remote deleted, local stays)
- Merged manually without using the pipeline
- Created by an agent but never completed

...the local branch persists indefinitely. There is **no periodic sweep** and **no deploy-time cleanup**.

**Secondary cause:** `om-deploy.sh` does not source `branch-enforce.sh` and does not run `git fetch --prune`, so stale remote-tracking refs also accumulate.

---

## 2. Branch Classification (OrthodoxMetrics — 2026-03-31)

After `git fetch --prune origin`, 21 local branches classified against `origin/main`:

### Protected (never delete)
| Branch | Status |
|--------|--------|
| `main` | protected |
| `recovery` | protected |
| `chore/omd-503/2026-03-31/orthodoxmetrics-branch-hygiene-audit` | current_active |

### Merged — Safe to Delete (4 branches)
| Branch | Ahead | Behind | Remote | Reason |
|--------|-------|--------|--------|--------|
| `EF_claude-cli_2026-03-24` | 0 | 46 | exists | Fully merged into origin/main |
| `feature/nectarios-parsells/2026-03-31/manual-prompt-creation-tool` | 0 | 0 | gone | Merged, remote already deleted |
| `feature/nectarios-parsells/2026-03-31/state-awareness-menu-badges` | 0 | 0 | gone | Merged, remote already deleted |

### Unmerged — Stale / Review Required (16 branches)
| Branch | Ahead | Behind | Remote | Classification |
|--------|-------|--------|--------|---------------|
| `EF_claude-cli_2026-03-24_632` | 4 | 46 | exists | unmerged_stale (legacy naming) |
| `NF_claude-cli_2026-03-24` | 15 | 46 | exists | unmerged_stale (legacy naming) |
| `chore/omd-502/2026-03-31/branch-discipline-standardization` | 31 | 0 | gone | unmerged_stale (remote deleted) |
| `enh/686-harden-workflow-templates` | 18 | 0 | gone | unmerged_stale (deprecated prefix) |
| `feat/684-multi-agent-routing` | 1 | 0 | gone | unmerged_stale |
| `feat/685-harden-multi-agent` | 2 | 0 | gone | unmerged_stale |
| `feature/nectarios-parsells/2026-02-26/login-redesign-homepage-style` | 57 | 70 | exists | diverged_review_required |
| `feature/nectarios-parsells/2026-03-24/omai-auth-bridge` | 5 | 46 | gone | unmerged_stale |
| `feature/nectarios-parsells/2026-03-30/orthodoxmetrics` | 30 | 0 | gone | unmerged_stale |
| `feature/omsvc/2026-03-28/add-task-runner-ui` | 27 | 0 | exists | unmerged_stale |
| `feature/omsvc/2026-03-30/add-auto-execution-engine` | 4 | 0 | gone | unmerged_stale |
| `feature/omsvc/2026-03-30/add-decision-engine` | 3 | 0 | gone | unmerged_stale |
| `feature/omsvc/2026-03-30/add-learning-engine` | 1 | 0 | gone | unmerged_stale |
| `feature/omsvc/2026-03-30/add-workflow-dashboard` | 1 | 0 | gone | unmerged_stale |
| `feature/omsvc/2026-03-30/add-workflow-templates` | 5 | 0 | gone | unmerged_stale |
| `feature/omsvc/2026-03-30/harden-learning-severity` | 1 | 0 | gone | unmerged_stale |

---

## 3. OM vs OMAI Comparison

| Aspect | OrthodoxMetrics | OMAI |
|--------|----------------|------|
| Local branches | 21 (18 stale) | 2 (clean) |
| Deploy script sources `branch-enforce.sh` | **No** | Yes |
| Deploy script runs `fetch --prune` | **No** | Yes (via `be_init`) |
| Branch naming validated at deploy | Partial (own regex) | Yes (shared lib) |
| `complete-work` deletes branches | Yes | Yes |
| Periodic branch sweep | **No** | **No** |
| Branch accumulation | Severe | Minimal |
| Why clean/dirty | No cleanup path for abandoned work | Lower churn, work goes through pipeline |

**OMAI stays clean** because:
1. It has much lower branch churn (single active feature branch at a time)
2. Work consistently flows through `start-work` → `complete-work` lifecycle
3. `be_init()` in deploy runs `fetch --prune` which at least cleans stale refs
4. Fewer agents/humans creating ad-hoc branches

**OM accumulates** because:
1. Multiple agents (`omsvc`, `claude-cli`, `nectarios-parsells`) create branches simultaneously
2. Many branches are abandoned without going through `complete-work`
3. No fetch/prune ever runs unless done manually
4. Deploy script has its own validation, doesn't use shared library

---

## 4. Branch Naming Discipline Audit

### Patterns Currently Present

| Pattern | Count | Status | Examples |
|---------|-------|--------|----------|
| `EF_<agent>_<date>` | 2 | **Deprecated** — OM Daily legacy format | `EF_claude-cli_2026-03-24` |
| `NF_<agent>_<date>` | 1 | **Deprecated** — OM Daily legacy format | `NF_claude-cli_2026-03-24` |
| `feat/<id>-<slug>` | 2 | **Deprecated** — short-form, missing date | `feat/685-harden-multi-agent` |
| `enh/<id>-<slug>` | 1 | **Invalid** — not a recognized prefix | `enh/686-harden-workflow-templates` |
| `feature/<user>/<date>/<slug>` | 8 | **Valid** — om-deploy.sh format, legacy-compatible | `feature/omsvc/2026-03-30/...` |
| `chore/<id>/<date>/<slug>` | 2 | **Authoritative** — matches branch-enforce.sh standard | `chore/omd-503/...` |

### Authoritative Convention (from `branch-enforce.sh`)

```
<type>/<work-item-id>/<yyyy-mm-dd>/<slug>

Types: feature, fix, chore
```

### Enforcement Points Requiring Update

1. **`om-deploy.sh`** — Uses own regex `^feature/...`, should source `branch-enforce.sh`
2. **OM Daily `createTaskBranch()`** — Creates `EF_`, `NF_`, `BF_`, `PA_` prefixed branches (legacy)
3. **Repo Ops branch analysis** — Already classifies branches, no changes needed
4. **`branch-enforce.sh`** — Already handles legacy patterns with deprecation warnings

---

## 5. Implementation Plan

### 5.1 Created: `branch-hygiene.sh` shared utility
Location: `/var/www/omai/scripts/lib/branch-hygiene.sh`

Features:
- `bh_report` — report-only mode, classifies all local branches
- `bh_clean` — deletes only merged-safe branches (never current, main, recovery)
- `bh_clean --force` — also deletes unmerged branches whose remote is gone
- Deterministic, non-interactive, safe by default
- Reusable across both repos

### 5.2 Modified: `om-deploy.sh`
- Sources `branch-enforce.sh` for branch validation (replaces ad-hoc regex)
- Adds post-deploy `bh_clean` call for merged branches

---

## 6. Verification Summary

| Scenario | Result |
|----------|--------|
| Merged branch identified as safe to delete | ✅ `--merged origin/main` check |
| Current active branch never deleted | ✅ `HEAD` comparison guard |
| `main` never deleted | ✅ Protected branch list |
| `recovery` never deleted | ✅ Protected branch list |
| Unmerged branch retained and flagged | ✅ Classified as `unmerged_stale` |
| `fetch --prune` updates stale refs | ✅ Run at start of every report/clean |
| OM cleanup matches intended discipline | ✅ After wiring shared lib |
| OMAI behavior confirmed | ✅ 2 branches, clean state |
| Mixed naming detected and reported | ✅ Pattern classification in report |
| Report-only mode available | ✅ Default mode is report |
