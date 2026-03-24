# OM Daily — Simplified Workflow Plan

> Redesign plan for the OM Daily pipeline UI.
> Based on audit: `docs/om-daily/om-daily-current-workflow-audit.md`

---

## 1. Goals

1. **One place for everything** — stop splitting OM Daily, Change Sets, and Prompt Plans across different nav trees
2. **Remove duplication** — SDLC Wizard's Advance and Fast Forward modes duplicate ChangeSetDetailPage actions
3. **Clarify relationships** — make it obvious that Items feed into Change Sets, and Prompt Plans generate Items
4. **Reduce page weight** — break the 1900-line OMDailyPage into focused sub-pages
5. **Action-oriented dashboard** — show what needs attention, not just metrics

---

## 2. Final Information Architecture

### Route Structure

```
/admin/control-panel/om-daily                  → Dashboard (new: action-oriented)
/admin/control-panel/om-daily/items            → Items list (extracted from Tab 1)
/admin/control-panel/om-daily/board            → Kanban board (extracted from Tab 2)
/admin/control-panel/om-daily/change-sets      → Change Sets dashboard (existing)
/admin/control-panel/om-daily/change-sets/:id  → Change Set detail (existing)
/admin/control-panel/om-daily/change-sets/releases → Release history (existing)
/admin/control-panel/om-daily/prompt-plans     → Prompt Plans list (MOVED from /devel-tools/)
/admin/control-panel/om-daily/prompt-plans/:id → Prompt Plan detail (MOVED from /devel-tools/)
/admin/control-panel/om-daily/changelog        → Changelog (extracted from Tab 3)
/admin/control-panel/om-daily/sdlc-wizard      → SDLC Wizard (simplified: New Work mode only)
```

### Navigation Model

The OM Daily section gets a **sub-nav bar** (horizontal tabs or breadcrumb pills) visible on all sub-pages:

```
[ Dashboard ] [ Items ] [ Board ] [ Change Sets ] [ Prompt Plans ] [ Changelog ]
```

This replaces the current tab system inside OMDailyPage and brings Prompt Plans into the same navigation family.

---

## 3. Page-by-Page Changes

### 3.1 Dashboard (new)

**What changes:**
- Replaces the old "Overview" tab
- Focus on **actionable items**, not vanity metrics
- Shows 3 sections:

| Section | Content |
|---------|---------|
| **Needs Attention** | Items overdue, items in review awaiting action, CS awaiting approval, failed prompt plan steps |
| **In Progress** | Active items with progress, active change sets with readiness %, running prompt plan steps |
| **Quick Stats** | Compact row: total items, completed today, active CS count, open PP count |

- Remove: horizon breakdown (rarely actionable), build info (belongs in DevOps), GitHub sync status (move to Items page header)
- Keep: quick links to active Change Sets

### 3.2 Items Page (extracted)

**What changes:**
- Extracted from OMDailyPage Tab 1 into standalone route
- Keeps: filters, search, multi-select, bulk actions, create/edit dialog
- Adds: GitHub sync button in page header (moved from Overview)
- Adds: inline CS membership badge on each item row (already enriched from API)
- Simplifies: remove `horizon` filter (keep field in DB but deprioritize in UI)

### 3.3 Board Page (extracted)

**What changes:**
- Extracted from OMDailyPage Tab 2 into standalone route
- No functional changes, just standalone routing

### 3.4 Change Sets Dashboard (minimal changes)

**What changes:**
- Breadcrumb updated to reflect new IA
- Remove "SDLC Wizard" button (wizard accessible from nav)
- Keep everything else

### 3.5 Change Set Detail (enhanced)

**What changes:**
- Move "Release Readiness Summary" to the TOP of the page (above lifecycle bar)
- Add **"Next Action" callout** at top: one-sentence instruction of what to do next (e.g., "Add items and activate this change set" or "Run `./scripts/om-deploy.sh stage CS-0042` to stage")
- Make linked items clickable → navigate to Items page filtered to that item
- Keep all existing functionality

### 3.6 Prompt Plans (moved)

**What changes:**
- Route moved from `/devel-tools/prompt-plans` to `/admin/control-panel/om-daily/prompt-plans`
- Breadcrumb updated
- No functional changes to list or detail pages
- Old route redirects to new route

### 3.7 Changelog (extracted)

**What changes:**
- Extracted from OMDailyPage Tab 3 into standalone route
- No functional changes

### 3.8 SDLC Wizard (simplified)

**What changes:**
- **Remove "Advance Change Set" mode** — this duplicates ChangeSetDetailPage transition buttons
- **Remove "Fast Forward" mode** — this duplicates ChangeSetDetailPage fast-forward button
- **Keep only "New Pipeline Work" mode** — this is the only mode with unique value (select items → create CS)
- Rename from "SDLC Pipeline Wizard" to "New Change Set Wizard"
- Since only one mode remains, skip mode selector and go directly to Step 1
- Accessible from: nav bar, Items page bulk action, Change Sets dashboard button

---

## 4. Component Changes

### Files to Create

| File | Purpose |
|------|---------|
| `OMDailyDashboard.tsx` | New action-oriented dashboard (replaces Tab 0) |
| `OMDailyItemsPage.tsx` | Extracted items list (from Tab 1) |
| `OMDailyBoardPage.tsx` | Extracted kanban board (from Tab 2) |
| `OMDailyChangelogPage.tsx` | Extracted changelog (from Tab 3) |
| `OMDailyLayout.tsx` | Shared sub-nav bar wrapper for all OM Daily sub-pages |

### Files to Modify

| File | Change |
|------|--------|
| `Router.tsx` | Add new routes, redirect old prompt-plans routes |
| `MenuItems.ts` | Move Prompt Plans under OM Daily nav section |
| `SDLCWizardPage.tsx` | Remove Advance and Fast Forward modes |
| `ChangeSetDetailPage.tsx` | Move readiness summary to top, add "Next Action" callout |
| `ChangeSetsDashboard.tsx` | Remove SDLC Wizard button, update breadcrumb |
| `PromptPlansPage.tsx` | Update breadcrumb |
| `PromptPlanDetailPage.tsx` | Update breadcrumb |

### Files to Delete

| File | Reason |
|------|--------|
| `OMDailyPage.tsx` | Replaced by Dashboard + Items + Board + Changelog sub-pages |
| `steps/AdvanceStep1.tsx` | Wizard advance mode removed |
| `steps/AdvanceStep2.tsx` | Wizard advance mode removed |
| `steps/AdvanceStep3.tsx` | Wizard advance mode removed |
| `steps/FastForwardStep1.tsx` | Wizard fast-forward mode removed |
| `steps/FastForwardStep2.tsx` | Wizard fast-forward mode removed |

---

## 5. Renamed Actions & Clarified Vocabulary

| Current | New | Reason |
|---------|-----|--------|
| "Pipeline Wizard" | "New Change Set" | Clearer purpose |
| "Advance Change Set" (wizard) | _(removed)_ | Use CS detail page transitions |
| "Fast Forward" (wizard) | _(removed)_ | Use CS detail page fast-forward button |
| "New Pipeline Item" | "New Item" | Simpler |
| "ready_for_staging" | "ready_for_staging" | Keep (accurate) |
| Overview tab | Dashboard | More accurate for action-oriented view |
| Prompt Plans (under Devel Tools) | Prompt Plans (under OM Daily) | Correct placement |

---

## 6. Implementation Order

### Phase 1: Layout & Routing (foundation)
1. Create `OMDailyLayout.tsx` with sub-nav bar
2. Update `Router.tsx` with new routes wrapped in layout
3. Update `MenuItems.ts` to move Prompt Plans

### Phase 2: Extract Sub-Pages
4. Create `OMDailyItemsPage.tsx` (extract Tab 1 logic from OMDailyPage)
5. Create `OMDailyBoardPage.tsx` (extract Tab 2)
6. Create `OMDailyChangelogPage.tsx` (extract Tab 3)
7. Create `OMDailyDashboard.tsx` (new action-oriented dashboard)

### Phase 3: Simplify Wizard
8. Remove Advance and Fast Forward modes from SDLCWizardPage
9. Remove step component files for deleted modes

### Phase 4: Enhance CS Detail
10. Move readiness summary to top of ChangeSetDetailPage
11. Add "Next Action" callout

### Phase 5: Cleanup
12. Delete old OMDailyPage.tsx
13. Add redirects for old Prompt Plans routes
14. Update breadcrumbs across all pages

---

## 7. Backend Changes Required

**None.** All changes are frontend-only. The API layer is well-structured and doesn't need modification for this redesign.

---

## 8. Risk Assessment

| Risk | Mitigation |
|------|------------|
| Breaking existing bookmarks/links | Add redirects from old routes to new routes |
| Losing OMDailyPage state coordination | Sub-pages will use URL params for cross-page state (filters, search) |
| SDLC Wizard users expect Advance/FF modes | Transition buttons on CS detail page are more discoverable anyway |
| Large diff from monolith extraction | Phase the work; each sub-page extraction is independently deployable |
