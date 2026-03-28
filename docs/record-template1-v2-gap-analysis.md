# record_template1 v1.1.0 → v2.0.0 Gap Analysis

**Date**: 2026-03-28
**Analyst**: omsvc (Claude CLI agent)
**Template Version**: v1.1.0 (frozen 2026-03-28)
**Target Version**: v2.0.0

---

## 1. Current-State Comparison

### Method

- Template DDL: extracted from `record_template1` (11 tables)
- Application code: `server/src/controllers/records.js` FIELD_MAP, `server/src/utils/writeSacramentHistory.js`, OCR route files
- Reference tenant: `om_church_46` used as comparison target only (not source of truth)
- Code usage: grep analysis across `server/src/` for every table/column in question

### Template Tables (v1.1.0)

| Table | Columns | Status |
|-------|---------|--------|
| activity_log | 6 | Duplicate index |
| baptism_history | 7 | Missing 5 columns required by writeSacramentHistory |
| baptism_records | 11 | Missing 4 OCR columns, entry_type constraint wrong |
| change_log | 9 | Clean |
| church_settings | 10 | Clean |
| funeral_history | 7 | Missing 5 columns required by writeSacramentHistory |
| funeral_records | 9 | Clean |
| marriage_history | 7 | Missing 5 columns required by writeSacramentHistory |
| marriage_records | 12 | Clean |
| ocr_jobs | 11 | Inadequate schema — missing 24+ columns used by OCR worker |
| template_meta | 9 | Governance table — keep as-is |

### Missing Tables (16 in reference, not in template)

| Table | Code References | Files Using It |
|-------|----------------|----------------|
| ocr_draft_records | 234 (grouped OCR) | fusion.ts, review.ts, jobs.ts, etc. |
| ocr_feeder_artifacts | (grouped) | ocrFeederWorker.ts, feeder.js |
| ocr_feeder_pages | (grouped) | ocrFeederWorker.ts, feeder.js |
| ocr_finalize_history | (grouped) | fusion.ts |
| ocr_fused_drafts | (grouped) | fusion.ts, review.ts, mapping.ts |
| ocr_mappings | (grouped) | mapping.ts, review.ts |
| ocr_settings | (grouped) | settings.ts, ocr-preferences.js |
| ocr_setup_state | (grouped) | setupWizard.ts |
| record_supplements | 25 | recordSupplements.js, migrate script |
| ag_grid_config | 0 | No server code references this table |
| calendar_events | 3 | Created on-demand by admin.js, church-decom.js |
| record_table | 7 | interactiveReports.js (column name, not table) |
| example_records | 0 | Dev artifact |
| example2_records | 0 | Dev artifact |
| example3_records | 0 | Dev artifact |
| test | 0 | Dev artifact |

---

## 2. Gap Analysis

### 2.1 baptism_records — Missing 4 OCR Columns

**Evidence**: `controllers/records.js` FIELD_MAP includes `source_scan_id` and `ocr_confidence`. Live tenant has `verified_by` and `verified_at` for OCR verification workflow.

| Column | Type | Default | Reason |
|--------|------|---------|--------|
| source_scan_id | VARCHAR(255) | NULL | Links record to OCR source scan. Mapped from `registryNumber` in FIELD_MAP |
| ocr_confidence | DECIMAL(5,2) | 0.00 | OCR accuracy score. Referenced in FIELD_MAP and seed-records.js |
| verified_by | INT(11) | NULL | User who verified OCR-extracted record |
| verified_at | DATETIME | NULL | Verification timestamp |

**entry_type constraint**: Template has `DEFAULT NULL`, should be `NOT NULL DEFAULT 'Baptism'`. Live tenant and application logic assume a non-null default.

**Missing indexes**: Template has only `idx_bap_name`, `idx_bap_dates`, `idx_bap_church`, `idx_baptism_records_church_id` (duplicate). Live has church-prefixed composite indexes which are better for tenant-scoped queries.

**Decision**: ADD all 4 columns, FIX entry_type constraint, REPLACE indexes with church-prefixed composites, DROP duplicate index.

### 2.2 History Tables — Missing 5 Columns Each

**Evidence**: `writeSacramentHistory.js` (line 169) inserts into history tables with 11 columns:
```sql
INSERT INTO {history_table}
  (type, description, timestamp, record_id, record_data, church_id, actor_user_id, source, request_id, ip_address, diff_data)
```

Template history tables only have the first 7 columns. **Writes will fail on new tenants.**

| Column | Type | Default | Reason |
|--------|------|---------|--------|
| diff_data | LONGTEXT | NULL | JSON diff of changed fields (line 153-157) |
| actor_user_id | INT(11) | NULL | User who made the change |
| source | VARCHAR(20) | 'system' | Change source identifier |
| request_id | VARCHAR(64) | NULL | Request correlation ID |
| ip_address | VARCHAR(45) | NULL | Client IP for audit trail |

**Missing indexes**: Live tenants have composite indexes for efficient queries:
- `idx_{prefix}_record` — (church_id, record_id, timestamp)
- `idx_{prefix}_request` — (church_id, request_id)
- `idx_{prefix}_actor` — (church_id, actor_user_id, timestamp)

**Decision**: ADD all 5 columns and 3 composite indexes to all 3 history tables.

### 2.3 activity_log — Duplicate Index

**Evidence**: Template has both `idx_act_church` and `idx_activity_log_church_id` on `church_id`. Live tenant only has `idx_activity_log_church_id`.

**Decision**: DROP `idx_act_church`. Keep `idx_activity_log_church_id` (matches provisioning script naming convention).

### 2.4 ocr_jobs — Inadequate Schema

**Evidence**: Template ocr_jobs has 11 columns with a basic schema. Live ocr_jobs has 35+ columns used by `ocrFeederWorker.ts`, `jobs.ts`, and the full OCR pipeline. Key missing columns include `user_id`, `storage_path`, `file_size`, `confidence_score`, `pages`, `processing_time_ms`, `processing_started_at`, `processing_ended_at`, `killed_at`, `worker_id`, `retry_count`, `archived_at`, etc.

**Decision**: DROP and recreate with complete schema. Clean up duplicate indexes from live (keep composite indexes, drop redundant single-column ones).

### 2.5 Missing Tables — Classification

#### REQUIRED_BASELINE (10 tables)

These tables are actively used by application code and must exist for core features to function.

| Table | Justification |
|-------|---------------|
| ocr_draft_records | Staging area for OCR-extracted records. Used by fusion.ts, review.ts |
| ocr_feeder_artifacts | Uploaded scan file metadata. Used by ocrFeederWorker.ts |
| ocr_feeder_pages | Per-page tracking within scans. Used by ocrFeederWorker.ts |
| ocr_finalize_history | Audit trail for record finalization. Used by fusion.ts |
| ocr_fused_drafts | Merged/deduplicated OCR results. Used by fusion.ts, review.ts, mapping.ts |
| ocr_mappings | Column mapping configurations. Used by mapping.ts |
| ocr_settings | Per-tenant OCR preferences. Used by settings.ts, ocr-preferences.js |
| ocr_setup_state | OCR onboarding wizard state. Used by setupWizard.ts |
| record_supplements | Extended record fields. Has dedicated API route (recordSupplements.js) and migration script |

Note: `ocr_jobs` already exists in template but needs schema replacement (counted above, not here).

#### OPTIONAL_FEATURE_PACK (3 tables)

These tables are used by optional features and created on-demand by admin tools. They should NOT be in the baseline template but may be added via a separate migration when the feature is enabled for a church.

| Table | Justification |
|-------|---------------|
| ag_grid_config | No server code queries this table. AG Grid feature controlled by feature flags, not table presence |
| calendar_events | Created on-demand by `admin.js` CREATE TABLE IF NOT EXISTS. Tenant calendar is an optional feature |
| record_table | Used as a column value in interactiveReports.js, not as a standalone table. Created on-demand |

#### DO_NOT_INCLUDE (4 tables)

| Table | Justification |
|-------|---------------|
| example_records | Dev/demo artifact — generic contact records schema |
| example2_records | Dev/demo artifact — task management schema |
| example3_records | Dev/demo artifact — product inventory schema |
| test | Dev/test artifact — graph/axis/type columns |

---

## 3. Decisions Summary

### Schema Changes to Existing Tables

| # | Table | Change | Type |
|---|-------|--------|------|
| 1 | baptism_records | ADD source_scan_id VARCHAR(255) DEFAULT NULL | ADD COLUMN |
| 2 | baptism_records | ADD ocr_confidence DECIMAL(5,2) DEFAULT 0.00 | ADD COLUMN |
| 3 | baptism_records | ADD verified_by INT(11) DEFAULT NULL | ADD COLUMN |
| 4 | baptism_records | ADD verified_at DATETIME DEFAULT NULL | ADD COLUMN |
| 5 | baptism_records | ALTER entry_type NOT NULL DEFAULT 'Baptism' | ALTER COLUMN |
| 6 | baptism_records | DROP idx_bap_name, idx_bap_dates, idx_bap_church; ADD church-prefixed composites | INDEX |
| 7 | baptism_history | ADD 5 columns + 3 composite indexes | ADD COLUMN + INDEX |
| 8 | marriage_history | ADD 5 columns + 3 composite indexes | ADD COLUMN + INDEX |
| 9 | funeral_history | ADD 5 columns + 3 composite indexes | ADD COLUMN + INDEX |
| 10 | activity_log | DROP idx_act_church | DROP INDEX |
| 11 | ocr_jobs | DROP and recreate with full schema | RECREATE |

### New Tables

| # | Table | Classification | Action |
|---|-------|---------------|--------|
| 12 | ocr_draft_records | REQUIRED_BASELINE | CREATE |
| 13 | ocr_feeder_artifacts | REQUIRED_BASELINE | CREATE |
| 14 | ocr_feeder_pages | REQUIRED_BASELINE | CREATE |
| 15 | ocr_finalize_history | REQUIRED_BASELINE | CREATE |
| 16 | ocr_fused_drafts | REQUIRED_BASELINE | CREATE |
| 17 | ocr_mappings | REQUIRED_BASELINE | CREATE |
| 18 | ocr_settings | REQUIRED_BASELINE | CREATE |
| 19 | ocr_setup_state | REQUIRED_BASELINE | CREATE |
| 20 | record_supplements | REQUIRED_BASELINE | CREATE |
| 21 | ag_grid_config | OPTIONAL_FEATURE_PACK | SKIP |
| 22 | calendar_events | OPTIONAL_FEATURE_PACK | SKIP |
| 23 | record_table | OPTIONAL_FEATURE_PACK | SKIP |
| 24-27 | example_*, test | DO_NOT_INCLUDE | SKIP |

### Final Template Inventory (v2.0.0)

20 tables total:
- 11 existing (with schema fixes applied)
- 9 new REQUIRED_BASELINE tables

---

## 4. Index Cleanup Rationale

### activity_log
- DROP `idx_act_church` — duplicate of `idx_activity_log_church_id`, both on `church_id`
- KEEP `idx_activity_log_church_id` — matches provisioning naming convention

### baptism_records
- DROP `idx_bap_name` (last_name, first_name) — replaced by church-scoped index
- DROP `idx_bap_dates` (birth_date, reception_date) — replaced by church-scoped indexes
- DROP `idx_bap_church` — duplicate of `idx_baptism_records_church_id`
- ADD `idx_church_lastname` (church_id, last_name)
- ADD `idx_church_firstname` (church_id, first_name)
- ADD `idx_church_birthdate` (church_id, birth_date)
- ADD `idx_church_receptiondate` (church_id, reception_date)

### ocr_jobs
- Deduplicated indexes from live tenant (removed redundant single-column indexes where composite equivalents exist)

---

## 5. Verification Criteria

After migration:
1. All 20 tables exist with correct column counts
2. All tables have 0 rows (except template_meta with 1 row)
3. All AUTO_INCREMENT values are 1 (template_meta at 2)
4. No duplicate indexes remain
5. History table INSERTs with 11 columns succeed
6. baptism_records.entry_type defaults to 'Baptism'
7. template_meta version = '2.0.0', frozen_at updated
