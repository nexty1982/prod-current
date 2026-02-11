# ✅ Multi-Tenant Record Template System – Final Reference

## Context
We've implemented a dynamic React + Node.js-based Record Template Manager that supports **per-church template isolation** and **global template availability**.

---

## 🧩 Core Concepts

1. **Templates table includes:**
   - `church_id` → FK to `churches(id)`
   - `is_global` → `TRUE` for shared templates
   - `fields` → JSON describing field layout
   - Full support for themes, grid type, layout mode, language labels

2. **Church Admins can:**
   - View global templates (read-only)
   - View and manage their own templates
   - Duplicate global templates for customization

3. **Global Templates:**
   - Read-only to non-superadmin users
   - Provide standardized starting points
   - Can be duplicated via UI or API

---

## 🛠 Backend API Endpoints

```http
GET    /api/templates                       # all templates (optionally filter by churchId)
GET    /api/templates/church/:churchId      # only for one church (incl. global)
GET    /api/templates/global/available      # global templates to duplicate
POST   /api/templates/generate              # create new (requires churchId or is_global)
POST   /api/templates/duplicate             # duplicate global → church
PUT    /api/templates/:name                 # update (with permission check)
DELETE /api/templates/:name                 # delete (with permission check)
```

---

## 💾 Schema Structure (MariaDB)

```sql
CREATE TABLE templates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  record_type ENUM('baptism', 'marriage', 'funeral', 'custom') NOT NULL,
  description TEXT,
  fields JSON NOT NULL,
  grid_type ENUM('aggrid', 'mui', 'bootstrap') DEFAULT 'aggrid',
  theme VARCHAR(50) DEFAULT 'liturgicalBlueGold',
  layout_type ENUM('table', 'form', 'dual') DEFAULT 'table',
  language_support JSON,
  is_editable BOOLEAN DEFAULT TRUE,
  created_by INT,
  church_id INT DEFAULT NULL,
  is_global BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (church_id) REFERENCES churches(id) ON DELETE CASCADE,
  INDEX idx_templates_church_type (church_id, record_type)
);
```

---

## 🧩 Frontend Features (React + TypeScript + Material-UI)

**`/views/admin/RecordTemplateManager.tsx`**

- Tabbed interface: Global | Church-specific
- Action buttons filtered by user permissions
- Duplication dialog to copy global templates
- AG Grid preview, field mapping, and editor

---

## ✅ Test Cases Implemented

- ✔ Retrieve, create, update, delete (church-only)
- ✔ Fetch global templates
- ✔ Duplicate global template for a specific church
- ✔ Restrict editing/deletion of global templates
- ✔ Validate church-scoped access control

---

## ✨ Sample Use

```ts
// Create template
await templateService.createTemplate({
  templateName: 'FuneralRecords',
  recordType: 'funeral',
  fields: [...],
  churchId: 14
});

// Duplicate global
await templateService.duplicateGlobalTemplate(
  'BaptismRecords',
  14,
  'ChurchBaptismRecords',
  { description: 'Customized for Saints Peter & Paul' }
);
```

---

## 🔮 Future Copilot Prompts

Consider adding:
- `versioning` table for rollback history
- `template_categories` table (e.g. sacramental, administrative)
- `usage_stats` per church to track adoption

---

## 📋 Developer Onboarding Guide

### Prerequisites
- Node.js 18+ with TypeScript
- MariaDB/MySQL 8+
- React 18+ with Material-UI v5
- Understanding of multi-tenant architecture

### Quick Start for New Contributors

1. **Database Setup**
   ```bash
   # Run the migration
   cd server && node -e "require('./test-multi-tenant-templates.js')"
   ```

2. **Key Files to Understand**
   ```
   server/
   ├── services/templateService.js     # Core business logic
   ├── routes/templates.js             # API endpoints
   └── database/migrations/add_church_templates.sql
   
   front-end/src/
   ├── services/templateService.ts     # API client
   └── views/admin/RecordTemplateManager.tsx
   ```

3. **Common Development Tasks**

   **Adding New Field Types:**
   ```javascript
   // In templateService.js
   static inferFieldType(fieldName) {
     const fieldLower = fieldName.toLowerCase();
     if (fieldLower.includes('currency')) return 'currency'; // Add this
     // ... existing logic
   }
   ```

   **Adding New Record Types:**
   ```sql
   ALTER TABLE templates 
   MODIFY record_type ENUM('baptism', 'marriage', 'funeral', 'custom', 'memorial');
   ```

   **Creating New Endpoints:**
   ```javascript
   // In routes/templates.js
   router.get('/analytics/:churchId', async (req, res) => {
     const { churchId } = req.params;
     const stats = await TemplateService.getUsageStats(churchId);
     res.json({ success: true, data: stats });
   });
   ```

### 🛡️ Security Guidelines

1. **Always validate church ownership:**
   ```javascript
   if (churchId && template.church_id && template.church_id !== churchId) {
     throw new Error('Permission denied');
   }
   ```

2. **Never allow global template modification from church context:**
   ```javascript
   if (template.is_global && !updates.allowGlobalUpdate) {
     throw new Error('Cannot modify global templates');
   }
   ```

3. **Sanitize template names:**
   ```javascript
   const templateNameRegex = /^[A-Z][a-zA-Z0-9]*$/;
   if (!templateNameRegex.test(templateName)) {
     throw new Error('Invalid template name format');
   }
   ```

### 🔧 Maintenance Tasks

#### Monthly Tasks
- Review template usage statistics
- Clean up orphaned template files
- Check for database performance issues

#### Quarterly Tasks
- Update global templates with new best practices
- Review and optimize database indexes
- Audit permission system effectiveness

#### Annual Tasks
- Evaluate schema changes for new features
- Performance testing with large datasets
- Security audit of multi-tenant isolation

### 🐛 Common Issues & Solutions

1. **Template Files Out of Sync with Database**
   ```bash
   cd server && node -e "require('./services/templateService').syncExistingTemplates()"
   ```

2. **Foreign Key Constraint Violations**
   ```javascript
   // Ensure church exists before creating template
   const [churches] = await promisePool.execute('SELECT id FROM churches WHERE id = ?', [churchId]);
   if (churches.length === 0) throw new Error('Church not found');
   ```

3. **Performance Issues with Large Churches**
   ```sql
   -- Add composite indexes for common queries
   CREATE INDEX idx_templates_church_type_created ON templates(church_id, record_type, created_at);
   ```

### 🧪 Testing Strategy

1. **Unit Tests** (Service Layer)
   ```javascript
   describe('TemplateService.getAllTemplates', () => {
     it('should filter by church ID', async () => {
       const templates = await TemplateService.getAllTemplates(14, false);
       expect(templates.every(t => t.church_id === 14 || t.is_global)).toBe(true);
     });
   });
   ```

2. **Integration Tests** (API Layer)
   ```javascript
   describe('POST /api/templates/duplicate', () => {
     it('should duplicate global template for church', async () => {
       const response = await request(app)
         .post('/api/templates/duplicate')
         .send({ globalTemplateName: 'BaptismRecords', churchId: 14, newName: 'Test' });
       expect(response.status).toBe(200);
     });
   });
   ```

3. **E2E Tests** (UI Components)
   ```javascript
   test('Church admin can duplicate global template', async () => {
     await page.click('[data-testid="duplicate-template-btn"]');
     await page.selectOption('[data-testid="global-template-select"]', 'BaptismRecords');
     await page.fill('[data-testid="new-template-name"]', 'ChurchBaptism');
     await page.click('[data-testid="confirm-duplicate"]');
     await expect(page.locator('.success-message')).toBeVisible();
   });
   ```

### 📊 Monitoring & Analytics

1. **Template Usage Tracking**
   ```sql
   CREATE TABLE template_usage (
     id INT AUTO_INCREMENT PRIMARY KEY,
     template_id INT,
     church_id INT,
     action ENUM('view', 'edit', 'delete', 'duplicate'),
     user_id INT,
     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
     FOREIGN KEY (template_id) REFERENCES templates(id),
     FOREIGN KEY (church_id) REFERENCES churches(id)
   );
   ```

2. **Performance Metrics**
   ```javascript
   // Add to service methods
   const startTime = Date.now();
   const result = await operation();
   const duration = Date.now() - startTime;
   console.log(`Operation took ${duration}ms`);
   ```

3. **Error Tracking**
   ```javascript
   // Add to error handlers
   if (error.code === 'ER_NO_REFERENCED_ROW_2') {
     logger.error('Foreign key violation', { churchId, templateName, error });
   }
   ```

---

## 🚀 Enhancement Roadmap

### Phase 1: Core Improvements
- [ ] Template versioning system
- [ ] Bulk import/export functionality
- [ ] Advanced field validation rules
- [ ] Template preview without saving

### Phase 2: Advanced Features
- [ ] Template categories and tags
- [ ] Church-to-church template sharing
- [ ] Template marketplace
- [ ] Custom field types (rich text, file upload)

### Phase 3: Enterprise Features
- [ ] Template approval workflows
- [ ] Usage analytics dashboard
- [ ] API rate limiting per church
- [ ] Template backup and disaster recovery

---

## Summary

You are working in a **multi-tenant, field-configurable template engine** that generates `.tsx` pages dynamically for React/AG Grid UIs. Templates are scoped by `church_id`, with optional global defaults.

**This system is now in production-ready state.**

### Key Integration Points
- Authentication system provides `churchId` context
- File system manages generated React components
- Database maintains template metadata and relationships
- UI provides church-scoped template management

### Architecture Strengths
- ✅ Complete data isolation between churches
- ✅ Scalable to unlimited churches
- ✅ Flexible field configuration
- ✅ Robust permission system
- ✅ Performance-optimized queries
- ✅ Comprehensive error handling

### Next Steps for Contributors
1. Review the test suite in `test-multi-tenant-templates.js`
2. Understand the permission flow in `templateService.js`
3. Explore the UI patterns in `RecordTemplateManager.tsx`
4. Practice with the API using the provided examples
5. Consider implementing one of the roadmap features
