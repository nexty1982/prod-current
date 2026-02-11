# Church Setup Wizard - Template Profiles Discovery

## Part A: Current Behavior Analysis

### UI Components

**Primary Component:**
- `front-end/src/features/church/apps/church-management/ChurchSetupWizard.tsx`
- Step 2: `TemplateSelectionStep` component (lines 692-780)

**How Template Churches are Loaded:**
1. **Line 254-293:** `useEffect` hook fetches English churches:
   - Endpoint: `GET /api/admin/churches?preferred_language=en`
   - For each church, fetches available tables:
   - Endpoint: `GET /api/admin/churches/${church.id}/tables`
   - Stores in `templateChurches` state with `available_tables` array

2. **Line 295-305:** `handleTemplateSelection` function:
   - Sets `template_church_id` in formik
   - Pre-populates `selected_tables` from template church's available tables

**UI Display:**
- Line 700-704: Shows "Choose a Template Church (Optional)" with description
- Line 714-732: "Start from Scratch" checkbox option
- Line 735-768: Maps through `templateChurches` and displays each as selectable card
- Line 760-761: Shows `{church.available_tables.length} available table(s)`
- Line 772-778: Shows selected template info alert

### Backend Endpoints

**1. GET /api/admin/churches?preferred_language=en**
- **File:** `server/routes/admin/churches.js`
- **Purpose:** Returns list of churches filtered by language
- **Response:** Array of church objects with `id`, `name`, `city`, `country`, etc.

**2. GET /api/admin/churches/:id/tables**
- **File:** `server/routes/admin/churches.js` (line 1178)
- **Purpose:** Returns list of tables in a church's database
- **Response:** `{ tables: [...] }` array of table names

**3. POST /api/admin/churches/wizard**
- **File:** `server/routes/admin/churches.js` (line 2343)
- **Current Payload:**
  ```javascript
  {
    church_name, address, city, country, ...
    setup_templates: true,
    auto_setup_standard: false,
    record_types: ['baptism', 'marriage', 'funeral'],
    template_style: 'orthodox_traditional'
    // NOTE: template_church_id is NOT currently used in wizard endpoint!
  }
  ```
- **Handler:** Uses `churchSetupService.setupNewChurch(churchData, templateOptions)`
- **Template Options:** Passes `recordTypes` and `templateStyle`, but NOT `template_church_id`

### How "Saints Peter & Paul" is Selected

**Current Flow:**
1. Frontend fetches all English churches (line 257)
2. User sees list including "Saints Peter & Paul" (if it exists and has `preferred_language='en'`)
3. User clicks on "Saints Peter & Paul" card
4. `handleTemplateSelection` sets `formik.values.template_church_id = church.id`
5. `formik.values.selected_tables` is populated from `church.available_tables`
6. **BUT:** When submitting to `/api/admin/churches/wizard`, `template_church_id` is sent but **NOT USED** by backend!

**Key Finding:** The wizard endpoint currently IGNORES `template_church_id`. It uses `churchSetupService.setupNewChurch()` which provisions from `orthodoxmetrics_db.templates` based on `recordTypes`, not from a template church.

### Database Source

**Current Template Source:**
- `orthodoxmetrics_db.templates` table (via `templateService.getGlobalTemplates()`)
- **File:** `server/services/churchSetupService.js` (line 91)
- **Method:** `setupChurchTemplates()` uses `templateService.getGlobalTemplates()`

**Legacy Code (NOT USED in wizard):**
- `server/src/api/admin.js` (line 738-893) has old wizard implementation that:
  - Uses `record_template1` database
  - Clones tables using `SHOW CREATE TABLE`
  - This is in `server/src/api/admin.js` which may not be the active route

### Summary

**Current State:**
- ✅ Backend wizard endpoint already uses `orthodoxmetrics_db.templates` (good!)
- ❌ Frontend still shows churches as templates (needs change)
- ❌ `template_church_id` is sent but ignored (dead code)
- ❌ Frontend fetches church tables unnecessarily

**What Needs to Change:**
1. Replace church list with template profiles
2. Update frontend to show template profiles
3. Update payload to send `selected_templates` (template slugs) instead of `template_church_id`
4. Update backend to use template slugs for provisioning
5. Remove legacy church cloning code (if exists in active path)
