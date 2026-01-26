# OM Specification Documentation - Current State Analysis

**Analysis Date:** 2026-01-24  
**Status:** ⚠️ **ROUTE NOT FOUND IN CODEBASE**

## Executive Summary

After thorough analysis of the codebase, **the `/church/om-spec` route does not currently exist** in the application. This document captures:
1. What was searched for
2. What was found (or not found)
3. Expected structure based on user requirements
4. Next steps for implementation/identification

---

## Search Methodology

### Files Searched
- **Router Configuration:** `prod/front-end/src/routes/Router.tsx` (1,498 lines)
  - Searched for: `/church/om-spec`, `om-spec`, `omSpec`, `OMSpec`
  - Result: No matches found

- **Menu Configuration:** `prod/front-end/src/layouts/full/vertical/sidebar/MenuItems.ts` (513 lines)
  - Searched for: om-spec references, "Devel Tools" section
  - Result: No om-spec menu item found
  - Note: "Developer Tools" section exists (line 491) but contains only "Site Structure Visualizer"

- **Component Search:**
  - Searched for files matching: `*om-spec*`, `*omSpec*`, `*Documentation*.tsx`, `*Task*.tsx`
  - Result: No matching components found

- **Backend Routes:**
  - Searched `prod/server/routes/` directory (89+ route files)
  - Result: No om-spec API endpoints found

### Search Patterns Used
- Case-insensitive grep for: `om-spec`, `omSpec`, `OMSpec`, `om_spec`
- Semantic search for: "OM Specification Documentation", "church om-spec", "tasks documentation tabs"
- File glob patterns: `**/*om-spec*`, `**/*omSpec*`, `**/church/**/*`

---

## Expected Feature Structure (Based on Requirements)

Based on the detailed requirements provided, the `/church/om-spec` feature should include:

### 1. Route Definition
**Expected Location:** `prod/front-end/src/routes/Router.tsx`

**Expected Pattern:**
```tsx
{
  path: '/church/om-spec',
  element: (
    <ProtectedRoute requiredPermission="...">
      <OMSpecPage />
    </ProtectedRoute>
  )
}
```

**Current Status:** ❌ Not found

---

### 2. Menu Item Placement
**Expected Location:** `prod/front-end/src/layouts/full/vertical/sidebar/MenuItems.ts`

**Expected Placement:** Under "🛠️ Developer Tools" section (currently at line 491)

**Expected Structure:**
```typescript
{
  id: uniqueId(),
  title: 'OM Specification Documentation',
  icon: IconFileDescription, // or appropriate icon
  href: '/church/om-spec',
}
```

**Current Status:** ❌ Not found

---

### 3. Frontend UI Structure

#### A. Page Shell Component
**Expected Component:** `OMSpecPage` or similar
**Expected Location:** `prod/front-end/src/views/` or `prod/front-end/src/pages/`
**Expected Title:** "OM Specification Documentation"

**Current Status:** ❌ Component not found

#### B. Tab Structure
**Expected Tabs:**
1. **Documentation Tab** - Renders documentation items
2. **Tasks Tab** - Renders task items

**Current Status:** ❌ Tabs component not found

#### C. Filters Bar
**Expected Components:**
- Search input field
- Dropdown filters (Category, Importance, Status, Type, Visibility, etc.)

**Current Status:** ❌ Filters component not found

#### D. Table/Grid Component
**Expected Columns:**
- Title
- Category
- Importance
- Status
- Type
- Visibility
- Tags
- Created (timestamp)
- Actions (view, edit, delete)

**Current Status:** ❌ Table component not found

#### E. Task Details Drawer
**Expected Component:** Right-side panel drawer
**Expected Behavior:** Opens when "view" action is clicked

**Current Status:** ❌ Drawer component not found

#### F. Edit Task Modal
**Expected Component:** Modal dialog with form
**Expected Behavior:** Opens when "edit" action is clicked

**Current Status:** ❌ Modal component not found

---

### 4. State & Data Flow

#### Expected Hooks/Services
- Task/documentation fetching hook
- Filter/search state management
- Selection state management
- Drawer/modal state management

**Current Status:** ❌ No hooks/services found

#### Expected Query Parameters
- Search term
- Category filter
- Importance filter
- Status filter
- Type filter
- Visibility filter
- Pagination (if implemented)
- Sorting (if implemented)

**Current Status:** ❌ No query parameter handling found

#### Expected Actions
- **View:** Opens drawer with task details
- **Edit:** Opens modal with edit form
- **Delete:** Confirmation dialog + deletion (optimistic updates?)

**Current Status:** ❌ No action handlers found

#### Revisions Feature
**Expected Behavior:**
- Revision count display
- Revision list view
- Diff view (if implemented)

**Current Status:** ❌ No revision handling found

#### Attachments Feature
**Expected Behavior:**
- Attachment links or uploads
- Attachment rendering

**Current Status:** ❌ No attachment handling found

---

### 5. Permissions & Visibility

#### Expected Frontend Gating
- Role checks for "Admin" visibility
- "Assigned To" filtering
- Permission checks before actions

**Current Status:** ❌ No permission checks found

#### Expected Backend Authorization
- JWT/session validation
- Role-based access control
- Permission middleware

**Current Status:** ❌ No API endpoints found

---

### 6. Backend/API Endpoints

**Expected Endpoints:**
- `GET /api/church/om-spec` - List/search/filter tasks/docs
- `GET /api/church/om-spec/:id` - Get task/doc by ID (for drawer)
- `POST /api/church/om-spec` - Create new task/doc
- `PUT /api/church/om-spec/:id` - Update task/doc
- `DELETE /api/church/om-spec/:id` - Delete task/doc
- `GET /api/church/om-spec/:id/revisions` - Get revisions
- `GET /api/church/om-spec/:id/attachments` - Get attachments
- `POST /api/church/om-spec/:id/attachments` - Upload attachment

**Current Status:** ❌ No API endpoints found

**Expected Location:** `prod/server/routes/omSpec.js` or similar

---

### 7. Database/Storage

**Expected Tables/Collections:**
- `om_spec_tasks` or `om_spec_docs` - Main tasks/docs table
- `om_spec_revisions` - Revision history table
- `om_spec_tags` - Tags table (or JSON field)
- `om_spec_attachments` - Attachments table

**Expected Fields:**
- `id` - Primary key
- `title` - Task/documentation title
- `category` - Category classification
- `importance` - Importance level
- `status` - Status (e.g., draft, published, archived)
- `type` - Type classification
- `visibility` - Visibility level (e.g., Admin, Public)
- `assignedTo` - User ID assignment
- `tags` - Tags array or JSON
- `created` - Created timestamp
- `updated` - Updated timestamp
- `createdBy` - Creator user ID
- `content` - Main content/text

**Expected Database:** `orthodoxmetrics_db` (not `orthodoxmetrics_auth_db`)

**Current Status:** ❌ No database schema found

**Search Locations Checked:**
- `prod/server/database/*.sql` - No om-spec related schemas found
- `prod/server/models/` - No om-spec models found

---

## Component Tree (Expected)

```
OMSpecPage
├── PageHeader ("OM Specification Documentation")
├── TabsContainer
│   ├── DocumentationTab
│   └── TasksTab
├── FiltersBar
│   ├── SearchInput
│   └── FilterDropdowns (Category, Importance, Status, Type, Visibility)
├── DataTable
│   └── TableRow (with Actions column)
├── TaskDetailsDrawer (conditional, right panel)
│   ├── TaskHeader
│   ├── TaskContent
│   ├── RevisionsSection
│   └── AttachmentsSection
└── EditTaskModal (conditional)
    └── TaskForm
```

**Current Status:** ❌ No component tree found

---

## File Paths & Line Counts

### Files That Should Exist (But Don't)

| File Path | Expected Purpose | Status |
|-----------|-----------------|--------|
| `prod/front-end/src/routes/Router.tsx` | Route definition | ✅ Exists (1,498 lines) but no om-spec route |
| `prod/front-end/src/layouts/full/vertical/sidebar/MenuItems.ts` | Menu item | ✅ Exists (513 lines) but no om-spec item |
| `prod/front-end/src/views/om-spec/OMSpecPage.tsx` | Main page component | ❌ Not found |
| `prod/front-end/src/views/om-spec/components/TabsContainer.tsx` | Tabs component | ❌ Not found |
| `prod/front-end/src/views/om-spec/components/FiltersBar.tsx` | Filters component | ❌ Not found |
| `prod/front-end/src/views/om-spec/components/DataTable.tsx` | Table component | ❌ Not found |
| `prod/front-end/src/views/om-spec/components/TaskDetailsDrawer.tsx` | Drawer component | ❌ Not found |
| `prod/front-end/src/views/om-spec/components/EditTaskModal.tsx` | Modal component | ❌ Not found |
| `prod/front-end/src/hooks/useOMSpec.ts` | Data fetching hook | ❌ Not found |
| `prod/front-end/src/api/omSpec.ts` | API service | ❌ Not found |
| `prod/server/routes/omSpec.js` | Backend API routes | ❌ Not found |
| `prod/server/controllers/omSpecController.js` | Backend controller | ❌ Not found |
| `prod/server/models/omSpec.js` | Database model | ❌ Not found |
| `prod/server/database/om_spec_schema.sql` | Database schema | ❌ Not found |

---

## What Was Actually Found

### Similar/Related Features Found

1. **Kanban Task Management**
   - Location: `prod/front-end/src/components/apps/kanban/`
   - Files: `TaskManager.tsx`, `TaskModal/AddNewTaskModal.tsx`, `TaskModal/EditTaskModal.tsx`
   - **Note:** This is a different feature (Kanban board), not om-spec

2. **Assign Task Page**
   - Location: `prod/front-end/src/pages/AssignTaskPage.tsx`
   - **Note:** This appears to be a different task assignment feature

3. **Documentation Routes**
   - Location: `prod/server/routes/docs.js` (file not found/doesn't exist)
   - **Note:** No actual docs route found

---

## Next Steps

### If Feature Exists Elsewhere
1. Check if route uses a different path pattern (e.g., `/church/:id/om-spec`)
2. Check if feature is named differently (e.g., "specifications", "docs", "tasks")
3. Check if feature is in a different branch or environment
4. Check if feature is dynamically loaded/registered

### If Feature Needs to Be Implemented
1. Create route definition in `Router.tsx`
2. Add menu item to `MenuItems.ts` under "Developer Tools"
3. Create page component structure
4. Implement UI components (tabs, filters, table, drawer, modal)
5. Create API endpoints in backend
6. Create database schema
7. Implement permissions/authorization

---

## Enhancement Readiness Assessment

**Current Status:** ⚠️ **Feature Not Found - Cannot Assess Readiness**

Once the feature is located or implemented, assess:

### Easy to Extend
- [ ] Component structure allows for new fields
- [ ] API endpoints follow RESTful patterns
- [ ] Database schema supports extensions
- [ ] State management is modular

### Risky/Tangled Areas
- [ ] Tight coupling between components
- [ ] Complex state dependencies
- [ ] Database relationships
- [ ] Permission logic complexity

### Smallest Safe Next Step
- [ ] Identify entry point
- [ ] Add new field to data model
- [ ] Extend API endpoint
- [ ] Update UI component

---

## Conclusion

The `/church/om-spec` route and all related components, API endpoints, and database schemas **do not currently exist** in the codebase. This analysis documents:
- What was searched
- What was expected to be found
- The structure that should exist based on requirements

**Recommendation:** Verify if:
1. The feature exists under a different name/path
2. The feature is in a different branch
3. The feature needs to be implemented from scratch

Once the feature is located or created, this document can be updated with actual implementation details.
