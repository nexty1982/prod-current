# CRM Migration — Phase 0: Current-State Audit

**Date**: 2026-03-24
**Purpose**: Complete inventory of all CRM data, routes, write paths, and frontend components before migrating ownership from OrthodoxMetrics to OMAI.

---

## 1. Database Architecture

**Critical finding**: OMAI and OrthodoxMetrics share the **same database** (`orthodoxmetrics_db`). There is no separate `omai_db`. OMAI's DB module (`_runtime/server/src/db/db.js`) connects to `orthodoxmetrics_db` directly.

This simplifies migration — no cross-database data copy is needed. The migration is about creating OMAI-owned tables and redirecting write paths, not moving data between servers.

---

## 2. CRM Tables — Complete Inventory

### 2a. Core CRM Tables (ACTIVE)

| Table | Rows | Purpose |
|-------|------|---------|
| `us_churches` | 1,519 | Lead/prospect tracking — main CRM entity |
| `crm_pipeline_stages` | 12 | Pipeline stage definitions (9 original + 3 extended) |
| `crm_contacts` | 0 | Contact people at church leads |
| `crm_activities` | 1 | Activity log (notes, calls, stage changes) |
| `crm_follow_ups` | 0 | Scheduled follow-up tasks |
| `jurisdictions` | 11 | Orthodox jurisdiction reference data |

### 2b. Public Booking Tables (ACTIVE)

| Table | Rows | Purpose |
|-------|------|---------|
| `crm_inquiries` | 0 | Web form submissions from churches |
| `crm_appointments` | 0 | Scheduled demos/meetings |
| `crm_appointment_slots` | 5 | Available time slot definitions |
| `crm_appointment_blocks` | 0 | Date blocks (unavailable) |

### 2c. Onboarding Extension Tables (NOT YET CREATED)

These tables exist as a migration script but have **not been run**:
- `sample_record_templates` — pre-defined record structures for onboarding
- `onboarding_record_requirements` — per-record-type decisions per lead
- `onboarding_emails` — email workflow tracking
- `onboarding_activity_log` — onboarding audit trail

**Migration file**: `server/database/migrations/20260324_church_onboarding_pipeline.sql`

### 2d. Provisioning Bridge Tables

| Table | Purpose |
|-------|---------|
| `churches` | Provisioned church entities (operational) |
| `church_registration_tokens` | One-time tokens for church admin setup |

**Bridge usage**: `us_churches.provisioned_church_id` → `churches.id` — currently **0 records** have been provisioned.

---

## 3. Table Schemas — Field Mappings

### us_churches (main CRM lead table)

```
id                  INT PRI AUTO_INCREMENT
ext_id              VARCHAR(50)
name                VARCHAR(512)
street              VARCHAR(512)
city                VARCHAR(255)
state_code          CHAR(2) INDEXED
zip                 VARCHAR(20)
phone               VARCHAR(50)
website             VARCHAR(512)
latitude            DECIMAL(10,7)
longitude           DECIMAL(11,7)
jurisdiction        VARCHAR(100) INDEXED (legacy text)
jurisdiction_id     INT INDEXED (FK to jurisdictions)
pipeline_stage      VARCHAR(50) INDEXED
assigned_to         INT INDEXED
is_client           TINYINT(1) INDEXED
provisioned_church_id INT (FK to churches.id)
last_contacted_at   DATETIME
next_follow_up      DATE INDEXED
priority            ENUM(low,medium,high,urgent) INDEXED
tags                LONGTEXT (JSON)
crm_notes           TEXT
created_at          TIMESTAMP
```

### crm_pipeline_stages

```
id          INT PRI
stage_key   VARCHAR(50) UNIQUE
label       VARCHAR(100)
color       VARCHAR(20)
sort_order  INT
is_terminal TINYINT(1)
```

**Current stages**: new_lead, contacted, demo_scheduled, demo_completed, proposal_sent, negotiation, won, onboarding, active, setup_complete, lost (terminal), not_interested (terminal)

### crm_contacts

```
id          INT PRI
church_id   INT (FK us_churches, CASCADE DELETE)
first_name  VARCHAR(100)
last_name   VARCHAR(100)
role        VARCHAR(100)
email       VARCHAR(255)
phone       VARCHAR(50)
is_primary  TINYINT(1)
notes       TEXT
created_at  TIMESTAMP
updated_at  DATETIME
```

### crm_activities

```
id            INT PRI
church_id     INT (FK us_churches)
contact_id    INT (optional FK crm_contacts)
activity_type ENUM(note,call,email,meeting,task,stage_change,provision)
subject       VARCHAR(255)
body          TEXT
metadata      LONGTEXT (JSON)
created_by    INT
created_at    TIMESTAMP
```

### crm_follow_ups

```
id           INT PRI
church_id    INT (FK us_churches)
assigned_to  INT
due_date     DATE
subject      VARCHAR(255)
description  TEXT
status       ENUM(pending,completed,overdue,cancelled)
completed_at DATETIME
created_at   TIMESTAMP
updated_at   DATETIME
```

### crm_inquiries

```
id                    INT PRI
church_id             INT (FK us_churches, nullable)
church_name_entered   VARCHAR(512)
state_code            CHAR(2)
contact_first_name    VARCHAR(100)
contact_last_name     VARCHAR(100)
contact_email         VARCHAR(255)
contact_phone         VARCHAR(50)
contact_role          VARCHAR(100)
maintains_records     ENUM(yes,no,unsure)
heard_about           VARCHAR(100)
heard_about_detail    VARCHAR(512)
interested_digital_records ENUM(yes,no,maybe)
wants_meeting         TINYINT(1)
appointment_id        INT (FK crm_appointments)
status                ENUM(new,contacted,converted,closed)
notes                 TEXT
created_at            TIMESTAMP
updated_at            DATETIME
```

### crm_appointments

```
id                INT PRI
inquiry_id        INT (FK crm_inquiries)
church_id         INT (FK us_churches)
appointment_type  ENUM(demo,tech_support,onboarding,general)
contact_name      VARCHAR(200)
contact_email     VARCHAR(255)
contact_phone     VARCHAR(50)
scheduled_date    DATE
scheduled_time    TIME
duration_min      INT
timezone          VARCHAR(50)
status            ENUM(scheduled,confirmed,completed,cancelled,no_show)
notes             TEXT
cancellation_reason VARCHAR(512)
created_at        TIMESTAMP
updated_at        DATETIME
```

### crm_appointment_slots

```
id               INT PRI
day_of_week      TINYINT (0=Sun..6=Sat)
start_time       TIME
end_time         TIME
slot_duration_min INT
is_active        TINYINT(1)
created_by       INT
created_at       TIMESTAMP
```

### crm_appointment_blocks

```
id         INT PRI
block_date DATE
reason     VARCHAR(255)
created_at TIMESTAMP
```

---

## 4. Backend Routes — Write Path Inventory

### `/api/crm` — Core CRM (crm.js, 732 lines)
**Auth**: `requireAuth` + `requireRole(['admin','super_admin'])`
**Mount**: `server/src/index.ts`

| Method | Path | Writes To | Operation |
|--------|------|-----------|-----------|
| GET | `/dashboard` | — | Read-only aggregate |
| GET | `/churches` | — | List/search with filters |
| GET | `/churches/:id` | — | Detail view |
| PUT | `/churches/:id` | `us_churches` | Update lead fields |
| POST | `/churches/:id/provision` | `churches`, `church_registration_tokens`, `us_churches`, `crm_activities` | Provision → creates church, token, links bridge |
| PUT | `/churches/bulk/pipeline` | `us_churches`, `crm_activities` | Bulk stage change |
| GET | `/churches/:churchId/contacts` | — | List contacts |
| POST | `/churches/:churchId/contacts` | `crm_contacts` | Add contact |
| PUT | `/churches/:churchId/contacts/:id` | `crm_contacts` | Update contact |
| DELETE | `/churches/:churchId/contacts/:id` | `crm_contacts` | Delete contact |
| GET | `/churches/:churchId/activities` | — | List activities |
| POST | `/churches/:churchId/activities` | `crm_activities` | Add activity |
| GET | `/follow-ups` | — | List all follow-ups |
| POST | `/churches/:churchId/follow-ups` | `crm_follow_ups` | Create follow-up |
| PUT | `/follow-ups/:id` | `crm_follow_ups` | Update follow-up |
| DELETE | `/follow-ups/:id` | `crm_follow_ups` | Delete follow-up |
| GET | `/map-data` | — | GeoJSON for map |
| GET | `/pipeline-stages` | — | List stages |

### `/api/crm-public` — Public Booking (crm-public.js)
**Auth**: None (public)
**Mount**: `server/src/index.ts`

| Method | Path | Writes To | Operation |
|--------|------|-----------|-----------|
| GET | `/available-slots` | — | Available slots for date |
| GET | `/available-dates` | — | Available dates for month |
| POST | `/inquiry` | `crm_inquiries`, `crm_appointments`, `us_churches` | Submit inquiry + optional appointment |

### `/api/admin/church-onboarding` — Onboarding (church-onboarding.js)
**Auth**: `requireAuth` + admin role
**Mount**: `server/src/index.ts`

| Method | Path | Writes To | Operation |
|--------|------|-----------|-----------|
| POST | `/generate-token` | `church_registration_tokens` | Generate reg token |
| POST | `/validate-token` | — | Validate token |
| POST | `/setup` | `churches`, `church_users`, tenant DB | Initial church setup |
| GET | `/tokens` | — | List tokens |
| DELETE | `/tokens/:tokenId` | `church_registration_tokens` | Revoke token |
| GET | `/status/:churchId` | — | Check setup status |

### `/api/admin/church-lifecycle` — Unified View (church-lifecycle.js)
**Auth**: `requireAuth` + admin role
**Mount**: `server/src/index.ts`

| Method | Path | Writes To | Operation |
|--------|------|-----------|-----------|
| GET | `/pipeline` | — | Unified pipeline view |
| GET | `/pipeline/:id` | — | Single entity detail |
| GET | `/stats` | — | Pipeline statistics |
| GET | `/search` | — | Cross-table search |
| GET | `/recent-activity` | — | Recent activity feed |

### `/api/admin/onboarding-pipeline` — Extended Onboarding (onboarding-pipeline.js)
**Auth**: `requireAuth` + admin role
**Mount**: **NOT MOUNTED** in index.ts — dead code

| Status | Impact |
|--------|--------|
| 15 endpoints defined | None — unreachable |
| References un-created tables | Would fail even if mounted |

---

## 5. Frontend Components

### OrthodoxMetrics Frontend (Active)

| File | Path | Status |
|------|------|--------|
| `CRMPage.tsx` | `front-end/src/features/devel-tools/crm/CRMPage.tsx` | 1,110 lines, full dashboard |
| Berry CRM wrappers | `front-end/src/features/berry-crm/` | Stage 1 prototypes, redirect to CRMPage |

**CRMPage.tsx writes to**:
- `PUT /api/crm/churches/:id` — update lead
- `PUT /api/crm/churches/bulk/pipeline` — bulk stage change
- `POST /api/crm/churches/:id/contacts` — add contact
- `PUT /api/crm/churches/:id/contacts/:id` — update contact
- `DELETE /api/crm/churches/:id/contacts/:id` — delete contact
- `POST /api/crm/churches/:id/activities` — log activity
- `POST /api/crm/churches/:id/follow-ups` — create follow-up
- `PUT /api/crm/follow-ups/:id` — update follow-up
- `POST /api/crm/churches/:id/provision` — provision church

### OMAI Berry Frontend (UI Templates Only)

| File | Status |
|------|--------|
| `berry/src/views/application/crm/LeadManagement.tsx` | Template — calls phantom Redux endpoints |
| `berry/src/views/application/crm/ContactManagement.tsx` | Template — calls phantom Redux endpoints |
| `berry/src/views/application/crm/SalesManagement.tsx` | Template — calls phantom Redux endpoints |
| `berry/src/store/slices/customer.ts` | Redux store — calls `/api/customer/*` (404s) |

**These Berry CRM components have NO working backend and will be replaced during migration.**

---

## 6. Column Naming Inconsistencies

| Field | `us_churches` (CRM lead) | `churches` (provisioned) |
|-------|--------------------------|--------------------------|
| Address | `street` | `address` |
| State | `state_code` (CHAR 2) | `state_province` (VARCHAR) |
| Jurisdiction | `jurisdiction_id` + `jurisdiction` (legacy) | `jurisdiction_id` |
| Identifier | `ext_id` | — |

These must be mapped during provisioning bridge operations.

---

## 7. Risks & Concerns

1. **Shared database**: OMAI and OM use the same DB. Migration doesn't require cross-DB data copy, but table naming must be coordinated to avoid collisions.

2. **Zero provisioning usage**: The `POST /api/crm/churches/:id/provision` endpoint exists but has never been used in production (0 provisioned_church_id values). The bridge path is untested at scale.

3. **Unrun migration**: The onboarding extension tables (sample_record_templates, onboarding_record_requirements, onboarding_emails, onboarding_activity_log) exist only as a SQL script. They should be evaluated for inclusion in the OMAI schema.

4. **Unmounted routes**: `onboarding-pipeline.js` (15 endpoints) is not mounted in index.ts. Dead code — should not be migrated.

5. **Public endpoints**: `crm-public.js` has no auth and creates records in `crm_inquiries`, `crm_appointments`, and `us_churches`. These write paths must be redirected to OMAI-owned tables.

6. **1,519 leads**: The `us_churches` table is the most populated CRM table. All other CRM tables have near-zero usage (0-5 rows). Migration data volume is low.

7. **Berry CRM templates**: The existing Berry CRM components call phantom Redux endpoints (`/api/customer/*`). They need to be rewired to OMAI CRM endpoints, not OM endpoints.

---

## 8. Files to Modify (Phase 1+)

### New files (OMAI side)
- OMAI CRM migration SQL (new tables with `omai_crm_` prefix or in OMAI namespace)
- OMAI CRM API routes (new Express router)
- OMAI Berry CRM components (replace phantom Redux templates)

### Modify (OrthodoxMetrics side — later phases)
- `server/src/routes/crm.js` — redirect writes to OMAI tables
- `server/src/routes/crm-public.js` — redirect writes to OMAI tables
- `server/src/routes/admin/church-onboarding.js` — coordinate with OMAI provisioning
- `server/src/index.ts` — route mount changes
- `front-end/src/features/devel-tools/crm/CRMPage.tsx` — point to OMAI API

### Do not modify
- `server/src/routes/admin/onboarding-pipeline.js` — dead code, skip
- `server/src/routes/admin/church-lifecycle.js` — read-only, migrate last

---

## 9. Summary

| Dimension | Count |
|-----------|-------|
| CRM tables (existing) | 10 |
| CRM tables (unrun migration) | 4 |
| Backend route files | 5 (4 mounted, 1 dead) |
| Write endpoints | 23 (across 3 route files) |
| Frontend components (OM) | 1 main + 3 wrappers |
| Frontend components (OMAI Berry) | 3 templates (non-functional) |
| Total lead records | 1,519 |
| Provisioned bridges | 0 |
| Tables written to | 8 distinct tables |

**Phase 0 is complete. Proceed to Phase 1: Define OMAI DB schema.**
