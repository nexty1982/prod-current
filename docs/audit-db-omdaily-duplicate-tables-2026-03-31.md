# DB Audit: OM Daily Duplicate Tables Analysis

**Prompt ID:** PROMPT-DB-AUDIT-OMDAILY-DUPLICATE-TABLES-001
**Work Item ID:** OMD-697
**Change Set ID:** CS-DB-OMDAILY-CONSOLIDATION-001
**Branch:** `audit/db-omdaily-duplicate-tables-2026-03-31`
**Date:** 2026-03-31
**Scope:** Analysis only — no schema changes, no migrations, no code changes
**Server:** 192.168.1.241 (MariaDB)

---

## Executive Summary

**The system has a confirmed duplication problem.** The `om_daily_items` table — the canonical work-item entity for all OM Daily operations — exists in **two databases** with diverging data:

| Database | Table | Rows | Max ID | Last Updated | Status |
|----------|-------|------|--------|-------------|--------|
| `omai_db` | `om_daily_items` | 499 | 697 | 2026-03-31 (today) | **Active canonical** |
| `orthodoxmetrics_db` | `om_daily_items` | 454 | 648 | 2026-03-28 (stale) | **Stale copy** |

453 IDs overlap between the two tables. Of those, 11 have diverged statuses (the `omai_db` copy is more current). 46 items exist only in `omai_db` (created after migration). 1 item exists only in `orthodoxmetrics_db`.

The entire `om_daily_*` family (6 tables) is duplicated across both databases. The `omai_db` copies are canonical; the `orthodoxmetrics_db` copies are stale.

Additionally, the audit identified **4 legacy/abandoned task table families** in `orthodoxmetrics_db` that represent earlier iterations of a task management system, all of which are either empty or have negligible data and no active application code.

### Bottom Line

| Table Family | Canonical Location | Action |
|-------------|-------------------|--------|
| `om_daily_items` + 5 support tables | `omai_db` | **Retain in omai_db, deprecate orthodoxmetrics_db copies** |
| `omai_tasks` + `omai_task_events` | `orthodoxmetrics_db` | **Retain** (different business entity: background job tracker) |
| `change_sets` + 2 support tables | `orthodoxmetrics_db` | **Retain** (unique, not duplicated) |
| `work_sessions` + `work_session_events` | `orthodoxmetrics_db` | **Retain** (unique, not duplicated) |
| `prompt_plans` + `prompt_plan_steps` | `orthodoxmetrics_db` | **Retain** (unique, not duplicated) |
| `om_tasks` | `orthodoxmetrics_db` | **Deprecate** (0 rows, legacy) |
| `ai_tasks` + 5 satellite tables | `orthodoxmetrics_db` | **Deprecate** (0 rows, legacy) |
| `daily_work` + `daily_work_assignees` | `orthodoxmetrics_db` | **Deprecate** (2 rows from Feb 2026, superseded) |
| `kanban_tasks` + 8 satellite tables | `orthodoxmetrics_db` | **Retain** (separate system, different purpose) |
| `tickets` + `ticket_replies` | `orthodoxmetrics_db` | **Deprecate** (0 rows, no backend) |

---

## 1. Full Candidate Table Inventory by Schema

### omai_db (6 candidate tables)

| Table | Rows | Max ID | AUTO_INCREMENT | Last Updated | Role |
|-------|------|--------|----------------|-------------|------|
| `om_daily_items` | 499 | 697 | 698 | 2026-03-31 | **Canonical work-item entity** |
| `om_daily_artifacts` | 25 | 27 | 28 | 2026-03-26 | Support: artifact records |
| `om_daily_changelog` | 38 | 44 | 45 | n/a | Support: daily changelogs |
| `om_daily_item_events` | 27 | 29 | 30 | 2026-03-26 | Support: status/event history |
| `om_daily_item_attachments` | 0 | n/a | 1 | n/a | Support: file attachments |
| `om_daily_schedule_blocks` | 0 | n/a | 1 | n/a | Support: scheduling |

### orthodoxmetrics_db (30+ candidate tables)

#### OM Daily Family (DUPLICATED from omai_db)

| Table | Rows | Max ID | AUTO_INCREMENT | Last Updated | Role |
|-------|------|--------|----------------|-------------|------|
| `om_daily_items` | 454 | 648 | 649 | 2026-03-28 | **Stale copy** |
| `om_daily_artifacts` | 25 | 27 | 28 | n/a | Stale copy |
| `om_daily_changelog` | 38 | 44 | 45 | n/a | Stale copy |
| `om_daily_item_events` | 27 | 29 | 30 | n/a | Stale copy |
| `om_daily_item_attachments` | 0 | n/a | 1 | n/a | Stale copy |
| `om_daily_schedule_blocks` | 0 | n/a | 1 | n/a | Stale copy |

#### OMAI Tasks (Background Job Tracker — NOT a duplicate of OM Daily)

| Table | Rows | Max ID | Last Updated | Role |
|-------|------|--------|-------------|------|
| `omai_tasks` | 20 | 20 | 2026-03-31 | Background async job tracker |
| `omai_task_events` | 107 | 107 | 2026-03-31 | Job event log |

#### Legacy Task Systems (abandoned)

| Table | Rows | Max ID | Last Updated | Role |
|-------|------|--------|-------------|------|
| `om_tasks` | 0 | n/a | n/a | Legacy: admin knowledge-base items |
| `ai_tasks` | 0 | n/a | n/a | Legacy: AI agent task assignments |
| `task_activity_log` | 0 | n/a | n/a | Legacy satellite of ai_tasks |
| `task_files` | 0 | n/a | n/a | Legacy satellite of ai_tasks |
| `task_notifications` | 0 | n/a | n/a | Legacy satellite of ai_tasks |
| `task_reports` | 0 | n/a | n/a | Legacy satellite of ai_tasks |
| `task_categories` | 10 | 10 | n/a | Legacy lookup (used by daily_work FK) |
| `task_types` | 5 | 5 | n/a | Legacy lookup (used by daily_work FK) |
| `task_assignment_logs` | 32 | 32 | n/a | Legacy audit log for task_links |
| `daily_work` | 2 | 15 | n/a | Legacy: earliest daily task prototype |
| `daily_work_assignees` | 0 | n/a | n/a | Legacy satellite of daily_work |
| `tickets` | 0 | n/a | n/a | Legacy: support tickets (never used) |
| `ticket_replies` | 0 | n/a | n/a | Legacy satellite of tickets |

#### Separate Systems (NOT duplicates)

| Table | Rows | Last Updated | Role |
|-------|------|-------------|------|
| `change_sets` | 14 | n/a | Release management entity |
| `change_set_items` | 223 | n/a | Links om_daily_items to change_sets |
| `change_set_events` | 239 | n/a | Change set audit trail |
| `work_sessions` | 2 | 2026-03-31 | Developer work session tracking |
| `work_session_events` | 4 | 2026-03-31 | Work session event log |
| `prompt_plans` | 2 | n/a | Agent prompt sequencing |
| `prompt_plan_steps` | 6 | 2026-03-27 | Prompt plan step definitions |
| `kanban_boards` | 2 | n/a | Kanban board system (separate from OM Daily) |
| `kanban_tasks` | 0 | n/a | Kanban task cards |
| `om_milestones` | 0 | n/a | Release milestone metadata |

### Other Databases

| Database | Task Tables Found |
|----------|------------------|
| `om_church_*` (70 tenant DBs) | None |
| `church_template` | None |
| `record_template1` | None |
| `orthodoxmetrics_ocr_db` | `ocr_queue` (OCR-specific, not a task duplicate) |
| `om_logging_db` | None |

---

## 2. Per-Table Analysis

### 2.1 om_daily_items (THE CRITICAL DUPLICATE)

#### omai_db.om_daily_items — CANONICAL

- **Auto-increment:** 698
- **Schema version:** Evolved (task_type ENUM: feature/enhancement/bugfix/refactor/migration/chore/spike/docs; branch_type uses same ENUM)
- **Active writes:** Yes (last insert 2026-03-31 20:32:02)
- **Code references:** OMAI `om-daily.js` (full CRUD via `getOmaiPool()`), OMAI `tasks.js`, OMAI `briefing.js`
- **FK children in omai_db:** om_daily_artifacts, om_daily_changelog, om_daily_item_events, om_daily_item_attachments, om_daily_schedule_blocks

#### orthodoxmetrics_db.om_daily_items — STALE COPY

- **Auto-increment:** 649
- **Schema version:** Older (task_type ENUM: task/note/followup/feature/bugfix/improvement/research; branch_type: bugfix/new_feature/existing_feature/patch)
- **Active writes:** No (last update 2026-03-28 19:50:20 — 3 days stale)
- **Code references:** OM `om-daily.js` route (mounted but migrated to OMAI), `conversation-log.js`, `prompt-plans.js`, `changeSetService.js`, `api/omai.js`
- **FK parents:** `change_set_items.om_daily_item_id` references this table
- **FK children:** All 5 satellite tables in orthodoxmetrics_db

**Key divergences between the two copies:**
- 453 overlapping IDs, 11 with different statuses (omai_db is more recent)
- 2 titles differ (likely updated in omai_db after the copy stopped syncing)
- 46 IDs exist only in omai_db (created after March 27 migration)
- 1 ID exists only in orthodoxmetrics_db
- ENUM values are incompatible (different task_type and branch_type options)

**Confidence: HIGH** — This is a confirmed unhealthy duplication caused by an incomplete migration from orthodoxmetrics_db to omai_db.

### 2.2 om_daily_artifacts / om_daily_changelog / om_daily_item_events / om_daily_item_attachments / om_daily_schedule_blocks

All 5 support tables are duplicated identically across both databases with matching row counts and max IDs. They are FK-linked to `om_daily_items` in their respective databases.

- **omai_db copies:** Canonical (FK constraints reference omai_db.om_daily_items)
- **orthodoxmetrics_db copies:** Stale (FK constraints reference orthodoxmetrics_db.om_daily_items)

**Confidence: HIGH**

### 2.3 omai_tasks (orthodoxmetrics_db) — NOT A DUPLICATE

This is a **fundamentally different entity** from om_daily_items:

| Aspect | om_daily_items | omai_tasks |
|--------|---------------|------------|
| Purpose | Developer work-item tracking (SDLC) | Background async job execution |
| Status values | draft/backlog/triaged/.../done/cancelled | queued/running/succeeded/failed/cancelled |
| Key fields | title, description, horizon, priority, branch, assigned_agent | task_type, source_feature, total_count, completed_count, heartbeat |
| Data shape | SDLC lifecycle items | Batch processing jobs (enrichment, backup, verification) |
| Row examples | "Add OCR quick-start guide" | "Remediate backup failure" |

**Classification:** Legitimate separate entity — background job tracker.
**Confidence: HIGH**

### 2.4 om_tasks (orthodoxmetrics_db) — LEGACY

- 0 rows, auto-increment 9 (had up to 8 rows at some point, all deleted)
- Schema is a knowledge-base/documentation model, not a task tracker (type enum: documentation/configuration/reference/guide)
- Only referenced by `server/src/api/omai.js` (full CRUD)
- Has a frontend page at `front-end/src/features/devel-tools/om-tasks/`

**Classification:** Legacy abandoned feature. Different business concept from om_daily_items.
**Confidence: HIGH**

### 2.5 ai_tasks (orthodoxmetrics_db) — LEGACY

- 0 rows, varchar primary key (not auto-increment)
- AI agent task assignment system with agent ENUM: Ninja/Claude/Cursor/OM-AI/Junie/GitHub Copilot
- Referenced by `server/src/api/calendar.js` (full CRUD)
- Has 5 FK-dependent satellite tables (all 0 rows): task_activity_log, task_files, task_notifications, task_reports
- Plus `chatgpt_sessions` and `ai_agents.current_task_id` FK references

**Classification:** Legacy abandoned feature. Superseded by om_daily_items' agent_tool/assigned_agent fields.
**Confidence: HIGH**

### 2.6 daily_work (orthodoxmetrics_db) — LEGACY

- 2 rows (from February 13, 2026 — pre-dates om_daily_items)
- Generic task model with FK to `task_categories` and `task_types` lookup tables
- Referenced by `server/src/api/dailyTasks.js` (full CRUD)
- Has 1 FK-dependent satellite: `daily_work_assignees` (0 rows)

**Classification:** Legacy prototype. The earliest version of daily task tracking, superseded by om_daily_items.
**Confidence: HIGH**

### 2.7 kanban_tasks (orthodoxmetrics_db) — SEPARATE SYSTEM

- 0 active rows (but board structures exist: 2 boards, 8 columns)
- Full kanban board system with boards/columns/tasks/labels/comments/attachments/activity
- Church-scoped (has church_id FK) — designed for multi-tenant use
- Extensive code: `server/src/models/kanbanTask.js`, `server/src/routes/kanban/`, `server/src/api/calendar.js`
- Active UI at `/apps/kanban`

**Classification:** Separate system. Not a task management duplicate — it's a kanban board feature for church users.
**Confidence: HIGH**

### 2.8 change_sets / change_set_items / change_set_events — LEGITIMATE SUPPORT

- `change_sets`: Release management entity (14 rows, active)
- `change_set_items`: Links om_daily_items to change_sets (223 rows)
- `change_set_events`: Audit trail (239 rows)
- FK: `change_set_items.om_daily_item_id` → `orthodoxmetrics_db.om_daily_items`
- Only exists in orthodoxmetrics_db (NOT duplicated to omai_db)

**Classification:** Legitimate support entity. Groups work items into releasable change sets.
**Critical issue:** FK points to the STALE copy of om_daily_items in orthodoxmetrics_db, not the canonical copy in omai_db.
**Confidence: HIGH**

### 2.9 work_sessions / work_session_events — LEGITIMATE SEPARATE

- `work_sessions`: Developer session tracking (2 rows)
- `work_session_events`: Session event log (4 rows)
- New feature (created 2026-03-31)
- Route file exists (`server/src/routes/work-sessions.js`) but is UNMOUNTED in index.ts

**Classification:** New feature, not a duplicate. Tracks when developers are working, not what they're working on.
**Confidence: HIGH**

### 2.10 prompt_plans / prompt_plan_steps — LEGITIMATE SEPARATE

- `prompt_plans`: Agent prompt sequencing (2 rows)
- `prompt_plan_steps`: Step definitions within plans (6 rows)
- Referenced by `server/src/routes/prompt-plans.js` (active)
- FK: `prompt_plan_steps.generated_work_item_id` → om_daily_items (weak FK, no constraint)

**Classification:** Legitimate separate entity. Orchestrates multi-step agent work by generating om_daily_items.
**Confidence: HIGH**

### 2.11 task_links / task_submissions / task_assignment_logs — LEGACY SUPPORT

- `task_links`: External task assignment links (email-based)
- `task_submissions`: Submitted tasks from external users
- `task_assignment_logs`: Audit trail for task link operations
- Referenced by `server/src/api/omai.js` and `/var/www/omai/_runtime/server/src/api/omai.js`

**Classification:** Semi-active task assignment feature. Not related to OM Daily. These are for external task submission workflows (email a link, user submits tasks).
**Confidence: MEDIUM** — actively coded but unclear if used in production.

### 2.12 tickets / ticket_replies — ABANDONED

- Both tables: 0 rows
- No active backend code queries the `tickets` table
- Frontend at `/apps/tickets` is a template/demo stub

**Classification:** Abandoned/template.
**Confidence: HIGH**

---

## 3. Code Usage Map

### Active Code → Table Mapping

| Code File | Database | Tables Used | Direction |
|-----------|----------|-------------|-----------|
| **OMAI** `api-ops/om-daily.js` | omai_db | om_daily_items, om_daily_changelog, om_daily_item_attachments | R+W |
| **OMAI** `omai-routes/tasks.js` | omai_db | om_daily_items | R+W |
| **OMAI** `omai-routes/briefing.js` | omai_db | om_daily_items | R |
| **OMAI** `api-ops/platform-badges.js` | orthodoxmetrics_db | omai_tasks | R |
| **OMAI** `services/changeSetService.js` | orthodoxmetrics_db | change_sets, change_set_items, change_set_events, om_daily_items | R+W |
| **OM** `routes/om-daily.js` | orthodoxmetrics_db | om_daily_items, om_daily_changelog, om_daily_item_attachments, om_daily_item_events | R+W (MIGRATED) |
| **OM** `routes/conversation-log.js` | orthodoxmetrics_db | om_daily_items | R+W |
| **OM** `routes/prompt-plans.js` | orthodoxmetrics_db | prompt_plans, prompt_plan_steps, om_daily_items, change_sets | R+W |
| **OM** `services/changeSetService.js` | orthodoxmetrics_db | change_sets, change_set_items, change_set_events, om_daily_items | R+W |
| **OM** `services/repoService.js` | orthodoxmetrics_db | om_daily_artifacts, om_daily_item_events | W |
| **OM** `api/omai.js` | orthodoxmetrics_db | om_tasks, task_links, task_submissions, task_assignment_logs | R+W |
| **OM** `api/calendar.js` | orthodoxmetrics_db | ai_tasks, kanban_tasks | R+W |
| **OM** `api/dailyTasks.js` | orthodoxmetrics_db | daily_work | R+W |
| **OM** `routes/kanban/*.js` | orthodoxmetrics_db | kanban_boards, kanban_columns, kanban_tasks, kanban_task_* | R+W |
| **OM** `routes/work-sessions.js` | orthodoxmetrics_db | work_sessions, work_session_events | R+W (UNMOUNTED) |

### Tables with ZERO active code references

| Table | Database | Evidence |
|-------|----------|----------|
| `om_daily_schedule_blocks` | Both | No application code |
| `omai_task_events` | orthodoxmetrics_db | FK exists, no application queries |
| `daily_work_assignees` | orthodoxmetrics_db | No application code |
| `work_session_events` | orthodoxmetrics_db | No application code |
| `task_categories` | orthodoxmetrics_db | Only FK target from daily_work |
| `task_types` | orthodoxmetrics_db | Only FK target from daily_work |
| `task_activity_log` | orthodoxmetrics_db | No application code |
| `task_files` | orthodoxmetrics_db | No application code |
| `task_notifications` | orthodoxmetrics_db | No application code |
| `task_reports` | orthodoxmetrics_db | No application code |
| `ticket_replies` | orthodoxmetrics_db | No application code |

---

## 4. UI → API → DB Mapping

### OM Daily (Primary Work Item System)

```
OMAI UI (port 7060)
  /control-panel/ops/om-daily
    ├── Overview Tab → GET /api/om-daily/dashboard/extended → omai_db.om_daily_items
    ├── Items Tab   → CRUD /api/om-daily/items           → omai_db.om_daily_items
    ├── Boards Tab  → GET/PUT /api/om-daily/items         → omai_db.om_daily_items
    ├── Changelog   → GET/POST /api/om-daily/changelog    → omai_db.om_daily_changelog
    └── Timeline    → GET /api/om-daily/items              → omai_db.om_daily_items

OM Prod UI (port 3001)
  /admin/control-panel/om-daily
    ├── Dashboard   → GET /api/om-daily/dashboard          → (MIGRATED TO OMAI)
    ├── Items       → CRUD /api/om-daily/items             → (MIGRATED TO OMAI)
    ├── Board       → GET/PUT /api/om-daily/items          → (MIGRATED TO OMAI)
    └── Changelog   → GET/POST /api/om-daily/changelog     → (MIGRATED TO OMAI)
```

### Change Sets

```
OMAI UI (port 7060)
  /control-panel/devops/changesets
    └── CRUD /api/admin/change-sets → (proxied to port 3001) → orthodoxmetrics_db.change_sets
                                                                orthodoxmetrics_db.change_set_items
                                                                orthodoxmetrics_db.change_set_events
```

### Kanban (Separate System)

```
OM Prod UI (port 3001)
  /apps/kanban
    └── CRUD /api/kanban/* → orthodoxmetrics_db.kanban_boards
                              orthodoxmetrics_db.kanban_columns
                              orthodoxmetrics_db.kanban_tasks
```

---

## 5. Duplicate/Conflict Matrix

| Entity | omai_db | orthodoxmetrics_db | Verdict |
|--------|---------|-------------------|---------|
| **om_daily_items** | 499 rows, ACTIVE | 454 rows, STALE | **UNHEALTHY DUPLICATE** |
| **om_daily_artifacts** | 25 rows | 25 rows | **UNHEALTHY DUPLICATE** |
| **om_daily_changelog** | 38 rows | 38 rows | **UNHEALTHY DUPLICATE** |
| **om_daily_item_events** | 27 rows | 27 rows | **UNHEALTHY DUPLICATE** |
| **om_daily_item_attachments** | 0 rows | 0 rows | **UNHEALTHY DUPLICATE** |
| **om_daily_schedule_blocks** | 0 rows | 0 rows | **UNHEALTHY DUPLICATE** |
| omai_tasks | — | 20 rows | Different entity (OK) |
| change_sets | — | 14 rows | Unique (OK) |
| work_sessions | — | 2 rows | Unique (OK) |
| prompt_plans | — | 2 rows | Unique (OK) |
| om_tasks | — | 0 rows | Legacy (deprecate) |
| ai_tasks | — | 0 rows | Legacy (deprecate) |
| daily_work | — | 2 rows | Legacy (deprecate) |
| kanban_tasks | — | 0 rows | Separate system (OK) |
| tickets | — | 0 rows | Abandoned (deprecate) |

---

## 6. Canonical Model Recommendation

### The Canonical Source of Truth

**`omai_db.om_daily_items`** is the canonical work-item table.

Evidence:
1. It has the most recent data (updated today, 2026-03-31)
2. It has the most rows (499 vs 454)
3. It has the highest auto-increment (698 vs 649)
4. It has the evolved schema (modern ENUM values matching CLAUDE.md specification)
5. All new OMAI routes (`om-daily.js`, `tasks.js`, `briefing.js`) write to it
6. Agent work item creation (via API) writes to it

### Tables to Retain Unchanged

| Table | Database | Reason |
|-------|----------|--------|
| `omai_db.om_daily_items` | omai_db | Canonical work-item entity |
| `omai_db.om_daily_artifacts` | omai_db | Canonical support table |
| `omai_db.om_daily_changelog` | omai_db | Canonical support table |
| `omai_db.om_daily_item_events` | omai_db | Canonical support table |
| `omai_db.om_daily_item_attachments` | omai_db | Canonical support table |
| `omai_db.om_daily_schedule_blocks` | omai_db | Canonical support table |
| `orthodoxmetrics_db.omai_tasks` | orthodoxmetrics_db | Different entity (background jobs) |
| `orthodoxmetrics_db.omai_task_events` | orthodoxmetrics_db | Background job event log |
| `orthodoxmetrics_db.change_sets` | orthodoxmetrics_db | Release management |
| `orthodoxmetrics_db.change_set_items` | orthodoxmetrics_db | Release management (needs FK update) |
| `orthodoxmetrics_db.change_set_events` | orthodoxmetrics_db | Release management |
| `orthodoxmetrics_db.work_sessions` | orthodoxmetrics_db | Developer session tracking |
| `orthodoxmetrics_db.work_session_events` | orthodoxmetrics_db | Session event log |
| `orthodoxmetrics_db.prompt_plans` | orthodoxmetrics_db | Agent prompt orchestration |
| `orthodoxmetrics_db.prompt_plan_steps` | orthodoxmetrics_db | Prompt step definitions |
| `orthodoxmetrics_db.kanban_*` (all 9 tables) | orthodoxmetrics_db | Separate kanban system |
| `orthodoxmetrics_db.om_milestones` | orthodoxmetrics_db | Release milestones |
| `orthodoxmetrics_db.task_links` | orthodoxmetrics_db | External task assignment |
| `orthodoxmetrics_db.task_submissions` | orthodoxmetrics_db | External task submission |
| `orthodoxmetrics_db.task_assignment_logs` | orthodoxmetrics_db | Task link audit trail |

### Tables to Deprecate

| Table | Database | Rows | Reason |
|-------|----------|------|--------|
| `orthodoxmetrics_db.om_daily_items` | orthodoxmetrics_db | 454 | Stale copy of omai_db canonical |
| `orthodoxmetrics_db.om_daily_artifacts` | orthodoxmetrics_db | 25 | Stale copy |
| `orthodoxmetrics_db.om_daily_changelog` | orthodoxmetrics_db | 38 | Stale copy |
| `orthodoxmetrics_db.om_daily_item_events` | orthodoxmetrics_db | 27 | Stale copy |
| `orthodoxmetrics_db.om_daily_item_attachments` | orthodoxmetrics_db | 0 | Stale copy |
| `orthodoxmetrics_db.om_daily_schedule_blocks` | orthodoxmetrics_db | 0 | Stale copy |
| `orthodoxmetrics_db.om_tasks` | orthodoxmetrics_db | 0 | Legacy, different concept |
| `orthodoxmetrics_db.ai_tasks` | orthodoxmetrics_db | 0 | Legacy, superseded |
| `orthodoxmetrics_db.task_activity_log` | orthodoxmetrics_db | 0 | Legacy satellite of ai_tasks |
| `orthodoxmetrics_db.task_files` | orthodoxmetrics_db | 0 | Legacy satellite of ai_tasks |
| `orthodoxmetrics_db.task_notifications` | orthodoxmetrics_db | 0 | Legacy satellite of ai_tasks |
| `orthodoxmetrics_db.task_reports` | orthodoxmetrics_db | 0 | Legacy satellite of ai_tasks |
| `orthodoxmetrics_db.daily_work` | orthodoxmetrics_db | 2 | Legacy prototype |
| `orthodoxmetrics_db.daily_work_assignees` | orthodoxmetrics_db | 0 | Legacy satellite |
| `orthodoxmetrics_db.task_categories` | orthodoxmetrics_db | 10 | Legacy lookup (FK target for daily_work) |
| `orthodoxmetrics_db.task_types` | orthodoxmetrics_db | 5 | Legacy lookup (FK target for daily_work) |
| `orthodoxmetrics_db.tickets` | orthodoxmetrics_db | 0 | Abandoned |
| `orthodoxmetrics_db.ticket_replies` | orthodoxmetrics_db | 0 | Abandoned |

---

## 7. Discovered Bugs and Issues

### BUG-1: OMAI om-daily.js queries change_sets from wrong database (Severity: Medium)

**Location:** `/var/www/omai/_runtime/server/src/api-ops/om-daily.js` lines 961-968, 1125, 1823-1838
**Problem:** Uses `getOmaiPool()` (connects to `omai_db`) to query `change_sets`, which only exists in `orthodoxmetrics_db`.
**Impact:** The `/dashboard/extended` endpoint's change set sections silently fail or return empty results.
**Fix:** Switch these queries to `getOmAuthPool()` or move `change_sets` to `omai_db`.

### BUG-2: change_set_items FK points to stale om_daily_items copy (Severity: High)

**Location:** `orthodoxmetrics_db.change_set_items.om_daily_item_id` → `orthodoxmetrics_db.om_daily_items.id`
**Problem:** All change_set_items reference the STALE copy of om_daily_items. Currently, all existing IDs (up to 648) exist in both tables, so the FK doesn't break. But any new om_daily_items (id > 648) cannot be linked to change_sets without updating this FK.
**Impact:** New work items created in omai_db.om_daily_items cannot be added to change sets.
**Fix:** Must resolve during consolidation — either move change_sets to omai_db or use cross-database references.

### BUG-3: OM backend still has stale om-daily route code (Severity: Low)

**Location:** `server/src/routes/om-daily.js` (OM prod)
**Problem:** The route was migrated to OMAI but the code still exists in the OM codebase. It's commented out in index.ts but the file remains.
**Impact:** No immediate impact (route is unmounted), but creates confusion about which codebase is authoritative.

### BUG-4: work-sessions.js is untracked and unmounted (Severity: Low)

**Location:** `server/src/routes/work-sessions.js`
**Problem:** File exists but is not mounted in `server/src/index.ts` and not tracked in git.
**Impact:** Work session API endpoints are non-functional.

---

## 8. Future Implementation Plan

### Risk Level: MEDIUM

The core duplication (om_daily_items across two DBs) is well-understood and the data gap is small (45 items). However, the FK dependency from `change_set_items` creates a hard coupling that must be resolved carefully.

### Recommended Order of Operations

#### Step 1: Fix BUG-1 (OMAI change_sets queries) — Low risk, immediate
- Update OMAI `om-daily.js` to use `getOmAuthPool()` for change_sets queries
- Test `/dashboard/extended` endpoint

#### Step 2: Redirect OM backend code to omai_db — Medium risk
- Update `server/src/routes/conversation-log.js` to use omai_db pool for om_daily_items writes
- Update `server/src/services/repoService.js` to use omai_db pool for artifacts/events writes
- Update `server/src/routes/prompt-plans.js` om_daily_items references
- Test all modified endpoints

#### Step 3: Resolve change_set_items FK — High risk, requires careful migration
**Option A (Recommended):** Move `change_sets` family to `omai_db`
- Migrate change_sets, change_set_items, change_set_events to omai_db
- Update changeSetService.js to use getOmaiPool()
- Update change_set_items FK to reference omai_db.om_daily_items
- Update all OMAI and OM code referencing change_sets

**Option B:** Cross-database FK (not supported in MariaDB)
- Would require removing FK constraint and enforcing referential integrity in application code

**Option C:** Keep change_sets in orthodoxmetrics_db, maintain a sync view
- Overly complex, not recommended

#### Step 4: Rename stale orthodoxmetrics_db tables — Low risk
- Rename orthodoxmetrics_db.om_daily_items → om_daily_items_deprecated_20260331
- Same for all 5 satellite tables
- Keep for 90 days as safety net, then DROP

#### Step 5: Drop legacy tables — Low risk (after 30-day observation)
- DROP orthodoxmetrics_db tables: om_tasks, ai_tasks, task_activity_log, task_files, task_notifications, task_reports, daily_work, daily_work_assignees, task_categories, task_types, tickets, ticket_replies
- Remove corresponding route files: api/omai.js (om_tasks section), api/calendar.js (ai_tasks section), api/dailyTasks.js

#### Step 6: Clean up OM Daily frontend duplication — Low risk
- Determine whether OM prod UI pages at `/admin/control-panel/om-daily/*` should be removed (since OMAI has the canonical UI)
- Remove or redirect as appropriate

### Recommended Next Prompt

```
Prompt ID: PROMPT-DB-CONSOLIDATE-OMDAILY-STEP1-002
Goal: Fix BUG-1 (OMAI om-daily.js change_sets queries use wrong pool) and redirect all OM backend om_daily_items writes to omai_db.
Scope: Code changes only (Steps 1-2 from the consolidation plan).
Depends On: PROMPT-DB-AUDIT-OMDAILY-DUPLICATE-TABLES-001 (this audit)
```

---

## Appendix: Schema Differences Between the Two om_daily_items Tables

| Column | omai_db | orthodoxmetrics_db | Status |
|--------|---------|-------------------|--------|
| `task_type` ENUM | feature, enhancement, bugfix, refactor, migration, chore, spike, docs | task, note, followup, feature, bugfix, improvement, research | **DIVERGED** |
| `branch_type` ENUM | feature, enhancement, bugfix, refactor, migration, chore, spike, docs | bugfix, new_feature, existing_feature, patch | **DIVERGED** |
| `tags` column | longtext (no CHECK) | longtext with CHECK (json_valid) | Minor |
| `metadata` column | longtext (no CHECK) | longtext with CHECK (json_valid) | Minor |
| `payload` in artifacts | longtext (no CHECK) | longtext with CHECK (json_valid) | Minor |
| `milestone_id` FK | No FK constraint | FK to om_milestones | Minor |

The omai_db schema is the evolved/correct version matching CLAUDE.md specifications.
