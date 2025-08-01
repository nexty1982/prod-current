# OM-BigBook Components Documentation

This directory contains auto-generated documentation for OMB (OrthodoxMetrics Builder) components.

## 📁 Directory Structure

```
docs/OM-BigBook/pages/components/
├── README.md                    # This file
├── {component-id}.md           # Auto-generated component docs
└── ...
```

## 🔄 Auto-Generation Process

When a component is saved in the OMB Visual Editor:

1. **Component Analysis**: AI plugins analyze the component for:
   - Route availability and accessibility
   - Database table existence
   - Security configuration
   - Best practices compliance

2. **Documentation Generation**: Markdown files are automatically created with:
   - Component metadata (type, route, database table, roles)
   - Plugin analysis results
   - Usage examples and API integration details
   - Security recommendations

3. **File Naming**: Files are named using the component ID with special characters replaced by hyphens

## 📄 Documentation Format

Each component documentation includes:

```markdown
# Component Name

**Type**: Icon/Card/Button  
**Route**: `/api/endpoint`  
**DB Table**: `table_name`  
**Roles**: `[role1, role2]`  
**Description**: Component description

---

✅ Linked from dashboard  
📡 Binds to `GET /api/endpoint`

## 🔍 Analysis Results

### routeChecker
✅ Route /api/endpoint is live and accessible

### databaseChecker
✅ Database table 'table_name' exists

### securityAnalyzer
🔒 Security Analysis:
✅ No security issues detected

## 📋 Metadata

**Created**: 2024-01-01T00:00:00.000Z  
**Updated**: 2024-01-01T00:00:00.000Z  
**Created By**: current_user

## 💻 Usage

This component is automatically generated and managed by the OMB Visual Editor.

### API Integration
- **Endpoint**: `/api/endpoint`
- **Method**: GET
- **Authentication**: Required
- **Roles**: role1, role2

### Database Schema
- **Table**: `table_name`
- **Access**: Role-based
```

## 🔗 Integration

- **OMB Editor**: Components are created and configured in `/omb/editor`
- **Plugin System**: Analysis performed by `/services/om-ai/plugins/`
- **Documentation**: Auto-generated in this directory
- **Big Book**: Integrated with the main documentation system

## 🛡️ Security

- All user content is escaped in markdown output
- Plugin execution is sandboxed
- No direct file system access by plugins
- Controlled API endpoints only

## 📊 Statistics

- **Total Components**: Auto-tracked
- **Analysis Coverage**: 100% of saved components
- **Documentation Quality**: Standardized format
- **Update Frequency**: Real-time on component save

---

*This documentation is automatically maintained by the OM-AI system.* 