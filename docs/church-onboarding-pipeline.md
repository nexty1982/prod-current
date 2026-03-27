# Church Onboarding Pipeline — Status & Architecture

> Last updated: 2026-03-27

## Overview

The church onboarding system manages the full lifecycle of bringing a new church onto OrthodoxMetrics — from initial CRM lead through provisioning, member onboarding, and active status. It was built across **three layers** that have now been unified into a single detail view as part of PP-0003 / CS-0050.

---

## Architecture: Three Layers

### Layer 1 — Church Onboarding (Post-Provisioning)

Tracks churches **after** they are created in the system. Manages token issuance, member signups, and setup completion.

**Status: Deprecated (Stage 2) — retired to OMAI**

| Component | File | Lines |
|-----------|------|-------|
| List page | `front-end/src/features/admin/control-panel/ChurchOnboardingPage.tsx` | 725 |
| Detail page | `front-end/src/features/admin/control-panel/ChurchOnboardingDetailPage.tsx` | 866 |
| Backend API | `server/src/routes/admin/church-onboarding.js` | 310 |

**Stage flow:** `new` → `token_issued` → `members_joining` → `active` → `setup_complete`

**Endpoints:**
- `GET /api/admin/church-onboarding/pipeline` — All churches with onboarding status (derived from token/user counts)
- `GET /api/admin/church-onboarding/tokens` — All registration tokens across churches
- `GET /api/admin/church-onboarding/tokens/:tokenId` — Single token details
- `POST /api/admin/church-onboarding/tokens/:churchId` — Create new registration token
- `PUT /api/admin/church-onboarding/tokens/:tokenId` — Update/deactivate token

---

### Layer 2 — Church Lifecycle (Unified CRM + Onboarding) ★ Active

The permanent unified detail view. Merges CRM leads (`us_churches` table) with onboarded churches (`churches` table) into a single pipeline view, now including Layer 3 features (record requirements, email workflow, provisioning checklist).

**Status: Live — Stage 3 (Review)**

| Component | File | Lines | Notes |
|-----------|------|-------|-------|
| Detail page | `front-end/src/features/admin/control-panel/ChurchLifecycleDetailPage.tsx` | ~1,900 | Permanent unified detail view |
| Backend API | `server/src/routes/admin/church-lifecycle.js` | 698 | |

**Tabs (8, conditionally shown):**
1. **Overview** — Church info, notes, onboarding stepper, discovery/qualification, provisioning checklist (interactive), record requirements summary
2. **Contacts** — CRM contacts with add/edit/delete (CRM only)
3. **Activity** — CRM activity log with type tagging (CRM only)
4. **Follow-ups** — Scheduled follow-ups with completion tracking (CRM only)
5. **Requirements** — Record structure requirements CRUD, sample template previews (CRM only)
6. **Email Workflow** — Formal email correspondence with template composer, status transitions (CRM only)
7. **Onboarding** — Members table, token management, approve/reject (onboarded churches only)
8. **Timeline** — Unified view of CRM activities, pipeline events, emails, tokens, and member joins

**Endpoints:**
- `GET /api/admin/church-lifecycle/stages` — Pipeline stages list
- `GET /api/admin/church-lifecycle/dashboard` — Merged stats across full lifecycle
- `GET /api/admin/church-lifecycle/:id` — Full detail (CRM + onboarded data)
- `PUT /api/admin/church-lifecycle/:id/stage` — Change pipeline stage

---

### Layer 3 — Extended Onboarding Pipeline (Pre-Provisioning)

Adds discovery, requirements gathering, email workflow, sample record templates, and provisioning readiness tracking. Originally built as separate pages, now **folded into ChurchLifecycleDetailPage** (Stage 4 fusion).

**Status: Backend live, frontend deprecated (folded into Layer 2)**

| Component | File | Status |
|-----------|------|--------|
| List page | `front-end/src/features/admin/control-panel/OnboardingPipelinePage.tsx` | Deprecated (Stage 1) |
| Detail page | `front-end/src/features/admin/control-panel/OnboardingPipelineDetailPage.tsx` | Deprecated (Stage 1) — features folded into ChurchLifecycleDetailPage |
| Backend API | `server/src/routes/admin/onboarding-pipeline.js` | Live, mounted at `/api/admin/onboarding-pipeline` |
| DB migration | `server/database/migrations/20260324_church_onboarding_pipeline.sql` | Executed |
| Transition validator | `server/src/services/transitionValidator.js` | Live (generic SDLC validator) |

**Database tables (all created and active):**
1. `sample_record_templates` — Pre-defined record structures (seeded with 5: baptism_standard, baptism_extended, marriage_standard, funeral_standard, chrismation_standard)
2. `onboarding_record_requirements` — Per-record-type decisions for each church (links to sample templates or marks as custom_required)
3. `onboarding_emails` — Email workflow tracking (drafts, sent, replied, awaiting_response, completed)
4. `onboarding_activity_log` — Audit trail of all onboarding actions

**Extended `us_churches` table** (13 new columns): `current_records_situation`, `estimated_volume`, `custom_structure_required`, `provisioning_ready`, `provisioning_completed`, `activation_date`, etc.

**Extended `crm_pipeline_stages`** (7 new stages): `awaiting_info`, `record_review`, `ready_provision`, `provisioning`, `awaiting_response`, `blocked`, `closed_lost`

**Endpoints (live, mounted at `/api/admin/onboarding-pipeline`):**
- `GET /api/admin/onboarding-pipeline/list` — Full pipeline with filters
- `GET /api/admin/onboarding-pipeline/:id/detail` — Full onboarding workspace
- `PUT /api/admin/onboarding-pipeline/:id` — Update onboarding fields
- `GET /api/admin/onboarding-pipeline/templates` — Sample record templates
- `GET /api/admin/onboarding-pipeline/email-templates` — Email template library
- `POST /api/admin/onboarding-pipeline/:id/requirements` — Set record type requirements
- `DELETE /api/admin/onboarding-pipeline/:id/requirements/:reqId` — Delete requirement
- `GET /api/admin/onboarding-pipeline/:id/emails` — Email history
- `POST /api/admin/onboarding-pipeline/:id/emails` — Send/log email
- `PUT /api/admin/onboarding-pipeline/:id/emails/:emailId` — Update email status
- `GET /api/admin/onboarding-pipeline/:id/activities` — Activity timeline
- `POST /api/admin/onboarding-pipeline/:id/mark-ready` — Flag as ready for provisioning
- `POST /api/admin/onboarding-pipeline/:id/mark-active` — Flag as active

**Built-in email templates:** `welcome`, `info_request`, `template_confirm`, `custom_review`, `provisioned`, `reminder`

---

## Implementation Plan: PP-0003 "Fuse Church Onboarding Pipeline into CRM"

**Change Set:** CS-0050
**Status:** Active — 4 of 6 stages complete
**Assigned agent:** `claude_cli`

The goal is to unify all three layers into a single cohesive church lifecycle management interface, from first CRM contact through active church status.

### Stage Progress

| Stage | Title | Status |
|-------|-------|--------|
| 1 | *(completed)* | Done |
| 2 | *(completed)* | Done |
| 3 | *(completed)* | Done |
| 4 | Fuse church detail view with Layer 3 features | **Done (2026-03-27)** |
| 5 | *(details available after stage 4)* | Pending |
| 6 | *(details available after stage 4)* | Pending |

### Stage 4 — Completed

Fused `OnboardingPipelineDetailPage` features into `ChurchLifecycleDetailPage` as the permanent unified detail view:

1. **Record Requirements tab** — Full CRUD: add requirements (sample template or custom structure), delete, review flag. Template preview with field listings via accordions.
2. **Email Workflow tab** — Email correspondence list with status transitions (draft → sent → replied → awaiting_response → completed). Compose dialog with 6 email type templates that auto-populate subject/body with church name and contact name.
3. **Interactive provisioning checklist** — Mark Ready for Provisioning / Mark Active buttons added to Overview tab checklist section.
4. **Template data fetching** — ChurchLifecycleDetailPage now fetches sample templates and email templates from `/api/admin/onboarding-pipeline/templates` and `/api/admin/onboarding-pipeline/email-templates`.

**Decisions (from open questions):**
- Layer 3 schema + backend integrated before Stage 4; Layer 3 UI not launched as separate parallel workflow
- `ChurchLifecycleDetailPage` is the permanent unified detail view; `OnboardingPipelineDetailPage` mined and folded in, now deprecated
- Parish-side onboarding wizard deferred until admin-side lifecycle/detail fusion is stable

**Registry changes:**
- `church-lifecycle-detail` re-registered in featureRegistry at Stage 3 (Review)
- `onboarding-pipeline-page` and `onboarding-pipeline-detail-page` added to deprecationRegistry at Stage 1

---

## Related Existing Systems

### Church Setup Wizard

Separate from the pipeline — handles the technical provisioning of a new church database once the decision to onboard has been made.

- **Frontend:** `front-end/src/features/church/apps/church-management/ChurchSetupWizard.tsx`
- **Backend:** `POST /api/admin/churches/wizard`
- **Templates:** `GET /api/admin/churches/wizard/template-profiles`
- Uses `orthodoxmetrics_db.templates` to provision record tables (baptism, marriage, funeral)
- Supports template profiles: "Start from Scratch" and "Standard English (Default)"
- Documented in `docs/WIZARD_TEMPLATE_PROFILES_IMPLEMENTATION.md`

### CRM System

The original CRM for tracking church leads before the lifecycle unification effort.

- **Data source:** `us_churches` table in platform DB
- **Pipeline stages:** Managed via `crm_pipeline_stages` table

### Parish Onboarding Wizard (Future)

Guided external-facing wizard for parish staff to self-configure record field labels, order, and visibility. Registered in featureRegistry at Stage 2 (`parish-onboarding-wizard`). To be built after admin-side lifecycle/detail fusion is stable.

---

## Feature Registry

All onboarding-related features in `front-end/src/config/featureRegistry.ts`:

| Feature ID | Stage | Visibility | Notes |
|------------|-------|------------|-------|
| `church-onboarding` | 5 (Production) | All users | Layer 1 — deprecated |
| `church-lifecycle-detail` | 3 (Review) | super_admin only | Permanent unified detail view |
| `onboarding-pipeline` | 2 (Development) | super_admin only | Deprecated — folded into lifecycle |
| `onboarding-pipeline-detail` | 2 (Development) | super_admin only | Deprecated — folded into lifecycle |
| `parish-onboarding-wizard` | 2 (Development) | super_admin only | Future — parish-side setup |

## Deprecation Registry

Entries in `front-end/src/config/deprecationRegistry.ts`:

| ID | Stage | Reason |
|----|-------|--------|
| `church-onboarding-page` | 2 (Quarantined) | Retired to OMAI (PP-0003) |
| `church-onboarding-detail-page` | 2 (Quarantined) | Retired to OMAI (PP-0003) |
| `church-pipeline-page` | 2 (Quarantined) | Retired to OMAI (PP-0003) |
| `crm-page` | 2 (Quarantined) | Retired to OMAI (PP-0003) |
| `crm-outreach-page` | 2 (Quarantined) | Retired to OMAI (PP-0003) |
| `onboarding-pipeline-page` | 1 (Deprecated) | Folded into ChurchLifecycleDetailPage (Stage 4) |
| `onboarding-pipeline-detail-page` | 1 (Deprecated) | Folded into ChurchLifecycleDetailPage (Stage 4) |
