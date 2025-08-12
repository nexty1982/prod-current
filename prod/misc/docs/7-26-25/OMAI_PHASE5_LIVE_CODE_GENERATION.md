# OM-AI Phase 5: Live Code Generation + Commit Hooks

## 🎯 Overview

Phase 5 completes the operational loop by enabling OMB to generate live TypeScript, API, and documentation files from component metadata, with optional Git integration and comprehensive audit logging. This phase transforms the visual design system into a fully operational code generation platform.

---

## 📁 Implementation Structure

```
services/omb/
├── templates/
│   ├── component.ejs          # React TypeScript component template
│   ├── api-route.ejs          # Express.js API route template
│   └── markdown-doc.ejs       # Documentation template
├── generateFromComponent.ts    # Main code generation engine
└── layouts/
    └── omb-components.json    # Component storage

front-end/src/pages/omb/
├── OMBEditor.tsx              # Updated with code generation
├── CodePreviewModal.tsx       # Code preview interface
├── MetadataForm.tsx           # Enhanced with generate button
└── types.ts                   # Updated types

server/routes/omb.js           # Enhanced with generation APIs
logs/omb-codegen.log          # Audit trail
```

---

## 🔧 Template System

### 1. Component Template (`component.ejs`)

**Purpose**: Generates React TypeScript components
**Features**:
- Material-UI integration
- Navigation handling
- Role-based display
- Responsive design
- TypeScript interfaces

**Generated Output**:
```typescript
// src/pages/auto/{component-id}.tsx
export default function ComponentName() {
  const navigate = useNavigate();
  
  return (
    <Paper elevation={2} onClick={() => navigate('/route')}>
      <Grid container>
        <Grid item>
          <Box sx={{ /* icon styling */ }}>
            <Typography>{icon}</Typography>
          </Box>
        </Grid>
        <Grid item xs>
          <Typography variant="h6">{name}</Typography>
          <Typography variant="body2">{description}</Typography>
          {roles.map(role => <Chip label={role} />)}
        </Grid>
      </Grid>
    </Paper>
  );
}
```

### 2. API Route Template (`api-route.ejs`)

**Purpose**: Generates Express.js API handlers
**Features**:
- CRUD operations (GET, POST, PUT, DELETE)
- Database integration
- Error handling
- Response formatting
- Route parameter handling

**Generated Output**:
```javascript
// src/api/auto/{component-id}.ts
const express = require('express');
const router = express.Router();

router.get('/route', async (req, res) => {
  try {
    const [rows] = await promisePool.query(
      'SELECT * FROM table_name ORDER BY created_at DESC'
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch data' });
  }
});

module.exports = router;
```

### 3. Documentation Template (`markdown-doc.ejs`)

**Purpose**: Generates comprehensive documentation
**Features**:
- Component metadata
- API integration details
- Database schema information
- Usage examples
- Generated file references

**Generated Output**:
```markdown
# Component Name

**Type**: Icon  
**Route**: `/api/route`  
**DB Table**: `table_name`  
**Roles**: `["role1", "role2"]`

## Generated Files
- Component: `src/pages/auto/{id}.tsx`
- API Route: `src/api/auto/{id}.ts`
- Documentation: `docs/OM-BigBook/pages/components/{id}.md`
```

---

## 🚀 Code Generation Engine

### 1. Main Generator (`generateFromComponent.ts`)

**Features**:
- EJS template rendering
- File system management
- Directory creation
- Error handling
- Git integration
- Audit logging

**Core Functions**:
```typescript
// Generate code from component
generateFromComponent(component, options)

// Preview without writing files
previewGeneratedCode(component)

// Generate and commit to Git
generateAndCommit(component, user)
```

### 2. File Generation Process

1. **Template Loading**: Load EJS templates from `/templates/`
2. **Variable Substitution**: Replace template variables with component data
3. **File Writing**: Create files in appropriate directories
4. **Audit Logging**: Record generation in `/logs/omb-codegen.log`
5. **Git Integration**: Optional commit to development branch

### 3. Generated File Structure

```
src/
├── pages/auto/
│   └── {component-id}.tsx    # React components
└── api/auto/
    └── {component-id}.ts     # API routes

docs/OM-BigBook/pages/components/
└── {component-id}.md         # Documentation
```

---

## 🖥️ UI Integration

### 1. Code Preview Modal

**Location**: `front-end/src/pages/omb/CodePreviewModal.tsx`

**Features**:
- Tabbed interface (Component, API, Documentation)
- Syntax highlighting
- File content preview
- Generate/Commit options
- Loading states

**Layout**:
- **Header**: Component info with chips
- **Tabs**: Component, API Route, Documentation
- **Content**: Syntax-highlighted code preview
- **Actions**: Generate Code, Cancel

### 2. Enhanced Metadata Form

**New Features**:
- **Generate Code Button**: Triggers code preview
- **Validation**: Ensures all required fields are filled
- **State Management**: Tracks generation progress
- **Error Handling**: Displays generation errors

### 3. Updated OMB Editor

**Enhanced Features**:
- Code generation integration
- Preview modal management
- Generation state tracking
- Success/error messaging

---

## 🔌 API Endpoints

### 1. Code Generation APIs

**POST `/api/omb/generate-code`**
- Generate code without Git commit
- Options: `{ commitToGit: false, user: 'username' }`
- Response: `{ success: true, files: { componentFile, apiFile, docFile } }`

**POST `/api/omb/preview-code`**
- Preview generated code without writing files
- Request: `{ component: BoundComponent }`
- Response: `{ success: true, files: { componentFile, apiFile, docFile } }`

**POST `/api/omb/generate-and-commit`**
- Generate code and commit to Git
- Request: `{ component: BoundComponent, user: 'username' }`
- Response: `{ success: true, files: { componentFile, apiFile, docFile } }`

**GET `/api/omb/generation-logs`**
- Retrieve code generation audit logs
- Response: `{ success: true, logs: LogEntry[] }`

### 2. Log Entry Format

```typescript
interface LogEntry {
  timestamp: string;
  componentId: string;
  componentName: string;
  files: string[];
  user: string;
  committed: boolean;
}
```

---

## 🔐 Security Features

### 1. Template Security
- EJS template escaping
- User input sanitization
- Path traversal prevention
- File system access control

### 2. Git Integration Security
- Conventional commit messages
- User attribution
- Branch protection
- Commit validation

### 3. Audit Trail
- Comprehensive logging
- User tracking
- File generation records
- Error logging

---

## 📊 Audit Logging

### 1. Log File: `/logs/omb-codegen.log`

**Format**: JSON lines
**Fields**:
- `timestamp`: ISO 8601 timestamp
- `componentId`: Unique component identifier
- `componentName`: Human-readable name
- `files`: Array of generated file paths
- `user`: User who triggered generation
- `committed`: Whether files were committed to Git

**Example Entry**:
```json
{
  "timestamp": "2024-01-01T12:00:00.000Z",
  "componentId": "parish-events-icon",
  "componentName": "Parish Events",
  "files": [
    "src/pages/auto/parish-events-icon.tsx",
    "src/api/auto/parish-events-icon.ts",
    "docs/OM-BigBook/pages/components/parish-events-icon.md"
  ],
  "user": "super_admin",
  "committed": true
}
```

### 2. Git Commit Messages

**Format**: Conventional commits
**Structure**:
```
feat(omb): generated {component-id} component, route, and doc

Generated from OMB component:
- Name: {name}
- Type: {type}
- Route: {route}
- DB Table: {dbTable}
- Roles: {roles}

Files generated:
- {componentFile}
- {apiFile}
- {docFile}

Generated by: {user}
Generated at: {timestamp}
```

---

## 🔄 Workflow Integration

### 1. Component Creation Flow
1. User designs component in OMB Editor
2. User configures metadata (route, database, roles)
3. User saves component (triggers plugin analysis)
4. User clicks "Generate Code" button
5. System shows code preview modal
6. User reviews generated code
7. User confirms generation
8. System generates files and optionally commits to Git
9. System logs generation and updates audit trail

### 2. Code Generation Flow
1. Component data validated
2. EJS templates loaded
3. Variables substituted
4. Files generated in appropriate directories
5. Audit log entry created
6. Optional Git staging and commit
7. Success/error response returned

### 3. Git Integration Flow
1. Files staged with `git add`
2. Conventional commit message generated
3. Commit executed with `git commit`
4. Log entry updated to mark as committed
5. Success/error response returned

---

## 🎯 Strategic Outcomes

### 1. Operational Code Generation
- Live TypeScript component generation
- Express.js API route generation
- Comprehensive documentation generation
- Git integration for version control

### 2. Development Efficiency
- Zero manual coding for basic components
- Automated file organization
- Consistent code patterns
- Version-controlled changes

### 3. Audit and Compliance
- Complete generation audit trail
- User attribution for all changes
- Conventional commit messages
- Rollback capability through Git

### 4. Quality Assurance
- Template-based consistency
- TypeScript type safety
- Material-UI design system
- Error handling patterns

---

## ✅ Phase 5 Completion Status

### ✅ Completed Features
- [x] EJS template system (component, API, documentation)
- [x] Code generation engine with file system management
- [x] Git integration with conventional commits
- [x] Comprehensive audit logging
- [x] Code preview modal with syntax highlighting
- [x] Enhanced OMB editor with generation buttons
- [x] Backend API routes for generation
- [x] Error handling and validation
- [x] Security features and sandboxing
- [x] User attribution and tracking

### 🎯 Ready for Testing
The Phase 5 Live Code Generation system is now ready for comprehensive testing with:
- Component design and metadata configuration
- Code preview and generation
- Git integration and commit management
- Audit logging and trail tracking
- Error handling and recovery

---

## 🔗 Access Points

- **OMB Editor**: `/omb/editor` - Visual editor with code generation
- **Code Preview**: Modal interface for reviewing generated code
- **Generated Files**: `src/pages/auto/`, `src/api/auto/`, `docs/OM-BigBook/pages/components/`
- **Generation API**: `/api/omb/generate-code` - Code generation
- **Preview API**: `/api/omb/preview-code` - Code preview
- **Commit API**: `/api/omb/generate-and-commit` - Generate and commit
- **Logs API**: `/api/omb/generation-logs` - Audit trail
- **Audit Log**: `/logs/omb-codegen.log` - Generation history

---

## 🚀 Next Steps (Future Phases)

### Phase 6 Enhancements
1. **Advanced Templates**: Complex component patterns, forms, tables
2. **Database Schema Generation**: Auto-create database tables
3. **Testing Integration**: Auto-generate unit tests
4. **Deployment Pipeline**: CI/CD integration
5. **Advanced Components**: Charts, maps, complex layouts

### Integration Opportunities
- **OM-AI Enhancement**: Use generated code for better suggestions
- **Testing Framework**: Auto-generate Jest/React Testing Library tests
- **Database Migration**: Auto-generate database schema changes
- **API Documentation**: Auto-generate OpenAPI/Swagger specs

---

The Phase 5 Live Code Generation + Commit Hooks system provides a complete operational loop from visual design to production-ready code, with comprehensive audit trails and Git integration, making OrthodoxMetrics a fully self-documenting and self-generating development platform. 