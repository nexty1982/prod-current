# God Component Refactoring Plan

> **Generated**: 2026-04-08  
> **Audit Run**: #21 (score 71.4)  
> **Total Criticals**: 36 OM + 12 OMAI = 48  
> **All violations**: `GOD_COMPONENT` (files over ~1000 LOC)

## Table of Contents

1. [Overview](#overview)
2. [Agent Assignments](#agent-assignments)
3. [Refactoring Patterns](#refactoring-patterns)
4. [Work Item Lifecycle](#work-item-lifecycle)
5. [OM Critical Items (36)](#om-critical-items)
6. [OMAI Critical Items (12)](#omai-critical-items)
7. [Verification](#verification)

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

**Workspace**: `/var/www/omai-workspaces/agent-windsurf`

### Claude CLI (OM — harder items + OMAI)

Claude handles **Tier 3** items from OM (deeply entangled state, complex hooks, high useState counts) and all OMAI items.

**Workspace**: `/var/www/omai-workspaces/agent-claude`

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

**Steps**:
1. Create a `tabs/` subdirectory next to the file
2. Move each tab's JSX into its own component
3. Pass only the props each tab needs (don't pass the whole parent state)
4. Keep tab switching state in the parent

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

**Steps**:
1. Create a `dialogs/` subdirectory (or `components/` if mixed)
2. Move dialog JSX + its local state into a separate component
3. Props: `open`, `onClose`, `onConfirm`, and any data it needs
4. Parent only manages `dialogOpen` boolean and passes callbacks

### Pattern C: Extract Custom Hooks

**When**: Component has 5+ `useState` calls or complex `useEffect` chains related to a single concern (data fetching, form state, polling, etc.).

```
BEFORE:
  MyPage.tsx (1400 LOC, 15 useState, 6 useEffect)

AFTER:
  MyPage.tsx (600 LOC)
  hooks/useMyPageData.ts (300 LOC)   — fetch, poll, cache
  hooks/useMyPageForm.ts (200 LOC)   — form state, validation
```

**Steps**:
1. Identify state clusters (which `useState` + `useEffect` + handlers go together)
2. Create `hooks/` subdirectory
3. Move the cluster into a custom hook, return the values/setters the component needs
4. Component calls the hook and destructures the return value

### Pattern D: Extract Inline Sub-Components

**When**: File defines multiple components (look for `const Foo: React.FC`, `function FooBar()`, or JSX-returning arrow functions that aren't event handlers).

```
BEFORE:
  Gallery.tsx (2800 LOC, 7 inline components)

AFTER:
  Gallery.tsx (800 LOC)
  components/GalleryGrid.tsx
  components/GalleryCard.tsx
  components/GalleryToolbar.tsx
  components/ImagePreview.tsx
  ...
```

### Pattern E: Extract Utility / Constants

**When**: File contains large helper functions, config objects, type definitions, or constant arrays that don't use React hooks.

```
BEFORE:
  visionParser.ts (1345 LOC, all utility functions)

AFTER:
  visionParser.ts (200 LOC, re-exports)
  utils/parseVisionResult.ts
  utils/extractColumns.ts
  types.ts
```

### Pattern F: Route File Splitting (Router.tsx only)

**When**: Router.tsx is large because of many route definitions.

```
BEFORE:
  Router.tsx (2249 LOC)

AFTER:
  Router.tsx (300 LOC, composes sub-routers)
  routes/adminRoutes.tsx
  routes/portalRoutes.tsx
  routes/develToolsRoutes.tsx
  routes/publicRoutes.tsx
  routes/churchRoutes.tsx
```

---

## Work Item Lifecycle

**Every refactor follows this exact workflow.** Do not skip steps.

### 1. Claim the item

```bash
# Check that the violation is not already in_progress
# (Check the Architecture Audit UI or query the API)

# Update violation status to in_progress
curl -X PATCH "http://127.0.0.1:7060/api/architecture-audit/violations/<VIOLATION_ID>/status" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"status":"in_progress"}'
```

### 2. Create OMAI Daily item

```bash
curl -X POST http://127.0.0.1:7060/api/omai-daily/items \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "title": "Refactor <ComponentName> God Component (<LOC> LOC)",
    "task_type": "refactor",
    "status": "backlog",
    "source": "agent",
    "agent_tool": "<windsurf|claude_cli>",
    "priority": "medium",
    "category": "<om-frontend|omai-frontend>",
    "description": "Extract sub-components/hooks/utilities from <file_path> to reduce below 800 LOC. Architecture audit violation ID: <VIOLATION_ID>."
  }'
```

### 3. Start work (creates branch)

```bash
curl -X POST http://127.0.0.1:7060/api/omai-daily/items/<ITEM_ID>/start-work \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"branch_type":"refactor","agent_tool":"<windsurf|claude_cli>"}'
```

### 4. Do the refactoring

1. **Read the file** — understand the structure before changing anything
2. **Identify extraction targets** — use the patterns above, pick the most impactful first
3. **Extract one piece at a time** — commit after each extraction so the diff is reviewable
4. **Keep the parent file's default export unchanged** — Router.tsx lazy-imports rely on this
5. **Test the build** — run `cd front-end && npx vite build` to verify no import errors
6. **Target < 800 LOC** for the main file after extraction

### 5. Commit, push, complete

```bash
# Commit with descriptive message
git add -A
git commit -m "refactor: extract <what> from <ComponentName>

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"

# Push
git push -u origin HEAD

# Signal completion
curl -X POST http://127.0.0.1:7060/api/omai-daily/items/<ITEM_ID>/agent-complete \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"agent_tool":"<windsurf|claude_cli>","summary":"Extracted X, Y, Z from ComponentName. Main file reduced from NNNN to NNN LOC."}'

# Create PR
gh pr create --base main --head "$(git branch --show-current)" \
  --title "OMD-<ID>: Refactor <ComponentName> God Component" \
  --body "$(cat <<'EOF'
## Summary
- Extracted <what> into <where>
- Main file reduced from NNNN LOC to NNN LOC
- Architecture audit violation ID: <VIOLATION_ID>

## Test plan
- [ ] `npx vite build` succeeds
- [ ] Page renders correctly at <route_path>
- [ ] All interactive features (tabs, dialogs, etc.) still work
- [ ] No console errors

Generated with [Claude Code](https://claude.com/claude-code)
EOF
)" --label "agent-pr"
```

### 6. After PR merge — verify

After admin merges, the next architecture audit scan will automatically:
- Remove the God Component violation (if main file < 1000 LOC)
- Mark the violation as `resolved` via status carry-forward

---

## OM Critical Items

### Tier 1: Quick Wins (Windsurf)

These have clear extraction boundaries, low state complexity, and minimal risk.

| # | File | LOC | useState | Patterns | What to Extract |
|---|------|-----|----------|----------|----------------|
| 1 | `features/system/apps/logs/Logs.tsx` | 1069 | 8 | A, B | 3 inline components → `components/`, any filter dialog → `dialogs/` |
| 2 | `features/devel-tools/command-center/CommandCenterPage.tsx` | 1071 | 5 | A, B | Tabs → `tabs/`, panels → `components/` |
| 3 | `features/devel-tools/om-ocr/components/InspectionPanel.tsx` | 1057 | 11 | A, B | Tab panels → `tabs/`, modals → `dialogs/` |
| 4 | `features/devel-tools/om-ocr/components/FieldMappingPanel.tsx` | 1092 | 7 | B, C | Modals → `dialogs/`, mapping logic → `hooks/useFieldMapping.ts` |
| 5 | `features/devel-tools/crm/CRMPage.tsx` | 1103 | 24 | A, B, C | Tabs → `tabs/`, dialogs → `dialogs/`, group state into hooks |
| 6 | `features/devel-tools/om-ocr/components/workbench/OcrWorkbench.tsx` | 1147 | 6 | A, D | Tab panels → `tabs/`, inline component → own file |
| 7 | `features/devel-tools/us-church-map/USChurchMapPage.tsx` | 1235 | 9 | A, B, D | Sidebar → `components/`, modals → `dialogs/`, map → `components/ChurchMap.tsx` **NOTE: canonical version moving to OMAI — refactor the OMAI copy instead, then delete this file** |
| 8 | `features/devel-tools/om-seedlings/RecordCreationWizard.tsx` | 1244 | 6 | A, D | Wizard steps → `steps/`, 2 inline components → own files |
| 9 | `features/devel-tools/platform-status/PlatformStatusPage.tsx` | 1278 | 10 | B, C | Modals → `dialogs/`, status polling → `hooks/usePlatformStatus.ts` |
| 10 | `components/VRTSettingsPanel.tsx` | 1307 | 4 | A, B | Tab panels → `tabs/`, modals → `dialogs/` |
| 11 | `features/devel-tools/page-edit-audit/PageEditAuditPage.tsx` | 1312 | 14 | A, B, C | Tabs → `tabs/`, modals → `dialogs/`, group 14 states into hooks |
| 12 | `components/AdminFloatingHUD.tsx` | 1341 | 13 | A, D | Tab panels → `tabs/`, inline component → own file |
| 13 | `features/devel-tools/om-ocr/utils/visionParser.ts` | 1345 | 0 | E | Pure utility — split into `utils/parseVisionResult.ts`, `utils/extractColumns.ts`, `utils/types.ts` |
| 14 | `features/church/apps/church-management/ChurchForm.tsx` | 1399 | 9 | A, B | Form sections → `sections/`, modals → `dialogs/` |

### Tier 2: Medium Complexity (Windsurf)

These have more state or larger extraction surface but still follow clear patterns.

| # | File | LOC | useState | Patterns | What to Extract |
|---|------|-----|----------|----------|----------------|
| 15 | `features/devel-tools/om-tasks/components/OMAITaskAssignmentWidget.tsx` | 1420 | 17 | A, B, C | Tabs → `tabs/`, modals → `dialogs/`, group 17 states into 2-3 hooks |
| 16 | `features/devel-tools/om-tasks/components/CreateTaskDialog.tsx` | 1507 | 7 | B, C | Sub-dialogs → separate files, form state → `hooks/useTaskForm.ts` |
| 17 | `features/devel-tools/live-table-builder/LiveTableBuilderPage.tsx` | 1512 | 21 | A, B, C | Tabs → `tabs/`, modals → `dialogs/`, 21 states → multiple hooks |
| 18 | `features/certificates/CertificateGeneratorPage.tsx` | 1513 | 16 | A, B, C | Tabs → `tabs/`, modals → `dialogs/`, group 16 states into hooks |
| 19 | `features/admin/dashboard/LogSearch.tsx` | 1535 | 37 | A, C | **37 useState** — most of these are filter/form state. Extract `hooks/useLogSearchFilters.ts`, `hooks/useLogSearchResults.ts`, tab panels → `tabs/` |
| 20 | `features/devel-tools/refactor-console/RefactorConsole.tsx` | 1630 | 8 | B, D | Modals → `dialogs/`, inline component → own file, panels → `components/` |
| 21 | `features/devel-tools/repo-ops/RepoOpsPage.tsx` | 1652 | 15 | A, B, C | Tabs → `tabs/`, modals → `dialogs/`, group 15 states into hooks |
| 22 | `features/admin/admin/components/ComponentManager.tsx` | 1709 | 0 | A, B | Tabs → `tabs/`, modals → `dialogs/`, panels → `components/` |
| 23 | `features/devel-tools/om-church-wizard/ChurchSetupWizard.tsx` | 1729 | 7 | A, B, D | Wizard steps → `steps/`, modals → `dialogs/`, inline component → own file |

### Tier 3: Complex (Claude CLI)

These have deep state entanglement, many useEffect chains, or are architecturally sensitive.

| # | File | LOC | useState | Patterns | What to Extract |
|---|------|-----|----------|----------|----------------|
| 24 | `tools/omtrace/omtrace.tsx` | 1567 | 0 | E | Utility — split into focused modules (trace engine, formatters, reporters) |
| 25 | `features/devel-tools/om-ocr/EnhancedOCRUploader.tsx` | 1742 | 7 | B, C | Upload logic → hook, panels → `components/` |
| 26 | `components/global/GlobalOMAI.tsx` | 1757 | 14 | A, B, C | Global provider — extract panels, dialogs, hooks carefully (used app-wide) |
| 27 | `features/admin/control-panel/OMDailyPage.tsx` | 1901 | 27 | A, B, C | 27 states + 6 effects — extract `hooks/useOMDailyData.ts`, tabs → `tabs/`, dialogs → `dialogs/` |
| 28 | `features/devel-tools/om-ocr/pages/OmOcrStudioPage.tsx` | 1976 | 10 | A, C | 9 useEffects — extract `hooks/useOcrStudioState.ts`, panels → `components/` |
| 29 | `features/devel-tools/conversation-log/ConversationLogPage.tsx` | 2070 | 16 | A, C | Tabs → `tabs/`, 16 states → hooks, panels → `components/` |
| 30 | `features/admin/control-panel/ChurchLifecycleDetailPage.tsx` | 2206 | 27 | A, B, C | 27 states — extract `hooks/useChurchLifecycle.ts`, tabs → `tabs/`, dialogs → `dialogs/` |
| 31 | `routes/Router.tsx` | 2249 | 0 | F | Split into sub-route files: `routes/adminRoutes.tsx`, `routes/portalRoutes.tsx`, `routes/develToolsRoutes.tsx`, etc. |
| 32 | `features/devel-tools/om-ocr/components/FusionTab.tsx` | 2818 | 11 | B, C, D | 10 useEffects — extract `hooks/useFusionState.ts`, modals → `dialogs/`, sub-components → `components/` |
| 33 | `features/devel-tools/om-gallery/Gallery.tsx` | 2876 | 18 | B, C, D | 7 inline components → own files, 18 states → hooks, modals → `dialogs/` |
| 34 | `features/records-centralized/components/records/RecordsPage.tsx` | 2987 | 7 | A, B, C | 10 useEffects — extract `hooks/useRecordsData.ts`, tabs → `tabs/`, modals → `dialogs/` |
| 35 | `features/admin/OMBigBook.tsx` | 3055 | 11 | A, B, C | Tabs → `tabs/`, modals → `dialogs/`, 3 useEffects → hooks |
| 36 | `features/church/FieldMapperPage.tsx` | 3239 | 7 | A, B, C | Largest file — tabs → `tabs/`, modals → `dialogs/`, mapping logic → `hooks/useFieldMapper.ts` |

---

## OMAI Critical Items

All handled by **Claude CLI**. Workspace: `/var/www/omai-workspaces/agent-claude`

**IMPORTANT**: OMAI items use the same OMAI Daily workflow but the category is `omai-frontend` and the code lives in `/var/www/omai/berry/src/views/`.

### Delete First (Dead Code)

| # | File | LOC | Action |
|---|------|-----|--------|
| 1 | `ops/daily-work/index.retired.tsx` | 2233 | **DELETE** — route uses `daily-ops-command`, this file is dead. Just delete and commit. |

### Refactor

| # | File | LOC | useState | Patterns | What to Extract |
|---|------|-----|----------|----------|----------------|
| 2 | `tools/page-snapshots/index.tsx` | 1048 | 14 | B, D | 5 inline components → own files, dialogs → `dialogs/` |
| 3 | `admin/workflows/dashboard.tsx` | 1114 | 4 | A, D | 4 inline components → own files, tabs → `tabs/` |
| 4 | `control-panel/consolidation/capabilityRegistry.ts` | 1186 | 0 | E | Pure utility — split registry data into categories |
| 5 | `devops/repo/index.tsx` | 1319 | 15 | A, B | Tabs → `tabs/`, dialogs → `dialogs/` |
| 6 | `devops/backup-restore/index.tsx` | 1346 | 12 | C, D | 5 inline components → own files, state → hooks |
| 7 | `control-panel/consolidation/index.tsx` | 1643 | 10 | B, D | 12 inline components → own files, dialogs → `dialogs/` |
| 8 | `tools/conversation-log/index.tsx` | 1684 | 22 | A, B, C | Tabs → `tabs/`, dialogs → `dialogs/`, 22 states → hooks |
| 9 | `admin/prompts/index.tsx` | 1802 | 9 | A, B, D | 7 inline components → own files, tabs → `tabs/`, dialogs → `dialogs/` |
| 10 | `devops/build-console/index.tsx` | 1902 | 12 | A, B, D | 5 inline components → own files, tabs → `tabs/`, dialogs → `dialogs/` |
| 11 | `ops/users/index.tsx` | 2350 | 33 | A, B, C, D | 8 inline components → own files, 33 states → hooks, tabs/drawers → extracted |
| 12 | `tools/om-seedlings/index.tsx` | 2553 | 29 | A, B, C, D | 12 inline components → own files, stepper steps → `steps/`, 29 states → hooks |

---

## Verification

After each refactor PR is merged:

1. **Build check**: `cd front-end && npx vite build` must succeed
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

---

## Priority Order for Windsurf

Start with these in order (easiest first, building confidence):

1. `visionParser.ts` — pure utility, no React, no risk (Pattern E only)
2. `Logs.tsx` — small, 3 inline components ready to extract
3. `CommandCenterPage.tsx` — small, clear tab structure
4. `VRTSettingsPanel.tsx` — small, clear tab/modal structure
5. `InspectionPanel.tsx` — small, clear tab/modal structure
6. Then continue through Tier 1 in order, then Tier 2
