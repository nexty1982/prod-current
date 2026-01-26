# OM Specification Documentation - Operations Notes

**Analysis Date:** 2026-01-24  
**Status:** ⚠️ **FEATURE NOT FOUND - OPERATIONAL NOTES BASED ON EXPECTED STRUCTURE**

## Overview

This document contains operational information for running, testing, and maintaining the `/church/om-spec` feature. Since the feature was not found in the codebase, these notes are based on expected patterns from similar features in the codebase.

---

## Local Development Setup

### Prerequisites

**Current Status:** ❌ Feature not found - prerequisites unknown

**Expected Prerequisites:**
- Node.js (version from `package.json`)
- Database: MySQL/PostgreSQL (based on `orthodoxmetrics_db`)
- Environment variables configured

### Environment Variables

**Expected Environment Variables:**

**Frontend (`prod/front-end/.env`):**
```env
# API Base URL
VITE_API_BASE_URL=http://localhost:5000/api

# Feature flags (if applicable)
VITE_ENABLE_OM_SPEC=true
```

**Backend (`prod/server/.env`):**
```env
# Database connection
DB_HOST=localhost
DB_PORT=3306
DB_NAME=orthodoxmetrics_db
DB_USER=your_user
DB_PASSWORD=your_password

# JWT Secret
JWT_SECRET=your_jwt_secret

# File upload (for attachments)
UPLOAD_DIR=./uploads/om-spec
MAX_FILE_SIZE=10485760  # 10MB
```

**Current Status:** ❌ No environment variables found

**Files Checked:**
- `prod/front-end/.env` - Not found
- `prod/front-end/.env.example` - Not found
- `prod/server/.env` - Not found
- `prod/server/.env.example` - Not found

---

## Running Locally

### Frontend

**Expected Command:**
```bash
cd prod/front-end
npm install
npm run dev
```

**Expected URL:** `http://localhost:5173/church/om-spec` (or port from Vite config)

**Current Status:** ❌ Feature not found - cannot run

**Files Checked:**
- `prod/front-end/package.json` - Exists but om-spec scripts not found
- `prod/front-end/vite.config.ts` - Not checked (may exist)

### Backend

**Expected Command:**
```bash
cd prod/server
npm install
npm run dev
```

**Expected API Base:** `http://localhost:5000/api/church/om-spec`

**Current Status:** ❌ Feature not found - cannot run

**Files Checked:**
- `prod/server/package.json` - Exists but om-spec scripts not found
- `prod/server/server.js` or `prod/server/index.js` - Not checked

---

## Database Setup

### Schema Creation

**Expected SQL File:** `prod/server/database/om_spec_schema.sql`

**Expected Schema:**
```sql
-- Main tasks table
CREATE TABLE IF NOT EXISTS om_spec_tasks (
  id INT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(255) NOT NULL,
  category VARCHAR(100),
  importance ENUM('low', 'medium', 'high', 'critical') DEFAULT 'medium',
  status ENUM('draft', 'published', 'archived') DEFAULT 'draft',
  type VARCHAR(100),
  visibility ENUM('admin', 'public', 'private') DEFAULT 'private',
  assigned_to INT,
  tags JSON,
  content TEXT,
  created TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by INT,
  FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_category (category),
  INDEX idx_status (status),
  INDEX idx_visibility (visibility),
  INDEX idx_assigned_to (assigned_to),
  INDEX idx_created (created)
);

-- Revisions table
CREATE TABLE IF NOT EXISTS om_spec_revisions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  task_id INT NOT NULL,
  content TEXT,
  changes JSON,
  created_by INT,
  created TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (task_id) REFERENCES om_spec_tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_task_id (task_id),
  INDEX idx_created (created)
);

-- Attachments table
CREATE TABLE IF NOT EXISTS om_spec_attachments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  task_id INT NOT NULL,
  filename VARCHAR(255) NOT NULL,
  file_path VARCHAR(500),
  file_size INT,
  mime_type VARCHAR(100),
  uploaded_by INT,
  created TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (task_id) REFERENCES om_spec_tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_task_id (task_id)
);
```

**Current Status:** ❌ No schema file found

**Database Location:** Should be in `orthodoxmetrics_db` (not `orthodoxmetrics_auth_db`)

### Migration Scripts

**Expected Location:** `prod/server/database/migrations/om_spec_*.sql`

**Current Status:** ❌ No migration scripts found

---

## Seed Data

### Test Data

**Expected Seed File:** `prod/server/database/seeds/om_spec_seed.sql`

**Expected Seed Data:**
```sql
-- Sample tasks for testing
INSERT INTO om_spec_tasks (title, category, importance, status, type, visibility, content, created_by) VALUES
('API Documentation Standards', 'Documentation', 'high', 'published', 'guide', 'admin', 'Content here...', 1),
('Database Schema Guidelines', 'Documentation', 'high', 'published', 'guide', 'admin', 'Content here...', 1),
('Frontend Component Patterns', 'Documentation', 'medium', 'draft', 'guide', 'admin', 'Content here...', 1),
('Task: Review PR #123', 'Task', 'medium', 'draft', 'task', 'admin', 'Content here...', 1),
('Task: Update Documentation', 'Task', 'low', 'published', 'task', 'public', 'Content here...', 1);
```

**Current Status:** ❌ No seed data found

---

## Testing

### Unit Tests

**Expected Test Files:**
- `prod/front-end/src/views/om-spec/__tests__/OMSpecPage.test.tsx`
- `prod/front-end/src/hooks/__tests__/useOMSpec.test.ts`
- `prod/server/__tests__/routes/omSpec.test.js`
- `prod/server/__tests__/controllers/omSpecController.test.js`

**Current Status:** ❌ No test files found

### Integration Tests

**Expected Test Scenarios:**
1. List tasks with filters
2. Create new task
3. Update existing task
4. Delete task
5. View task details
6. Upload attachment
7. View revisions
8. Permission checks

**Current Status:** ❌ No integration tests found

### Manual Testing Checklist

**Expected Test Cases:**

- [ ] Navigate to `/church/om-spec`
- [ ] Verify page loads with title "OM Specification Documentation"
- [ ] Switch between Documentation and Tasks tabs
- [ ] Test search functionality
- [ ] Test each filter dropdown (Category, Importance, Status, Type, Visibility)
- [ ] Verify table displays all columns correctly
- [ ] Click "View" to open drawer
- [ ] Verify drawer displays task details
- [ ] Verify revisions section in drawer
- [ ] Verify attachments section in drawer
- [ ] Click "Edit" to open modal
- [ ] Submit edit form and verify update
- [ ] Click "Delete" and verify confirmation
- [ ] Verify delete removes task
- [ ] Test permission checks (admin vs non-admin)
- [ ] Test "Assigned To" filtering

**Current Status:** ❌ Cannot test - feature not found

---

## Troubleshooting

### Common Issues

**Issue: Route not found (404)**
- **Expected Cause:** Route not registered in Router.tsx
- **Expected Fix:** Add route definition to `prod/front-end/src/routes/Router.tsx`

**Issue: API endpoint not found (404)**
- **Expected Cause:** Route not registered in backend
- **Expected Fix:** Add route to `prod/server/routes/omSpec.js` and register in main server file

**Issue: Database connection error**
- **Expected Cause:** Wrong database name or credentials
- **Expected Fix:** Verify `.env` file has correct `orthodoxmetrics_db` credentials (not `orthodoxmetrics_auth_db`)

**Issue: Permission denied (403)**
- **Expected Cause:** User doesn't have required permissions
- **Expected Fix:** Check user roles/permissions in database

**Issue: Attachments not uploading**
- **Expected Cause:** Upload directory doesn't exist or permissions issue
- **Expected Fix:** Create upload directory and set permissions

**Current Status:** ❌ No known issues (feature not found)

---

## Deployment

### Build Process

**Frontend:**
```bash
cd prod/front-end
npm run build
```

**Backend:**
```bash
cd prod/server
npm run build  # if applicable
```

**Current Status:** ❌ Build process unknown

### Environment-Specific Configs

**Expected Configurations:**
- Development: `localhost` database, debug logging enabled
- Staging: Staging database, limited logging
- Production: Production database, error logging only

**Current Status:** ❌ Configurations unknown

---

## Monitoring & Logging

### Expected Log Locations

**Frontend Logs:**
- Browser console (development)
- Error tracking service (production)

**Backend Logs:**
- `prod/server/logs/om-spec.log` (if file logging)
- Console output (development)
- Logging service (production)

**Current Status:** ❌ Logging configuration unknown

### Metrics to Monitor

**Expected Metrics:**
- API endpoint response times
- Database query performance
- File upload success/failure rates
- Error rates by endpoint
- User activity (views, creates, updates, deletes)

**Current Status:** ❌ Metrics not configured

---

## Maintenance

### Database Maintenance

**Expected Maintenance Tasks:**
- Clean up old revisions (keep last N revisions per task)
- Archive old tasks (move to archived status)
- Clean up orphaned attachments
- Optimize indexes

**Current Status:** ❌ Maintenance scripts not found

### Backup Strategy

**Expected Backup:**
- Database: Regular backups of `orthodoxmetrics_db.om_spec_*` tables
- Files: Backup of attachment upload directory

**Current Status:** ❌ Backup strategy unknown

---

## Dependencies

### Frontend Dependencies

**Expected Dependencies:**
- React Router (for routing)
- React Query or SWR (for data fetching)
- Material-UI or similar (for UI components)
- Axios or fetch (for API calls)

**Current Status:** ❌ Dependencies unknown (feature not found)

**Files Checked:**
- `prod/front-end/package.json` - Exists but om-spec dependencies not identified

### Backend Dependencies

**Expected Dependencies:**
- Express (for routing)
- Database driver (mysql2 or pg)
- Multer or similar (for file uploads)
- JWT library (for authentication)

**Current Status:** ❌ Dependencies unknown (feature not found)

**Files Checked:**
- `prod/server/package.json` - Exists but om-spec dependencies not identified

---

## Related Features

### Similar Features in Codebase

1. **Kanban Task Management**
   - Location: `prod/front-end/src/components/apps/kanban/`
   - **Note:** Different feature but may share patterns

2. **Assign Task Page**
   - Location: `prod/front-end/src/pages/AssignTaskPage.tsx`
   - **Note:** Different feature but may share patterns

3. **Records Management**
   - Location: `prod/front-end/src/views/records/`
   - **Note:** May share table/filter patterns

---

## Next Steps

1. **Locate Feature:** Verify if feature exists under different name/path
2. **Implement Feature:** If not found, implement based on requirements
3. **Update This Document:** Once feature is found/implemented, update with actual:
   - Environment variables
   - Database schema
   - API endpoints
   - Test procedures
   - Deployment steps

---

## Notes

- **Database:** Must use `orthodoxmetrics_db` (not `orthodoxmetrics_auth_db`)
- **Permissions:** Feature appears to require admin-level access
- **File Storage:** Attachments likely stored in filesystem (not database)
- **Revisions:** Expected to be append-only (no deletion)
