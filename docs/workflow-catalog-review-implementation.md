# Workflow Catalog Review — Design Summary

**Date:** 2026-06-12  
**Scope:** Approved catalog review decisions (items 1–10)  
**Repos:** `orthodoxmetrics/prod` (canonical), `omai` (control panel + delegated APIs)

---

## 1. Impacted files

### OM backend (`orthodoxmetrics/prod/server`)

| File | Change |
|------|--------|
| `database/migrations/20260612_workflow_catalog_review_decisions.sql` | New catalog workflow, payment split, cache + governance tables |
| `src/services/workflowGoalsService.js` | Resolvers, feature gates, OCR cache reads, `church.ops.setup` |
| `src/services/workflowRuntimeCacheService.js` | **New** — OCR setup summary cache refresh |
| `src/services/workflowGovernanceService.js` | **New** — deployment history, queue, validation gates |
| `src/services/workflowRegistry.js` | Register `church.ops.setup` |
| `src/routes/admin/church-users.js` | Lock sets `is_locked=1`; identity queries via `church_users` |

### OM front-end (`orthodoxmetrics/prod/front-end`)

| File | Change |
|------|--------|
| `src/routes/portalRoutes.tsx` | Parish OCR setup route `/portal/ocr/setup` |
| `src/features/devel-tools/om-ocr/components/OcrSetupGate.tsx` | Portal-first setup link |
| `src/routes/develRoutes.tsx` | Retain devel routes for platform staff |

### OMAI (`omai/_runtime/server`)

| File | Change |
|------|--------|
| `src/api-ops/platform-workflows.js` | Governance APIs, OMStudio authority endpoint, approve flow gates |

### OMAI UI (`omai/berry`)

| File | Change |
|------|--------|
| `src/views/control-panel/ops/Workflows.tsx` | Deployment history + governance authority panel |

### Documentation

| File | Change |
|------|--------|
| `docs/workflow-catalog-review-implementation.md` | This design summary |
| `docs/app-workflow-catalog-pipeline.md` | Cross-link + decision log |
| `.gitignore` | Whitelist new design doc |

---

## 2. Schema changes

### Catalog (`app_workflows*`)

- **New workflow** `church.ops.setup` under `church_ops` system level (separate from `church.enrollment`).
- **Enrollment payment split:** replace single `payment` step with `payment_pending` (seq 30) and `payment_received` (seq 35).
- **OCR route entrypoints:** add `/portal/ocr/setup` to `ocr.setup.wizard` active version.

### Runtime cache (platform DB)

```sql
workflow_runtime_cache (cache_key PK, payload JSON, refreshed_at)
```

- `cache_key = 'ocr.setup.wizard'` stores aggregated setup counters (no per-refresh church DB scan).

### Governance foundations

```sql
workflow_deployment_history  — deploy/rollback/validate events with rollback_of link
workflow_deployment_queue    — queued deployments with validation_gates JSON
```

Existing `workshop_deployment_requests` and `omstudio_deployment_audit_log` remain; approve flow writes to history + queue.

---

## 3. Migration requirements

1. Run `20260612_workflow_catalog_review_decisions.sql` on `orthodoxmetrics_db` **before** backend deploy.
2. Idempotent `INSERT … ON DUPLICATE KEY` / `CREATE TABLE IF NOT EXISTS` — safe to re-run.
3. Post-migrate: `POST /api/platform/workflow-catalog/sync-production-states` (OMAI) to refresh `omstudio_workflow_refs`.
4. Initial OCR cache: first overview refresh triggers `workflowRuntimeCacheService.refreshOcrSetupCache()` (or manual via governance refresh endpoint).

**Rollback SQL (partial):**

```sql
DROP TABLE IF EXISTS workflow_deployment_queue;
DROP TABLE IF EXISTS workflow_deployment_history;
DROP TABLE IF EXISTS workflow_runtime_cache;
DELETE FROM app_workflows WHERE workflow_key = 'church.ops.setup';
-- Re-merge payment_pending/payment_received → payment manually if needed
```

---

## 4. API changes

| Endpoint | Change |
|----------|--------|
| `GET /api/workflow-goals` | Feature-gated goals; `church.ops.setup` goal; identity via `church_users` |
| `GET /api/platform/workflow-runtime-summary` | OCR stats from cache; ops.setup KPI |
| `POST /api/admin/church-users/:churchId/:userId/lock` | Sets `is_locked=1` (and `is_active=0`) |
| `GET /api/platform/governance/deployment-history` | **New** — paginated history |
| `GET /api/platform/governance/deployment-queue` | **New** — queue status |
| `POST /api/platform/governance/deployment-requests/:id/approve` | Validation gates before deploy |
| `POST /api/platform/governance/runtime-cache/refresh` | **New** — refresh OCR cache |
| `GET /api/platform/governance/workflow-authority` | **New** — OMStudio documentation authority manifest |

No breaking changes to existing catalog list/detail shapes.

---

## 5. UI changes

| Surface | Change |
|---------|--------|
| Parish `WorkflowGoalStrip` | May show `church.ops.setup` after enrollment completes |
| Parish OCR goals | Actions → `/portal/ocr`, `/portal/ocr/setup`, `/portal/upload` |
| `OcrSetupGate` | Portal setup link (devel retained for superadmin menu) |
| OMAI Workflows → OMStudio tab | Deployment history table + authority doc links |
| CCC / Executive overview | KPI includes ops-setup incomplete count |

---

## 6. Deployment requirements

1. **OM:** `git push origin main` → `/var/omai-ops/om-deploy.sh be-sync` then `fe`
2. **OMAI:** `git push origin main` → `/var/omai-ops/omai-deploy.sh be` then `fe`
3. **DB migration** on production `orthodoxmetrics_db` (ops script or manual)
4. Post-deploy: sync production states + optional OCR cache refresh

---

## 7. Rollback strategy

| Layer | Action |
|-------|--------|
| **Code** | Revert commits in reverse phase order; redeploy OM + OMAI |
| **Catalog** | `church.ops.setup` row removable without affecting enrollment |
| **Payment steps** | Resolver falls back if only `payment` step exists (code keeps legacy key mapping) |
| **Governance tables** | Drop new tables; approve flow reverts to audit-only (pre-governance) |
| **OCR cache** | Stale cache ignored if service missing — falls back to live scan (slower) |

---

## 8. Implementation phases (commits)

| Phase | Commit focus |
|-------|----------------|
| 0 | Design summary (this document) |
| 1 | SQL migration |
| 2 | Identity + lock/unlock |
| 3 | Goals service (resolvers, flags, cache, ops.setup) |
| 4 | Portal OCR routes + registry |
| 5 | Governance service + platform APIs |
| 6 | OMStudio UI + pipeline doc update; deploy |

---

## 9. Decision traceability

| # | Decision | Implementation |
|---|----------|----------------|
| 1 | File Workflow #6 as `church.ops.setup` | Migration + resolver + registry + KPI |
| 2 | Separate from `church.enrollment` | Distinct workflow_key; enrollment ends at `activate_parish` |
| 3 | `church_users` authoritative | Identity resolver + stats join `church_users` |
| 4 | Lock uses `is_locked` | `church-users.js` lock endpoint |
| 5 | Payment step split | `payment_pending` / `payment_received` catalog + mapping |
| 6 | Feature flags on goals | `FEATURE_OCR`, `FEATURE_CERTIFICATES` gates |
| 7 | OCR cache in platform DB | `workflow_runtime_cache` + refresh service |
| 8 | Parish OCR → portal routes | `STEP_ACTION_ROUTES` + portal route |
| 9 | Governance foundations | History + queue + validation gates |
| 10 | OMStudio authority | `workflow-authority` API + Workflows UI |
