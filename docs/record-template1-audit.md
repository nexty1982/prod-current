# record_template1 — Canonical Tenant Database Audit (v1.1.0)

> **Superseded**: This audit documents the v1.1.0 state. All gaps identified here were resolved in v2.0.0.
> See [record-template1-v2-gap-analysis.md](record-template1-v2-gap-analysis.md) for the v2 upgrade details.

**Date**: 2026-03-28
**Auditor**: omsvc (Claude CLI agent)
**Database**: `record_template1`
**Charset/Collation**: utf8mb4 / utf8mb4_unicode_ci

---

## 1. Purpose

`record_template1` is the **canonical schema template** used to provision new tenant databases during church onboarding. When a church is promoted from Phase 1 (Infancy) to Phase 2 (Child), the system runs:

```bash
mysqldump --no-data record_template1 | mysql om_church_{churchId}
```

This creates a schema-only clone. The template exists (rather than cloning a live tenant) because:

- **No data leakage** — live tenants contain real sacramental records; `--no-data` on a dedicated template guarantees zero PII exposure.
- **Controlled schema** — live tenants accumulate ad-hoc tables, test data, and schema drift. A frozen template is the single source of truth for what a new tenant should look like.
- **Deterministic provisioning** — every new church starts with identical structure, AUTO_INCREMENT values, and constraints.

### Origin

Sourced from `dump-orthodoxmetrics_ch_37-202508101846.sql` (Church 37, August 10 2025). This is recorded in the `template_meta` table.

---

## 2. Summary of Findings

| Finding | Severity | Action Required |
|---------|----------|-----------------|
| 8 stale test rows in `marriage_history` | Medium | TRUNCATE |
| `marriage_records` AUTO_INCREMENT at 211 (should be 1) | Medium | RESET |
| `marriage_history` AUTO_INCREMENT at 9 (should be 1) | Low | RESET |
| `template_meta` AUTO_INCREMENT at 2 (should be 1) | Low | RESET |
| `baptism_records` missing 4 columns vs live tenants | High | ADD (Phase 6) |
| `baptism_records.entry_type` nullable (live is NOT NULL) | Medium | ALTER (Phase 6) |
| 16 tables missing vs live tenants | High | ADD (Phase 6) |
| Duplicate index on `activity_log` | Low | DROP (Phase 6) |
| No triggers, views, routines, or events | Info | Expected |

---

## 3. Table-by-Table Analysis

### 3.1 activity_log

| Attribute | Value |
|-----------|-------|
| Rows | 0 |
| AUTO_INCREMENT | 1 |
| Status | **CLEAN** |
| Recommendation | **KEEP_REQUIRED** |

Core audit trail table. Tracks all user actions within a tenant.

**Issue**: Duplicate index — both `idx_act_church` and `idx_activity_log_church_id` index the `church_id` column. The redundant index wastes space on every tenant clone.

**Columns**: id, church_id, user_id, action, entity_type, entity_id, details (JSON), ip_address, created_at

---

### 3.2 baptism_history

| Attribute | Value |
|-----------|-------|
| Rows | 0 |
| AUTO_INCREMENT | 1 |
| Status | **CLEAN** |
| Recommendation | **KEEP_REQUIRED** |

Edit history for baptism records. FK to `baptism_records(id)` with CASCADE delete.

**Columns**: id, baptism_id, church_id, field_name, old_value, new_value, changed_by, changed_at

---

### 3.3 baptism_records

| Attribute | Value |
|-----------|-------|
| Rows | 0 |
| AUTO_INCREMENT | 1 |
| Status | **SCHEMA DRIFT** |
| Recommendation | **KEEP_REQUIRED** (with schema updates in Phase 6) |

Primary sacramental record table. Schema is behind live tenants.

**Missing columns** (present in `om_church_46` but absent here):
- `source_scan_id` INT DEFAULT NULL — links record to OCR source scan
- `ocr_confidence` DECIMAL(5,2) DEFAULT NULL — OCR accuracy score
- `verified_by` INT DEFAULT NULL — user who verified OCR output
- `verified_at` DATETIME DEFAULT NULL — verification timestamp

**Schema difference**:
- `entry_type`: template has `DEFAULT NULL`, live has `NOT NULL DEFAULT 'Baptism'`

**Columns (current)**: id, church_id, child_first_name, child_middle_name, child_last_name, date_of_birth, date_of_baptism, place_of_baptism, father_first_name, father_middle_name, father_last_name, mother_first_name, mother_middle_name, mother_last_name, godfather_first_name, godfather_middle_name, godfather_last_name, godmother_first_name, godmother_middle_name, godmother_last_name, priest_name, notes, entry_number, entry_type, page_number, created_at, updated_at, record_status

---

### 3.4 change_log

| Attribute | Value |
|-----------|-------|
| Rows | 0 |
| AUTO_INCREMENT | 1 |
| Status | **CLEAN** |
| Recommendation | **KEEP_REQUIRED** |

Generic change tracking table. Provides a secondary audit trail alongside `activity_log`.

**Columns**: id, church_id, table_name, record_id, field_name, old_value, new_value, changed_by, change_type, created_at

---

### 3.5 church_settings

| Attribute | Value |
|-----------|-------|
| Rows | 0 |
| AUTO_INCREMENT | 1 |
| Status | **CLEAN** |
| Recommendation | **KEEP_REQUIRED** |

Per-tenant configuration store.

**Columns**: id, church_id, setting_key, setting_value, created_at, updated_at

---

### 3.6 funeral_history

| Attribute | Value |
|-----------|-------|
| Rows | 0 |
| AUTO_INCREMENT | 1 |
| Status | **CLEAN** |
| Recommendation | **KEEP_REQUIRED** |

Edit history for funeral records. FK to `funeral_records(id)` with CASCADE delete.

**Columns**: id, funeral_id, church_id, field_name, old_value, new_value, changed_by, changed_at

---

### 3.7 funeral_records

| Attribute | Value |
|-----------|-------|
| Rows | 0 |
| AUTO_INCREMENT | 1 |
| Status | **CLEAN** |
| Recommendation | **KEEP_REQUIRED** |

Funeral sacramental records. Schema matches live tenants.

**Columns**: id, church_id, deceased_first_name, deceased_middle_name, deceased_last_name, date_of_birth, date_of_death, date_of_funeral, place_of_funeral, place_of_burial, cause_of_death, priest_name, notes, entry_number, entry_type, page_number, created_at, updated_at, record_status

---

### 3.8 marriage_history

| Attribute | Value |
|-----------|-------|
| Rows | **8** |
| AUTO_INCREMENT | **9** |
| Status | **STALE DATA** |
| Recommendation | **KEEP_REQUIRED** (after TRUNCATE) |

Edit history for marriage records. FK to `marriage_records(id)` with CASCADE delete.

**Stale data**: 8 rows from May 2025 testing (church_id=14, test names "John Doe", "Jane Roe", "Nick Parsells"). These are leftover from the original Church 37 dump and must be removed before the template is frozen.

**Columns**: id, marriage_id, church_id, field_name, old_value, new_value, changed_by, changed_at

---

### 3.9 marriage_records

| Attribute | Value |
|-----------|-------|
| Rows | 0 |
| AUTO_INCREMENT | **211** |
| Status | **STALE AUTO_INCREMENT** |
| Recommendation | **KEEP_REQUIRED** (after AI reset) |

Marriage sacramental records. Schema matches live tenants. All rows were deleted but AUTO_INCREMENT was never reset — new tenants would start IDs at 211 instead of 1.

**Columns**: id, church_id, groom_first_name, groom_middle_name, groom_last_name, bride_first_name, bride_middle_name, bride_last_name, date_of_marriage, place_of_marriage, officiating_priest, best_man_first_name, best_man_middle_name, best_man_last_name, maid_of_honor_first_name, maid_of_honor_middle_name, maid_of_honor_last_name, notes, entry_number, entry_type, page_number, created_at, updated_at, record_status

---

### 3.10 ocr_jobs

| Attribute | Value |
|-----------|-------|
| Rows | 0 |
| AUTO_INCREMENT | 1 |
| Status | **CLEAN** |
| Recommendation | **KEEP_OPTIONAL** |

OCR job tracking. Only relevant for churches using the OCR digitization pipeline. Clean and ready.

**Columns**: id, church_id, job_type, status, source_file, result_file, error_message, started_at, completed_at, created_at, updated_at

---

### 3.11 template_meta

| Attribute | Value |
|-----------|-------|
| Rows | **1** |
| AUTO_INCREMENT | **2** |
| Status | **EVALUATE** |
| Recommendation | **KEEP_OPTIONAL** |

Metadata about the template itself. Contains 1 row documenting origin:
- `name`: "record_template1"
- `source`: "dump-orthodoxmetrics_ch_37-202508101846.sql"
- `created_at`: 2025-08-10

This table is excluded from `mysqldump --no-data` clones (no data copied). It serves as internal documentation for the template only. Decision: keep the table and its data as governance metadata.

**Columns**: id, name, description, source, version, created_at, updated_at

---

## 4. Missing Tables (vs live tenant om_church_46)

The following 16 tables exist in live tenants but are **absent from record_template1**:

### OCR Pipeline (8 tables)
| Table | Purpose | Priority |
|-------|---------|----------|
| `ocr_draft_records` | Staging area for OCR-extracted records | High |
| `ocr_feeder_artifacts` | Uploaded scan files metadata | High |
| `ocr_feeder_pages` | Individual page tracking within scans | High |
| `ocr_finalize_history` | Audit trail for record finalization | Medium |
| `ocr_fused_drafts` | Merged/deduplicated OCR results | High |
| `ocr_mappings` | Column mapping configurations | Medium |
| `ocr_settings` | Per-tenant OCR preferences | Medium |
| `ocr_setup_state` | OCR onboarding wizard state | Low |

### Other (8 tables)
| Table | Purpose | Priority |
|-------|---------|----------|
| `ag_grid_config` | Saved AG Grid column/filter states | Medium |
| `calendar_events` | Church calendar/scheduling | Medium |
| `record_supplements` | Additional fields for records | Medium |
| `record_table` | Generic record type definitions | Low |
| `example_records` | Example/demo record type | Low |
| `example2_records` | Example/demo record type | Low |
| `example3_records` | Example/demo record type | Low |
| `test` | Test table (should NOT be added) | None |

---

## 5. Schema Drift Summary

| Table | Column/Issue | Template | Live | Fix |
|-------|-------------|----------|------|-----|
| `baptism_records` | `source_scan_id` | MISSING | INT DEFAULT NULL | ADD COLUMN |
| `baptism_records` | `ocr_confidence` | MISSING | DECIMAL(5,2) DEFAULT NULL | ADD COLUMN |
| `baptism_records` | `verified_by` | MISSING | INT DEFAULT NULL | ADD COLUMN |
| `baptism_records` | `verified_at` | MISSING | DATETIME DEFAULT NULL | ADD COLUMN |
| `baptism_records` | `entry_type` | DEFAULT NULL | NOT NULL DEFAULT 'Baptism' | ALTER COLUMN |
| `activity_log` | Duplicate index | `idx_act_church` + `idx_activity_log_church_id` | — | DROP one |

---

## 6. Recommendations

### Immediate (This Audit — Phases 2-5)
1. **Backup** `record_template1` in full before any changes
2. **TRUNCATE** `marriage_history` (8 stale test rows)
3. **Reset AUTO_INCREMENT** on `marriage_records` (211→1), `marriage_history` (9→1), `template_meta` (2→1)
4. **Update `template_meta`** with audit date, version, and freeze status
5. **Freeze** — mark as approved canonical template

### Future (Phase 6)
1. **Add missing OCR columns** to `baptism_records` (source_scan_id, ocr_confidence, verified_by, verified_at)
2. **Fix `entry_type`** constraint on `baptism_records` (NOT NULL DEFAULT 'Baptism')
3. **Add OCR pipeline tables** (8 tables) — required for churches using OCR digitization
4. **Add `calendar_events`** — needed for church scheduling features
5. **Add `ag_grid_config`** — needed for saved grid states
6. **Add `record_supplements`** — needed for extended record fields
7. **Drop duplicate index** `idx_act_church` from `activity_log`
8. **Do NOT add** `test`, `example_records`, `example2_records`, `example3_records` — these are dev artifacts

---

## 7. Governance

After cleanup and freeze:
- Any schema changes to `record_template1` require a migration script in `server/database/migrations/`
- Changes should be applied to both the template AND existing tenant databases
- `template_meta` should be updated with each schema change (version bump)
- Template should be re-audited quarterly or before major onboarding batches
