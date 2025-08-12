# Orthodox Metrics - Church Management System

## 📖 Overview

Orthodox Metrics is a comprehensive church management system designed specifically for Orthodox Christian communities. It provides tools for record management, OCR processing of historical documents, user administration, and multi-church support.

## 🚀 Quick Navigation

| Document | Purpose | Key Sections |
|----------|---------|--------------|
| **[Quick Start Guide](QUICK_START_GUIDE.md)** | Get up and running | Installation, First Setup, Basic Usage |
| **[System Architecture](SYSTEM_ARCHITECTURE.md)** | Technical overview | Database Design, API Structure, Components |
| **[Administration Guide](ADMINISTRATION_GUIDE.md)** | Daily operations | Church Setup, User Management, Content |
| **[Development Guide](DEVELOPMENT_GUIDE.md)** | Developer resources | Scripts, Testing, Local Development |
| **[Deployment Guide](DEPLOYMENT_GUIDE.md)** | Production setup | Server Config, Security, Monitoring |
| **[Troubleshooting](TROUBLESHOOTING.md)** | Problem solving | Common Issues, Debugging, Maintenance |
| **[API Reference](API_REFERENCE.md)** | Developer API docs | Endpoints, Authentication, Examples |

## 🏗️ System Components

### Frontend (React/TypeScript)
- **Homepage**: Eastern Orthodox-styled landing page with multilingual support
- **Admin Panel**: Church management, user administration, content management
- **OCR Interface**: Document upload and processing interface
- **Records Management**: Baptism, marriage, and funeral record handling

### Backend (Node.js/Express)
- **Multi-tenant Architecture**: Support for multiple churches
- **OCR Pipeline**: Google Vision API integration for document processing
- **Authentication System**: Role-based access control
- **Database Management**: Three-tier database system

### Database Architecture
- **Master Database**: System configuration and church registry
- **Records Database**: Orthodox church records and metadata
- **Client Databases**: Individual church-specific data

## 🔧 New Organized Server Structure

The server has been reorganized from 73+ scattered scripts into clear functional directories:

```
server/
├── setup/           # Church registration, database creation, system setup
├── testing/         # All test scripts and validation tools
├── database/        # SQL schemas, database utilities, management tools
├── maintenance/     # System maintenance, repairs, optimizations
├── migration/       # Data migration and schema updates
├── deployment/      # Production deployment scripts
└── legacy/          # Deprecated scripts (kept for reference)
```

### Key Consolidated Scripts

- **`setup/master-setup.js`** - Complete system setup (replaces multiple phase runners)
- **`testing/unified-tests.js`** - Comprehensive test suite (consolidates 15+ test scripts)
- **`database/database-manager.js`** - Database operations (unifies DB utilities)

## 📋 Quick Commands

```bash
# System Setup
npm run setup:fresh           # Complete fresh setup
node setup/master-setup.js    # Alternative direct execution

# Testing
npm run test:health           # Basic health checks
npm run test:comprehensive    # Full test suite
node testing/unified-tests.js --level full  # Direct execution

# Database Operations
npm run db:backup             # Create database backup
npm run db:setup              # Setup database schema
node database/database-manager.js backup    # Direct execution

# Development
npm run dev:frontend          # Start frontend development server
npm run dev:backend           # Start backend with auto-reload
npm run build:production      # Build for production
```

## 🎯 Core Features

### 🏛️ Church Management
- Multi-church support with isolated data
- Church registration and provisioning
- Customizable branding and content
- Orthodox calendar integration

### 📄 OCR Document Processing
- Google Vision API integration
- Multi-language support (English, Greek, Russian, Romanian, Georgian)
- Baptism, marriage, and funeral record extraction
- Manual review and correction interface

### 👥 User Management
- Role-based access control (Super Admin, Admin, User)
- Church-specific user isolation
- Secure authentication with session management
- User activity tracking and logging

### 🔒 Security Features
- HTTPS enforcement
- SQL injection prevention
- XSS protection
- Rate limiting
- Secure session management
- Input validation and sanitization

## 🌍 Multilingual Support

The system supports Orthodox communities in:
- **English** - Primary interface language
- **Greek** - Ελληνικά (Modern and Classical Greek text support)
- **Russian** - Русский (Cyrillic script support)
- **Romanian** - Română (Latin script with diacritics)
- **Georgian** - ქართული (Georgian script support)

## 📊 System Requirements

### Production Environment
- **OS**: Ubuntu 20.04+ or CentOS 8+
- **Node.js**: v18.0.0 or higher
- **MySQL**: v8.0 or higher
- **Memory**: 4GB RAM minimum, 8GB recommended
- **Storage**: 50GB minimum for database and uploaded documents
- **Network**: HTTPS-capable domain with SSL certificate

### Development Environment
- **Node.js**: v18.0.0+
- **MySQL**: v8.0+
- **Git**: Latest version
- **Code Editor**: VS Code recommended with Orthodox Metrics extensions

## 🚦 System Status

- ✅ **Frontend**: Complete with Eastern Orthodox styling and multilingual support
- ✅ **Backend**: Fully functional with multi-tenant architecture
- ✅ **Database**: Three-tier system operational
- ✅ **OCR Pipeline**: Google Vision API integration working
- ✅ **Authentication**: Role-based access control implemented
- ✅ **Server Organization**: Scripts consolidated and organized
- ✅ **Documentation**: Consolidated and comprehensive

## 🆘 Need Help?

1. **Quick Issues**: Check [Troubleshooting Guide](TROUBLESHOOTING.md)
2. **Setup Problems**: See [Quick Start Guide](QUICK_START_GUIDE.md)
3. **Development**: Consult [Development Guide](DEVELOPMENT_GUIDE.md)
4. **API Questions**: Reference [API Documentation](API_REFERENCE.md)

## 📝 Contributing

This system is designed for Orthodox Christian communities. When contributing, please maintain respect for Orthodox traditions and liturgical practices.

---

*"Recording the Saints Amongst Us" - Orthodox Metrics Mission Statement*
