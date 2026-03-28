# Tenant Database Provisioning

## Overview

New church tenant databases (`om_church_{churchId}`) are provisioned from the approved `record_template1` template database. This process is triggered automatically during Phase 1→2 promotion, or manually via CLI.

## Architecture

```
record_template1 (v2.0.0, 20 tables, frozen)
    │
    ├── mysqldump --no-data ──► om_church_{churchId}
    │                            ├── 20 tables (empty)
    │                            ├── church_id defaults set
    │                            └── verified against checklist
    │
    └── template_meta (governance row, not cloned to tenants)
```

### Design Decision: Option A (mysqldump clone)

Chosen over Option B (replay migration SQL) because:
- **Single source of truth**: `record_template1` IS the schema definition — no second artifact to maintain
- **No drift risk**: Template and provisioning always match by definition
- **Proven**: Already used in production; extended with validation + verification

## Usage

### Automatic (Phase Promotion)

When a church is promoted from Phase 1 (Infancy) to Phase 2 (Child) via the control panel or API:

```
POST /api/admin/church-onboarding/promote
{ "church_id": 99, "from_phase": 1, "to_phase": 2 }
```

The provisioning service is called automatically. It:
1. Validates the template (version check, frozen status)
2. Creates `om_church_99`
3. Clones schema from `record_template1`
4. Sets `church_id` DEFAULT on all applicable tables
5. Verifies 20 tables exist with correct columns
6. Updates `churches.db_name` and `churches.database_name`

### CLI Script

```bash
# Provision a single church
node scripts/provision-tenant-db.js <church_id>

# Verify an existing tenant DB
node scripts/provision-tenant-db.js --verify om_church_46

# Validate template readiness
node scripts/provision-tenant-db.js --validate-template

# Full test cycle (provision → verify → cleanup)
node scripts/provision-tenant-db.js --test
```

### Programmatic (Service Module)

```js
const { provisionTenantDb, validateTemplate, verifyExistingTenantDb } = require('../services/tenantProvisioning');

// Provision
const result = await provisionTenantDb(churchId, pool, {
  allowExisting: false,    // Fail if DB already exists (default)
  skipChurchUpdate: false,  // Update churches table (default)
  force: false,            // Bypass version check AND duplicate guard (default: false)
  source: 'onboarding',   // Audit trail: caller identifier
  initiatedBy: userId,     // Audit trail: who triggered it
  requestId: 'unique-id',  // Idempotency key (optional)
});

// Result structure
{
  success: true,
  churchId: 99,
  targetDb: 'om_church_99',
  templateVersion: '2.0.0',
  tablesCreated: 20,
  verified: true,
  dbCreated: true,
  churchIdDefaultsSet: true,
  versionOverride: false,
  idempotent: false,
  durationMs: 8500,
  error: null,
  errorType: null,
  warnings: [],
}
```

## Template Requirements

Provisioning will **refuse to proceed** if:
- `record_template1` database does not exist
- `template_meta.version` != `2.0.0` (or current `APPROVED_VERSION`)
- `template_meta.frozen_at` is NULL (template not frozen)
- Template has fewer than 20 tables

## Audit Trail

Every provisioning attempt (success or failure) is recorded in `orthodoxmetrics_db.tenant_provisioning_log`:

| Column | Type | Description |
|---|---|---|
| id | INT PK | Auto-increment |
| church_id | INT | Target church |
| db_name | VARCHAR(128) | Target database name (`om_church_{id}`) |
| template_version | VARCHAR(20) | Template version used (or attempted) |
| status | ENUM | `started`, `success`, `failure` |
| started_at | DATETIME | When provisioning began |
| completed_at | DATETIME | When provisioning ended |
| duration_ms | INT | Total duration in milliseconds |
| error_message | TEXT | Error details (on failure) |
| error_type | VARCHAR(40) | Structured error classification (see Error Classification) |
| initiated_by | VARCHAR(64) | User ID or `cli`/`system` |
| source | VARCHAR(32) | Caller: `onboarding`, `crm`, `lifecycle`, `demo`, `admin`, `cli` |
| request_id | VARCHAR(64) | Idempotency key (UNIQUE) |
| version_override | TINYINT | 1 if `force:true` bypassed version check |
| warnings | TEXT | JSON array of warning strings |
| verification_passed | TINYINT | 1=passed, 0=failed, NULL=not attempted |
| expected_table_count | INT | Expected tables (currently 20) |
| actual_table_count | INT | Actual tables found in provisioned DB |
| missing_tables | JSON | Tables expected but not found (null if none) |
| extra_tables | JSON | Tables found but not in template (null if none) |

Audit logging is best-effort — a failed log write will never block provisioning.

### Verification Snapshot

Each audit row includes a structural verification snapshot of the provisioned database. This enables post-factum diagnosis of schema issues without needing to re-inspect the tenant DB.

- **verification_passed**: Whether the full verification checklist passed. `NULL` if provisioning failed before verification ran (e.g., template version mismatch).
- **expected_table_count / actual_table_count**: Numeric comparison. A mismatch indicates partial clone or extra tables.
- **missing_tables**: JSON array of table names that should exist but don't. `NULL` when all expected tables are present.
- **extra_tables**: JSON array of table names present in the tenant DB but not in the template. `NULL` when no extras.

### Example Audit Entries

```
-- Successful provision, clean verification
id=1  status=success  version=2.0.0  verification_passed=1  expected=20  actual=20  missing=null  extra=null

-- Failed before verification (version mismatch)
id=2  status=failure  version=null  verification_passed=null  expected=null  actual=null  error="Template version 1.9.0 != approved 2.0.0"

-- Successful but with missing table (hypothetical)
id=3  status=success  version=2.0.0  verification_passed=0  expected=20  actual=19  missing=["record_supplements"]  extra=null
```

## Template Version Enforcement

Provisioning strictly enforces the approved template version (`APPROVED_VERSION` constant in `tenantProvisioning.js`):

1. Reads `record_template1.template_meta.version`
2. Compares to `APPROVED_VERSION` (currently `2.0.0`)
3. **Fails immediately** if versions don't match

### Override

Pass `force: true` in the options to bypass the version check:

```js
await provisionTenantDb(churchId, pool, { force: true, source: 'admin', initiatedBy: userId });
```

When overridden:
- Provisioning proceeds with the mismatched template
- `version_override = 1` is set in the audit log
- A warning is added to the result: `"Template version override: actual=X, approved=Y"`
- Console warning is emitted

Overrides are for emergency use only — they indicate the template is out of sync with the approved version.

## Duplicate Provisioning Guard

Before creating a database, provisioning checks two sources:

1. **`churches.db_name`** — if the church already has a database assigned
2. **`tenant_provisioning_log`** — if a previous successful provisioning exists for this church_id

If either check finds an existing provision, provisioning fails with `DUPLICATE_PROVISION` error type unless `force: true` is passed.

This prevents accidental re-provisioning from CRM, lifecycle, or onboarding flows calling provisioning multiple times for the same church.

## Idempotency

Pass `requestId` in options to enable idempotent retries:

```js
const result = await provisionTenantDb(churchId, pool, {
  requestId: 'crm-provision-church-99-1711612800',
  source: 'crm',
});
```

Behavior:
- First call with a given `requestId`: provisions normally, stores `request_id` in audit log
- Subsequent calls with the same `requestId`: returns the cached result without re-provisioning
- The returned result has `idempotent: true` and a warning noting the cached return

The `request_id` column has a UNIQUE index — only one provisioning per key.

## Error Classification

Every provisioning failure is classified with a structured `error_type`:

| error_type | Meaning |
|---|---|
| `TEMPLATE_VERSION_MISMATCH` | Template version != approved version |
| `TEMPLATE_NOT_FOUND` | `record_template1` database does not exist |
| `TEMPLATE_NOT_FROZEN` | Template `frozen_at` is NULL |
| `TEMPLATE_INVALID` | Cannot read `template_meta` |
| `DB_ALREADY_EXISTS` | Target database already exists (without `allowExisting`) |
| `DUPLICATE_PROVISION` | Church already provisioned (duplicate guard) |
| `SCHEMA_CLONE_FAILED` | `mysqldump` pipe failed |
| `CONNECTION_ERROR` | Database connection refused or access denied |
| `UNKNOWN` | Unclassified error |

The `error_type` is stored in `tenant_provisioning_log.error_type` for structured querying:

```sql
-- Find all template drift failures
SELECT * FROM tenant_provisioning_log WHERE error_type = 'TEMPLATE_VERSION_MISMATCH';

-- Count failures by type
SELECT error_type, COUNT(*) FROM tenant_provisioning_log WHERE status = 'failure' GROUP BY error_type;
```

## Safety Guarantees

| Safety Check | How |
|---|---|
| No overwrite | Fails if target DB exists (unless `allowExisting: true`) |
| Duplicate guard | Fails if church already provisioned (unless `force: true`) |
| Idempotent retries | Same `requestId` returns cached result, no re-provisioning |
| Rollback on failure | Drops the empty DB if schema clone fails |
| No data leakage | Uses `--no-data` flag — only schema is cloned |
| Template validation | Checks version + freeze status before every provision |
| Post-provision verification | Validates table count, critical tables, column presence |
| Prefix guard | Rollback refuses to drop DBs not starting with `om_church_` |
| Structured logging | Every attempt logged with success/failure, timing, error_type |

## Verification Checklist

After provisioning, the service verifies:

1. All 20 expected tables exist
2. 13 critical tables present (core records, history, OCR, audit)
3. All tables are empty (0 rows)
4. `baptism_records.entry_type` defaults to `'Baptism'`
5. `baptism_records` has OCR columns (source_scan_id, ocr_confidence, verified_by, verified_at)
6. All 3 history tables have audit columns (diff_data, actor_user_id, source, request_id, ip_address)
7. `church_id` defaults set on applicable tables

## Files

| File | Purpose |
|---|---|
| `server/src/services/tenantProvisioning.js` | Centralized provisioning service (single source of truth) |
| `server/src/routes/admin/church-onboarding.js` | Phase promotion endpoints — delegates to service |
| `server/src/routes/crm.js` | CRM lead provisioning — delegates to service |
| `server/src/routes/admin/church-lifecycle.js` | Lifecycle stage transitions — delegates to service |
| `server/src/routes/admin/demo-churches.js` | Demo church creation — delegates to service |
| `server/src/api/admin.js` | Church wizard endpoint — delegates to service |
| `scripts/provision-tenant-db.js` | CLI entrypoint |
| `server/database/migrations/20260328_record_template1_v2_upgrade.sql` | Template v2 migration |
| `server/database/migrations/20260328_tenant_provisioning_log.sql` | Provisioning audit trail table |
| `server/database/migrations/20260328_tenant_provisioning_log_verification.sql` | Verification snapshot columns |
| `server/database/migrations/20260328_tenant_provisioning_log_hardening.sql` | Idempotency + error classification columns |
| `docs/record-template1-audit.md` | Original template audit |
| `docs/record-template1-v2-gap-analysis.md` | v2 gap analysis and decisions |

## Callers of the Centralized Service

| Endpoint / Caller | File | How |
|---|---|---|
| `POST /promote` (single) | church-onboarding.js | Phase 1→2 triggers `provisionTenantDb()` |
| `POST /batch-promote` | church-onboarding.js | Batch phase 1→2 triggers `provisionTenantDb()` per church |
| `POST /:churchId/promote` | church-onboarding.js | Individual promote triggers `provisionTenantDb()` |
| `POST /churches/wizard` | admin.js | Church setup wizard triggers `provisionTenantDb()` |
| `POST /crm/churches/:id/provision` | crm.js | CRM lead provisioning triggers `provisionTenantDb()` |
| `PUT /admin/church-lifecycle/:id/stage` | church-lifecycle.js | Lifecycle stage transition triggers `provisionTenantDb()` |
| `POST /admin/demo-churches` | demo-churches.js | Demo church creation triggers `provisionTenantDb()` (fatal on failure) |
| `node scripts/provision-tenant-db.js` | CLI | Manual provisioning |

## Deprecated: ChurchProvisioner (Legacy)

`server/src/services/church-provisioner.js` is a deprecated legacy provisioning system. All callers have been migrated to `tenantProvisioning.js` as of 2026-03-28. The legacy file is retained for reference only — it always failed at runtime because its SQL template file (`templates/church-database-template.sql`) never existed.

## Template Version History

| Version | Date | Changes |
|---|---|---|
| 1.0.0 | 2025-08-10 | Initial template from Church 37 dump |
| 1.1.0 | 2026-03-28 | Audit cleanup: stale data removed, AUTO_INCREMENT reset, governance metadata added |
| 2.0.0 | 2026-03-28 | Schema gaps closed: +4 OCR columns, +5 audit columns per history table, ocr_jobs rebuilt, 9 new tables added, duplicate index removed. 20 tables total. |
