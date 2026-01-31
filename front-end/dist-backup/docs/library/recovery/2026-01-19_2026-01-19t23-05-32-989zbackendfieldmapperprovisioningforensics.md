# Backend Field Mapper + Provisioning Forensics Report
## OrthodoxMetrics Server Implementation

**Date:** 2026-01-17  
**Scope:** Backend route handlers, SQL execution, database selection, and provisioning logic

---

## A) Route Handlers: File Paths + Exported Routers

### Primary Route File
**File:** `server/routes/admin/churches.js`  
**Exported:** `module.exports = router;` (line 2488)  
**Router Type:** Express Router

### Alternative Route Files (Legacy/Backup)
- `server/src/routes/admin/churches.js` - Alternative implementation
- `server/src/api/churches.js` - API layer implementation

**Note:** The primary active route file appears to be `server/routes/admin/churches.js` based on file structure and completeness.

---

## B) Field Mapper Endpoints: Implementation Details

### 1. GET `/api/admin/churches/:id/field-mapper?table=TABLE_NAME`

**File:** `server/routes/admin/churches.js:925-965`

**Handler Function:**
```javascript
router.get('/:id/field-mapper', async (req, res) => {
  const churchId = parseInt(req.params.id, 10);
  const table = String(req.query.table || '').trim();
  
  await validateChurchAccess(churchId);
  
  // Query central database for stored mappings
  const [rows] = await getAppPool().query(
    `SELECT mapping_json, field_settings_json
     FROM \`${APP_DB}\`.church_field_mappings
     WHERE church_id = ? AND table_name = ?
     LIMIT 1`,
    [churchId, table]
  );
  
  // Parse JSON and return
  return res.json({
    success: true,
    mappings: mapping_json || {},
    field_settings: field_settings_json || {}
  });
});
```

**SQL Statements:**
1. `SELECT mapping_json, field_settings_json FROM orthodoxmetrics_db.church_field_mappings WHERE church_id = ? AND table_name = ?`

**Database Used:** `orthodoxmetrics_db` (central database)  
**Tables:** `orthodoxmetrics_db.church_field_mappings`

**Storage:**
- **Mapping (column → display name):** Stored in `church_field_mappings.mapping_json` (LONGTEXT/JSON)
- **Field Settings (visibility/sort/default sort):** Stored in `church_field_mappings.field_settings_json` (LONGTEXT/JSON)

**Table Schema:**
```sql
CREATE TABLE IF NOT EXISTS orthodoxmetrics_db.church_field_mappings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  church_id INT NOT NULL,
  table_name VARCHAR(128) NOT NULL,
  mapping_json LONGTEXT NULL,
  field_settings_json LONGTEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_church_table (church_id, table_name),
  CHECK (JSON_VALID(mapping_json)),
  CHECK (JSON_VALID(field_settings_json))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

---

### 2. POST `/api/admin/churches/:id/field-mapper`

**File:** `server/routes/admin/churches.js:870-922`

**Handler Function:**
```javascript
router.post('/:id/field-mapper', async (req, res) => {
  const churchId = parseInt(req.params.id, 10);
  const { table, mapping = {}, field_settings = {} } = req.body || {};
  
  await validateChurchAccess(churchId);
  
  // Ensure table exists
  await getAppPool().query(`
    CREATE TABLE IF NOT EXISTS \`${APP_DB}\`.church_field_mappings (...)
  `);
  
  // Upsert mappings
  await getAppPool().query(
    `INSERT INTO \`${APP_DB}\`.church_field_mappings
     (church_id, table_name, mapping_json, field_settings_json)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       mapping_json = VALUES(mapping_json),
       field_settings_json = VALUES(field_settings_json),
       updated_at = CURRENT_TIMESTAMP`,
    [churchId, table, JSON.stringify(mapping), JSON.stringify(field_settings)]
  );
  
  return res.json({ success: true });
});
```

**SQL Statements:**
1. `CREATE TABLE IF NOT EXISTS orthodoxmetrics_db.church_field_mappings (...)` (if table doesn't exist)
2. `ALTER TABLE orthodoxmetrics_db.church_field_mappings ADD COLUMN IF NOT EXISTS ...` (migration support)
3. `INSERT INTO orthodoxmetrics_db.church_field_mappings (...) VALUES (...) ON DUPLICATE KEY UPDATE ...`

**Database Used:** `orthodoxmetrics_db` (central database)  
**Tables:** `orthodoxmetrics_db.church_field_mappings`

**Payload Structure:**
```json
{
  "table": "baptism_records",
  "mapping": {
    "first_name": "First Name",
    "last_name": "Last Name"
  },
  "field_settings": {
    "visibility": { "first_name": true, "last_name": true },
    "sortable": { "first_name": true, "last_name": true },
    "default_sort_field": "last_name",
    "default_sort_direction": "asc"
  }
}
```

---

### 3. GET `/api/admin/churches/:id/tables/:tableName/columns`

**File:** `server/routes/admin/churches.js:843-868`

**Handler Function:**
```javascript
router.get('/:id/tables/:table/columns', async (req, res) => {
  const churchId = parseInt(req.params.id, 10);
  const table = String(req.params.table || '').trim();
  
  const { database_name } = await validateChurchAccess(churchId);
  
  // Query INFORMATION_SCHEMA for column names
  const [rows] = await getAppPool().query(
    `SELECT COLUMN_NAME
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
     ORDER BY ORDINAL_POSITION`,
    [database_name, table]
  );
  
  const columns = rows.map(r => r.COLUMN_NAME);
  return res.json({ success: true, columns });
});
```

**SQL Statements:**
1. `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? ORDER BY ORDINAL_POSITION`

**Database Used:** `INFORMATION_SCHEMA` (system schema)  
**Target Database:** Church database (`om_church_##` or `database_name` from `churches` table)

**What "Reload Columns" Does:**
- Reads column schema directly from the church database table
- Uses `INFORMATION_SCHEMA.COLUMNS` to get column names and ordinal positions
- Returns list of column names in order
- **No caching** - always reads live schema from database

**Database Selection:**
1. Validates church access via `validateChurchAccess(churchId)`
2. Queries `orthodoxmetrics_db.churches` to get `database_name` for the church
3. Uses that `database_name` in `INFORMATION_SCHEMA` query to read from church database

---

### 4. GET `/api/admin/churches/:id/columns?table=TABLE_NAME`

**File:** `server/routes/admin/churches.js:814-841`

**Alternative endpoint** - Same functionality as `/:id/tables/:table/columns` but uses query parameter instead of path parameter.

**SQL:** Same as endpoint #3 above.

---

### 5. GET `/api/admin/churches/:id/record-settings`

**File:** `server/routes/admin/churches.js:1735-1812`

**Handler Function:**
```javascript
router.get('/:id/record-settings', async (req, res) => {
  const churchId = parseInt(req.params.id, 10);
  await validateChurchAccess(churchId);
  
  // Ensure table exists
  await getAppPool().query(`
    CREATE TABLE IF NOT EXISTS ${APP_DB}.church_record_settings (
      id INT AUTO_INCREMENT PRIMARY KEY,
      church_id INT NOT NULL,
      settings JSON NOT NULL,
      updated_by INT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY unique_church (church_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  
  // Fetch settings
  const [rows] = await getAppPool().query(
    `SELECT settings FROM ${APP_DB}.church_record_settings WHERE church_id = ?`,
    [churchId]
  );
  
  const settings = rows.length > 0 ? (typeof rows[0].settings === 'string' 
    ? JSON.parse(rows[0].settings) 
    : rows[0].settings) : {};
    
  res.json({ success: true, settings });
});
```

**SQL Statements:**
1. `CREATE TABLE IF NOT EXISTS orthodoxmetrics_db.church_record_settings (...)` (if needed)
2. `SELECT settings FROM orthodoxmetrics_db.church_record_settings WHERE church_id = ?`

**Database Used:** `orthodoxmetrics_db` (central database)  
**Tables:** `orthodoxmetrics_db.church_record_settings`

**Storage:** Record display settings (logos, images, headers, branding) stored as JSON in `settings` column.

---

### 6. POST `/api/admin/churches/:id/record-settings`

**File:** `server/routes/admin/churches.js:1815-1912`

**Handler Function:**
```javascript
router.post('/:id/record-settings', upload.single('logo'), async (req, res) => {
  const churchId = parseInt(req.params.id, 10);
  await validateChurchAccess(churchId);
  
  // Parse settings from FormData
  let settings = {};
  if (req.body.settings) {
    settings = typeof req.body.settings === 'string' 
      ? JSON.parse(req.body.settings) 
      : req.body.settings;
  }
  
  // Handle logo file upload if provided
  if (req.file) {
    const logoPath = `/uploads/church-logos/${req.file.filename}`;
    if (!settings.logo) settings.logo = {};
    settings.logo.path = logoPath;
  }
  
  // Upsert settings
  await getAppPool().query(
    `INSERT INTO ${APP_DB}.church_record_settings (church_id, settings, updated_by)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE 
       settings = VALUES(settings),
       updated_by = VALUES(updated_by),
       updated_at = CURRENT_TIMESTAMP`,
    [churchId, JSON.stringify(settings), userId]
  );
  
  res.json({ success: true, message: 'Settings saved successfully', settings });
});
```

**SQL Statements:**
1. `CREATE TABLE IF NOT EXISTS orthodoxmetrics_db.church_record_settings (...)` (if needed)
2. `INSERT INTO orthodoxmetrics_db.church_record_settings (...) VALUES (...) ON DUPLICATE KEY UPDATE ...`

**Database Used:** `orthodoxmetrics_db` (central database)  
**Tables:** `orthodoxmetrics_db.church_record_settings`

---

### 7. GET `/api/admin/churches/:id/dynamic-records-config`

**File:** `server/routes/admin/churches.js:2322-2340`

**Handler Function:**
```javascript
router.get('/:id/dynamic-records-config', async (req, res) => {
  const churchId = parseInt(req.params.id, 10);
  await validateChurchAccess(churchId);
  
  // Return empty config for now - can be extended later
  res.json({ success: true, config: {} });
});
```

**SQL Statements:** None (returns empty config)

**Database Used:** None  
**Status:** **Stub implementation** - returns empty config object

---

### 8. GET `/api/admin/churches/:id/record-images`

**File:** `server/routes/admin/churches.js:1531-1732`

**Handler Function:**
- Handles file uploads for record images (logo, bg, baptism, marriage, funeral, g1, omLogo)
- Stores files on filesystem: `RECORD_IMAGES_BASE_DIR/churchId/type/filename`
- Returns file URL path

**SQL Statements:** None (file-based storage)

**Database Used:** None (filesystem storage)  
**Storage Location:** Filesystem at `RECORD_IMAGES_BASE_DIR` (default: `/var/www/orthodoxmetrics/uploads/record-images`)

---

### 9. POST `/admin/churches/wizard` (or `/api/admin/churches/wizard`)

**File:** `server/routes/admin/churches.js:2343-2487`

**Handler Function:**
```javascript
router.post('/wizard', upload.single('logo'), async (req, res) => {
  const {
    church_name, address, city, country,
    admin_full_name, admin_email, admin_password,
    setup_templates = true,
    record_types = ['baptism', 'marriage', 'funeral']
  } = req.body;
  
  // Prepare church data and template options
  const churchData = { name, address, city, ... };
  const templateOptions = { setupTemplates, recordTypes, ... };
  
  // Use enhanced church setup service
  const setupResult = await churchSetupService.setupNewChurch(churchData, templateOptions);
  
  res.status(201).json({
    success: true,
    church: setupResult.church,
    templates: setupResult.templates
  });
});
```

**Service Called:** `churchSetupService.setupNewChurch()`  
**Service File:** `server/services/churchSetupService.js:18-65`

---

## C) Database Selection Logic

### How Database is Selected

**Central Database (`orthodoxmetrics_db`):**
- Accessed via: `getAppPool()` from `server/config/db.js`
- Used for: Church metadata, field mappings, record settings, themes, user management

**Church Database (`om_church_##`):**
- Database name stored in: `orthodoxmetrics_db.churches.database_name`
- Accessed via: `getChurchDbConnection(databaseName)` from `server/utils/dbSwitcher.js`
- Used for: Actual record data (baptism_records, marriage_records, funeral_records)

**Database Selection Flow:**
1. Route handler receives `churchId` parameter
2. Calls `validateChurchAccess(churchId)` which:
   - Queries `orthodoxmetrics_db.churches` to get church record
   - Returns `database_name` field
3. For church database queries: Uses `getChurchDbConnection(database_name)`
4. For central database queries: Uses `getAppPool()` directly

**Code Location:**
- `validateChurchAccess()`: `server/routes/admin/churches.js:801-812`
- `getChurchDbConnection()`: `server/utils/dbSwitcher.js:18-42`

---

## D) Storage Locations: What's Stored Where

### Central Database (`orthodoxmetrics_db`)

#### 1. `church_field_mappings`
- **Purpose:** Stores field mappings (column → display name) and field settings (visibility, sortable, default sort)
- **Columns:**
  - `church_id` (INT) - Links to church
  - `table_name` (VARCHAR(128)) - e.g., "baptism_records"
  - `mapping_json` (LONGTEXT) - JSON: `{ "column_name": "Display Name", ... }`
  - `field_settings_json` (LONGTEXT) - JSON: `{ visibility: {...}, sortable: {...}, default_sort_field: "...", default_sort_direction: "asc" }`
- **Unique Constraint:** `(church_id, table_name)`
- **Used By:** Field Mapper GET/POST endpoints

#### 2. `church_record_settings`
- **Purpose:** Stores record display settings (logos, images, headers, branding)
- **Columns:**
  - `church_id` (INT)
  - `settings` (JSON) - Complete record display configuration
  - `updated_by` (INT) - User ID who last updated
- **Unique Constraint:** `(church_id)`
- **Used By:** Record Settings GET/POST endpoints

#### 3. `church_themes`
- **Purpose:** Stores liturgical themes and branding for records
- **Columns:**
  - `church_id` (INT) - 0 for global themes
  - `themes` (LONGTEXT/JSON) - Theme definitions
- **Used By:** Themes GET/POST endpoints

#### 4. `ag_grid_config`
- **Purpose:** Stores AG Grid display configurations per table
- **Location:** `orthodoxmetrics_db.ag_grid_config`
- **Status:** ⚠️ **UNKNOWN USAGE** - Table exists in schema but no code found that reads/writes to it in field mapper routes
- **Evidence:** Table defined in `orthodoxmetrics_schema.sql:191-216` but no queries found in route handlers

#### 5. `record_table`
- **Purpose:** Central registry of record table definitions
- **Location:** `orthodoxmetrics_db.record_table`
- **Status:** ⚠️ **UNKNOWN USAGE** - Table exists in schema but no code found that reads/writes to it
- **Evidence:** Table defined in `orthodoxmetrics_schema.sql:3917-3941` but no queries found in route handlers

### Church Database (`om_church_##`)

#### Record Tables (Created During Provisioning):
- `baptism_records` - Actual baptism record data
- `marriage_records` - Actual marriage record data
- `funeral_records` - Actual funeral record data
- `baptism_history` - Audit/history (if created)
- `marriage_history` - Audit/history (if created)
- `funeral_history` - Audit/history (if created)

**Schema Source:** Hardcoded SQL in `createChurchDatabaseSchema()` function (lines 669-785)

---

## E) Provisioning: Database + Table Creation

### Entry Point

**Route:** `POST /api/admin/churches/wizard`  
**File:** `server/routes/admin/churches.js:2343-2487`  
**Service:** `churchSetupService.setupNewChurch()`  
**Service File:** `server/services/churchSetupService.js:18-65`

### Database Creation

**Location:** `server/src/api/admin.js:775-1200` (wizard endpoint implementation)

**SQL Statements:**
1. `CREATE DATABASE IF NOT EXISTS \`${dbName}\`` (line 783)
   - Database name format: `om_church_${churchId}` or from `database_name` field

2. `CREATE USER IF NOT EXISTS '${dbUser}'@'localhost' IDENTIFIED BY '${dbPassword}'` (line 787)
   - User format: `church_${churchId}`

3. `GRANT ALL PRIVILEGES ON \`${dbName}\`.* TO '${dbUser}'@'localhost'` (line 791)

### Table Creation

**Two Methods Found:**

#### Method 1: Hardcoded Schema (Primary)
**File:** `server/routes/admin/churches.js:669-785`  
**Function:** `createChurchDatabaseSchema(churchDb)`

**Tables Created:**
1. `church_config` - Church configuration
2. `baptism_records` - Baptism records (lines 690-707)
3. `marriage_records` - Marriage records (lines 710-729)
4. `funeral_records` - Funeral records (lines 732-748)
5. `entity_extraction_corrections` - OCR corrections
6. `activity_logs` - Activity logging

**Schema Source:** Hardcoded SQL strings in JavaScript

#### Method 2: Template Cloning (Alternative)
**File:** `server/src/api/admin.js:833-893`

**Process:**
1. Queries `INFORMATION_SCHEMA.TABLES` to get tables from template database
2. For each table:
   - `SHOW CREATE TABLE \`${templateDatabaseName}\`.\`${tableName}\``
   - Replaces database name in CREATE statement
   - Executes in new church database
3. Also creates tables from hardcoded definitions (lines 899-1065)

**Template Database:** Referenced as `record_template1` or `templateDatabaseName` (from request body)

**Tables Cloned:**
- `baptism_records`, `baptism_history`
- `marriage_records`, `marriage_history`
- `funeral_records`, `funeral_history`
- Plus: `clergy`, `members`, `donations`, `calendar_events`

### Schema Sources

**Confirmed Sources:**
1. **Hardcoded SQL** - Primary method in `createChurchDatabaseSchema()` function
2. **Template Database Cloning** - Alternative method using `SHOW CREATE TABLE` from template DB
3. **No Migrations Found** - No migration system detected
4. **No Templates Table** - No evidence of `orthodoxmetrics_db.templates` table being queried for schema definitions

### Provisioning Trigger

**Entry Points:**
1. `POST /api/admin/churches/wizard` - Church creation wizard
2. `POST /api/admin/churches` - Direct church creation (calls `churchSetupService.setupNewChurch()`)

**Flow:**
1. Frontend calls wizard endpoint
2. Backend validates input
3. Calls `churchSetupService.setupNewChurch()`
4. Service calls `createChurchDatabase()` (internal method)
5. Database created: `CREATE DATABASE IF NOT EXISTS om_church_${churchId}`
6. Tables created via `createChurchDatabaseSchema()` or template cloning
7. Church record inserted into `orthodoxmetrics_db.churches`
8. Returns church ID and database name

---

## F) Complete Data Flow Map

### UI → API → Backend → SQL → Database

#### Scenario: User Configures Field Mappings

1. **UI:** `FieldMapperPage.tsx` at `/apps/church-management/:id/field-mapper`
2. **Load Columns (Reload Columns button):**
   - Frontend: `adminAPI.churches.getTableColumns(churchId, tableName)`
   - API Call: `GET /api/admin/churches/${churchId}/tables/${tableName}/columns`
   - Backend: `server/routes/admin/churches.js:843-868`
   - SQL: `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?`
   - Database: `INFORMATION_SCHEMA` (reads from church DB: `om_church_46`)
   - Returns: `{ columns: ["id", "first_name", "last_name", ...] }`

3. **Load Existing Mappings:**
   - API Call: `GET /api/admin/churches/${churchId}/field-mapper?table=${tableName}`
   - Backend: `server/routes/admin/churches.js:925-965`
   - SQL: `SELECT mapping_json, field_settings_json FROM orthodoxmetrics_db.church_field_mappings WHERE church_id = ? AND table_name = ?`
   - Database: `orthodoxmetrics_db` (central)
   - Returns: `{ mappings: {...}, field_settings: {...} }`

4. **Save Mappings:**
   - API Call: `POST /api/admin/churches/${churchId}/field-mapper`
   - Backend: `server/routes/admin/churches.js:870-922`
   - SQL: `INSERT INTO orthodoxmetrics_db.church_field_mappings (...) VALUES (...) ON DUPLICATE KEY UPDATE ...`
   - Database: `orthodoxmetrics_db` (central)
   - Tables: `orthodoxmetrics_db.church_field_mappings`
   - Columns Written: `mapping_json`, `field_settings_json`

---

## G) Inconsistencies & Findings

### 1. Multiple Route Files
**Finding:** Three different route files exist:
- `server/routes/admin/churches.js` (primary, most complete)
- `server/src/routes/admin/churches.js` (alternative)
- `server/src/api/churches.js` (API layer)

**Inconsistency:** Different implementations may be active depending on route registration. Need to verify which is actually mounted in `index.js`.

### 2. Field Mappings Storage: Two Table Names
**Finding:** Two different table names found:
- `orthodoxmetrics_db.church_field_mappings` (in `server/routes/admin/churches.js`)
- `orthodoxmetrics_db.field_mapper_settings` (in `server/src/routes/admin/churches.js`)

**Inconsistency:** Different table names in different route files. Need to verify which is actually used in production.

### 3. AG Grid Config: Defined but Unused
**Finding:** `orthodoxmetrics_db.ag_grid_config` table exists in schema but:
- No route handlers found that read/write to it
- Field mapper uses `church_field_mappings` instead
- May be legacy or planned for future use

**Status:** Table exists but appears unused in current field mapper implementation.

### 4. Record Table: Defined but Unused
**Finding:** `orthodoxmetrics_db.record_table` table exists in schema but:
- No route handlers found that read/write to it
- No references in provisioning code
- May be legacy or planned for future use

**Status:** Table exists but appears unused.

### 5. Dynamic Records Config: Stub Implementation
**Finding:** `GET /api/admin/churches/:id/dynamic-records-config` returns empty config:
```javascript
res.json({ success: true, config: {} });
```

**Status:** Endpoint exists but not fully implemented.

### 6. Database Name Format Inconsistency
**Finding:** Multiple database name formats found:
- `om_church_${churchId}` (most common)
- `orthodoxmetrics_ch_${churchId}` (in `server/src/routes/admin/churches.js:86`)
- Generated from church name (in `church-provisioner.js:21-29`)

**Inconsistency:** Database naming not standardized across codebase.

### 7. Table Creation: Two Methods
**Finding:** Tables can be created via:
1. Hardcoded SQL in `createChurchDatabaseSchema()` function
2. Template cloning from `record_template1` database

**Inconsistency:** Two different provisioning paths may create different table schemas.

---

## H) Provisioning Code Path

### Complete Flow: Church Creation → Database Provisioning

**Entry Point:** `POST /api/admin/churches/wizard`  
**File:** `server/routes/admin/churches.js:2343`

**Step-by-Step:**

1. **Request Received:**
   - Route: `server/routes/admin/churches.js:2343`
   - Validates required fields

2. **Service Call:**
   - Calls: `churchSetupService.setupNewChurch(churchData, templateOptions)`
   - File: `server/services/churchSetupService.js:18`

3. **Database Creation:**
   - Internal method: `createChurchDatabase()` (not shown in file, likely in `server/src/api/admin.js`)
   - SQL: `CREATE DATABASE IF NOT EXISTS \`om_church_${churchId}\``
   - Location: `server/src/api/admin.js:783`

4. **Table Creation:**
   - Method 1: Calls `createChurchDatabaseSchema(churchDb)`
     - File: `server/routes/admin/churches.js:669-785`
     - Creates: `baptism_records`, `marriage_records`, `funeral_records`, `church_config`, `activity_logs`, `entity_extraction_corrections`
   - Method 2: Clones from template database
     - File: `server/src/api/admin.js:833-893`
     - Uses: `SHOW CREATE TABLE` to get schema from template DB
     - Clones: Selected tables based on `selected_tables` parameter

5. **Church Record Creation:**
   - Inserts into: `orthodoxmetrics_db.churches`
   - Sets: `database_name` field to `om_church_${churchId}`

6. **Template Setup (Optional):**
   - Calls: `setupChurchTemplates(churchId, templateOptions)`
   - File: `server/services/churchSetupService.js:73-141`
   - May duplicate global templates for church use

**Schema Source:** Hardcoded SQL strings (primary method)

**Template Database:** `record_template1` (if template cloning is used)

**No Migrations:** No migration system found - schemas are hardcoded or cloned.

---

## I) Summary: Storage Locations

### Field Mappings (Column → Display Name)
- **Storage:** `orthodoxmetrics_db.church_field_mappings.mapping_json`
- **Format:** JSON object: `{ "column_name": "Display Name", ... }`
- **Per-Church:** Yes (indexed by `church_id` + `table_name`)

### Field Settings (Visibility/Sort/Default Sort)
- **Storage:** `orthodoxmetrics_db.church_field_mappings.field_settings_json`
- **Format:** JSON object: `{ visibility: {...}, sortable: {...}, default_sort_field: "...", default_sort_direction: "asc" }`
- **Per-Church:** Yes (indexed by `church_id` + `table_name`)

### AG Grid Config
- **Storage:** `orthodoxmetrics_db.ag_grid_config` (table exists)
- **Usage:** ⚠️ **UNKNOWN** - No code found that reads/writes to it
- **Status:** May be legacy or unused

### Record Table Config
- **Storage:** `orthodoxmetrics_db.record_table` (table exists)
- **Usage:** ⚠️ **UNKNOWN** - No code found that reads/writes to it
- **Status:** May be legacy or unused

### Record Display Settings (Logos/Images/Headers)
- **Storage:** `orthodoxmetrics_db.church_record_settings.settings`
- **Format:** JSON object with complete display configuration
- **Per-Church:** Yes (indexed by `church_id`)

### Record Images (Files)
- **Storage:** Filesystem at `RECORD_IMAGES_BASE_DIR/churchId/type/filename`
- **Database:** None (file-based)
- **Per-Church:** Yes (organized by `churchId`)

### Actual Record Data
- **Storage:** `om_church_##.baptism_records`, `om_church_##.marriage_records`, `om_church_##.funeral_records`
- **Per-Church:** Yes (separate database per church)

---

## J) Recommendations

### 1. Consolidate Route Files
- Verify which route file is actually mounted in `server/index.js`
- Remove or deprecate unused route files
- Standardize on single implementation

### 2. Standardize Table Names
- Choose one: `church_field_mappings` vs `field_mapper_settings`
- Update all code to use consistent name
- Migrate data if needed

### 3. Clarify AG Grid Config Usage
- Determine if `ag_grid_config` table is needed
- If unused, document as legacy or remove
- If needed, implement read/write handlers

### 4. Standardize Database Naming
- Choose one format: `om_church_${id}` (recommended)
- Update all code to use consistent format
- Document naming convention

### 5. Unify Table Creation
- Choose one method: hardcoded SQL or template cloning
- Document which method is primary
- Ensure both create identical schemas

### 6. Implement Record Table Config
- If `record_table` is intended for use, implement handlers
- Or remove if legacy/unused

---

## K) Files Changed/Referenced

### Route Files
- `server/routes/admin/churches.js` (primary, 2488 lines)
- `server/src/routes/admin/churches.js` (alternative, 408 lines)
- `server/src/api/churches.js` (API layer)

### Service Files
- `server/services/churchSetupService.js` (church setup logic)
- `server/services/templateService.js` (template management)

### Utility Files
- `server/utils/dbSwitcher.js` (database connection switching)
- `server/config/db.js` (central database pool)

### Provisioning Files
- `server/church-provisioner.js` (legacy provisioner)
- `server/src/api/admin.js` (wizard endpoint with database creation)

### Schema Files
- `front-end/orthodoxmetrics_schema.sql` (central database schema)

---

**Report Generated:** 2026-01-17  
**Investigation Scope:** Server directory (`server/`)  
**Status:** Complete mapping of field mapper and provisioning implementation
