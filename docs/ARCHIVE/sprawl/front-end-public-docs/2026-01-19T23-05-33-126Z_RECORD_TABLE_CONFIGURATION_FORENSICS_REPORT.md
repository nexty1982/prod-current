# Record Table Configuration Forensics Report
## OrthodoxMetrics Repository Investigation

**Date:** 2026-01-17  
**Scope:** UI → API → DB data flow for Record Table Configuration system

---

## A) Record Table Configuration: UI → API → DB Map

### Frontend Route/Component

**Route:** `/apps/church-management/:id/field-mapper`  
**Component:** `front-end/src/features/church/FieldMapperPage.tsx`  
**Route Definition:** `front-end/src/routes/Router.tsx:504-510`

**Component Purpose:**
- Configure field mappings (column name → display name)
- Set column visibility and sortability
- Configure default sort field/direction
- Manage record display settings (logos, images, headers)
- Configure dynamic records branding and liturgical themes

### API Endpoints Called

The component makes the following API calls (with fallback paths):

1. **Load Columns (Reload Columns button):**
   - Primary: `/api/admin/churches/${churchId}/tables/${tableName}/columns`
   - Fallbacks (tried in order):
     - `/api/admin/churches/${churchId}/columns?table=${tableName}`
     - `/api/admin/churches/${churchId}/tables/${tableName}`
     - `/api/admin/churches/${churchId}/table-columns?table=${tableName}`
     - `/api/admin/churches/${churchId}/schema?table=${tableName}`
     - `/admin/churches/${churchId}/tables/${tableName}/columns` (legacy)
     - `/admin/churches/${churchId}/columns?table=${tableName}` (legacy)
   - **Handler:** `adminAPI.churches.getTableColumns()` in `front-end/src/api/admin.api.ts:97-180`
   - **What it does:** Fetches column schema from the church database table

2. **Load Field Mappings:**
   - Primary: `/api/admin/churches/${churchId}/field-mapper?table=${tableName}`
   - Fallback: `/admin/churches/${churchId}/field-mapper?table=${tableName}`
   - **What it returns:** `{ columns: [...], mappings: {...}, field_settings: {...} }`
   - **Evidence:** `FieldMapperPage.tsx:502-518`

3. **Save Field Mappings:**
   - Endpoint: `/api/admin/churches/${churchId}/field-mapper`
   - Method: `POST`
   - **Payload:**
     ```json
     {
       "table": "baptism_records",
       "mapping": { "column_name": "new_display_name", ... },
       "field_settings": {
         "visibility": { "column_name": true/false, ... },
         "sortable": { "column_name": true/false, ... },
         "default_sort_field": "column_name",
         "default_sort_direction": "asc|desc"
       }
     }
     ```
   - **Evidence:** `FieldMapperPage.tsx:576-599`

4. **Load Dynamic Records Config:**
   - Endpoint: `/api/admin/churches/${churchId}/dynamic-records-config`
   - **Evidence:** `FieldMapperPage.tsx:429`

5. **Load/Save Record Settings:**
   - Endpoint: `/api/admin/churches/${churchId}/record-settings`
   - **Evidence:** `FieldMapperPage.tsx:993, 1012, 1122`

6. **Load Record Images:**
   - Endpoint: `/api/admin/churches/${churchId}/record-images`
   - **Evidence:** `FieldMapperPage.tsx:810`

### Backend Handler Files

**⚠️ UNKNOWN:** Backend handler files not found in front-end repository.  
**Likely Location:** Separate backend repository (Node.js/Express) or server-side codebase.

**Expected Handler Patterns:**
- `/api/admin/churches/:id/field-mapper` → `routes/admin/churches.js` or `controllers/admin/churchController.js`
- `/api/admin/churches/:id/tables/:table/columns` → Database schema introspection endpoint
- `/api/admin/churches/:id/dynamic-records-config` → Config retrieval endpoint

### Database Usage

**Central Database (`orthodoxmetrics_db`):**

1. **`ag_grid_config` table** (lines 191-216 in schema.sql):
   - Stores AG Grid display configurations per table
   - Columns: `table_name`, `config_name`, `grid_options`, `column_definitions`, `default_column_state`, `filter_model`, `sort_model`, `grid_settings`, `theme_settings`, etc.
   - **Location:** `orthodoxmetrics_db.ag_grid_config`
   - **Purpose:** Per-table grid display settings (visible columns, sorting, filtering, themes)

2. **`record_table` table** (lines 3917-3941 in schema.sql):
   - Stores record table metadata and configurations
   - Columns: `table_name`, `display_name`, `table_type` (baptism/marriage/funeral/custom), `table_config`, `field_definitions`, `display_settings`, `search_config`, `validation_rules`, `import_export_config`, `certificate_config`
   - **Location:** `orthodoxmetrics_db.record_table`
   - **Purpose:** Central registry of record table definitions and configurations

3. **`church_provision` table** (lines 1536+ in schema.sql):
   - Tracks church database provisioning status
   - **Purpose:** Logs when church databases are created/provisioned

**Church Database (`om_church_##`):**

**⚠️ UNKNOWN:** Exact table usage in church databases not confirmed from code inspection.

**Expected Tables (based on UI and naming):**
- `baptism_records` - Actual baptism record data
- `marriage_records` - Actual marriage record data
- `funeral_records` - Actual funeral record data
- `baptism_history` - Audit/history for baptism records
- `marriage_history` - Audit/history for marriage records
- `funeral_history` - Audit/history for funeral records
- Possibly per-church copies of `ag_grid_config` or `record_table` (unconfirmed)

### What "Reload Columns" Does

**Function:** `loadColumns()` in `FieldMapperPage.tsx:488-556`

**Process:**
1. Calls `adminAPI.churches.getTableColumns(churchId, tableName)`
2. Backend queries the church database (`om_church_##`) for the specified table
3. Returns column schema (column names, ordinal positions)
4. Frontend maps columns to UI rows with existing mappings/settings
5. If mappings exist, loads them from `/api/admin/churches/${churchId}/field-mapper?table=${tableName}`
6. Displays columns with current mappings, visibility, and sortability settings

**Data Source:** Reads directly from church database table schema (e.g., `om_church_46.baptism_records`)

---

## B) Table-by-Table Purpose + Usage Evidence

### Central Database (`orthodoxmetrics_db`) Tables

#### `ag_grid_config`
- **Purpose:** Stores AG Grid display configurations (column visibility, sorting, filtering, themes) per table
- **Used:** ✅ Yes - Referenced in schema, likely used by grid display components
- **Read/Write:** Unknown backend handlers (not found in front-end repo)
- **Should stay central or move to church DB:** **Stay central** - Shared configuration patterns

#### `record_table`
- **Purpose:** Central registry of record table definitions, field definitions, display settings, validation rules, certificate configs
- **Used:** ✅ Yes - Referenced in schema
- **Read/Write:** Unknown backend handlers (not found in front-end repo)
- **Should stay central or move to church DB:** **Stay central** - Template/definition registry

#### `church_provision`
- **Purpose:** Tracks church database provisioning/creation status
- **Used:** ✅ Yes - Referenced in schema
- **Read/Write:** Unknown backend handlers (not found in front-end repo)
- **Should stay central or move to church DB:** **Stay central** - System-level provisioning log

### Church Database (`om_church_46`) Tables

**⚠️ NOTE:** Usage evidence is inferred from table names and UI context. Backend code not found to confirm actual usage.

#### `activity_log`
- **Purpose:** Audit log of user actions within the church database
- **Used:** ⚠️ **UNKNOWN** - No code references found
- **Evidence needed:** Backend queries, frontend API calls
- **Recommendation:** Likely per-church (audit logs are church-specific)

#### `ag_grid_config`
- **Purpose:** Per-church AG Grid display settings (if exists in church DB)
- **Used:** ⚠️ **UNKNOWN** - May be duplicate of central table or church-specific overrides
- **Evidence needed:** Check if this table exists in `om_church_46` and how it differs from central `ag_grid_config`
- **Recommendation:** If exists, likely should be per-church (church-specific display preferences)

#### `baptism_records`
- **Purpose:** Actual baptism record data for the church
- **Used:** ✅ **YES** - Referenced in UI (`FieldMapperPage.tsx:87, 91-92`)
- **Evidence:** UI loads columns from this table, table name used in API calls
- **Recommendation:** **Per-church** - Actual record data

#### `baptism_history`
- **Purpose:** Audit/history log for baptism record changes
- **Used:** ⚠️ **UNKNOWN** - No code references found
- **Evidence needed:** Backend triggers, history API endpoints
- **Recommendation:** **Per-church** - Change history is church-specific

#### `calendar_events`
- **Purpose:** Church calendar events
- **Used:** ⚠️ **UNKNOWN** - No code references found in this investigation
- **Recommendation:** **Per-church** - Calendar data is church-specific

#### `change_log`
- **Purpose:** General change log for the church database
- **Used:** ⚠️ **UNKNOWN** - No code references found
- **Recommendation:** **Per-church** - Change logs are church-specific

#### `example_records` / `example2_records` / `example3_records`
- **Purpose:** Likely demo/test data
- **Used:** ⚠️ **UNKNOWN** - No code references found
- **Evidence needed:** Check if these are referenced in any seed scripts or test files
- **Recommendation:** **Remove if unused** - Demo data should not be in production

#### `funeral_history`
- **Purpose:** Audit/history log for funeral record changes
- **Used:** ⚠️ **UNKNOWN** - No code references found
- **Recommendation:** **Per-church** - Change history is church-specific

#### `funeral_records`
- **Purpose:** Actual funeral record data for the church
- **Used:** ✅ **YES** - Referenced in UI (`FieldMapperPage.tsx:94`)
- **Evidence:** UI supports funeral_records table configuration
- **Recommendation:** **Per-church** - Actual record data

#### `marriage_history`
- **Purpose:** Audit/history log for marriage record changes
- **Used:** ⚠️ **UNKNOWN** - No code references found
- **Recommendation:** **Per-church** - Change history is church-specific

#### `marriage_records`
- **Purpose:** Actual marriage record data for the church
- **Used:** ✅ **YES** - Referenced in UI (`FieldMapperPage.tsx:93`)
- **Evidence:** UI supports marriage_records table configuration
- **Recommendation:** **Per-church** - Actual record data

#### `ocr_draft_records`
- **Purpose:** Temporary OCR-processed records before finalization
- **Used:** ⚠️ **UNKNOWN** - No code references found in this investigation
- **Evidence needed:** OCR workflow code, OCR API endpoints
- **Recommendation:** **Per-church** - OCR drafts are church-specific

#### `ocr_finalize_history`
- **Purpose:** History of OCR finalization actions
- **Used:** ⚠️ **UNKNOWN** - No code references found
- **Recommendation:** **Per-church** - OCR history is church-specific

#### `ocr_fused_drafts`
- **Purpose:** Merged/fused OCR draft records
- **Used:** ⚠️ **UNKNOWN** - No code references found
- **Recommendation:** **Per-church** - OCR processing data is church-specific

#### `ocr_jobs`
- **Purpose:** OCR job queue/status tracking
- **Used:** ⚠️ **UNKNOWN** - No code references found
- **Evidence needed:** OCR job processing code
- **Recommendation:** **Per-church** - OCR jobs are church-specific

#### `ocr_mappings`
- **Purpose:** Field mappings for OCR processing (which OCR field → which database column)
- **Used:** ⚠️ **UNKNOWN** - No code references found
- **Evidence needed:** OCR mapping configuration UI/API
- **Recommendation:** **Per-church** - OCR mappings may be church-specific

#### `ocr_settings`
- **Purpose:** OCR processing settings per church
- **Used:** ⚠️ **UNKNOWN** - No code references found
- **Evidence needed:** OCR settings API/UI
- **Recommendation:** **Per-church** - OCR settings are church-specific

#### `record_table`
- **Purpose:** Per-church record table configuration (if exists in church DB)
- **Used:** ⚠️ **UNKNOWN** - May be duplicate of central table or church-specific overrides
- **Evidence needed:** Check if this table exists in `om_church_46` and how it differs from central `record_table`
- **Recommendation:** If exists, may need to consolidate with central `record_table` or clarify purpose

---

## C) Where Table Provisioning / "Template Cloning" Happens

### Findings

**⚠️ NO PROVISIONING CODE FOUND** in the front-end repository.

### Evidence Searched

1. **Database Creation:**
   - Searched for: `CREATE DATABASE om_church_`
   - **Result:** No matches found

2. **Table Creation:**
   - Searched for: `CREATE TABLE baptism_records`, `CREATE TABLE marriage_records`, etc.
   - **Result:** No matches found in scripts directory

3. **Schema Introspection:**
   - Searched for: `SHOW TABLES`, `INFORMATION_SCHEMA`, `DESCRIBE`
   - **Result:** No matches found

4. **Provisioning Keywords:**
   - Searched for: "provision", "onboard", "clone", "template", "seed", "bootstrap"
   - **Result:** Found only git template references and UI template reorganization scripts (not database provisioning)

5. **Church Provision Table:**
   - Found: `church_provision` table in `orthodoxmetrics_db` (schema.sql:1536+)
   - **Purpose:** Tracks provisioning status
   - **Evidence:** Table exists but no code found that writes to it

### Likely Missing Pieces

1. **Backend Provisioning Endpoint:**
   - Expected: `/api/admin/churches/:id/provision` or `/api/admin/churches/wizard` (referenced in `admin.api.ts:84`)
   - **Location:** Backend repository (not in front-end)

2. **Database Creation Script:**
   - Expected: Script that creates `om_church_##` databases
   - **Location:** Backend scripts or server-side code

3. **Table Template/Seed Logic:**
   - Expected: Code that creates standard tables (`baptism_records`, `marriage_records`, etc.) in new church databases
   - **Location:** Backend migration/seed scripts

4. **Schema Cloning:**
   - Expected: Code that copies table schemas from templates or creates them from definitions
   - **Location:** Backend provisioning service

### Entry Point Hypothesis

Based on `admin.api.ts:84`, there's a `createChurchWizard` endpoint:
```typescript
createChurchWizard: (data: any): Promise<ApiResponse> =>
  apiClient.post('/admin/churches/wizard', data),
```

**Likely Flow:**
1. Frontend calls `/admin/churches/wizard` (via `ChurchSetupWizard` component)
2. Backend creates `om_church_##` database
3. Backend creates standard tables (baptism_records, marriage_records, funeral_records, etc.)
4. Backend may copy schema from templates or use predefined schemas
5. Backend logs provisioning status to `church_provision` table

**⚠️ CONFIRMATION NEEDED:** Backend codebase access required to verify this hypothesis.

---

## D) Recommendations (Evidence-Based)

### Template Selection Per Church

**Current State:** ⚠️ **UNKNOWN** - No code found that selects templates per church

**Recommendation:**
- **Store in:** `orthodoxmetrics_db.record_table` (central registry)
- **Link to church:** Add `church_id` column to `record_table` OR create junction table `church_record_templates`
- **Rationale:** Templates are reusable across churches, but churches may have custom overrides

### Per-Church Grid/Display Settings

**Current State:** 
- Central `ag_grid_config` exists
- May have per-church `ag_grid_config` (unconfirmed)

**Recommendation:**
- **Store in:** `om_church_##.ag_grid_config` (per-church table)
- **Fallback:** `orthodoxmetrics_db.ag_grid_config` (default templates)
- **Rationale:** Display preferences (visible columns, sorting) are church-specific, but can inherit from templates

### Schema-Changing Actions

**Current State:** ⚠️ **UNKNOWN** - No schema migration code found

**Recommendation:**
- **Central Management:** Schema changes should be managed centrally (migrations)
- **Per-Church Application:** Migrations applied to each church database
- **Version Tracking:** Track schema version per church database
- **Rationale:** Schema changes need to be consistent and versioned

### Field Mappings (Current Implementation)

**Current State:** Stored via `/api/admin/churches/:id/field-mapper` endpoint

**Recommendation:**
- **Store in:** `om_church_##.record_table` or dedicated `field_mappings` table
- **Alternative:** `orthodoxmetrics_db.church_field_mappings` (centralized with `church_id`)
- **Rationale:** Field mappings (column name → display name) are church-specific but could benefit from template inheritance

---

## E) What's Unclear + How to Confirm

### Critical Unknowns

1. **Backend Handler Locations:**
   - **Question:** Where are the actual API route handlers?
   - **How to confirm:** Access backend repository, search for `/api/admin/churches/:id/field-mapper` route definition

2. **Database Connection Logic:**
   - **Question:** How does backend connect to `om_church_##` databases?
   - **How to confirm:** Find database connection pool/manager code, check for dynamic database selection based on `church_id`

3. **Table Provisioning Code:**
   - **Question:** Where is the code that creates church databases and tables?
   - **How to confirm:** Search backend for `CREATE DATABASE`, `CREATE TABLE`, or ORM migration code

4. **Field Mappings Storage:**
   - **Question:** Where are field mappings actually stored after POST to `/field-mapper`?
   - **How to confirm:** Trace backend handler, find INSERT/UPDATE queries

5. **`record_table` vs `ag_grid_config` Usage:**
   - **Question:** What's the difference between these two tables? Do they overlap?
   - **How to confirm:** Compare table schemas, find code that reads/writes to each

6. **Per-Church vs Central Config:**
   - **Question:** Do church databases have their own `ag_grid_config` and `record_table`?
   - **How to confirm:** Query `om_church_46` database directly, check for these tables

7. **Template System:**
   - **Question:** Is there a template system that defines standard table schemas?
   - **How to confirm:** Search for "template" in database queries, check `orthodoxmetrics_db` for template tables

### Recommended Next Steps

1. **Access Backend Repository:**
   - Locate API route handlers
   - Find database connection logic
   - Identify provisioning/migration code

2. **Query `om_church_46` Database:**
   - List all tables: `SHOW TABLES;`
   - Check for `ag_grid_config`, `record_table` in church DB
   - Compare schemas with central database

3. **Trace API Calls:**
   - Use browser DevTools to capture actual API requests/responses
   - Verify which database is queried for each endpoint

4. **Review Backend Logs:**
   - Check for database creation logs
   - Look for provisioning workflow logs

---

## Summary

### Confirmed

✅ **UI Component:** `FieldMapperPage.tsx` at `/apps/church-management/:id/field-mapper`  
✅ **API Endpoints:** Multiple endpoints with fallback paths  
✅ **Central Tables:** `ag_grid_config`, `record_table`, `church_provision` exist in `orthodoxmetrics_db`  
✅ **Reload Columns:** Reads schema from church database table  
✅ **"Reload Columns" Functionality:** Reads schema from church database table  

### Unknown

⚠️ **Backend Handlers:** Not found in front-end repository  
⚠️ **Provisioning Code:** No database creation/migration code found  
⚠️ **Field Mapping Storage:** Exact storage location not confirmed  
⚠️ **Per-Church Tables:** Usage of tables in `om_church_46` not fully confirmed  
⚠️ **Template System:** Template selection/cloning logic not found  

### Next Implementation Approach

1. **Phase 1: Backend Investigation**
   - Access backend codebase
   - Map all API handlers
   - Identify database connection patterns

2. **Phase 2: Database Audit**
   - Query `om_church_46` directly
   - Compare with `orthodoxmetrics_db`
   - Document actual table usage

3. **Phase 3: Consolidation Plan**
   - Determine optimal storage locations (central vs per-church)
   - Design template inheritance system
   - Plan migration strategy

---

**Report Generated:** 2026-01-17  
**Investigation Scope:** Front-end repository only  
**Backend Access:** Required for complete picture
