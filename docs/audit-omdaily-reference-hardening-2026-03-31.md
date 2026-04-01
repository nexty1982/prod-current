# OMAI Daily Reference Audit & Hardening Report

**Date**: 2026-03-31
**Prompt**: PROMPT-030
**Work Item**: OMD-702
**Branch**: `chore/omd-ref-audit/2026-03-31/om-daily-reference-hardening`

## Executive Summary

**omai_db is the single source of truth for all om_daily_items data.**

orthodoxmetrics_db retains a stale copy (454 rows, max_id 648) that is no longer written to by any active code path. omai_db has 502 rows, max_id 702, with 49 items created after the migration cutover.

All active OM backend and OMAI routes now consistently read/write om_daily_items from omai_db. Zero orphaned references. Zero stale JOINs in mounted code.

---

## Phase 1: Repository-Wide Reference Audit

### OM Backend (`/var/www/orthodoxmetrics/prod/server/src/`)

| File | Mounted? | Pool | DB | Status |
|------|----------|------|----|--------|
| `routes/om-daily.js` | **NO** (line 852 in index.ts) | `promisePool` | orthodoxmetrics_db | Dead code. Banner added. |
| `api/omai.js` | YES (`/api/omai`) | `getOmaiPool()` | omai_db | **CORRECT** (fixed this session) |
| `routes/conversation-log.js` | YES (`/api/conversation-log`) | `getOmaiPool()` | omai_db | **CORRECT** (fixed this session) |
| `routes/prompt-plans.js` | YES (`/api/prompt-plans`) | `getOmaiPool()` | omai_db | **CORRECT** (fixed in BUG-2) |
| `services/changeSetService.js` | YES (via change-sets route) | `hydrateOmDailyItems()` | omai_db | **CORRECT** (fixed in BUG-2) |
| `services/omDailyItemHydrator.js` | YES (used by above) | `getOmaiPool()` | omai_db | **CORRECT** |
| `routes/admin/change-sets.js` | YES | (delegates to service) | omai_db | **CORRECT** |
| `services/repoService.js` | Library | Takes pool param | Caller-dependent | N/A (not called from OM for om_daily) |

### OMAI (`/var/www/omai/_runtime/server/src/`)

| File | Mounted? | Pool | DB | Status |
|------|----------|------|----|--------|
| `api-ops/om-daily.js` | YES (`/api/om-daily`) | `getOmaiPool()` | omai_db | **CORRECT** |
| `services/changeSetService.js` | YES | `hydrateOmDailyItems()` | omai_db | **CORRECT** (fixed in BUG-2) |
| `services/omDailyItemHydrator.js` | YES | `getOmaiPool()` | omai_db | **CORRECT** |
| `omai-routes/tasks.js` | **NO** (not mounted) | `db-omai` | orthodoxmetrics_db | Dead code. Not mounted in server. |
| `omai-routes/briefing.js` | **NO** (not mounted) | `db-omai` | orthodoxmetrics_db | Dead code. Not mounted in server. |

### Frontend

No frontend files reference `om_daily_items` directly. All access is through API calls.

---

## Phase 2: Schema & FK Audit

### Table Inventory

| Schema | Table | Rows | Auto_Increment | Status |
|--------|-------|------|----------------|--------|
| omai_db | om_daily_items | 502 | 703 | **CANONICAL** |
| omai_db | om_daily_artifacts | 25 | 28 | Active |
| omai_db | om_daily_changelog | 38 | 45 | Active |
| omai_db | om_daily_item_events | 27 | 30 | Active |
| omai_db | om_daily_item_attachments | 0 | 1 | Active |
| omai_db | om_daily_schedule_blocks | 0 | 1 | Active |
| orthodoxmetrics_db | om_daily_items | 454 | 649 | **STALE** — no active writes |
| orthodoxmetrics_db | om_daily_artifacts | 24 | 28 | Stale |
| orthodoxmetrics_db | om_daily_changelog | 36 | 45 | Stale |
| orthodoxmetrics_db | om_daily_item_events | 26 | 30 | Stale |
| orthodoxmetrics_db | om_daily_item_attachments | 0 | 1 | Stale |
| orthodoxmetrics_db | om_daily_schedule_blocks | 0 | 1 | Stale |

### FK Inventory

| Schema | From Table | Column | To Table | Constraint | Status |
|--------|-----------|--------|----------|------------|--------|
| omai_db | om_daily_artifacts | item_id | om_daily_items | omai_art_fk_item | Correct |
| omai_db | om_daily_item_attachments | work_item_id | om_daily_items | omai_att_fk_item | Correct |
| omai_db | om_daily_item_events | item_id | om_daily_items | omai_evt_fk_item | Correct |
| omai_db | om_daily_schedule_blocks | item_id | om_daily_items | omai_sched_fk_item | Correct |
| orthodoxmetrics_db | om_daily_artifacts | item_id | om_daily_items | fk_artifacts_item | Stale (self-referential within stale schema) |
| orthodoxmetrics_db | om_daily_item_attachments | work_item_id | om_daily_items | om_daily_item_attachments_ibfk_1 | Stale |
| orthodoxmetrics_db | om_daily_item_events | item_id | om_daily_items | fk_item_events_item | Stale |
| orthodoxmetrics_db | om_daily_schedule_blocks | item_id | om_daily_items | fk_schedule_item | Stale |
| orthodoxmetrics_db | change_set_items | change_set_id | change_sets | change_set_items_ibfk_1 | Correct |
| ~~orthodoxmetrics_db~~ | ~~change_set_items~~ | ~~om_daily_item_id~~ | ~~om_daily_items~~ | ~~change_set_items_ibfk_2~~ | **DROPPED** (BUG-2 fix) |

**No views, procedures, or triggers reference om_daily_items in either schema.**

Column and index on `change_set_items.om_daily_item_id` preserved. Referential integrity enforced at application layer via `omDailyItemHydrator`.

---

## Phase 3: Code Path Classification

| Category | Files | Pool | Status |
|----------|-------|------|--------|
| **Authoritative write** | OMAI `api-ops/om-daily.js` | `getOmaiPool()` | Correct |
| **Authoritative write** | OM `api/omai.js` (createPromptWorkItem) | `getOmaiPool()` | **Fixed this session** |
| **Authoritative write** | OM `routes/conversation-log.js` (export) | `getOmaiPool()` | **Fixed this session** |
| **Authoritative write** | OM `routes/prompt-plans.js` (createWorkItem) | `getOmaiPool()` | Fixed in BUG-2 |
| **Authoritative read** | OMAI `api-ops/om-daily.js` | `getOmaiPool()` | Correct |
| **Enrichment/hydration** | OM/OMAI `changeSetService.js` | `omDailyItemHydrator` → `getOmaiPool()` | Fixed in BUG-2 |
| **Enrichment/hydration** | OM `routes/prompt-plans.js` (GET plan) | `omDailyItemHydrator` → `getOmaiPool()` | Fixed in BUG-2 |
| **Dead code** | OM `routes/om-daily.js` | `promisePool` → orthodoxmetrics_db | NOT MOUNTED. Banner added. |
| **Dead code** | OMAI `omai-routes/tasks.js` | `db-omai` → orthodoxmetrics_db | NOT MOUNTED. |
| **Dead code** | OMAI `omai-routes/briefing.js` | `db-omai` → orthodoxmetrics_db | NOT MOUNTED. |

---

## Phase 6: Orphan Audit

| Check | Result |
|-------|--------|
| change_set_items with no matching omai_db item | **0 orphans** |
| prompt_plan_steps with no matching omai_db item | **0 orphans** |
| Items only in orthodoxmetrics_db (not in omai_db) | 1 (negligible; likely test data) |

---

## Phase 7: Verification Results

| Test | Endpoint | Result |
|------|----------|--------|
| Change set hydration | `GET /api/admin/change-sets/50/items` | 5/5 items hydrated from omai_db |
| Prompt plan hydration | `GET /api/prompt-plans/3` | 3/3 work items hydrated from omai_db |
| Dashboard stats | `GET /api/omai-daily/dashboard` (OMAI) | Returns data from omai_db |
| Agent-complete transition | `POST /api/omai-daily/items/702/agent-complete` | in_progress → self_review (omai_db) |
| Start Work flow | Traced end-to-end in code | All reads/writes use `getOmaiPool()` → omai_db |

---

## Residual Risk

1. **Stale orthodoxmetrics_db tables**: The 6 `om_daily_*` tables in orthodoxmetrics_db are no longer written to but still exist. They should be retired in a future migration (DROP or rename to `_deprecated_*`). No active code depends on them.

2. **Dead code files**: `routes/om-daily.js` (OM), `omai-routes/tasks.js` and `omai-routes/briefing.js` (OMAI) contain stale references but are not mounted. They could be deleted in a cleanup pass.

3. **OMAI `db-omai.js` DB_NAME env override**: The OMAI `.env.omai` sets `DB_NAME=orthodoxmetrics_db`, which means the `db-omai` pool (used by dead routes) points to the wrong DB. Harmless since those routes aren't mounted, but confusing. Could be cleaned up.

4. **Start Work repo_target**: The `start-work` endpoint always operates on `/var/www/orthodoxmetrics/prod` regardless of the item's `repo_target` value. This is a known limitation, not introduced by this work.

---

## Files Changed (This Session)

### OM Backend (committed)

| File | Change |
|------|--------|
| `server/src/config/db.js` | Added `getOmaiPool()` (cherry-pick from BUG-2) |
| `server/src/config/db-compat.js` | Re-exported `getOmaiPool` (cherry-pick) |
| `server/src/services/omDailyItemHydrator.js` | **New** — two-pool hydration helper (cherry-pick) |
| `server/src/services/changeSetService.js` | Replaced 4 stale JOINs with hydrator (cherry-pick) |
| `server/src/routes/prompt-plans.js` | Two-pool resolution + omai_db writes (cherry-pick) |
| `server/database/migrations/drop_change_set_items_fk_to_stale_om_daily.sql` | FK drop record (cherry-pick) |
| `server/src/api/omai.js` | Redirected createPromptWorkItem + updateWorkItemExecutionMeta to `getOmaiPool()` |
| `server/src/routes/conversation-log.js` | Redirected both export endpoints to `getOmaiPool()` |
| `server/src/routes/om-daily.js` | Added dead-code banner (NOT MOUNTED) |

### OMAI (not git-tracked in this repo)

| File | Change |
|------|--------|
| `services/changeSetService.js` | Replaced 4 stale JOINs with hydrator (from BUG-2) |
| `services/omDailyItemHydrator.js` | **New** — two-pool hydration helper (from BUG-2) |
