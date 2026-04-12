# OM ↔ OMAI Boundary Contract

> **Status**: Draft v1 — 2026-04-12
> **Owner**: Platform architecture
> **Supersedes**: Informal "move it to OMAI" decisions scattered across PP-0003, CS-0050, etc.
> **Related**: [god-component-refactor-plan.md](./god-component-refactor-plan.md), [om-architecture-audit-plan.md](./om-architecture-audit-plan.md)

This document defines the separation between **OrthodoxMetrics (OM)** and **OMAI** — what belongs where, why, and how they talk to each other. It exists so that every future "where does this feature live?" question has a one-sentence answer instead of a debate.

---

## The One-Sentence Rule

> **OM is the church-facing records frontend. OMAI is the platform processing brain.**

Corollary: **if a priest or church admin clicks it during their normal work, it belongs in OM. If it runs on a schedule, processes data in bulk, or coordinates agents, it belongs in OMAI.**

Every other rule in this document is a specialization of that one.

---

## Ownership Matrix

### Belongs in OM (user-facing records frontend)

| Domain | Examples |
|---|---|
| **Sacramental records CRUD** | Baptism / marriage / funeral record create, edit, view, search |
| **Certificate generation UI** | Template selection, field preview, PDF export trigger |
| **Parish management** | Users, roles, permissions scoped to one church |
| **OCR review UI** | Human correcting boxes, approving fusion results, editing extracted fields |
| **Calendar & liturgical tools** | Feast days, reading schedules, commemorations |
| **Single-church reports** | Dashboards scoped to one parish's data |
| **Authentication & session** | Login, logout, password reset, 2FA — the user's entry point |
| **Church-scoped settings** | Record templates, branding, language preferences |

### Belongs in OMAI (processing brain)

| Domain | Examples |
|---|---|
| **OCR pipeline execution** | Feeder worker, vision API calls, column mapping, fusion |
| **Bulk record operations** | Record seeding, batch import, field migration, data backfills |
| **Church lifecycle** | Onboarding pipeline, provisioning, tenant setup (PP-0003 already owns this) |
| **Background jobs & schedulers** | Anything triggered by cron, not a user click |
| **Cross-church analytics** | Platform-wide reporting, telemetry, audit rollups |
| **Agent orchestration** | OMAI Daily, change sets, prompt plans, SDLC tooling |
| **Deprecation / feature registry enforcement** | Registry scans, dead code detection, stage transitions |
| **Platform admin tooling** | Database inspection, system health, infrastructure controls |

### Shared, but owned by one side

| Thing | Owner | Rationale |
|---|---|---|
| `om_church_##` tenant databases | **OM** is the system of record; **OMAI** has direct read/write for bulk ops | Two access paths, same data |
| `orthodoxmetrics_db` platform DB (users, churches, sessions) | **OM** | OM owns auth, session, user identity |
| `omai_db` (work items, change sets, plans) | **OMAI** | OMAI owns its own ops state |
| System logs (`system_logs` table) | **OM** writes via `requestLogger` middleware; **OMAI** reads for analysis | Write-once, multi-read |

---

## Access Rules

### Database Access

1. **OM backend** connects to `orthodoxmetrics_db` + `om_church_##` pools via `getAppPool()` / `getTenantPool(churchId)`. This is the user-facing read/write path. Every write produces a `system_logs` audit entry.
2. **OMAI backend** connects to `omai_db` for its own state, AND has direct access to `om_church_##` pools for bulk processing (OCR, seeding, migrations). OMAI writes do not go through OM's middleware, so they **must** write their own audit entries when mutating church data.
3. **Neither side reads the other's ops DB** without a documented reason. OM does not read `omai_db.om_daily_items` directly — it calls the OMAI API.

### API Access

1. **OM calls OMAI** when it needs to trigger processing (e.g., "kick off OCR job", "seed 100 records"). Always via HTTP.
2. **OMAI calls OM** only when it needs to notify a user-facing surface (webhook-style notifications). Prefer not to — prefer shared status tables.
3. **Neither side ships code that directly imports the other's modules.** They are separate services, separate repos, separate deploys.

### UI Surface

1. **OM's frontend** (`front-end/`) renders church-facing features. Church admins, priests, deacons, editors live here.
2. **OMAI's frontend** (`berry/`) is the **super_admin ops console**. Regular church users never see it.
3. **Cross-surface features** — when a church admin needs to trigger an OMAI capability (e.g., bulk seed records) — render the UI in OM and call the OMAI API. The user never leaves OM.

---

## Sync Primitives

How do OM and OMAI stay in sync when work happens on one side that the other needs to know about?

| Primitive | When to use | Example |
|---|---|---|
| **Shared status table** (in church DB) | Default choice. Low latency not required, polling acceptable. | OCR job status: OMAI writes `ocr_jobs.status`, OM reads it on the review page |
| **HTTP webhook (OMAI → OM)** | Event must fire within seconds, losing it is OK (user can refresh) | OCR batch complete → POST to OM's `/api/ocr/notify-complete` |
| **HTTP webhook (OM → OMAI)** | User-triggered action that kicks off processing | User clicks "Seed 100 records" → OM POSTs to OMAI's `/api/seedlings/run` |
| **Direct DB read (OMAI reading OM)** | Bulk analysis, read-only, batch workload | Cross-church analytics job reading all church DBs |
| **Event bus (Redis/NATS)** | **Not yet.** Reserve for when webhook + shared-table pattern breaks down. | — |

**Rule**: Start with a shared status table. Add a webhook only when polling latency is unacceptable. Add an event bus only when neither works.

---

## Naming & Routing Conventions

| Pattern | Meaning |
|---|---|
| `/api/records/*` on OM | Church-facing records CRUD |
| `/api/church/:churchId/*` on OM | Anything scoped to a single church |
| `/api/admin/*` on OM | super_admin tools that still belong in OM (auth, user mgmt) |
| `/api/omai-daily/*` on OMAI | Work item tracking |
| `/api/seedlings/*` on OMAI | Bulk record seeding |
| `/api/ocr/process/*` on OMAI | OCR processing (vs. `/api/ocr/review/*` on OM for the review UI) |
| `/api/change-sets/*` on OMAI | Change set orchestration |

**Rule of thumb**: if the route verb is "process", "run", "seed", "scan", "migrate", "analyze" → OMAI. If it's "get", "create", "update", "delete" against a specific record → OM.

---

## What Has Already Moved (Historical Reference)

These migrations are complete or in progress. They are listed so future work can cross-reference them.

| Feature | From | To | Vehicle | Status |
|---|---|---|---|---|
| Church lifecycle (CRM, onboarding, pipeline) | OM | OMAI | PP-0003, CS-0050 | In progress — OM routes retired as Navigate redirects (OMD-728, OMD-734, etc.) |
| Record seeding (RecordCreationWizard) | OM | OMAI Seedlings | CS-0050 | Done — OMD-734 deleted the OM copy 2026-04-11 |
| Legacy Field Mapper | OM | (replaced by canonical field config) | — | Done — OMD-742 deleted 2026-04-11 |
| Super Dashboard, User Dashboard | OM | (replaced by Control Panel + Portal Hub) | — | Quarantined — awaiting stage 4 |

See [`front-end/src/config/deprecationRegistry.ts`](../front-end/src/config/deprecationRegistry.ts) for the authoritative list.

---

## What Still Needs to Move (Phase 3 Targets)

These are the migrations the boundary contract **implies** but which haven't been executed yet. Each one should become its own OMAI Daily item with a branch, PR, and verification plan. **Not scheduled here** — this is the backlog, prioritized later.

| Feature | Currently in | Should move to | Rationale |
|---|---|---|---|
| **OCR feeder worker** | OM (`om-ocr-worker` service, but code lives in `server/src/workers/`) | OMAI | It's a processing job that runs on a schedule. The review UI stays in OM. |
| **OCR vision result processing** | OM (`server/src/ocr/`) | OMAI | Bulk processing, not user-facing |
| **Background schedulers / cron jobs** | OM (various `server/src/jobs/`) | OMAI | By definition, schedule-driven |
| **Cross-church analytics endpoints** | OM | OMAI | Platform-level concern, not per-church |
| **Platform status / system health deep inspection** | OM (`features/devel-tools/platform-status`) | OMAI | Ops console feature |
| **Live table builder** | OM (`features/devel-tools/live-table-builder`) | OMAI | Developer tool, not church-facing |
| **Page edit audit** | OM (`features/devel-tools/page-edit-audit`) | OMAI | Meta-tool, not church work |
| **Command Center** | OM (`features/devel-tools/command-center`) | OMAI or delete | Ops console or dead — triage needed |

Everything in `front-end/src/features/devel-tools/` should be evaluated against the rule: **does a church user ever see this?** If no, it probably belongs in OMAI's Berry frontend or should be deleted.

---

## Enforcement

How do we stop the boundary from re-blurring over time?

1. **Deprecation registry is the source of truth** for anything that moved. Every migration updates `deprecationRegistry.ts` with stage 4 + `removedDate`.
2. **Feature registry pins new features** to the correct side. When adding a feature to `featureRegistry.ts`, the description must state which side of the boundary it lives on.
3. **CI check (future)**: lint rule that fails if `server/src/` (OM) contains new routes matching "processing" verbs (`/process`, `/run`, `/seed`, `/scan`, `/migrate`, `/analyze`) without an explicit exemption comment.
4. **PR review**: if a PR adds a file to `server/src/workers/`, `server/src/jobs/`, or `front-end/src/features/devel-tools/`, reviewer must ask "should this be in OMAI?" and either move it or document why not.
5. **Quarterly audit**: re-read this document, confirm matrix still reflects reality, add new rows for migrations that shipped.

---

## Decision Log

Open questions to be resolved before Phase 3 work begins:

1. **Does OMAI write its own entries to `system_logs` when mutating church data?**
   - Proposed: yes, with `actor_type='omai'` and the originating job ID.
   - Status: not decided.

2. **Shared status table schema — one table per domain or one unified `om_job_status`?**
   - Proposed: one per domain (`ocr_jobs`, `seed_jobs`, `migration_jobs`). Unified table becomes a god-table fast.
   - Status: not decided.

3. **OMAI auth when calling OM APIs** — does OMAI use the `omsvc-claude` service account, a dedicated `omsvc-omai` account, or a machine-to-machine JWT?
   - Proposed: dedicated `omsvc-omai` account, separate from agent accounts, for audit trail clarity.
   - Status: not decided.

4. **Does the `prod-current` repo (OM) keep `server/src/workers/` at all after OCR worker moves?**
   - Proposed: no. Delete `workers/` entirely. If OM needs a background job, that's evidence it should be in OMAI.
   - Status: not decided.

Decisions resolved here get appended to this document with a date stamp.

---

## Appendix: Quick Reference Card

```
┌─────────────────────────────────┬─────────────────────────────────┐
│              OM                 │              OMAI               │
│  (church records frontend)      │       (processing brain)        │
├─────────────────────────────────┼─────────────────────────────────┤
│  Priests & church admins        │  super_admin only               │
│  Records CRUD                   │  Bulk processing                │
│  OCR review UI                  │  OCR pipeline execution         │
│  Certificate generation         │  Background jobs                │
│  Calendar & parish mgmt         │  Agent orchestration            │
│  User clicks → immediate action │  Scheduled / triggered work     │
├─────────────────────────────────┼─────────────────────────────────┤
│  Port 3001                      │  Port 7060                      │
│  orthodox-backend systemd       │  omai systemd                   │
│  orthodoxmetrics_db +           │  omai_db +                      │
│    om_church_## (primary)       │    om_church_## (bulk ops)      │
└─────────────────────────────────┴─────────────────────────────────┘
```

**The rule, one more time**: if a priest clicks it, it's OM. If it runs on a schedule, it's OMAI. When in doubt, read this document.
