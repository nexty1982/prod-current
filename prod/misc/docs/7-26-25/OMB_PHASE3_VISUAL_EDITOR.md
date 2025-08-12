# OMB Phase 3: Visual Editor MVP

## 🎯 Overview

Phase 3 of the OrthodoxMetrics Builder (OMB) system provides a **Visual Site Editor** that allows super_admin users to create and configure UI components with automatic metadata generation. The system enables drag-and-drop component selection, metadata assignment, and live preview functionality.

---

## 📁 Implementation Structure

```
front-end/src/pages/omb/
├── editor.tsx               # Main page wrapper
├── OMBEditor.tsx            # Main layout and logic
├── ComponentPalette.tsx     # Icon/Card/Tile picker
├── MetadataForm.tsx         # Form for route/db assignments
├── ComponentPreview.tsx     # Live preview of mapped component
├── types.ts                 # Shared component + binding types
└── sample-icons.ts          # Starter icon registry

server/routes/omb.js         # Backend API routes
services/omb/layouts/        # Component storage
└── omb-components.json     # Saved component configurations
```

---

## 🔧 Core Components

### 1. Component Palette (`ComponentPalette.tsx`)

**Purpose**: Allows users to select UI components from a categorized palette

**Features**:
- **Categorized Icons**: Navigation, Data, Action, Display categories
- **Visual Selection**: Click-to-select with visual feedback
- **Sample Icons**: 20+ pre-configured OrthodoxMetrics icons
- **Tab Navigation**: Filter by component category

**Sample Icons Include**:
- Person, Group, Church, Book, Calendar
- Settings, Dashboard, Storage, Description
- School, Celebration, Hospital, Home
- Business, Account Balance, Security, Admin

### 2. Metadata Form (`MetadataForm.tsx`)

**Purpose**: Assigns purpose, API endpoints, database references, and access roles

**Fields**:
- **Component Name**: Descriptive name for the component
- **Description**: Purpose and functionality description
- **API Route**: Backend endpoint (with autocomplete)
- **Database Table**: Database table reference (with autocomplete)
- **Size**: Small, Medium, Large options
- **Access Roles**: Multi-select role assignment

**Sample Data**:
```typescript
// API Routes
['/records/baptism', '/records/marriage', '/admin/users', '/dashboard']

// Database Tables
['baptism_records', 'marriage_records', 'users', 'churches']

// Access Roles
['user', 'priest', 'admin', 'super_admin', 'moderator', 'viewer']
```

### 3. Component Preview (`ComponentPreview.tsx`)

**Purpose**: Live rendering of selected component with metadata display

**Features**:
- **Live Preview**: Real-time component rendering
- **Metadata Display**: Shows assigned API routes, database tables, roles
- **Saved Components**: Displays previously saved components
- **Visual Feedback**: Size indicators and role chips

### 4. Main Editor (`OMBEditor.tsx`)

**Purpose**: Orchestrates the three-panel layout and manages state

**Layout**:
- **Left Panel (25%)**: Component Palette
- **Center Panel (50%)**: Live Preview
- **Right Panel (25%)**: Metadata Form

**State Management**:
- Selected component tracking
- Form data management
- Save/load operations
- Error handling

---

## 🔌 API Endpoints

### Core Endpoints
- `GET /api/omb/components` - Get all saved components
- `POST /api/omb/components` - Save new component
- `PUT /api/omb/components/:id` - Update existing component
- `DELETE /api/omb/components/:id` - Delete component

### Utility Endpoints
- `GET /api/omb/components/export` - Export components as JSON
- `POST /api/omb/components/import` - Import components from JSON

### Output Format
```json
[
  {
    "id": "baptism-icon-1234567890",
    "name": "Baptism Records",
    "type": "icon",
    "icon": "church",
    "route": "/records/baptism",
    "dbTable": "baptism_records",
    "roles": ["priest", "admin"],
    "description": "Manages Orthodox Baptismal Records",
    "size": "medium",
    "metadata": {
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z",
      "createdBy": "current_user"
    }
  }
]
```

---

## 🧩 Features (Phase 3 MVP Scope)

| Feature | Type | Status |
|---------|------|--------|
| Component Picker (icon/card) | UI | ✅ Complete |
| Metadata form | UI | ✅ Complete |
| Live Preview | UI | ✅ Complete |
| Save to local JSON config | Logic | ✅ Complete |
| Role assignment dropdown | UI | ✅ Complete |
| Smart suggestions from OM-AI | AI assist | ⏳ Later |
| Commit to dev branch (Git) | Devops | ❌ Future |
| Link to /docs/OM-BigBook | Docs | ⏳ Later |

---

## 📊 Sample Use Cases

### 1. Baptism Records Component
**User Action**: Select "Church" icon from palette
**Metadata Assignment**:
- Name: "Baptism Records"
- Description: "Manages Orthodox Baptismal Records"
- API Route: "/records/baptism"
- Database Table: "baptism_records"
- Roles: ["priest", "admin"]
- Size: "medium"

**Output**:
```json
{
  "id": "church-baptism-1234567890",
  "name": "Baptism Records",
  "type": "icon",
  "icon": "church",
  "route": "/records/baptism",
  "dbTable": "baptism_records",
  "roles": ["priest", "admin"],
  "description": "Manages Orthodox Baptismal Records",
  "size": "medium"
}
```

### 2. User Management Component
**User Action**: Select "Admin" icon from palette
**Metadata Assignment**:
- Name: "User Management"
- Description: "Administrative user management interface"
- API Route: "/admin/users"
- Database Table: "users"
- Roles: ["admin", "super_admin"]
- Size: "large"

---

## 🔒 Access Control

### Security Features
- **Role Restriction**: Only accessible to `super_admin` role
- **Protected Route**: `/omb/editor` requires authentication
- **Admin Error Boundary**: Wrapped in error boundary for safety
- **Input Validation**: Server-side validation of all inputs

### Access Points
- **Editor**: `/omb/editor` - Main visual editor interface
- **API**: `/api/omb/*` - Backend component management
- **Storage**: `services/omb/layouts/omb-components.json`

---

## 🚀 Performance Features

### Frontend Optimizations
- **Lazy Loading**: Components loaded on demand
- **State Management**: Efficient React state updates
- **Visual Feedback**: Immediate UI responses
- **Error Handling**: Graceful error display

### Backend Optimizations
- **File-based Storage**: Simple JSON storage
- **Validation**: Input validation and sanitization
- **Error Recovery**: Graceful error handling
- **Directory Management**: Automatic directory creation

---

## 🔧 Configuration

### Component Storage
```typescript
// services/omb/layouts/omb-components.json
const OMB_COMPONENTS_PATH = path.join(__dirname, '../../services/omb/layouts/omb-components.json');
```

### Sample Icons Configuration
```typescript
// front-end/src/pages/omb/sample-icons.ts
export const sampleIcons = [
  {
    id: 'church',
    name: 'Church',
    icon: ChurchIcon,
    description: 'Church building or parish',
    category: 'navigation'
  }
  // ... 20+ more icons
];
```

---

## 📈 Usage Statistics

### Component Categories
- **Navigation**: 6 icons (Church, Home, School, Hospital, Business, Person)
- **Data**: 6 icons (Book, Calendar, Storage, Description, Group, Account Balance)
- **Action**: 4 icons (Settings, Assignment, Security, Admin)
- **Display**: 4 icons (Dashboard, Super Admin, Verified User, Celebration)

### Metadata Fields
- **Required**: Name, API Route, Database Table, Roles
- **Optional**: Description, Size
- **Auto-generated**: ID, Creation timestamp, User info

---

## 🎯 Next Steps (Future Phases)

### Phase 4 Enhancements
1. **Smart Suggestions**: Integrate with OM-AI for intelligent metadata suggestions
2. **Git Integration**: Commit components to development branches
3. **Big Book Integration**: Link to documentation system
4. **Advanced Components**: Support for cards, buttons, grid items
5. **Layout Management**: Drag-and-drop layout positioning

### Integration Opportunities
- **OM-AI Integration**: Use AI for metadata suggestions
- **Documentation System**: Link with OM-BigBook
- **Code Generation**: Auto-generate React components
- **Deployment Pipeline**: Integrate with CI/CD

---

## ✅ Phase 3 Completion Status

### ✅ Completed Features
- [x] Component palette with categorized icons
- [x] Metadata form with validation
- [x] Live preview with real-time updates
- [x] Save/load functionality to JSON
- [x] Role assignment with multi-select
- [x] Backend API routes for CRUD operations
- [x] Protected access for super_admin only
- [x] Error handling and validation
- [x] Responsive three-panel layout
- [x] Sample icon registry (20+ icons)

### 🎯 Ready for Testing
The Phase 3 OMB Visual Editor is now ready for comprehensive testing with:
- Component selection and configuration
- Metadata assignment and validation
- Live preview functionality
- Save/load operations
- Role-based access control

---

## 🔗 Access Points

- **Visual Editor**: `/omb/editor` - Main OMB interface
- **Component API**: `/api/omb/components` - CRUD operations
- **Export/Import**: `/api/omb/components/export` - Data management
- **Storage**: `services/omb/layouts/omb-components.json` - Component storage

The OMB Visual Editor provides a powerful interface for super_admin users to create and configure UI components with automatic metadata generation, making it easy to build and manage OrthodoxMetrics interface components. 