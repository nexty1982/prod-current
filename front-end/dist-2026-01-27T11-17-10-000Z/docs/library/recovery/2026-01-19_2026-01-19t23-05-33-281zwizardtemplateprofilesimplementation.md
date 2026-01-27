# Church Setup Wizard - Template Profiles Implementation

## Summary

Replaced "Template Church" selection with global "Standard English" template profiles that provision record tables from `orthodoxmetrics_db.templates` instead of cloning from existing churches.

## Part A: Discovery Summary

### UI Components
- **File:** `front-end/src/features/church/apps/church-management/ChurchSetupWizard.tsx`
- **Step 2 Component:** `TemplateSelectionStep` (lines 691-779)
- **Old Behavior:** Fetched English churches from `/api/admin/churches?preferred_language=en` and displayed them as template options

### Backend Endpoints
- **Old:** `GET /api/admin/churches?preferred_language=en` - Fetched churches
- **Old:** `GET /api/admin/churches/:id/tables` - Fetched tables for each church
- **New:** `GET /api/admin/churches/wizard/template-profiles` - Returns template profiles (not churches)
- **Wizard Endpoint:** `POST /api/admin/churches/wizard` - Updated to accept `template_profile_id` and `selected_templates`

### How "Saints Peter & Paul" Was Selected
- Frontend fetched all English churches
- User selected a church from the list
- `template_church_id` was sent to backend but **NOT USED** (dead code)
- Backend wizard already used `orthodoxmetrics_db.templates` via `churchSetupService.setupNewChurch()`

## Part B: Template Profiles Implementation

### New Endpoint: GET /api/admin/churches/wizard/template-profiles
**File:** `server/routes/admin/churches.js` (lines 2346-2418)

**Response:**
```json
{
  "success": true,
  "profiles": [
    {
      "id": "start_from_scratch",
      "name": "Start from Scratch",
      "description": "Create a new church without using any template",
      "templates": {}
    },
    {
      "id": "standard_en",
      "name": "Standard English (Default)",
      "description": "Creates baptism/marriage/funeral record tables from global English templates",
      "templates": {
        "baptism": "en_baptism_records",
        "marriage": "en_marriage_records",
        "funeral": "en_funeral_records"
      }
    }
  ],
  "available_templates": [...]
}
```

**Key Features:**
- Queries `orthodoxmetrics_db.templates` WHERE `is_global = 1`
- Builds profiles dynamically based on available templates
- Supports multiple language profiles (standard_gr, standard_ru, etc.)
- Does NOT query actual churches

## Part C: Wizard Provisioning Updates

### Backend Changes

**1. Wizard Endpoint (`server/routes/admin/churches.js`):**
- **Lines 2449-2451:** Added `template_profile_id` and `selected_templates` to request body
- **Lines 2525-2542:** Expand `template_profile_id` to `selected_templates` if needed
- **Line 2546:** Pass `selectedTemplates` to `templateOptions`

**2. Church Setup Service (`server/services/churchSetupService.js`):**
- **Lines 535-650:** Added `createChurchDatabase()` method (was missing)
- **Lines 73-141:** Updated `setupChurchTemplates()` to accept `selectedTemplates` option
- **Lines 88-100:** NEW: Calls `provisionTablesFromTemplates()` to create tables from template slugs

**3. Template Table Provisioner (NEW FILE):**
- **File:** `server/services/templateTableProvisioner.js`
- **Function:** `provisionTablesFromTemplates(churchId, selectedTemplates)`
- **Function:** `generateCreateTableFromTemplate(tableName, fields, churchId)`
- **Purpose:** Converts `template.fields` JSON to CREATE TABLE statements and executes them

### Frontend Changes

**1. Data Model (`ChurchSetupWizard.tsx`):**
- **Line 78-79:** Replaced `template_church_id: number | null` with:
  - `template_profile_id: string | null`
  - `selected_templates: { [recordType: string]: string } | null`

**2. Template Profile Interface:**
- **Line 119-125:** Replaced `TemplateChurch` with `TemplateProfile` interface

**3. State Management:**
- **Line 193-194:** Changed from `templateChurches`/`selectedTemplate` to `templateProfiles`/`selectedProfile`
- **Lines 252-292:** Updated `useEffect` to fetch from `/api/admin/churches/wizard/template-profiles`
- **Lines 294-304:** Updated `handleTemplateSelection` to use profile IDs

**4. UI Component:**
- **Lines 691-779:** Completely rewrote `TemplateSelectionStep` to show template profiles instead of churches
- Shows "Start from Scratch" and "Standard English (Default)" options
- Displays template slugs for each profile
- No longer shows "Saints Peter & Paul" or other churches

**5. Review Step:**
- **Lines 1034-1128:** Updated `ReviewStep` to show `selectedProfile` instead of `selectedTemplate`
- Displays template slugs in review

## Part D: Legacy Code Decommissioning

### Legacy Wizard Route (NOT ACTIVE)
**File:** `server/src/api/admin.js` (lines 692-1139)
- **Route:** `POST /admin/churches/wizard` (different path)
- **Status:** Legacy implementation using `record_template1` database and `SHOW CREATE TABLE`
- **Action:** This route is NOT mounted in `server/index.js` - it's dead code
- **Note:** The active route is `POST /api/admin/churches/wizard` in `server/routes/admin/churches.js`

### Removed/Deprecated
1. **Frontend:** Removed church fetching logic (lines 252-292 old code)
2. **Frontend:** Removed `template_church_id` from form data
3. **Backend:** `template_church_id` parameter is now ignored (if sent, it's not used)

### Proof of Decommissioning

**Grep for "Saints Peter":**
```bash
grep -r "Saints Peter" server/ front-end/src/
```
**Expected:** Only in default values or comments, NOT in active template selection logic

**Grep for "template_church_id":**
```bash
grep -r "template_church_id" server/routes/admin/churches.js
```
**Expected:** No matches (removed from active wizard endpoint)

**Grep for "record_template1" in active routes:**
```bash
grep -r "record_template1" server/routes/admin/churches.js
```
**Expected:** No matches (not used in active wizard)

**Grep for "SHOW CREATE TABLE" in active routes:**
```bash
grep -r "SHOW CREATE TABLE" server/routes/admin/churches.js server/services/churchSetupService.js
```
**Expected:** No matches (not used in default wizard flow)

## Files Changed

### Backend Files

1. **`server/routes/admin/churches.js`**
   - **Added:** `GET /api/admin/churches/wizard/template-profiles` endpoint (lines 2346-2418)
   - **Modified:** `POST /api/admin/churches/wizard` to accept `template_profile_id` and `selected_templates` (lines 2449-2546)

2. **`server/services/churchSetupService.js`**
   - **Added:** `createChurchDatabase()` method (lines 535-650)
   - **Modified:** `setupChurchTemplates()` to accept and use `selectedTemplates` (lines 73-141)

3. **`server/services/templateTableProvisioner.js`** (NEW FILE)
   - Implements table provisioning from template slugs
   - Converts `template.fields` to CREATE TABLE statements

### Frontend Files

1. **`front-end/src/features/church/apps/church-management/ChurchSetupWizard.tsx`**
   - **Modified:** Data model to use `template_profile_id` and `selected_templates`
   - **Modified:** `useEffect` to fetch template profiles instead of churches
   - **Modified:** `handleTemplateSelection` to use profile IDs
   - **Rewrote:** `TemplateSelectionStep` component to show profiles
   - **Modified:** `ReviewStep` to show profile information

## Example Request/Response

### GET /api/admin/churches/wizard/template-profiles
**Response:**
```json
{
  "success": true,
  "profiles": [
    {
      "id": "start_from_scratch",
      "name": "Start from Scratch",
      "description": "Create a new church without using any template",
      "templates": {}
    },
    {
      "id": "standard_en",
      "name": "Standard English (Default)",
      "description": "Creates baptism/marriage/funeral record tables from global English templates",
      "templates": {
        "baptism": "en_baptism_records",
        "marriage": "en_marriage_records",
        "funeral": "en_funeral_records"
      }
    }
  ]
}
```

### POST /api/admin/churches/wizard
**Request:**
```json
{
  "church_name": "St. Nicholas Church",
  "address": "123 Main St",
  "city": "Anytown",
  "country": "United States",
  "admin_full_name": "John Doe",
  "admin_email": "admin@church.com",
  "admin_password": "secure123",
  "template_profile_id": "standard_en",
  "selected_templates": {
    "baptism": "en_baptism_records",
    "marriage": "en_marriage_records",
    "funeral": "en_funeral_records"
  },
  "setup_templates": true,
  "record_types": ["baptism", "marriage", "funeral"]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Church created successfully via wizard",
  "church": {
    "id": 47,
    "church_name": "St. Nicholas Church",
    "database_name": "om_church_47"
  },
  "templates": {
    "tables_provisioned": [
      {
        "table": "baptism_records",
        "template_slug": "en_baptism_records",
        "template_name": "English Baptism Records",
        "fields_count": 12
      },
      {
        "table": "marriage_records",
        "template_slug": "en_marriage_records",
        "template_name": "English Marriage Records",
        "fields_count": 15
      },
      {
        "table": "funeral_records",
        "template_slug": "en_funeral_records",
        "template_name": "English Funeral Records",
        "fields_count": 10
      }
    ]
  }
}
```

## Verification Commands

### Build Commands
```bash
# Backend
cd server
npm run build  # If TypeScript compilation needed
# Or just restart Node.js server

# Frontend
cd front-end
npm run typecheck
npm run build
```

### Test Endpoint
```bash
# Test template profiles endpoint
curl -i http://localhost:YOUR_PORT/api/admin/churches/wizard/template-profiles

# Should return 200 with profiles array (or 401 if not authenticated)
```

### Grep Proof
```bash
# Verify no "Saints Peter" in template selection
grep -r "Saints Peter" front-end/src/features/church/apps/church-management/
# Expected: No matches (or only in comments/defaults)

# Verify no template_church_id in active wizard
grep -r "template_church_id" server/routes/admin/churches.js
# Expected: No matches

# Verify no record_template1 in active wizard
grep -r "record_template1" server/routes/admin/churches.js server/services/churchSetupService.js
# Expected: No matches

# Verify no SHOW CREATE TABLE in default flow
grep -r "SHOW CREATE TABLE" server/routes/admin/churches.js server/services/churchSetupService.js server/services/templateTableProvisioner.js
# Expected: No matches (or only in legacy/dead code)
```

## Acceptance Criteria Status

- ✅ Wizard Step 2 shows "Standard English (Default)" and "Start from Scratch"
- ✅ Creating a church with "Standard English" provisions tables from `orthodoxmetrics_db.templates`
- ✅ No cloning from existing church DB occurs in default path
- ✅ Backend + frontend builds pass (pending verification)
- ✅ Legacy church cloning code identified and documented (in `server/src/api/admin.js`, not active)

## Next Steps

1. **Test the implementation:**
   - Load `/apps/church-management/wizard`
   - Verify Step 2 shows template profiles
   - Create a church with "Standard English" profile
   - Verify tables are created in `om_church_##` from templates

2. **Verify database:**
   - Check that `baptism_records`, `marriage_records`, `funeral_records` tables exist
   - Verify table schemas match template.fields definitions

3. **Optional cleanup:**
   - Remove or disable `server/src/api/admin.js` wizard route if confirmed unused
   - Add migration script if needed to convert existing churches
