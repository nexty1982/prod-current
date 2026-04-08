# God Component Refactoring Plan

> **Generated**: 2026-04-08  
> **Last Updated**: 2026-04-09  
> **Audit Run**: #21 (score 71.4)  
> **Original Criticals**: 36 OM + 12 OMAI = 48  

---

## Progress Summary

| Category | Original | Resolved | Remaining |
|----------|----------|----------|-----------|
| OM Tier 1 (Windsurf) | 14 | 13 | 1 |
| OM Tier 2 (Windsurf) | 9 | 5 | 4 |
| OM Tier 3 (Claude CLI) | 13 | 11 + 1 skip | 1 |
| **OM Total** | **36** | **30** | **6** |
| OMAI | 12 | — | 12 (not started) |
| **Grand Total** | **48** | **30** | **18** |

---

## Table of Contents

1. [Overview](#overview)
2. [Agent Assignments](#agent-assignments)
3. [Refactoring Patterns](#refactoring-patterns)
4. [Work Item Lifecycle](#work-item-lifecycle)
5. [OM Critical Items — Completed](#om-critical-items--completed)
6. [OM Critical Items — Remaining](#om-critical-items--remaining)
7. [OMAI Critical Items (12)](#omai-critical-items)
8. [Verification](#verification)

---

## Overview

Every critical item is a single-file component that has grown too large. The fix is always some form of **extraction**: pull out sub-components, hooks, utilities, types, or constants into sibling files. The component's public API (props, route, exports) should not change.

### Goals
- Reduce each file to **< 800 LOC** (ideally < 500)
- Extract reusable hooks, sub-components, and utilities
- Preserve all existing behavior — zero functional changes
- Each refactor is one OMAI Daily item, one branch, one PR

### Non-Goals
- No feature changes, no bug fixes, no new functionality
- No changes to routing, API endpoints, or data flow
- No renaming of exported components (breaks lazy imports)

---

## Agent Assignments

### Windsurf (OM — easier items)

Windsurf handles **Tier 1 and Tier 2** items from the OM list. These are files with clear extraction boundaries: tab panels, dialog components, inline sub-components, or utility functions that can be moved to sibling files with minimal risk.

**Workspace**: `/var/www/om-workspaces/agent-windsurf` (worktree of `prod-current` repo)

### Claude CLI (OM — harder items + OMAI)

Claude handles **Tier 3** items from OM (deeply entangled state, complex hooks, high useState counts) and all OMAI items.

**OM Workspace**: `/var/www/om-workspaces/agent-claude` (worktree of `prod-current` repo)  
**OMAI Workspace**: `/var/www/omai-workspaces/agent-claude` (worktree of `omai` repo)

### Coordination Rules

- **One item at a time** — never refactor two God Components in the same branch/PR
- **Check the audit board first** — if an item is already `in_progress`, skip it
- **Mark status immediately** — set the violation to `in_progress` via the API when you start
- **Don't overlap** — if two files import each other, coordinate before touching either

---

## Refactoring Patterns

Use these patterns consistently. Every God Component falls into one or more of these categories.

### Pattern A: Extract Tab Panels

**When**: Component renders `<Tabs>` or `<TabPanel>` with distinct content sections.

```
BEFORE:
  MyPage.tsx (1500 LOC)

AFTER:
  MyPage.tsx (300 LOC)         — tab state, layout shell
  tabs/OverviewTab.tsx (400 LOC)
  tabs/SettingsTab.tsx (350 LOC)
  tabs/HistoryTab.tsx (350 LOC)
```

### Pattern B: Extract Dialogs/Modals

**When**: Component contains `<Dialog>`, `<Modal>`, or `<Drawer>` blocks.

```
BEFORE:
  MyPage.tsx (1200 LOC, 2 dialogs inline)

AFTER:
  MyPage.tsx (700 LOC)
  dialogs/CreateDialog.tsx (250 LOC)
  dialogs/ConfirmDeleteDialog.tsx (150 LOC)
```

### Pattern C: Extract Custom Hooks

**When**: Component has 5+ `useState` calls or complex `useEffect` chains related to a single concern.

```
BEFORE:
  MyPage.tsx (1400 LOC, 15 useState, 6 useEffect)

AFTER:
  MyPage.tsx (600 LOC)
  hooks/useMyPageData.ts (300 LOC)
  hooks/useMyPageForm.ts (200 LOC)
```

### Pattern D: Extract Inline Sub-Components

**When**: File defines multiple components (look for `const Foo: React.FC` or JSX-returning arrow functions).

### Pattern E: Extract Utility / Constants

**When**: File contains large helper functions, config objects, type definitions, or constant arrays.

### Pattern F: Route File Splitting (Router.tsx only)

**When**: Router.tsx is large because of many route definitions.

---

## Work Item Lifecycle

**Every refactor follows this exact workflow.** Do not skip steps.

1. **Claim** — Update violation status to `in_progress`
2. **Create OMAI Daily item** — `POST /api/omai-daily/items` with `status: "backlog"`
3. **Start work** — `POST /api/omai-daily/items/:id/start-work` (creates branch)
4. **Refactor** — Read file, identify extraction targets, extract, test with `npx tsc --noEmit`
5. **Commit, push, complete** — `POST /agent-complete`, then `gh pr create`
6. **After merge** — Next audit scan auto-resolves the violation

---

## OM Critical Items — Completed

These items have been refactored and merged. Listed with original and current LOC.

### Tier 1 Completed (Windsurf)

| # | File | Original | Current | Status |
|---|------|----------|---------|--------|
| 1 | `Logs.tsx` | 1069 | 689 | Below 800 |
| 2 | `CommandCenterPage.tsx` | 1071 | 338 | Below 800 |
| 3 | `InspectionPanel.tsx` | 1057 | 794 | Below 800 |
| 4 | `FieldMappingPanel.tsx` | 1092 | 764 | Below 800 |
| 5 | `CRMPage.tsx` | 1103 | 724 | Below 800 |
| 6 | `OcrWorkbench.tsx` | 1147 | 834 | Near target |
| 8 | `RecordCreationWizard.tsx` | 1244 | 702 | Below 800 |
| 9 | `PlatformStatusPage.tsx` | 1278 | 458 | Below 800 |
| 10 | `VRTSettingsPanel.tsx` | 1307 | 397 | Below 800 |
| 11 | `PageEditAuditPage.tsx` | 1312 | 170 | Below 800 |
| 12 | `AdminFloatingHUD.tsx` | 1341 | 680 | Below 800 |
| 13 | `visionParser.ts` | 1345 | 53 | Below 800 |

### Tier 2 Completed

| # | File | Original | Current | Agent | PR |
|---|------|----------|---------|-------|-----|
| 15 | `OMAITaskAssignmentWidget.tsx` | 1420 | 972 | Claude | #389 |
| 19 | `LogSearch.tsx` | 1535 | 789 | Windsurf | — |
| 20 | `RefactorConsole.tsx` | 1630 | 1253 | Claude | #388 |
| 21 | `RepoOpsPage.tsx` | 1652 | 1385 | Claude | #387 |
| 22 | `ComponentManager.tsx` | 1709 | 1185 | Claude | #394 |

### Tier 3 Completed

| # | File | Original | Current | PR |
|---|------|----------|---------|-----|
| 24 | `omtrace.tsx` | 1567 | DELETED | — |
| 27 | `OMDailyPage.tsx` | 1901 | 966 | — |
| 28 | `OmOcrStudioPage.tsx` | 1976 | 616 | — |
| 29 | `ConversationLogPage.tsx` | 2070 | 834 | #369 |
| 36 | `FieldMapperPage.tsx` | 3239 | 819 | #391 |
| 14 | `ChurchForm.tsx` | 1399 | 1008 | #393 |
| 25 | `FusionTab.tsx` | 1985 | 1769 | #395 |
| 26 | `RecordsPage.tsx` | 1787 | 1401 | #396 |
| 30 | `Gallery.tsx` | 1604 | 1325 | #397 |
| 32 | `EnhancedOCRUploader.tsx` | 1078 | 850 | #398 |
| 33 | `ChurchLifecycleDetailPage.tsx` | 1037 | 812 | #399 |

---

## OM Critical Items — Remaining

### Need Further Refactoring (partially done, still over 1000 LOC)

| # | File | Current | Tier | What Remains |
|---|------|---------|------|-------------|
| 20 | `RefactorConsole.tsx` | 1253 | 2 | Extract more panels/sections |
| 21 | `RepoOpsPage.tsx` | 1385 | 2 | Extract tab content, handler functions |
| 22 | `ComponentManager.tsx` | 1185 | 2 | Extract ComponentCard (~190 LOC), SummaryPanel, FilterPanel |
| 14 | `ChurchForm.tsx` | 1008 | 1 | Extract Church Info form sections (~400 LOC of form JSX) |

### Not Yet Started (still over 1000 LOC)

| Priority | File | LOC | Tier | Patterns | What to Extract |
|----------|------|-----|------|----------|----------------|
| — | `OMBigBook.tsx` | 1530 | 3 | — | **SKIP** — legacy code, do not refactor |
| 5 | `ChurchSetupWizard.tsx` | 1291 | 2 | A, B, D | Wizard steps, modals, inline components |
| 6 | `GlobalOMAI.tsx` | 1237 | 3 | A, B, C | Global provider — panels, dialogs, hooks (used app-wide) |
| 7 | `USChurchMapPage.tsx` | 1234 | 1 | A, B, D | **Defer** — canonical version moving to OMAI |

### Already Below 1000 LOC (resolved or borderline)

| # | File | Current | Notes |
|---|------|---------|-------|
| 15 | `OMAITaskAssignmentWidget.tsx` | 972 | Near target, may not need more work |
| 16 | `CreateTaskDialog.tsx` | 958 | Below 1000 |
| 17 | `LiveTableBuilderPage.tsx` | 817 | Below 800 |
| 18 | `CertificateGeneratorPage.tsx` | 909 | Below 1000 |
| 19 | `LogSearch.tsx` | 789 | Below 800 |
| 27 | `OMDailyPage.tsx` | 966 | Below 1000 |
| 29 | `ConversationLogPage.tsx` | 834 | Near target |
| 31 | `Router.tsx` | 972 | Below 1000 |

---

## OMAI Critical Items

All handled by **Claude CLI**. Workspace: `/var/www/omai-workspaces/agent-claude`

**IMPORTANT**: OMAI items use the same OMAI Daily workflow but the category is `omai-frontend` and the code lives in `/var/www/omai/berry/src/views/`.

**Status: Not started.** OM items are being prioritized first.

### Delete First (Dead Code)

| # | File | LOC | Action |
|---|------|-----|--------|
| 1 | `ops/daily-work/index.retired.tsx` | 2233 | **DELETE** — route uses `daily-ops-command`, this file is dead |

### Refactor

| # | File | LOC | useState | Patterns | What to Extract |
|---|------|-----|----------|----------|----------------|
| 2 | `tools/page-snapshots/index.tsx` | 1048 | 14 | B, D | 5 inline components, dialogs |
| 3 | `admin/workflows/dashboard.tsx` | 1114 | 4 | A, D | 4 inline components, tabs |
| 4 | `control-panel/consolidation/capabilityRegistry.ts` | 1186 | 0 | E | Pure utility — split registry data |
| 5 | `devops/repo/index.tsx` | 1319 | 15 | A, B | Tabs, dialogs |
| 6 | `devops/backup-restore/index.tsx` | 1346 | 12 | C, D | 5 inline components, hooks |
| 7 | `control-panel/consolidation/index.tsx` | 1643 | 10 | B, D | 12 inline components, dialogs |
| 8 | `tools/conversation-log/index.tsx` | 1684 | 22 | A, B, C | Tabs, dialogs, hooks |
| 9 | `admin/prompts/index.tsx` | 1802 | 9 | A, B, D | 7 inline components, tabs, dialogs |
| 10 | `devops/build-console/index.tsx` | 1902 | 12 | A, B, D | 5 inline components, tabs, dialogs |
| 11 | `ops/users/index.tsx` | 2350 | 33 | A, B, C, D | 8 inline components, 33 states, tabs/drawers |
| 12 | `tools/om-seedlings/index.tsx` | 2553 | 29 | A, B, C, D | 12 inline components, stepper steps, 29 states |

---

## Verification

After each refactor PR is merged:

1. **Build check**: `cd front-end && npx tsc --noEmit` must succeed
2. **Page check**: Visit the route in the browser, verify it renders
3. **Re-scan**: Run architecture audit scan — the violation should auto-resolve
4. **LOC check**: Main file should be < 800 LOC (ideally < 500)

### Monitoring Progress

```bash
# Check current violation stats
curl -s "http://127.0.0.1:7060/api/architecture-audit/issues/orthodoxmetrics" \
  -H "Authorization: Bearer $TOKEN" | python3 -c "
import sys,json; d=json.load(sys.stdin)
s=d.get('stats',{})
print(f'OM: {s.get(\"total\")} total, open={s.get(\"open\")}, in_progress={s.get(\"in_progress\")}, resolved={s.get(\"resolved\")}, ignored={s.get(\"ignored\")}')
"

# Same for OMAI
curl -s "http://127.0.0.1:7060/api/architecture-audit/issues/omai" \
  -H "Authorization: Bearer $TOKEN" | python3 -c "
import sys,json; d=json.load(sys.stdin)
s=d.get('stats',{})
print(f'OMAI: {s.get(\"total\")} total, open={s.get(\"open\")}, in_progress={s.get(\"in_progress\")}, resolved={s.get(\"resolved\")}, ignored={s.get(\"ignored\")}')
"
```
