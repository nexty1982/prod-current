# System Architecture - Orthodox Metrics

## 🏗️ Overview

Orthodox Metrics is built as a modern multi-tenant web application designed specifically for Orthodox Christian communities. The architecture emphasizes security, scalability, and respect for Orthodox traditions.

## 📐 High-Level Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   Database      │
│   React/TS      │◄──►│   Node.js       │◄──►│   MySQL         │
│   Material-UI   │    │   Express       │    │   Multi-Tenant  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │   External      │
                       │   Google        │
                       │   Vision API    │
                       └─────────────────┘
```

## 🎨 Frontend Architecture

### Technology Stack
- **Framework**: React 18 with TypeScript
- **UI Library**: Material-UI v7.2.0
- **Styling**: Eastern Orthodox liturgical design system
- **Animation**: Framer Motion for smooth transitions
- **Build Tool**: Vite for fast development and builds

### Component Structure
```
src/
├── components/
│   ├── frontend-pages/          # Public website pages
│   │   ├── homepage/            # Landing page with Orthodox styling
│   │   │   ├── banner/          # Multilingual animated banner
│   │   │   ├── showcase/        # 2x2 records grid display
│   │   │   └── sections/        # Various homepage sections
│   │   └── about/               # About and contact pages
│   ├── admin/                   # Administrative interface
│   │   ├── dashboard/           # Main admin dashboard
│   │   ├── users/               # User management
│   │   ├── churches/            # Church administration
│   │   ├── content/             # Content management
│   │   └── settings/            # System configuration
│   ├── ocr/                     # OCR processing interface
│   │   ├── upload/              # Document upload component
│   │   ├── review/              # OCR result review
│   │   └── records/             # Processed records display
│   └── shared/                  # Reusable components
│       ├── forms/               # Form components
│       ├── tables/              # Data display components
│       └── orthodox/            # Orthodox-specific UI elements
├── services/                    # API service layers
├── hooks/                       # Custom React hooks
├── utils/                       # Utility functions
└── styles/                      # Global styles and themes
```

### Orthodox Design System

#### Liturgical Color Palette
- **Gold (#FFD700)**: Primary color, represents divine light
- **Purple (#6B46C1)**: Imperial purple, authority and wisdom
- **Blue (#2563EB)**: Heavenly blue, divine presence
- **Red (#DC2626)**: Liturgical red, martyrdom and sacrifice
- **Green (#059669)**: Life and renewal
- **Black (#000000)**: Solemnity and mourning
- **White (#FFFFFF)**: Purity and resurrection

#### Typography
- **Primary Font**: "Noto Serif" - Supports multiple Orthodox languages
- **Fallback**: "Times New Roman" - Classical serif for readability
- **Display**: Orthodox Cross iconography integrated

#### Responsive Design
- Mobile-first approach with breakpoints
- Tablet optimization for church office use
- Desktop full-feature interface

## ⚙️ Backend Architecture

### Technology Stack
- **Runtime**: Node.js v18+
- **Framework**: Express.js
- **Language**: JavaScript (transitioning to TypeScript)
- **Authentication**: Session-based with role management
- **File Upload**: Multer with security validation
- **OCR Integration**: Google Vision API

### Server Structure (Reorganized)
```
server/
├── setup/                       # System setup and initialization
│   ├── master-setup.js         # Consolidated setup script
│   ├── register-existing-church.js
│   ├── createClientDatabase.js
│   └── phase-runners/          # Legacy phase scripts
├── testing/                     # Test scripts and validation
│   ├── unified-tests.js        # Consolidated test suite
│   ├── test-ocr-*.js          # OCR testing scripts
│   ├── test-api-*.js          # API testing scripts
│   └── debug-*.js             # Debugging utilities
├── database/                    # Database management
│   ├── database-manager.js     # Consolidated DB operations
│   ├── *.sql                  # Schema files
│   └── migrations/            # Database migrations
├── maintenance/                 # System maintenance
│   ├── database-maintenance.js
│   ├── fix-*.js               # Repair scripts
│   └── generate-*.js          # Utility generators
├── migration/                   # Data migration tools
│   ├── convert-ocr-data.js
│   ├── migrate-church-info.js
│   └── update-schemas.js
├── deployment/                  # Production deployment
│   └── RunScript.ps1          # PowerShell deployment
└── legacy/                     # Deprecated scripts (archived)
    └── phase0-*.js            # Old phase scripts
```

### Core Application Structure
```
server/
├── index.js                    # Application entry point
├── config/                     # Configuration files
│   ├── database.js            # Database configuration
│   ├── auth.js                # Authentication setup
│   └── ocr.js                 # OCR service configuration
├── middleware/                 # Express middleware
│   ├── auth.js                # Authentication middleware
│   ├── validation.js          # Input validation
│   ├── logging.js             # Request logging
│   └── security.js            # Security headers
├── routes/                     # API route definitions
│   ├── auth.js                # Authentication endpoints
│   ├── admin.js               # Admin panel APIs
│   ├── ocr.js                 # OCR processing endpoints
│   ├── churches.js            # Church management APIs
│   └── public.js              # Public website APIs
├── controllers/                # Business logic controllers
│   ├── authController.js      # Authentication logic
│   ├── ocrController.js       # OCR processing logic
│   ├── churchController.js    # Church management logic
│   └── userController.js      # User management logic
├── models/                     # Data models
│   ├── User.js                # User model
│   ├── Church.js              # Church model
│   └── OcrResult.js           # OCR result model
├── services/                   # External service integrations
│   ├── googleVision.js        # Google Vision API service
│   ├── emailService.js        # Email notifications
│   └── fileService.js         # File handling service
└── utils/                      # Utility functions
    ├── logger.js              # Logging utilities
    ├── validation.js          # Data validation
    └── helpers.js             # General helpers
```

## 🗄️ Database Architecture

### Three-Tier Database System

#### 1. Master Database (`orthodox_metrics`)
**Purpose**: System-wide configuration and church registry

```sql
-- Core system tables
Churches                        -- Church registry and configuration
Users                          -- System users with church association
SystemConfig                   -- Global system settings
AuditLog                       -- System-wide audit trail
Notifications                  -- System notifications
MenuItems                     -- Dynamic menu configuration
```

#### 2. Records Database (`orthodox_records`)
**Purpose**: Orthodox church records and metadata

```sql
-- Orthodox records tables
BaptismRecords                 -- Baptism certificates and records
MarriageRecords               -- Marriage certificates and records
FuneralRecords                -- Funeral and memorial records
OcrSessions                   -- OCR processing sessions
OcrResults                    -- OCR extraction results
RecordMetadata                -- Record classification and metadata
```

#### 3. Client Databases (`church_[id]_db`)
**Purpose**: Individual church-specific data

```sql
-- Church-specific tables
ChurchMembers                 -- Church membership records
ChurchEvents                  -- Church calendar and events
ChurchContent                 -- Church-specific content
ChurchSettings               -- Church configuration
KanbanBoards                 -- Task management for church administration
```

### Database Schema Relationships

```
orthodox_metrics (Master)
    ├── churches (1:many) ──┐
    ├── users (1:many) ─────┤
    └── system_config ──────┘
                           │
orthodox_records ──────────┼── OCR Processing Pipeline
    ├── baptism_records    │
    ├── marriage_records   │
    ├── funeral_records    │
    └── ocr_sessions ──────┘
                           │
church_[id]_db ────────────┘── Church-Specific Data
    ├── church_members
    ├── church_events
    └── church_content
```

## 🔄 OCR Processing Pipeline

### Google Vision API Integration

#### Processing Flow
```
Document Upload
    ↓
Security Validation
    ↓
Google Vision API
    ↓
Text Extraction
    ↓
Language Detection
    ↓
Orthodox Record Classification
    ↓
Manual Review Interface
    ↓
Database Storage
```

#### Supported Record Types
1. **Baptism Records**
   - Baptismal certificates
   - Chrismation records
   - Godparent information

2. **Marriage Records**
   - Wedding certificates
   - Marriage licenses
   - Witness information

3. **Funeral Records**
   - Death certificates
   - Memorial service records
   - Burial information

#### Language Support
- **English**: Standard Orthodox terminology
- **Greek**: Modern and Classical Greek text
- **Russian**: Cyrillic script with Orthodox terms
- **Romanian**: Latin script with diacritics
- **Georgian**: Georgian script support

### OCR Result Processing

```javascript
// OCR result structure
{
  sessionId: "uuid",
  documentType: "baptism|marriage|funeral",
  language: "en|el|ru|ro|ka",
  confidence: 0.95,
  extractedText: "...",
  structuredData: {
    names: [...],
    dates: [...],
    locations: [...],
    ecclesiasticalData: {...}
  },
  reviewStatus: "pending|approved|rejected",
  corrections: [...]
}
```

## 🔐 Authentication & Security

### Multi-Tenant Security Model

#### User Roles Hierarchy
```
Super Admin
    ├── System-wide access
    ├── Church creation/deletion
    └── User role management
    
Church Admin
    ├── Church-specific admin access
    ├── Church user management
    └── Church content management
    
Church User
    ├── Limited church access
    ├── Assigned record access
    └── OCR submission only
```

#### Session Management
- **Session Storage**: Redis with MySQL fallback
- **Session Duration**: Configurable (default: 24 hours)
- **Security**: HTTPS-only, secure cookies, CSRF protection
- **Multi-Device**: Support for multiple concurrent sessions

#### Church Data Isolation
```javascript
// Middleware ensures users only access their church's data
function churchIsolationMiddleware(req, res, next) {
  const userChurchId = req.session.user.churchId;
  const requestedChurchId = req.params.churchId || req.body.churchId;
  
  if (userChurchId !== requestedChurchId && req.session.user.role !== 'super_admin') {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  next();
}
```

## 🌐 API Architecture

### RESTful API Design

#### Authentication Endpoints
```
POST /api/auth/login          # User authentication
POST /api/auth/logout         # Session termination
GET  /api/auth/profile        # User profile
PUT  /api/auth/profile        # Update profile
POST /api/auth/change-password # Password change
```

#### Church Management APIs
```
GET    /api/churches          # List churches (super admin)
POST   /api/churches          # Create church (super admin)
GET    /api/churches/:id      # Get church details
PUT    /api/churches/:id      # Update church
DELETE /api/churches/:id      # Delete church (super admin)
```

#### OCR Processing APIs
```
POST /api/ocr/upload         # Upload document for processing
GET  /api/ocr/sessions       # List OCR sessions
GET  /api/ocr/sessions/:id   # Get session details
PUT  /api/ocr/sessions/:id   # Update/approve OCR results
DELETE /api/ocr/sessions/:id # Delete OCR session
```

#### Records Management APIs
```
GET    /api/records/baptisms    # List baptism records
POST   /api/records/baptisms    # Create baptism record
GET    /api/records/marriages   # List marriage records
POST   /api/records/marriages   # Create marriage record
GET    /api/records/funerals    # List funeral records
POST   /api/records/funerals    # Create funeral record
```

### API Response Format
```javascript
// Success response
{
  success: true,
  data: {...},
  meta: {
    timestamp: "2025-07-18T10:30:00Z",
    requestId: "uuid",
    version: "1.0.0"
  }
}

// Error response
{
  success: false,
  error: {
    code: "VALIDATION_ERROR",
    message: "Invalid input data",
    details: {...}
  },
  meta: {
    timestamp: "2025-07-18T10:30:00Z",
    requestId: "uuid"
  }
}
```

## 📊 Performance & Scaling

### Database Optimization
- **Indexing**: Optimized indexes for common queries
- **Connection Pooling**: MySQL connection pool management
- **Query Optimization**: Prepared statements and query caching
- **Partitioning**: Large tables partitioned by church and date

### Application Performance
- **Caching**: Redis for session and application caching
- **Compression**: Gzip compression for responses
- **Static Assets**: CDN integration for static files
- **Background Jobs**: Queue system for OCR processing

### Monitoring & Logging
- **Application Logs**: Structured logging with winston
- **Performance Metrics**: Response time and database query monitoring
- **Error Tracking**: Comprehensive error logging and alerting
- **Health Checks**: Automated system health monitoring

## 🔄 Deployment Architecture

### Production Environment
```
Internet
    ↓
Nginx (Reverse Proxy)
    ↓
PM2 Process Manager
    ├── Node.js App (Port 3000)
    ├── Node.js App (Port 3001)  # Load balanced
    └── Node.js App (Port 3002)
    ↓
MySQL Database Cluster
    ├── Master Database
    └── Read Replicas
```

### Development Environment
- **Hot Reload**: Vite for frontend, nodemon for backend
- **Database**: Local MySQL with test data
- **Testing**: Jest for unit tests, Cypress for E2E
- **Code Quality**: ESLint, Prettier, TypeScript

---

This architecture provides a robust, scalable foundation for Orthodox church management while maintaining security and respect for Orthodox traditions. 🏛️✨
