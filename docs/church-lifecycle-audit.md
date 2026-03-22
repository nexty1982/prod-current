# Church Lifecycle Data Model Audit

**PP-0003 Step 1** | CS-0050 | 2026-03-15

## Current State: Two Separate Systems

### System A: CRM (Lead Tracking)
**Table**: `us_churches` (1,519 records)
**API**: `/api/crm/*`
**Frontend**: `CRMPage.tsx` at `/devel-tools/crm`

Tracks churches from first discovery through sales pipeline. US Orthodox churches imported from external datasets. Includes geographic data (lat/lng), contact management, activity logging, and follow-up scheduling.

**Pipeline stages** (`crm_pipeline_stages`, 9 stages):

| Order | Stage Key | Label | Terminal |
|-------|-----------|-------|----------|
| 1 | new_lead | New Lead | No |
| 2 | contacted | Contacted | No |
| 3 | demo_scheduled | Demo Scheduled | No |
| 4 | demo_completed | Demo Completed | No |
| 5 | proposal_sent | Proposal Sent | No |
| 6 | negotiation | Negotiation | No |
| 7 | won | Won / Client | No |
| 8 | lost | Lost | Yes |
| 9 | not_interested | Not Interested | Yes |

**Supporting tables**:
- `crm_contacts` — People at the church (first_name, last_name, role, email, phone, is_primary)
- `crm_activities` — Activity log (note, call, email, meeting, task, stage_change, provision)
- `crm_follow_ups` — Scheduled follow-up tasks (pending, completed, overdue, cancelled)

**Handoff mechanism**: `POST /api/crm/churches/:id/provision` — creates entry in `churches` table, creates tenant DB, generates registration token, sets `us_churches.provisioned_church_id` and `pipeline_stage = 'won'`.

### System B: Church Onboarding (Post-Provisioning)
**Table**: `churches` (3 records)
**API**: `/api/admin/church-onboarding/*`
**Frontend**: `ChurchOnboardingPage.tsx` at `/admin/control-panel/church-onboarding`

Tracks provisioned churches through setup. Derives onboarding stage from data state (no explicit stage column).

**Derived onboarding stages** (computed, not stored):

| Priority | Stage Key | Condition |
|----------|-----------|-----------|
| 1 (highest) | setup_complete | `setup_complete = 1` |
| 2 | active | Active users > 0 |
| 3 | members_joining | Pending users > 0 |
| 4 | token_issued | Active tokens > 0 |
| 5 (lowest) | new | None of the above |

**Supporting tables**:
- `church_registration_tokens` — Registration tokens (church_id, token, is_active, created_by)
- `users` — Members registered via token (church_id links to `churches.id`)

---

## Gap Analysis

### Fields in CRM (`us_churches`) but NOT in Onboarding (`churches`)

| Field | Purpose | Notes |
|-------|---------|-------|
| `ext_id` | External dataset ID | Import reference only |
| `street` | Street address | `churches` has `address` (TEXT) instead |
| `state_code` | 2-char state | `churches` uses `state_province` (varchar 100) |
| `zip` | ZIP code | `churches` uses `postal_code` |
| `latitude/longitude` | Geolocation | `churches` has same columns |
| `pipeline_stage` | Explicit stage | Onboarding derives stage from data |
| `assigned_to` | CRM user assignment | Not tracked post-provision |
| `is_client` | Client flag | Implicit when in `churches` |
| `provisioned_church_id` | Link to churches table | The bridge field |
| `last_contacted_at` | Last contact date | Not tracked post-provision |
| `next_follow_up` | Next follow-up date | Not tracked post-provision |
| `priority` | CRM priority | Not tracked post-provision |
| `tags` | JSON tags | Not in onboarding |
| `crm_notes` | CRM-specific notes | `churches.notes` exists but separate |

### Fields in Onboarding (`churches`) but NOT in CRM (`us_churches`)

| Field | Purpose | Notes |
|-------|---------|-------|
| `db_name/database_name` | Tenant DB name | Created at provision |
| `setup_complete` | Setup flag | Onboarding-specific |
| `jurisdiction_id` | FK to jurisdictions | Both have it now |
| `calendar_type` | Julian/Revised Julian | Church-specific |
| `is_demo` | Demo flag | QA/testing |
| `sub_*` | Subscription fields (14) | Billing system |
| `plan_*` | Plan fields (10) | Pricing system |
| `ocr_base_dir` | OCR storage path | Feature-specific |
| All record flags | has_baptism_records etc. | Feature-specific |

### The Handoff Gap

Currently **zero** churches have `provisioned_church_id` set, meaning:
- The CRM → Onboarding bridge has never been used in production
- All 3 onboarded churches were created manually, not through CRM provision
- The provision endpoint exists but hasn't been battle-tested

---

## Proposed Unified Pipeline Model

### Full Lifecycle Stages (10 stages)

| Order | Stage Key | Label | Source | Terminal | Color |
|-------|-----------|-------|--------|----------|-------|
| 1 | new_lead | New Lead | CRM | No | #9e9e9e |
| 2 | contacted | Contacted | CRM | No | #2196f3 |
| 3 | demo_scheduled | Demo Scheduled | CRM | No | #ff9800 |
| 4 | demo_completed | Demo Completed | CRM | No | #ff5722 |
| 5 | proposal_sent | Proposal Sent | CRM | No | #9c27b0 |
| 6 | negotiation | Negotiation | CRM | No | #e91e63 |
| 7 | won | Won / Provisioned | BRIDGE | No | #4caf50 |
| 8 | onboarding | Onboarding | Onboarding | No | #00bcd4 |
| 9 | active | Active | Onboarding | No | #2e7d32 |
| 10 | setup_complete | Setup Complete | Onboarding | No | #1b5e20 |
| — | lost | Lost | CRM | Yes | #f44336 |
| — | not_interested | Not Interested | CRM | Yes | #795548 |

### Key Design Decisions

1. **"Won" becomes the bridge stage** — When a CRM lead reaches "won", the provision happens (create `churches` record, tenant DB, registration token). The `us_churches.provisioned_church_id` links the two records.

2. **"Onboarding" replaces three derived stages** — The current `token_issued` / `members_joining` substages become metadata visible in the detail view, not separate pipeline stages. This keeps the Kanban board manageable.

3. **No schema changes needed for stage tracking** — The CRM stages are already stored in `crm_pipeline_stages`. For onboarded churches, the unified API will compute the stage from the existing data (tokens, users, setup_complete) and map it to the unified stage model.

4. **Both tables remain** — `us_churches` (CRM leads) and `churches` (onboarded) stay separate. The unified API presents them as one pipeline through a UNION-style query joined via `provisioned_church_id`.

5. **CRM features extend to onboarded churches** — Contacts, activities, and follow-ups (currently only on `us_churches` via `crm_*` tables) should also work for onboarded churches. The `crm_contacts.church_id` and similar fields will need a `source` column or separate tables to distinguish CRM-lead contacts from onboarded-church contacts. **Simpler approach**: keep CRM features on the `us_churches` side only, and for provisioned churches, the detail view pulls from both the CRM record (contacts/activities/follow-ups) and the onboarded record (tokens/members/setup).

### API Surface for Unified View

```
GET  /api/admin/church-lifecycle/pipeline
  → Returns all us_churches + enriches "won" entries with onboarding data from churches table
  → Each entry has: id, name, stage (unified), source ('crm' | 'onboarded' | 'both'), ...

GET  /api/admin/church-lifecycle/:id
  → If CRM lead: returns us_churches data + crm_contacts/activities/follow-ups
  → If provisioned: returns BOTH us_churches + churches data + tokens + members + CRM data
  → Unified response shape regardless of source

PUT  /api/admin/church-lifecycle/:id/stage
  → Stage transitions including automatic provisioning at "won" stage
  → For post-provision stages, updates derived state (e.g., toggle setup_complete)

GET  /api/admin/church-lifecycle/dashboard
  → Merged stats: full pipeline counts + onboarding metrics + follow-up summary
```

### Migration Path

1. Add `onboarding` and `active` and `setup_complete` stages to `crm_pipeline_stages` table
2. Create unified API routes (facade over existing tables)
3. Build unified frontend
4. Deprecate separate pages
5. (Future) Consider merging `us_churches` into `churches` with a `source` column
