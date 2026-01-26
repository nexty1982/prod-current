# Phase 1: DB-Backed Record Templates Implementation

## Summary

Implemented database-backed record templates as a first-class concept using the existing `orthodoxmetrics_db.templates` table, without modifying existing church provisioning logic.

## Files Created/Modified

### Backend

1. **`server/routes/admin/templates.js`** (NEW)
   - Complete CRUD endpoints for templates
   - GET `/api/admin/templates` - List all templates (with filters)
   - GET `/api/admin/templates/:slug` - Get single template
   - POST `/api/admin/templates` - Create template
   - PUT `/api/admin/templates/:slug` - Update template
   - DELETE `/api/admin/templates/:slug` - Delete template
   - Admin-only access control via `requireAuth` + `requireAdmin` middleware
   - Comprehensive validation for `fields` JSON structure

2. **`server/index.js`** (MODIFIED)
   - Added import: `const templatesRouter = require('./routes/admin/templates');`
   - Registered route: `app.use('/api/admin/templates', templatesRouter);`

### Frontend

3. **`front-end/src/api/admin.api.ts`** (MODIFIED)
   - Added `templates` API methods:
     - `getAll(filters?)` - List templates
     - `getBySlug(slug)` - Get template by slug
     - `create(template)` - Create template
     - `update(slug, template)` - Update template
     - `delete(slug)` - Delete template

4. **`front-end/src/features/devel-tools/live-table-builder/LiveTableBuilderPage.tsx`** (MODIFIED)
   - Added "Save to Database" button in Template Management section
   - Added dialog for saving templates to database with:
     - Template name input
     - Record type selector (baptism/marriage/funeral/custom)
     - Description field
     - Global template checkbox
   - Added `handleSaveDbTemplate()` function that:
     - Converts table state to template format
     - Validates required fields
     - Calls API to save to database
   - Added `convertTableToDbTemplate()` helper to transform table columns to template fields format

## Template Fields JSON Schema

The `fields` column in the `templates` table must contain a JSON array of column definitions:

```typescript
interface TemplateField {
  column: string;      // Required: Database column name (e.g., "first_name")
  label: string;       // Required: Display label (e.g., "First Name")
  type?: string;       // Optional: Field type (e.g., "string", "date", "number", "email", "tel")
  required?: boolean;  // Optional: Whether field is required (default: false)
}
```

### Validation Rules

- `fields` must be an array
- Array must contain at least one field definition
- Each field must have:
  - `column` (string, required) - Used as database column identifier
  - `label` (string, required) - Display name for UI
- Optional fields:
  - `type` (string) - Field data type
  - `required` (boolean) - Field requirement flag

## API Endpoints

### GET `/api/admin/templates`
**Query Parameters:**
- `record_type` (optional): Filter by record type (baptism/marriage/funeral/custom)
- `is_global` (optional): Filter by global flag (true/false)
- `church_id` (optional): Filter by church ID

**Response:**
```json
{
  "success": true,
  "templates": [...],
  "count": 5
}
```

### GET `/api/admin/templates/:slug`
**Response:**
```json
{
  "success": true,
  "template": {
    "id": 1,
    "name": "Standard Baptism Records",
    "slug": "standard-baptism-records",
    "record_type": "baptism",
    "fields": [...],
    ...
  }
}
```

### POST `/api/admin/templates`
**Request Body:**
```json
{
  "name": "Standard Baptism Records",
  "slug": "standard-baptism-records",  // Optional, auto-generated from name
  "record_type": "baptism",
  "description": "Standard template for baptism records",
  "fields": [
    {
      "column": "first_name",
      "label": "First Name",
      "type": "string",
      "required": true
    },
    ...
  ],
  "grid_type": "aggrid",              // Optional, default: "aggrid"
  "theme": "liturgicalBlueGold",      // Optional, default: "liturgicalBlueGold"
  "layout_type": "table",             // Optional, default: "table"
  "is_editable": true,                // Optional, default: true
  "church_id": null,                  // Optional, null for global
  "is_global": false                  // Optional, default: false
}
```

### PUT `/api/admin/templates/:slug`
**Request Body:** Same as POST, but all fields are optional (partial update)

### DELETE `/api/admin/templates/:slug`
**Response:**
```json
{
  "success": true,
  "message": "Template deleted successfully",
  "deleted": {
    "slug": "standard-baptism-records",
    "name": "Standard Baptism Records"
  }
}
```

## Access Control

- All endpoints require authentication via `requireAuth` middleware
- All endpoints require admin or super_admin role via `requireAdmin` middleware
- Returns 401 if not authenticated
- Returns 403 if not admin/super_admin

## Database Schema

Uses existing `orthodoxmetrics_db.templates` table:

```sql
CREATE TABLE `templates` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `slug` varchar(100) NOT NULL,
  `record_type` enum('baptism','marriage','funeral','custom') NOT NULL,
  `description` text DEFAULT NULL,
  `fields` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`fields`)),
  `grid_type` enum('aggrid','mui','bootstrap') DEFAULT 'aggrid',
  `theme` varchar(50) DEFAULT 'liturgicalBlueGold',
  `layout_type` enum('table','form','dual') DEFAULT 'table',
  `language_support` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`language_support`)),
  `is_editable` tinyint(1) DEFAULT 1,
  `created_by` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `church_id` int(11) DEFAULT NULL,
  `is_global` tinyint(1) DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`),
  UNIQUE KEY `slug` (`slug`),
  ...
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

## Testing

### Manual Testing Steps

1. **Create Template:**
   - Navigate to `/devel-tools/live-table-builder`
   - Design a table with columns
   - Click "Save to Database"
   - Fill in template name, record type, description
   - Click "Save to Database"
   - Verify success toast appears

2. **List Templates:**
   ```bash
   curl -X GET "http://localhost:3000/api/admin/templates" \
     -H "Cookie: orthodoxmetrics.sid=YOUR_SESSION_ID"
   ```

3. **Get Template by Slug:**
   ```bash
   curl -X GET "http://localhost:3000/api/admin/templates/standard-baptism-records" \
     -H "Cookie: orthodoxmetrics.sid=YOUR_SESSION_ID"
   ```

4. **Update Template:**
   ```bash
   curl -X PUT "http://localhost:3000/api/admin/templates/standard-baptism-records" \
     -H "Content-Type: application/json" \
     -H "Cookie: orthodoxmetrics.sid=YOUR_SESSION_ID" \
     -d '{"description": "Updated description"}'
   ```

5. **Delete Template:**
   ```bash
   curl -X DELETE "http://localhost:3000/api/admin/templates/standard-baptism-records" \
     -H "Cookie: orthodoxmetrics.sid=YOUR_SESSION_ID"
   ```

## What Was NOT Changed

- ✅ `createChurchDatabaseSchema()` - Not modified
- ✅ Church onboarding logic - Not modified
- ✅ Existing church databases - No changes
- ✅ Existing template storage (localStorage) - Still functional

## Next Steps (Future Phases)

- Phase 2: Modify church provisioning to use templates from database
- Phase 3: Add template selection UI during church onboarding
- Phase 4: Add template versioning and migration support
- Phase 5: Add template preview and validation UI

## Notes

- Slug is auto-generated from name if not provided
- Template names and slugs must be unique
- Fields validation ensures proper structure before saving
- Admin-only access ensures only authorized users can manage templates
- Global templates (`is_global=true`) are available to all churches
- Church-specific templates (`church_id` set) are scoped to that church
