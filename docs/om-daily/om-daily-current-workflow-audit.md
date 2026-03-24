# OM Daily — Current Workflow Audit

> Generated 2026-03-23 · Covers frontend + backend + database

---

## 1. Route Map

### Frontend Routes (all `super_admin` only)

| Route | Component | Purpose |
|-------|-----------|---------|
| `/admin/control-panel/om-daily` | `OMDailyPage` | Main hub — 4 tabs: Overview, Items, Board, Changelog |
| `/admin/control-panel/om-daily/sdlc-wizard` | `SDLCWizardPage` | 3-mode wizard: New Work, Advance CS, Fast Forward |
| `/admin/control-panel/om-daily/change-sets` | `ChangeSetsDashboard` | Change set list with filters and status summary |
| `/admin/control-panel/om-daily/change-sets/releases` | `ReleaseHistoryPage` | Promoted + rolled-back CS history |
| `/admin/control-panel/om-daily/change-sets/:id` | `ChangeSetDetailPage` | Single CS detail with transitions, items, events |
| `/devel-tools/prompt-plans` | `PromptPlansPage` | Prompt plan list with agent/status filters |
| `/devel-tools/prompt-plans/:id` | `PromptPlanDetailPage` | Plan detail with step management and launch |

### Backend API Routes

| Mount Point | File | Auth |
|-------------|------|------|
| `/api/om-daily` | `server/src/routes/om-daily.js` | requireAuth |
| `/api/admin/change-sets` | `server/src/routes/admin/change-sets.js` | requireAuth + super_admin |
| `/api/prompt-plans` | `server/src/routes/prompt-plans.js` | requireAuth + super_admin |

---

## 2. Backend Endpoint Inventory

### OM Daily Items (`/api/om-daily`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/dashboard` | Aggregate stats: horizon breakdown, overdue, due today, recently completed |
| GET | `/dashboard/extended` | Rich KPIs: status/priority/category distribution, velocity, phase groups |
| POST | `/sync-commits` | Auto-import today's git commits as 24-hour items |
| GET | `/items` | List items with filters (horizon, status, priority, category, search, sort, due dates). Supports `#ID`, `CS-XXXX`, `field:value`, `-exclude` |
| POST | `/items` | Create item. Auto-syncs to GitHub, creates branch if `agent_tool + branch_type` set |
| PUT | `/items/:id` | Update item. Auto-creates branch if fields become set |
| DELETE | `/items/:id` | Delete item |
| GET | `/categories` | Distinct category list |
| GET | `/dates` | Dates with items (90-day window) |
| POST | `/email` | Send daily task summary email |
| POST | `/start-work/:id` | Start work: status → `in_progress`, create branch from main |
| POST | `/complete-work/:id` | Complete: ff-merge branch to main, delete branch, close item |

### OM Daily Changelog (`/api/om-daily`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/changelog` | List changelog entries (date range, limit) |
| GET | `/changelog/:date` | Single day's changelog |
| POST | `/changelog/generate` | Generate changelog for a date (git commits → item matching) |
| POST | `/changelog/email/:date` | Send formatted HTML changelog email |

### GitHub Integration (`/api/om-daily`)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/github/sync/:id` | Sync single item → GitHub Issue |
| POST | `/github/pull-changes` | Pull GitHub state changes → DB |
| GET | `/github/sync-status` | Real-time sync progress |

### Change Sets (`/api/admin/change-sets`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | List with filters (status, change_type, priority, limit, offset) |
| GET | `/releases` | Release history (promoted + rolled_back only) |
| POST | `/memberships` | Bulk lookup: item IDs → change set membership |
| GET | `/:id` | Get by ID or code (CS-XXXX). Includes items + events |
| POST | `/` | Create change set. Auto-generates code |
| PUT | `/:id` | Update metadata (draft/active only) |
| POST | `/:id/transition` | Status transition with validation + side effects |
| POST | `/:id/fast-forward` | Bypass staging: draft/active → promoted directly |
| POST | `/:id/promote-and-push` | Promote + push branch to origin |
| POST | `/:id/items` | Add OM Daily item to CS |
| DELETE | `/:id/items/:itemId` | Remove item from CS |
| POST | `/:id/notes` | Add audit note |
| GET | `/:id/events` | Audit event history |

### Prompt Plans (`/api/prompt-plans`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | List plans (filter by status, agent) |
| GET | `/agent/:agentName` | Find plans assigned to agent with next step |
| GET | `/:id` | Get plan with all steps |
| POST | `/` | Create plan with optional steps array |
| PUT | `/:id` | Update metadata (draft/active/paused only) |
| POST | `/:id/transition` | Status transition. Auto-creates CS on activation |
| POST | `/:id/steps` | Add step |
| PUT | `/:id/steps/:stepId` | Update step |
| DELETE | `/:id/steps/:stepId` | Delete pending/ready steps |
| POST | `/:id/reorder` | Reorder steps by ID array |
| POST | `/:id/steps/:stepId/launch` | Execute step via OMAI, create work item, add to CS |
| POST | `/:id/steps/:stepId/skip` | Skip optional step |
| POST | `/:id/steps/:stepId/retry` | Reset failed step to pending |

---

## 3. Database Tables

| Table | DB | Key Columns |
|-------|-----|-------------|
| `om_daily_items` | platform | id, title, task_type, description, horizon, status, priority, category, due_date, tags, source, agent_tool, branch_type, conversation_ref, metadata, created_by, completed_at, github_issue_number, github_branch, github_synced_at, progress |
| `om_daily_changelog` | platform | date, commits, files_changed, summary, status_breakdown, matched_items, email_sent_at |
| `change_sets` | platform | id, code, title, description, change_type, priority, status, git_branch, deployment_strategy, has_db_changes, migration_files, created_by, reviewed_by, staging/approved/prod commit SHAs + build IDs, staged_at, approved_at, promoted_at, rejected_at, pre_promote_snapshot_id |
| `change_set_items` | platform | change_set_id, om_daily_item_id, sort_order, is_required, notes, added_at |
| `change_set_events` | platform | change_set_id, event_type, from_status, to_status, user_id, message, metadata |
| `prompt_plans` | platform | id, title, description, assigned_agent, status, change_set_id, created_by |
| `prompt_plan_steps` | platform | id, prompt_plan_id, step_number, title, prompt_text, execution_order, status, notes, is_required, generated_work_item_id, started_at, completed_at, metadata |

---

## 4. Component Map

### OMDailyPage (~1900 lines)

**4 Tabs:**

| Tab | Name | Content |
|-----|------|---------|
| 0 | Overview | KPIs (total, completed, working), active CS list, GitHub sync status, build info, horizon breakdown |
| 1 | Items | Filterable/searchable/sortable table with multi-select and bulk actions |
| 2 | Board | Kanban view (status columns, drag-drop, quick actions) via `OMDailyKanban` |
| 3 | Changelog | Git commit history by date |

**Dialogs (3):**
1. Create/Edit Item — title, description, horizon, status, priority, category, due_date, agent_tool, branch_type
2. Change Set — two modes: Create (title, type, priority, branch, strategy) or Add to Existing (dropdown)
3. Prompt Plan — title, description, assigned_agent

**Bulk Actions (from multi-select):**
- Create Change Set from selected items
- Add selected items to existing CS
- Navigate to SDLC Wizard (advance or fast-forward mode)

### SDLCWizardPage (~394 lines + 8 step components)

**3 Modes:**

| Mode | Steps | Purpose |
|------|-------|---------|
| New Work | Select Items → CS Details → Review & Create | Create items + change set from scratch |
| Advance | Select CS → Transition Form → Execute | Move CS through next lifecycle transition |
| Fast Forward | Select CS → Confirm & Execute | Bypass staging for fully-tested work |

**Step Components (in `./steps/`):**
- NewWorkStep1, NewWorkStep2, NewWorkStep3
- AdvanceStep1, AdvanceStep2, AdvanceStep3
- FastForwardStep1, FastForwardStep2

### ChangeSetsDashboard (~456 lines)

- Status summary chips (clickable filters)
- Filter bar: status, type, priority dropdowns
- Table: code, title, status, priority, type, branch, items count, next step hint
- Create CS dialog
- Links to: CS detail, SDLC Wizard, Release History

### ChangeSetDetailPage (~1000+ lines)

**Sections:**
1. Header card with status chip and transition buttons
2. Lifecycle progress bar (Draft → Active → Ready → Staged → Review → Approved → Promoted)
3. Release readiness summary (items linked, required ready, branch set, DB migrations, staging, approved)
4. CLI action alerts (deploy commands with copy button)
5. DB changes warning + migration file list
6. Rejection notice (if rejected)
7. Git & build linkage metadata grid
8. Pre-promote snapshot section with restore button
9. Linked OM Daily items table (add/remove)
10. Event timeline (all status transitions, notes)

**Actions:**
- Transition buttons (activate, mark ready, approve, reject, promote, rollback, reactivate)
- Add/remove items
- Add notes
- Restore from snapshot

### PromptPlansPage (~328 lines)

- Agent filter dropdown
- Table: ID (PP-XXXX), title, agent, status, CS link, progress bar, creator, date
- Create plan dialog

### PromptPlanDetailPage (~800+ lines)

**Sections:**
1. Plan header (editable toggle) with status transitions
2. Launch result alert
3. Steps list with per-step actions

**Per-step actions:** Launch, Retry, Skip, Edit, Delete, Reorder (up/down arrows)

---

## 5. Data Flow & Workflow Relationships

```
                    ┌─────────────────────┐
                    │   OM Daily Item      │
                    │ (unit of work)       │
                    └──────┬──────────────┘
                           │
              ┌────────────┼────────────────┐
              │            │                │
              ▼            ▼                ▼
     ┌────────────┐  ┌──────────┐   ┌──────────────┐
     │ GitHub     │  │ Change   │   │ Prompt Plan  │
     │ Issue Sync │  │ Set      │   │ Step         │
     │ (optional) │  │ (bundle) │   │ (generates   │
     └────────────┘  └────┬─────┘   │  work items) │
                          │         └──────┬───────┘
                          │                │
                          ▼                │
                    ┌───────────┐          │
                    │ SDLC      │◄─────────┘
                    │ Pipeline  │   (auto-links items
                    │ (status   │    to plan's CS)
                    │ lifecycle)│
                    └───────────┘
```

### Item Lifecycle:
```
backlog → todo → in_progress → review → done
                                  ↓
                              cancelled
```

### Change Set Lifecycle:
```
draft → active → ready_for_staging → staged → in_review → approved → promoted
                                                   ↓                     ↓
                                               rejected              rolled_back
                                                   ↓
                                                active (reactivate)
```

### Prompt Plan Lifecycle:
```
draft → active ↔ paused → completed
          ↓
       cancelled (terminal)
```

### Key Relationships:
1. **Item → Change Set**: Many-to-one via `change_set_items` junction table
2. **Change Set → Items**: One-to-many; items must be "done" or "review" for CS to stage
3. **Prompt Plan → Change Set**: One-to-one; auto-created on plan activation if not linked
4. **Prompt Plan Step → Item**: One-to-one; step launch creates OM Daily item + adds to plan's CS
5. **Item → GitHub**: One-to-one; auto-synced on create/update if `agent_tool` set

---

## 6. Action Inventory

### From OMDailyPage

| Action | Trigger | Effect |
|--------|---------|--------|
| Create item | "New Pipeline Item" button | POST `/om-daily/items` |
| Edit item | Click edit icon on row | PUT `/om-daily/items/:id` |
| Delete item | Click delete icon | DELETE `/om-daily/items/:id` |
| Bulk create CS | Select items → "Create Change Set" | POST `/admin/change-sets` + POST `/:id/items` for each |
| Bulk add to CS | Select items → "Add to Change Set" | POST `/:csId/items` for each selected item |
| Navigate to SDLC Wizard | "Pipeline Wizard" button or bulk action | Navigate with query params |
| Navigate to CS dashboard | "Change Sets" button | Navigate |
| Navigate to Prompt Plans | "Prompt Plans" button | Navigate |
| GitHub sync all | "Sync" button | POST `/om-daily/github/pull-changes` |
| Send daily email | "Email" button | POST `/om-daily/email` |
| Generate changelog | Tab 3 button | POST `/om-daily/changelog/generate` |
| Drag item (Board) | Kanban drag-drop | PUT `/om-daily/items/:id` with new status |

### From ChangeSetDetailPage

| Action | Trigger | Effect |
|--------|---------|--------|
| Transition status | Status button | POST `/admin/change-sets/:id/transition` |
| Fast forward | FF button | POST `/admin/change-sets/:id/fast-forward` |
| Add item | "Add Item" button | POST `/admin/change-sets/:id/items` |
| Remove item | Row delete button | DELETE `/admin/change-sets/:id/items/:itemId` |
| Add note | "Add Note" button | POST `/admin/change-sets/:id/notes` |
| Restore snapshot | "Restore" button | Server-side snapshot restore |
| Copy CLI command | Copy button | Clipboard copy of deploy command |

### From PromptPlanDetailPage

| Action | Trigger | Effect |
|--------|---------|--------|
| Edit plan | Toggle edit mode | PUT `/prompt-plans/:id` |
| Transition plan | Status button | POST `/prompt-plans/:id/transition` |
| Add step | "Add Step" button | POST `/prompt-plans/:id/steps` |
| Edit step | Edit icon | PUT `/prompt-plans/:id/steps/:stepId` |
| Delete step | Delete icon | DELETE `/prompt-plans/:id/steps/:stepId` |
| Launch step | "Launch" button | POST `/prompt-plans/:id/steps/:stepId/launch` |
| Skip step | "Skip" button | POST `/prompt-plans/:id/steps/:stepId/skip` |
| Retry step | "Retry" button | POST `/prompt-plans/:id/steps/:stepId/retry` |
| Reorder steps | Up/down arrows | POST `/prompt-plans/:id/reorder` |

### From SDLCWizardPage

| Action | Trigger | Effect |
|--------|---------|--------|
| Create CS with items | New Work mode → final step | POST `/admin/change-sets` + link items |
| Advance CS | Advance mode → final step | POST `/admin/change-sets/:id/transition` |
| Fast forward CS | FF mode → final step | POST `/admin/change-sets/:id/fast-forward` |

---

## 7. UX Pain Points

### Navigation Fragmentation
- **Prompt Plans lives under `/devel-tools/`** while everything else is under `/admin/control-panel/om-daily/`. This splits the workflow across two unrelated nav sections.
- **No single entry point**: Users must know to go to OM Daily for items, then navigate separately to CS dashboard, then separately to Prompt Plans. The relationship between these three entities isn't self-evident.
- **Cross-page navigation is URL-query-param-based**: Clicking a work item link in Prompt Plans navigates to OMDailyPage with `?tab=1&search=%23{id}`. This is fragile and non-obvious.

### Conceptual Overload
- **Too many ways to create a Change Set**: From OMDailyPage bulk actions, from ChangeSetsDashboard, from SDLC Wizard "New Work" mode. Each has slightly different fields.
- **SDLC Wizard duplicates existing flows**: "Advance" mode does what the transition buttons on ChangeSetDetailPage already do. "Fast Forward" duplicates the fast-forward button. "New Work" is the only mode with unique value.
- **Horizon concept is confusing**: Items have a `horizon` (7/14/30/60/90 days) that doesn't map clearly to urgency. It coexists with `priority` and `due_date`, creating redundant urgency signals.

### Status Terminology
- **Item statuses** (backlog, todo, in_progress, review, done) use different vocabulary from **Change Set statuses** (draft, active, ready_for_staging, staged, in_review, approved, promoted). This makes the relationship unclear — when does an item's "done" status interact with a CS's "ready_for_staging"?
- **"ready_for_staging" vs "staged"**: The difference is that staging happens via CLI, not UI. This CLI/UI split is implicit and confusing.

### Information Hierarchy
- **OMDailyPage is 1900 lines** with 4 tabs, 3 dialogs, KPIs, filters, multi-select, and bulk actions all in one component. This monolith makes the page slow to understand and maintain.
- **Change Set readiness checks** on ChangeSetDetailPage are thorough but buried below the fold. The most actionable information (what to do next) requires scrolling.

### Missing Connections
- **No reverse navigation from CS → items back to OM Daily**: If you're on a Change Set detail page and want to see an item's full details, there's no link.
- **Prompt Plan steps don't show which CS they belong to** inline — you have to look at the plan header.
- **Changelog tab** is disconnected from items — commits are matched by substring, which is unreliable.

### Workflow Gaps
- **Branch lifecycle is partially automated**: `start-work` creates a branch, `complete-work` merges it, but there's no status sync between item branch work and CS branch tracking.
- **No bulk status transitions**: Can't transition multiple items at once (e.g., mark 5 items as "done").
- **GitHub sync is manual**: Must click "Sync" button; no automatic bi-directional sync.

---

## 8. Implementation Gaps

1. **No real-time updates**: All pages use fetch-on-load with manual refresh. No WebSocket or polling for active operations.
2. **Optimistic updates in Kanban**: Drag-drop updates status locally before server confirms. If server fails, state diverges.
3. **No undo for destructive actions**: Item deletion, CS item removal, and step deletion are immediate with no undo.
4. **Changelog matching is substring-based**: Commit messages are matched to items by 4+ character word overlap, which produces false positives.
5. **No pagination on OM Daily items**: All items are fetched at once. Will degrade as item count grows.
6. **SDLC Wizard step components are not reusable**: Each step is tightly coupled to the wizard's state management pattern.
7. **Change Set code auto-generation** always scans all existing codes to find max — no sequence table.

---

## 9. Sidebar/Menu Integration

From `MenuItems.ts`, the OM Daily system appears under:

```
Admin → Control Panel → OM Daily
  └── (tabs within page: Overview, Items, Board, Changelog)
  └── Change Sets (sub-route)
  └── SDLC Wizard (sub-route)

Devel Tools → Prompt Plans (separate nav section)
```

This split is the root cause of the navigation fragmentation noted above.

---

## 10. Recommended Simplification Direction

See `docs/om-daily/om-daily-simplified-workflow-plan.md` for the full redesign plan.

**Key themes:**
1. **Unify navigation** — bring Prompt Plans under the OM Daily umbrella
2. **Flatten the OMDailyPage monolith** — extract tabs into standalone sub-routes
3. **Remove SDLC Wizard redundancy** — keep only "New Work" mode; replace Advance/FF with direct actions on CS detail
4. **Clarify status vocabulary** — align item and CS terminology
5. **Surface "what to do next"** — make the dashboard action-oriented, not metric-oriented
6. **Simplify item model** — consider deprecating `horizon` in favor of `due_date` + `priority`
