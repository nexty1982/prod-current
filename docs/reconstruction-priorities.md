# Feature Reconstruction Report

**Generated**: January 26, 2026  
**Purpose**: Gap analysis between September 2025 backup and January 2026 production state  
**Scope**: Backend API, MariaDB schema, and UI component mismatches

---

## Executive Summary

This report identifies **10 critical mismatches** between the September 2025 backup and the current January 2026 production state. The primary gaps involve:

1. **Database Schema Evolution** - Production uses newer column naming conventions
2. **New January Features** - Interactive Reports, Enhanced Gallery, OCR Workflow
3. **Backend Stability Fixes** - Critical fixes applied post-September
4. **UI Field Mapping Gaps** - September UI doesn't match January DB columns

---

## Priority 1: Baptism Records Schema Gap (CRITICAL)

### Feature Name
**Baptismal Records - Database Schema Mismatch**

### Live API Endpoint
- `GET /api/baptism-records` - List records
- `POST /api/baptism-records` - Create record
- `PUT /api/baptism-records/:id` - Update record
- `DELETE /api/baptism-records/:id` - Delete record
- **Alternative**: `GET /api/records/baptisms` (browse.ts)

### Schema Gaps

| Production DB Column | September UI Field | Status |
|---------------------|-------------------|--------|
| `person_first` | `first_name` | ⚠️ MISMATCH |
| `person_middle` | (not present) | ❌ MISSING IN UI |
| `person_last` | `last_name` | ⚠️ MISMATCH |
| `person_full` | (not present) | ❌ MISSING IN UI (generated) |
| `baptism_date` | `reception_date` | ⚠️ MISMATCH |
| `godparents` (JSON) | `sponsor_name` (VARCHAR) | ⚠️ TYPE CHANGE |
| `father_name` | `parents_names` | ⚠️ SPLIT REQUIRED |
| `mother_name` | (not present) | ❌ MISSING IN UI |
| `officiant_name` | `clergy` | ⚠️ MISMATCH |
| `place_name` | (not present) | ❌ MISSING IN UI |
| `source_system` | (not present) | ❌ MISSING IN UI |
| `source_hash` | (not present) | ❌ MISSING IN UI |

### Source Spec
- Schema: `server/database/05_sacrament_tables.sql` (lines 1-38)
- API: `server/src/api/baptism.js`
- UI: `front-end/src/features/records-centralized/components/baptism/BaptismRecordsPage.tsx`
- Docs: `docs/records/RECORDS_SYSTEM_MAP.md`, `docs/records/RECORDS_CANONICAL_SET.md`

### Rebuild Priority
**HIGH** - Core functionality blocked without field mapping

---

## Priority 2: Marriage Records Schema Gap (CRITICAL)

### Feature Name
**Marriage Records - Database Schema Mismatch**

### Live API Endpoint
- `GET /api/marriage-records` - List records
- `POST /api/marriage-records` - Create record
- `PUT /api/marriage-records/:id` - Update record
- `DELETE /api/marriage-records/:id` - Delete record
- **Alternative**: `GET /api/records/marriages` (browse.ts)

### Schema Gaps

| Production DB Column | September UI Field | Status |
|---------------------|-------------------|--------|
| `groom_first` | `groom_first_name` | ⚠️ MISMATCH |
| `groom_middle` | (not present) | ❌ MISSING IN UI |
| `groom_last` | `groom_last_name` | ⚠️ MISMATCH |
| `groom_full` | (not present) | ❌ MISSING IN UI (generated) |
| `bride_first` | `bride_first_name` | ⚠️ MISMATCH |
| `bride_middle` | (not present) | ❌ MISSING IN UI |
| `bride_last` | `bride_last_name` | ⚠️ MISMATCH |
| `bride_full` | (not present) | ❌ MISSING IN UI (generated) |
| `witnesses` (JSON) | `witnesses` (VARCHAR) | ⚠️ TYPE CHANGE |
| `officiant_name` | (not present) | ❌ MISSING IN UI |
| `place_name` | `marriage_place` | ⚠️ MISMATCH |
| `source_system` | (not present) | ❌ MISSING IN UI |
| `source_hash` | (not present) | ❌ MISSING IN UI |

### Source Spec
- Schema: `server/database/05_sacrament_tables.sql` (lines 40-73)
- API: `server/src/api/marriage.js`
- UI: `front-end/src/features/records-centralized/components/marriage/MarriageRecordsPage.tsx`
- Docs: `docs/records/RECORDS_SYSTEM_MAP.md`

### Rebuild Priority
**HIGH** - Core functionality blocked without field mapping

---

## Priority 3: Funeral Records Schema Gap (CRITICAL)

### Feature Name
**Funeral Records - Database Schema Mismatch**

### Live API Endpoint
- `GET /api/funeral-records` - List records
- `POST /api/funeral-records` - Create record
- `PUT /api/funeral-records/:id` - Update record
- `DELETE /api/funeral-records/:id` - Delete record
- **Alternative**: `GET /api/records/funerals` (browse.ts)

### Schema Gaps

| Production DB Column | September UI Field | Status |
|---------------------|-------------------|--------|
| `deceased_first` | `first_name` / `name` | ⚠️ MISMATCH |
| `deceased_middle` | (not present) | ❌ MISSING IN UI |
| `deceased_last` | `last_name` / `lastname` | ⚠️ MISMATCH |
| `deceased_full` | (not present) | ❌ MISSING IN UI (generated) |
| `funeral_date` | (not present) | ❌ MISSING IN UI |
| `burial_place` | `burial_location` | ⚠️ MISMATCH |
| `cause_of_death` | (not present) | ❌ MISSING IN UI |
| `officiant_name` | `priest_name` | ⚠️ MISMATCH |
| `place_name` | (not present) | ❌ MISSING IN UI |
| `source_system` | (not present) | ❌ MISSING IN UI |
| `source_hash` | (not present) | ❌ MISSING IN UI |
| `age_at_death` | (not present in schema) | ❌ ONLY IN UI |

### Source Spec
- Schema: `server/database/05_sacrament_tables.sql` (lines 75-106)
- API: `server/src/api/funeral.js`
- UI: `front-end/src/features/records-centralized/components/death/FuneralRecordsPage.tsx`
- Docs: `docs/records/RECORDS_SYSTEM_MAP.md`

### Rebuild Priority
**HIGH** - Core functionality blocked without field mapping

---

## Priority 4: Interactive Reports Feature (HIGH)

### Feature Name
**Interactive Reports - New January 2026 Feature**

### Live API Endpoint
- `GET /api/records/interactive-reports` - List reports
- `POST /api/records/interactive-reports` - Create report
- `GET /api/records/interactive-reports/:id` - Get report detail
- `GET /api/records/interactive-reports/jobs` - Job monitoring
- `POST /api/records/interactive-reports/jobs/:id/cancel` - Cancel job
- `GET /r/interactive/:token` - Public recipient submission

### Schema Gaps
- **Database tables needed**: `interactive_reports`, `interactive_report_recipients`, `interactive_report_jobs`
- **September UI**: No Interactive Reports feature
- **January production**: Full wizard, review screen, recipient submission page

### Source Spec
- Docs: `docs/1-22-26/INTERACTIVE_REPORT_JOBS_IMPLEMENTATION.md`
- Docs: `docs/1-22-26/INTEGRATION_CHECKLIST.md`
- Routes: `server/src/routes/interactiveReports.js`
- UI: `front-end/src/features/devel-tools/interactive-reports/InteractiveReportJobsPage.tsx`
- UI: `front-end/src/features/records-centralized/components/interactiveReport/`

### Rebuild Priority
**HIGH** - New feature not in September backup

---

## Priority 5: Backend Stability Fixes (HIGH)

### Feature Name
**Backend Crash Prevention - January 2026 Fixes**

### Live API Endpoint
- `GET /api/churches/church-info` - Church info (clientApi.js)
- `GET /api/admin/churches/:id/tables` - Church tables (churches-compat.js)
- All `/api/*` routes (index.ts safe loading)

### Schema Gaps
- **September backend**: Crashes on startup due to module resolution issues
- **January fixes**:
  - `clientApi.js`: Removed `asyncHandler` dependency, uses direct try/catch
  - `db-compat.js`: Exports `getChurchDbConnection` function
  - `interactiveReports.js`: Dynamic column introspection
  - `index.ts`: Safe router loading with graceful degradation

### Source Spec
- Docs: `docs/1-22-26/BACKEND_STABILITY_FIXES_DOCUMENTATION.md`
- Docs: `docs/1-22-26/DATABASE_IMPORT_FIX_FINAL.md`
- Files: `server/src/routes/clientApi.js`, `server/config/db-compat.js`

### Rebuild Priority
**HIGH** - Backend won't boot without these fixes

---

## Priority 6: Gallery System Enhancements (MEDIUM)

### Feature Name
**Gallery Application - January 2026 Enhancements**

### Live API Endpoint
- `GET /api/gallery/images` - List images
- `POST /api/gallery/upload` - Upload images
- `POST /api/gallery/check-usage` - Check codebase usage
- `GET /api/gallery/used-images` - Export used images
- `POST /api/gallery/suggest-destination` - Catalog suggestions
- `POST /api/gallery/validate-actions` - Dry-run validation
- `POST /api/gallery/apply-actions` - Apply batch actions

### Schema Gaps
- **September UI**: Basic gallery view
- **January production**:
  - Tri-state usage tracking (Used / Not Used / Not Checked)
  - Auto-check on filter change
  - Catalog suggestions with dry-run validation
  - Visual indicators (light green for used images)
  - Enhanced delete with per-item error reporting

### Source Spec
- Docs: `docs/1-20-26/gallery-documentation.md`
- Docs: `docs/GALLERY_USAGE_AND_METADATA.md`
- Frontend: `front-end/src/features/devel-tools/om-gallery/Gallery.tsx`
- Backend: `server/routes/gallery.js`

### Rebuild Priority
**MEDIUM** - Enhancements, not core functionality

---

## Priority 7: Date Formatting System (MEDIUM)

### Feature Name
**Date Field Formatting - January 2026 Fixes**

### Live API Endpoint
- Applies to all Records API responses

### Schema Gaps
- **September UI**: Displays ISO timestamps (`2005-01-03T05:00:00.000Z`)
- **January fix**: Uses `formatRecordDate()` utility, displays `YYYY-MM-DD`
- **Fields affected**: All date fields (birth_date, baptism_date, marriage_date, etc.)

### Source Spec
- Docs: `docs/1-22-26/DATE_FORMAT_AND_ADMIN_ENDPOINT_FIX.md`
- Utility: `@/utils/formatDate` (`formatRecordDate` function)
- Files: `BaptismRecordsPage.tsx` (getCellValue function)

### Rebuild Priority
**MEDIUM** - Display issue, not data integrity

---

## Priority 8: OCR Workflow System (MEDIUM)

### Feature Name
**OCR Document Processing - Church-Scoped Endpoints**

### Live API Endpoint
- `GET /api/church/:churchId/ocr/jobs` - List OCR jobs
- `GET /api/church/:churchId/ocr/jobs/:jobId` - Get job detail
- `GET /api/church/:churchId/ocr/jobs/:jobId/fusion/drafts` - Get fusion drafts
- `POST /api/church/:churchId/ocr/jobs/:jobId/fusion/drafts` - Save fusion drafts
- `POST /api/church/:churchId/ocr/jobs/:jobId/fusion/ready-for-review` - Mark ready
- `POST /api/church/:churchId/ocr/jobs/:jobId/review/finalize` - Finalize drafts
- `POST /api/church/:churchId/ocr/jobs/:jobId/review/commit` - Commit to database

### Schema Gaps
- **Database tables**: `ocr_jobs`, `ocr_fused_drafts` (church-specific databases)
- **September UI**: Basic OCR upload
- **January production**: Full workflow with draft/review/commit stages
- **Column issues**: `church_id` may be NULL, `workflow_status` enum needed

### Source Spec
- Docs: `docs/OCR_ENDPOINTS_REFERENCE.md`
- Docs: `docs/ocr/` directory (13 documentation files)
- Backend: `server/src/index.ts` (lines 653-2527)
- Frontend: `front-end/src/features/ocr/`

### Rebuild Priority
**MEDIUM** - Workflow enhancements

---

## Priority 9: Refactor Console Gap Analysis (LOW)

### Feature Name
**Refactor Console - Recovery Mode Feature**

### Live API Endpoint
- `GET /api/refactor-console/scan?compareWithBackup=1` - Scan with gap analysis
- `POST /api/refactor-console/restore` - Restore file from backup

### Schema Gaps
- **September UI**: No recovery mode
- **January production**: Full gap analysis with:
  - Missing file detection (purple indicators)
  - Modified file detection (orange indicators)
  - New file detection (green indicators)
  - One-click restore from backup

### Source Spec
- Docs: `docs/DEVELOPMENT/refactor-console-gap-analysis.md`
- Backend: `server/src/routes/refactorConsole.ts`

### Rebuild Priority
**LOW** - Developer tool, not user-facing

---

## Priority 10: Build System - Smart Deploy (LOW)

### Feature Name
**Smart Build System - January 2026 Enhancement**

### Live API Endpoint
N/A - Build tooling

### Schema Gaps
- **September build**: Full rebuild every time
- **January production**: Smart build system with:
  - Change detection (build-history.json)
  - Incremental TypeScript compile
  - Copy-only mode for runtime files
  - PM2 restart only when backend changes

### Source Spec
- Docs: `docs/1-20-26/operators-guide.md`
- Scripts: `server/scripts/build-smart.js`, `server/scripts/build-all.js`
- Config: `server/build-history.json`

### Rebuild Priority
**LOW** - Build optimization, not functionality

---

## Summary Table

| Priority | Feature | Risk Level | Affected Routes | Action Required |
|----------|---------|------------|-----------------|-----------------|
| 1 | Baptism Records Schema | CRITICAL | `/api/baptism-records` | Field mapping update |
| 2 | Marriage Records Schema | CRITICAL | `/api/marriage-records` | Field mapping update |
| 3 | Funeral Records Schema | CRITICAL | `/api/funeral-records` | Field mapping update |
| 4 | Interactive Reports | HIGH | `/api/records/interactive-reports/*` | Full integration |
| 5 | Backend Stability | HIGH | All `/api/*` routes | Apply fixes |
| 6 | Gallery Enhancements | MEDIUM | `/api/gallery/*` | UI integration |
| 7 | Date Formatting | MEDIUM | All Records routes | Apply formatter |
| 8 | OCR Workflow | MEDIUM | `/api/church/:id/ocr/*` | Workflow integration |
| 9 | Refactor Console | LOW | `/api/refactor-console/*` | Developer tool |
| 10 | Smart Build | LOW | N/A | Build scripts |

---

## Recommended Rebuild Order

### Phase 1: Critical Schema Alignment
1. Update `baptism.js` to use column aliases or view mapping
2. Update `marriage.js` to use column aliases or view mapping
3. Update `funeral.js` to use column aliases or view mapping
4. Update UI components to handle both old and new column names

### Phase 2: Backend Stability
1. Apply `clientApi.js` try/catch fix
2. Apply `db-compat.js` export fix
3. Apply `interactiveReports.js` dynamic introspection
4. Apply `index.ts` safe router loading

### Phase 3: New Features Integration
1. Add Interactive Reports tables and routes
2. Integrate Gallery enhancements
3. Apply date formatting fixes

### Phase 4: Developer Tools
1. Update Refactor Console with gap analysis
2. Update build system with smart deploy

---

## Files to Review

### January 2026 Documentation (Priority)
1. `docs/1-22-26/BACKEND_STABILITY_FIXES_DOCUMENTATION.md` - Critical fixes
2. `docs/1-22-26/DATABASE_IMPORT_FIX_FINAL.md` - Import fix
3. `docs/1-22-26/DATE_FORMAT_AND_ADMIN_ENDPOINT_FIX.md` - Date formatting
4. `docs/1-22-26/INTERACTIVE_REPORT_JOBS_IMPLEMENTATION.md` - New feature
5. `docs/1-20-26/gallery-documentation.md` - Gallery enhancements
6. `docs/1-20-26/operators-guide.md` - Build system

### Schema Files
1. `server/database/05_sacrament_tables.sql` - Production schema
2. `server/src/api/admin.js` (lines 899-1000) - Legacy schema

### Key Source Files
1. `server/src/routes/records/browse.ts` - Unified browse API
2. `server/src/routes/interactiveReports.js` - Interactive Reports
3. `server/config/db-compat.js` - Database compatibility
4. `server/src/routes/clientApi.js` - Client API fixes

---

**Report Generated By**: doc-backend-gap-analysis task  
**Constraint Observed**: No code modifications made - diagnostic only
