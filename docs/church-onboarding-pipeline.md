# Church Onboarding Pipeline — Status & Architecture

> Last updated: 2026-03-24

## Overview

The church onboarding system manages the full lifecycle of bringing a new church onto OrthodoxMetrics — from initial CRM lead through provisioning, member onboarding, and active status. It is built across **three layers** that evolved over time, plus an active implementation plan to unify them.

---

## Architecture: Three Layers

### Layer 1 — Church Onboarding (Post-Provisioning)

Tracks churches **after** they are created in the system. Manages token issuance, member signups, and setup completion.

**Status: Live (committed)**

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

### Layer 2 — Church Lifecycle (Unified CRM + Onboarding)

Merges CRM leads (`us_churches` table) with onboarded churches (`churches` table) into a single pipeline view. This was built as part of **PP-0003 / CS-0050** (stages 1-3).

**Status: Live (committed)**

| Component | File | Lines |
|-----------|------|-------|
| List page (Kanban + table) | `front-end/src/features/admin/control-panel/ChurchLifecyclePage.tsx` | 680 |
| Detail page | `front-end/src/features/admin/control-panel/ChurchLifecycleDetailPage.tsx` | 1,422 |
| Pipeline overview | `front-end/src/features/admin/control-panel/ChurchPipelinePage.tsx` | 205 |
| Backend API | `server/src/routes/admin/church-lifecycle.js` | 698 |

**Endpoints:**
- `GET /api/admin/church-lifecycle/stages` — Pipeline stages list
- `GET /api/admin/church-lifecycle/dashboard` — Merged stats across full lifecycle

---

### Layer 3 — Extended Onboarding Pipeline (Pre-Provisioning)

Adds discovery, requirements gathering, email workflow, sample record templates, and provisioning readiness tracking. Operates on CRM leads **before** they become provisioned churches.

**Status: Built but NOT integrated (untracked on branch `EF_claude-cli_2026-03-24_632`)**

| Component | File | Lines |
|-----------|------|-------|
| List page | `front-end/src/features/admin/control-panel/OnboardingPipelinePage.tsx` | 368 |
| Detail page | `front-end/src/features/admin/control-panel/OnboardingPipelineDetailPage.tsx` | 952 |
| Backend API | `server/src/routes/admin/onboarding-pipeline.js` | 641 |
| DB migration | `server/database/migrations/20260324_church_onboarding_pipeline.sql` | 201 |
| Transition validator | `server/src/services/transitionValidator.js` | 365 |

**Not yet done:**
- Backend route is **not mounted** in `server/src/index.ts`
- Database migration has **not been run**
- Frontend routes registered in `featureRegistry.ts` (stage 2) but may not be in `Router.tsx`

**New database tables (from migration):**
1. `sample_record_templates` — Pre-defined record structures (seeded with 5: baptism_standard, baptism_extended, marriage_standard, funeral_standard, chrismation_standard)
2. `onboarding_record_requirements` — Per-record-type decisions for each church (links to sample templates or marks as custom_required)
3. `onboarding_emails` — Email workflow tracking (drafts, sent, replied, awaiting_response, completed)
4. `onboarding_activity_log` — Audit trail of all onboarding actions

**Extended `us_churches` table** (13 new columns): `current_records_situation`, `estimated_volume`, `custom_structure_required`, `provisioning_ready`, `provisioning_completed`, `activation_date`, etc.

**Extended `crm_pipeline_stages`** (7 new stages): `awaiting_info`, `record_review`, `ready_provision`, `provisioning`, `awaiting_response`, `blocked`, `closed_lost`

**Endpoints (not yet mounted):**
- `GET /api/admin/onboarding-pipeline/list` — Full pipeline with filters (search, status, jurisdiction, custom structure, provisioning)
- `GET /api/admin/onboarding-pipeline/:id/detail` — Full onboarding workspace
- `PUT /api/admin/onboarding-pipeline/:id` — Update onboarding fields
- `GET /api/admin/onboarding-pipeline/templates` — Sample record templates
- `POST /api/admin/onboarding-pipeline/:id/requirements` — Set record type requirements
- `GET /api/admin/onboarding-pipeline/:id/emails` — Email history
- `POST /api/admin/onboarding-pipeline/:id/emails` — Send/log email
- `GET /api/admin/onboarding-pipeline/:id/activities` — Activity timeline
- `POST /api/admin/onboarding-pipeline/:id/mark-ready` — Flag as ready for provisioning
- `POST /api/admin/onboarding-pipeline/:id/mark-active` — Flag as active

**Built-in email templates:** `welcome`, `info_request`, `template_confirm`, `custom_review`, `provisioned`, `reminder`

---

## Implementation Plan: PP-0003 "Fuse Church Onboarding Pipeline into CRM"

**Change Set:** CS-0050
**Status:** Active — 3 of 6 stages complete
**Assigned agent:** `claude_cli`

The goal is to unify all three layers into a single cohesive church lifecycle management interface, from first CRM contact through active church status.

### Stage Progress

| Stage | Title | Status |
|-------|-------|--------|
| 1 | *(completed)* | Done |
| 2 | *(completed)* | Done |
| 3 | *(completed)* | Done |
| **4** | **Fuse church detail view with CRM contact management** | **Pending (next)** |
| 5 | *(details available after stage 4)* | Pending |
| 6 | *(details available after stage 4)* | Pending |

### Stage 4 Requirements

Create/extend `ChurchLifecycleDetailPage.tsx` at `/admin/control-panel/church-lifecycle/:churchId` combining:

1. **Church overview card** — name, address, stage, dates
2. **Contacts tab** — from CRM: add/edit/delete contacts
3. **Activities tab** — from CRM: log calls, meetings, emails
4. **Follow-ups tab** — from CRM: schedule and track follow-ups
5. **Onboarding tab** — tokens, member list, setup checklist (only visible for provisioned+ churches)
6. **Timeline tab** — unified activity + onboarding event timeline

The detail page should work for both CRM leads (no onboarding tab) and onboarded churches (all tabs).

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

---

## Feature Registry

All onboarding-related features are registered in `front-end/src/config/featureRegistry.ts`:

| Feature ID | Stage | Visibility |
|------------|-------|------------|
| `church-onboarding` | 5 (Production) | All users |
| `church-lifecycle` | 2 (Development) | super_admin only |
| `church-lifecycle-detail` | 2 (Development) | super_admin only |
| `onboarding-pipeline` | 2 (Development) | super_admin only |
| `onboarding-pipeline-detail` | 2 (Development) | super_admin only |

---

## Total Codebase Investment

| Category | Lines | Files |
|----------|-------|-------|
| Committed frontend pages | ~3,898 | 5 |
| Committed backend routes | ~1,008 | 2 |
| Untracked frontend pages | ~1,320 | 2 |
| Untracked backend + services | ~1,641 | 3 |
| Untracked migration | ~201 | 1 |
| Untracked utilities | ~168 | 1 |
| **Total** | **~8,236** | **14** |

Plus ~2,155 lines of modifications across 28 changed files on the current branch.

---

## Open Questions

1. **Integration gap:** The untracked Layer 3 files are built but not wired up. Should they be integrated before proceeding with Stage 4?
2. **Overlap:** `ChurchLifecycleDetailPage.tsx` (1,422 lines, committed) and `OnboardingPipelineDetailPage.tsx` (952 lines, untracked) appear to cover similar ground. Clarification needed on whether one supersedes the other or they serve different stages.
3. **Missing piece:** A parish-side onboarding wizard (for parish staff to self-configure record fields) has TODOs in the code but no implementation yet.
