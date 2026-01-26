# OM Specification Documentation - UI → API → DB Mapping

**Analysis Date:** 2026-01-24  
**Status:** ⚠️ **FEATURE NOT FOUND - MAPPING BASED ON EXPECTED STRUCTURE**

## Overview

This document provides a mapping table showing how UI components connect to API endpoints, which in turn connect to database tables/collections. Since the feature was not found in the codebase, this mapping is based on the expected structure from requirements.

---

## Mapping Table

### Feature Area: List/Filter/Search

| UI Component | User Action | Frontend Hook/Service | API Endpoint | Request Method | Request Params | Response Schema | DB Query | DB Table/Collection |
|-------------|-------------|----------------------|--------------|----------------|----------------|-----------------|----------|---------------------|
| SearchInput | Type search term | `useOMSpec({ search })` | `GET /api/church/om-spec` | GET | `?search=term` | `{ tasks: Task[], total: number }` | `SELECT * FROM om_spec_tasks WHERE title LIKE ?` | `om_spec_tasks` |
| CategoryFilter | Select category | `useOMSpec({ category })` | `GET /api/church/om-spec` | GET | `?category=value` | `{ tasks: Task[] }` | `SELECT * FROM om_spec_tasks WHERE category = ?` | `om_spec_tasks` |
| ImportanceFilter | Select importance | `useOMSpec({ importance })` | `GET /api/church/om-spec` | GET | `?importance=value` | `{ tasks: Task[] }` | `SELECT * FROM om_spec_tasks WHERE importance = ?` | `om_spec_tasks` |
| StatusFilter | Select status | `useOMSpec({ status })` | `GET /api/church/om-spec` | GET | `?status=value` | `{ tasks: Task[] }` | `SELECT * FROM om_spec_tasks WHERE status = ?` | `om_spec_tasks` |
| TypeFilter | Select type | `useOMSpec({ type })` | `GET /api/church/om-spec` | GET | `?type=value` | `{ tasks: Task[] }` | `SELECT * FROM om_spec_tasks WHERE type = ?` | `om_spec_tasks` |
| VisibilityFilter | Select visibility | `useOMSpec({ visibility })` | `GET /api/church/om-spec` | GET | `?visibility=value` | `{ tasks: Task[] }` | `SELECT * FROM om_spec_tasks WHERE visibility = ?` | `om_spec_tasks` |
| DataTable | Render list | `useOMSpec()` | `GET /api/church/om-spec` | GET | `?page=1&limit=50&sort=created&order=desc` | `{ tasks: Task[], pagination: {...} }` | `SELECT * FROM om_spec_tasks ORDER BY created DESC LIMIT ? OFFSET ?` | `om_spec_tasks` |

**Current Status:** ❌ No implementation found

**Expected Files:**
- Frontend: `prod/front-end/src/hooks/useOMSpec.ts`
- Frontend: `prod/front-end/src/api/omSpec.ts`
- Backend: `prod/server/routes/omSpec.js`
- Backend: `prod/server/controllers/omSpecController.js`
- Database: `prod/server/database/om_spec_schema.sql`

---

### Feature Area: Task Details Drawer

| UI Component | User Action | Frontend Hook/Service | API Endpoint | Request Method | Request Params | Response Schema | DB Query | DB Table/Collection |
|-------------|-------------|----------------------|--------------|----------------|----------------|-----------------|----------|---------------------|
| ViewButton (in table row) | Click "View" | `useOMSpecTask(id)` | `GET /api/church/om-spec/:id` | GET | `:id` (route param) | `{ task: Task }` | `SELECT * FROM om_spec_tasks WHERE id = ?` | `om_spec_tasks` |
| TaskDetailsDrawer | Display task | `useOMSpecTask(id)` | `GET /api/church/om-spec/:id` | GET | `:id` | `{ task: Task, revisions: Revision[], attachments: Attachment[] }` | `SELECT * FROM om_spec_tasks WHERE id = ?`<br>`SELECT * FROM om_spec_revisions WHERE task_id = ?`<br>`SELECT * FROM om_spec_attachments WHERE task_id = ?` | `om_spec_tasks`<br>`om_spec_revisions`<br>`om_spec_attachments` |
| RevisionsSection | Display revisions | `useOMSpecRevisions(id)` | `GET /api/church/om-spec/:id/revisions` | GET | `:id` | `{ revisions: Revision[] }` | `SELECT * FROM om_spec_revisions WHERE task_id = ? ORDER BY created DESC` | `om_spec_revisions` |
| AttachmentsSection | Display attachments | `useOMSpecAttachments(id)` | `GET /api/church/om-spec/:id/attachments` | GET | `:id` | `{ attachments: Attachment[] }` | `SELECT * FROM om_spec_attachments WHERE task_id = ?` | `om_spec_attachments` |

**Current Status:** ❌ No implementation found

**Expected Files:**
- Frontend: `prod/front-end/src/views/om-spec/components/TaskDetailsDrawer.tsx`
- Frontend: `prod/front-end/src/hooks/useOMSpecTask.ts`
- Backend: `prod/server/routes/omSpec.js` (GET /:id endpoint)

---

### Feature Area: Edit Task Modal

| UI Component | User Action | Frontend Hook/Service | API Endpoint | Request Method | Request Params | Response Schema | DB Query | DB Table/Collection |
|-------------|-------------|----------------------|--------------|----------------|----------------|-----------------|----------|---------------------|
| EditButton (in table row) | Click "Edit" | `useOMSpecTask(id)` | `GET /api/church/om-spec/:id` | GET | `:id` | `{ task: Task }` | `SELECT * FROM om_spec_tasks WHERE id = ?` | `om_spec_tasks` |
| EditTaskModal | Open modal | `useOMSpecTask(id)` | `GET /api/church/om-spec/:id` | GET | `:id` | `{ task: Task }` | `SELECT * FROM om_spec_tasks WHERE id = ?` | `om_spec_tasks` |
| TaskForm (in modal) | Submit form | `useUpdateOMSpecTask()` | `PUT /api/church/om-spec/:id` | PUT | `:id` (route param)<br>`body: TaskUpdate` | `{ task: Task }` | `UPDATE om_spec_tasks SET ... WHERE id = ?`<br>`INSERT INTO om_spec_revisions ...` | `om_spec_tasks`<br>`om_spec_revisions` |
| CreateButton | Click "Create" | `useCreateOMSpecTask()` | `POST /api/church/om-spec` | POST | `body: TaskCreate` | `{ task: Task }` | `INSERT INTO om_spec_tasks ...` | `om_spec_tasks` |

**Current Status:** ❌ No implementation found

**Expected Files:**
- Frontend: `prod/front-end/src/views/om-spec/components/EditTaskModal.tsx`
- Frontend: `prod/front-end/src/hooks/useUpdateOMSpecTask.ts`
- Frontend: `prod/front-end/src/hooks/useCreateOMSpecTask.ts`
- Backend: `prod/server/routes/omSpec.js` (POST, PUT endpoints)

---

### Feature Area: Delete Task

| UI Component | User Action | Frontend Hook/Service | API Endpoint | Request Method | Request Params | Response Schema | DB Query | DB Table/Collection |
|-------------|-------------|----------------------|--------------|----------------|----------------|-----------------|----------|---------------------|
| DeleteButton (in table row) | Click "Delete" | `useDeleteOMSpecTask()` | `DELETE /api/church/om-spec/:id` | DELETE | `:id` (route param) | `{ success: boolean }` | `DELETE FROM om_spec_tasks WHERE id = ?`<br>`DELETE FROM om_spec_revisions WHERE task_id = ?`<br>`DELETE FROM om_spec_attachments WHERE task_id = ?` | `om_spec_tasks`<br>`om_spec_revisions`<br>`om_spec_attachments` |
| ConfirmDialog | Confirm deletion | `useDeleteOMSpecTask()` | `DELETE /api/church/om-spec/:id` | DELETE | `:id` | `{ success: boolean }` | Same as above | Same as above |

**Current Status:** ❌ No implementation found

**Expected Files:**
- Frontend: `prod/front-end/src/hooks/useDeleteOMSpecTask.ts`
- Backend: `prod/server/routes/omSpec.js` (DELETE endpoint)

---

### Feature Area: Attachments

| UI Component | User Action | Frontend Hook/Service | API Endpoint | Request Method | Request Params | Response Schema | DB Query | DB Table/Collection |
|-------------|-------------|----------------------|--------------|----------------|----------------|-----------------|----------|---------------------|
| UploadButton | Upload file | `useUploadAttachment()` | `POST /api/church/om-spec/:id/attachments` | POST | `:id`<br>`body: FormData` | `{ attachment: Attachment }` | `INSERT INTO om_spec_attachments ...` | `om_spec_attachments` |
| AttachmentLink | Download/view | `useDownloadAttachment()` | `GET /api/church/om-spec/attachments/:attachmentId` | GET | `:attachmentId` | File stream or URL | `SELECT * FROM om_spec_attachments WHERE id = ?` | `om_spec_attachments` |
| DeleteAttachmentButton | Delete attachment | `useDeleteAttachment()` | `DELETE /api/church/om-spec/attachments/:attachmentId` | DELETE | `:attachmentId` | `{ success: boolean }` | `DELETE FROM om_spec_attachments WHERE id = ?` | `om_spec_attachments` |

**Current Status:** ❌ No implementation found

**Expected Files:**
- Frontend: `prod/front-end/src/hooks/useAttachments.ts`
- Backend: `prod/server/routes/omSpec.js` (attachment endpoints)
- Backend: `prod/server/controllers/omSpecController.js` (file handling)

---

### Feature Area: Revisions

| UI Component | User Action | Frontend Hook/Service | API Endpoint | Request Method | Request Params | Response Schema | DB Query | DB Table/Collection |
|-------------|-------------|----------------------|--------------|----------------|----------------|-----------------|----------|---------------------|
| RevisionsList | Display revisions | `useOMSpecRevisions(id)` | `GET /api/church/om-spec/:id/revisions` | GET | `:id` | `{ revisions: Revision[] }` | `SELECT * FROM om_spec_revisions WHERE task_id = ? ORDER BY created DESC` | `om_spec_revisions` |
| RevisionItem | View revision | `useOMSpecRevision(revisionId)` | `GET /api/church/om-spec/revisions/:revisionId` | GET | `:revisionId` | `{ revision: Revision }` | `SELECT * FROM om_spec_revisions WHERE id = ?` | `om_spec_revisions` |
| DiffView | Compare revisions | `useOMSpecDiff(id1, id2)` | `GET /api/church/om-spec/revisions/diff` | GET | `?revision1=id&revision2=id` | `{ diff: DiffResult }` | `SELECT * FROM om_spec_revisions WHERE id IN (?, ?)` | `om_spec_revisions` |

**Current Status:** ❌ No implementation found

**Expected Files:**
- Frontend: `prod/front-end/src/hooks/useOMSpecRevisions.ts`
- Backend: `prod/server/routes/omSpec.js` (revision endpoints)

---

## Data Models

### Task/Documentation Model

**Expected Database Schema:**
```sql
CREATE TABLE om_spec_tasks (
  id INT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(255) NOT NULL,
  category VARCHAR(100),
  importance ENUM('low', 'medium', 'high', 'critical'),
  status ENUM('draft', 'published', 'archived'),
  type VARCHAR(100),
  visibility ENUM('admin', 'public', 'private'),
  assigned_to INT,
  tags JSON,
  content TEXT,
  created TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by INT,
  FOREIGN KEY (assigned_to) REFERENCES users(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);
```

**Expected TypeScript Interface:**
```typescript
interface OMSpecTask {
  id: number;
  title: string;
  category: string;
  importance: 'low' | 'medium' | 'high' | 'critical';
  status: 'draft' | 'published' | 'archived';
  type: string;
  visibility: 'admin' | 'public' | 'private';
  assignedTo?: number;
  tags: string[];
  content: string;
  created: string; // ISO timestamp
  updated: string; // ISO timestamp
  createdBy: number;
}
```

**Current Status:** ❌ No schema/model found

---

### Revision Model

**Expected Database Schema:**
```sql
CREATE TABLE om_spec_revisions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  task_id INT NOT NULL,
  content TEXT,
  changes JSON,
  created_by INT,
  created TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (task_id) REFERENCES om_spec_tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id)
);
```

**Current Status:** ❌ No schema/model found

---

### Attachment Model

**Expected Database Schema:**
```sql
CREATE TABLE om_spec_attachments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  task_id INT NOT NULL,
  filename VARCHAR(255) NOT NULL,
  file_path VARCHAR(500),
  file_size INT,
  mime_type VARCHAR(100),
  uploaded_by INT,
  created TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (task_id) REFERENCES om_spec_tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (uploaded_by) REFERENCES users(id)
);
```

**Current Status:** ❌ No schema/model found

---

## Authentication & Authorization

### Expected Auth Flow

| UI Action | Frontend Check | API Endpoint | Backend Middleware | Permission Required |
|-----------|----------------|--------------|-------------------|---------------------|
| View list | `hasPermission('view_om_spec')` | `GET /api/church/om-spec` | `authMiddleware`<br>`permissionMiddleware` | `view_om_spec` |
| View task | `hasPermission('view_om_spec')` | `GET /api/church/om-spec/:id` | `authMiddleware`<br>`permissionMiddleware` | `view_om_spec` |
| Create task | `hasPermission('create_om_spec')` | `POST /api/church/om-spec` | `authMiddleware`<br>`permissionMiddleware` | `create_om_spec` |
| Edit task | `hasPermission('edit_om_spec')` OR `isAssignedTo(task)` | `PUT /api/church/om-spec/:id` | `authMiddleware`<br>`permissionMiddleware`<br>`ownershipMiddleware` | `edit_om_spec` OR owner |
| Delete task | `hasPermission('delete_om_spec')` OR `isAssignedTo(task)` | `DELETE /api/church/om-spec/:id` | `authMiddleware`<br>`permissionMiddleware`<br>`ownershipMiddleware` | `delete_om_spec` OR owner |
| View admin-only | `hasRole('admin')` | `GET /api/church/om-spec?visibility=admin` | `authMiddleware`<br>`roleMiddleware` | `admin` role |

**Current Status:** ❌ No auth implementation found

**Expected Files:**
- Frontend: `prod/front-end/src/utils/permissions.ts`
- Backend: `prod/server/middleware/authMiddleware.js`
- Backend: `prod/server/middleware/permissionMiddleware.js`

---

## Error Handling

### Expected Error Responses

| Error Type | HTTP Status | Response Schema | UI Handling |
|------------|-------------|-----------------|-------------|
| Not Found | 404 | `{ error: 'Task not found' }` | Show error message, close drawer/modal |
| Unauthorized | 401 | `{ error: 'Unauthorized' }` | Redirect to login |
| Forbidden | 403 | `{ error: 'Permission denied' }` | Show error message, disable action |
| Validation Error | 400 | `{ error: 'Validation failed', fields: {...} }` | Show field errors in form |
| Server Error | 500 | `{ error: 'Internal server error' }` | Show generic error message |

**Current Status:** ❌ No error handling found

---

## Notes

1. **Database Selection:** Based on requirements, this should use `orthodoxmetrics_db` (not `orthodoxmetrics_auth_db`)

2. **Pagination:** Expected but not confirmed - may use offset/limit or cursor-based pagination

3. **Sorting:** Expected but not confirmed - may support sorting by created, updated, title, importance, etc.

4. **Optimistic Updates:** Expected for delete/edit actions but not confirmed

5. **Real-time Updates:** Not mentioned in requirements - may use WebSockets or polling

---

## Next Steps

Once the feature is located or implemented:

1. **Update this mapping** with actual file paths and line numbers
2. **Document actual API request/response schemas** from code
3. **Document actual database queries** from controllers/models
4. **Add actual error handling** patterns found
5. **Document actual authentication/authorization** implementation
