# 🚀 Multi-Tenant Template System - Quick Reference

## Essential Commands

### Database Operations
```bash
# Run migration
cd server && node -e "const mysql = require('mysql2/promise'); /* migration code */"

# Test system
cd server && node test-multi-tenant-templates.js

# Sync existing templates
cd server && node -e "require('./services/templateService').syncExistingTemplates()"
```

### API Quick Reference

| Endpoint | Method | Purpose | Parameters |
|----------|--------|---------|------------|
| `/api/templates` | GET | Get all templates | `?churchId=14&includeGlobal=true` |
| `/api/templates/church/:id` | GET | Church templates | `:id` = church ID |
| `/api/templates/global/available` | GET | Global templates | None |
| `/api/templates/generate` | POST | Create template | `{templateName, fields, churchId}` |
| `/api/templates/duplicate` | POST | Duplicate global | `{globalTemplateName, churchId, newName}` |
| `/api/templates/:name` | PUT | Update template | `{fields, description, churchId}` |
| `/api/templates/:name` | DELETE | Delete template | `{churchId}` in body |

### Frontend Service Usage

```javascript
// Get church templates
const templates = await templateService.getTemplatesForChurch(14);

// Create new template
await templateService.createTemplate({
  templateName: 'CustomRecords',
  fields: [
    { field: 'name', label: 'Full Name', type: 'string' },
    { field: 'date', label: 'Date', type: 'date' }
  ],
  churchId: 14,
  options: { recordType: 'custom', description: 'Custom template' }
});

// Duplicate global template
await templateService.duplicateGlobalTemplate(
  'BaptismRecords', 14, 'ChurchBaptism', 
  { description: 'Customized baptism template' }
);
```

### Database Schema Quick View

```sql
-- Key columns in templates table
church_id INT          -- NULL for global, church ID for church-specific
is_global BOOLEAN      -- TRUE for global templates
fields JSON           -- Template field definitions
is_editable BOOLEAN   -- FALSE for system templates
record_type ENUM      -- 'baptism', 'marriage', 'funeral', 'custom'
```

### Permission Rules

1. **Global Templates**: Read-only for church admins
2. **Church Templates**: Full CRUD for owning church only
3. **Cross-Church Access**: Blocked at service level
4. **Template Creation**: Requires valid church ID or global admin rights

### Common Patterns

```javascript
// Service method pattern
static async methodName(params, churchId = null) {
  // 1. Validate inputs
  // 2. Build query with church filtering
  // 3. Execute with permission checks
  // 4. Return formatted results
}

// Permission check pattern
if (churchId && template.church_id && template.church_id !== churchId) {
  throw new Error('Permission denied');
}

// Global template check
if (template.is_global && !allowGlobalUpdate) {
  throw new Error('Cannot modify global templates');
}
```

### File Structure
```
server/
├── services/templateService.js     # Business logic
├── routes/templates.js             # API endpoints  
├── database/migrations/            # Schema changes
└── test-multi-tenant-templates.js  # Test suite

front-end/src/
├── services/templateService.ts     # API client
└── views/admin/RecordTemplateManager.tsx # UI component
```

### Troubleshooting

| Issue | Solution |
|-------|----------|
| Foreign key error | Verify church exists in `churches` table |
| Permission denied | Check `church_id` matches current user's church |
| Template not found | Verify church context in request |
| File sync issues | Run `syncExistingTemplates()` |

### Testing Checklist

- [ ] Church can create/edit/delete own templates
- [ ] Church cannot access other church templates  
- [ ] Church can view but not edit global templates
- [ ] Church can duplicate global templates
- [ ] Global templates work for all churches
- [ ] Permission errors return proper HTTP codes
- [ ] Database constraints prevent invalid data

---

**🎯 Remember**: This is a multi-tenant system where data isolation is critical. Always test with multiple church contexts!
