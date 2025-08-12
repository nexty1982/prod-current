# OrthodoxMetrics JavaScript Arsenal

## Table of Contents

- [1. Consolidated Server Scripts](#1-consolidated-server-scripts)
  - [Setup Scripts](#setup-scripts)
  - [Testing Scripts](#testing-scripts)
  - [Database Scripts](#database-scripts)
  - [Deployment Scripts](#deployment-scripts)
  - [Maintenance Scripts](#maintenance-scripts)
  - [Migration Scripts](#migration-scripts)
  - [Legacy Scripts](#legacy-scripts)
- [2. Route Handler Scripts](#2-route-handler-scripts)
- [3. Service Layer Scripts](#3-service-layer-scripts)
- [4. Frontend/UI Scripts](#4-frontendui-scripts)
- [5. Debug & Diagnostic Scripts](#5-debug--diagnostic-scripts)
- [6. Scraper & Data Collection Scripts](#6-scraper--data-collection-scripts)
- [7. Utility Scripts](#7-utility-scripts)
- [8. Authentication & Session Scripts](#8-authentication--session-scripts)
- [9. OCR & AI Processing Scripts](#9-ocr--ai-processing-scripts)
- [10. Shell Automation Scripts](#10-shell-automation-scripts)
- [11. Configuration & Environment Scripts](#11-configuration--environment-scripts)

---

## 1. Consolidated Server Scripts

The server has been reorganized from 73+ scattered scripts into logical categories with consolidated functionality.

### Setup Scripts

**Location**: `server/setup/`

#### `master-setup.js`
- **Description**: Complete system setup replacing multiple phase runners (Phase 1 + 2)
- **When to use**: Fresh installation, initial system configuration
- **Requirements**: Database access, proper environment variables
- **Usage**: `npm run setup:fresh` or `node setup/master-setup.js`
- **Features**: Database schema setup, OCR pipeline setup, progress tracking, error recovery

#### `register-existing-church.js`
- **Description**: Register an existing church in the system
- **When to use**: Adding new churches to the platform
- **Requirements**: Super admin privileges, church database exists
- **Usage**: `node setup/register-existing-church.js`

#### `register-ssppoc-church.js`
- **Description**: Register SSPPOC church specifically
- **When to use**: Initial SSPPOC church setup
- **Requirements**: Database access, church provisioning
- **Usage**: `node setup/register-ssppoc-church.js`

#### `createClientDatabase.js`
- **Description**: Create isolated database for new church client
- **When to use**: Church provisioning process
- **Requirements**: Database admin privileges, church registration
- **Usage**: `node setup/createClientDatabase.js`

#### `setup-default-kanban-boards.js`
- **Description**: Set up default Kanban boards for project management
- **When to use**: Initial church setup, project management activation
- **Requirements**: Church database exists, user permissions
- **Usage**: `node setup/setup-default-kanban-boards.js`

### Testing Scripts

**Location**: `server/testing/`

#### `unified-tests.js`
- **Description**: Consolidated test suite replacing 15+ individual test scripts
- **When to use**: System validation, pre-deployment testing, debugging
- **Requirements**: Database access, test environment
- **Usage**: 
  - `npm run test:health` (basic tests)
  - `npm run test:full` (comprehensive tests)
  - `npm run test:debug` (debug mode)
- **Features**: OCR pipeline testing, API validation, authentication flows

#### `test-ocr-pipeline.js`
- **Description**: OCR pipeline validation and testing
- **When to use**: After OCR system changes, debugging OCR issues
- **Requirements**: OCR services configured, test documents
- **Usage**: `node testing/test-ocr-pipeline.js`

#### `test-ocr-complete.js`
- **Description**: Complete OCR workflow testing
- **When to use**: End-to-end OCR validation
- **Requirements**: Full OCR stack, sample documents
- **Usage**: `node testing/test-ocr-complete.js`

#### `test-ocr-upload.js`
- **Description**: OCR file upload testing
- **When to use**: Upload functionality validation
- **Requirements**: Upload directory permissions, sample files
- **Usage**: `node testing/test-ocr-upload.js`

#### `test-api-routes.js`
- **Description**: Systematic API endpoint testing
- **When to use**: API validation, regression testing
- **Requirements**: Server running, authentication tokens
- **Usage**: `node testing/test-api-routes.js`

#### `test-church-api.js`
- **Description**: Church-specific API endpoint testing
- **When to use**: Church management feature validation
- **Requirements**: Church database, API access
- **Usage**: `node testing/test-church-api.js`

#### `check-links-permissions.js`
- **Description**: Comprehensive authentication-aware link testing
- **When to use**: Permission system validation, security audits
- **Requirements**: Admin credentials, full system access
- **Usage**: `npm run legacy:check:full`
- **Features**: HTML crawling, session management, detailed reporting

#### `quick-permission-test.js`
- **Description**: Fast health assessment without authentication
- **When to use**: Quick system validation, CI/CD pipeline checks
- **Requirements**: Network access to server
- **Usage**: `npm run legacy:check:quick`
- **Features**: 11 core route testing, success rate reporting

#### `browser-session-test.js`
- **Description**: Real browser session testing
- **When to use**: Session management debugging, authentication issues
- **Requirements**: Browser environment, test user credentials
- **Usage**: `npm run legacy:check:session`

### Database Scripts

**Location**: `server/database/`

#### `database-manager.js`
- **Description**: Unified database operations replacing scattered DB utilities
- **When to use**: Database maintenance, schema management, backups
- **Requirements**: Database admin privileges
- **Usage**: 
  - `npm run db:backup` (create backup)
  - `npm run db:optimize` (optimize performance)
  - `npm run db:validate` (validate schema)
- **Features**: Backup/restore, optimization, validation, migration

#### `setup-ocr-tables.js`
- **Description**: OCR-specific table creation and setup
- **When to use**: OCR system initialization, schema updates
- **Requirements**: Database admin access, OCR configuration
- **Usage**: `npm run setup:ocr`

#### `fix-database-tables.js`
- **Description**: Database table structure repairs
- **When to use**: Schema corruption, data integrity issues
- **Requirements**: Database admin privileges, backup recommended
- **Usage**: `npm run legacy:fix:database`

### Deployment Scripts

**Location**: `server/deployment/`

#### `production-deploy.js`
- **Description**: Production deployment automation
- **When to use**: Deploying to production servers
- **Requirements**: Production server access, deployment credentials
- **Usage**: `npm run deploy:production`

### Maintenance Scripts

**Location**: `server/maintenance/`

#### `system-status.js`
- **Description**: System health monitoring and status reporting
- **When to use**: Regular maintenance, health checks
- **Requirements**: System access, monitoring permissions
- **Usage**: `npm run maintain:status`

#### `log-analyzer.js`
- **Description**: Log analysis and error pattern detection
- **When to use**: Debugging, performance analysis
- **Requirements**: Log file access, analysis permissions
- **Usage**: `npm run maintain:logs`

#### `cleanup.js`
- **Description**: System cleanup and optimization
- **When to use**: Regular maintenance, disk space management
- **Requirements**: File system permissions, backup recommended
- **Usage**: `npm run maintain:cleanup`

#### `database-maintenance.js`
- **Description**: Database optimization and maintenance operations
- **When to use**: Regular database maintenance, performance tuning
- **Requirements**: Database admin access, maintenance window
- **Usage**: `node maintenance/database-maintenance.js`

### Migration Scripts

**Location**: `server/migration/`

#### `server-migrate.js`
- **Description**: Server migration tools for moving to new infrastructure
- **When to use**: Server migrations, infrastructure changes
- **Requirements**: Source and target server access
- **Usage**: `npm run migrate:server`

#### `convert-ocr-data.js`
- **Description**: OCR data format conversion and migration
- **When to use**: OCR system upgrades, data format changes
- **Requirements**: OCR data access, conversion permissions
- **Usage**: `node migration/convert-ocr-data.js`

### Legacy Scripts

**Location**: `server/legacy/`

#### `phase0-fix-issues.js`
- **Description**: Legacy Phase 0 issue resolution
- **When to use**: Legacy system fixes (deprecated)
- **Requirements**: Legacy system access
- **Status**: **DEPRECATED** - Kept for reference

#### `step6-demo.js`
- **Description**: Legacy demo script
- **When to use**: Historical reference only
- **Status**: **OBSOLETE**

---

## 2. Route Handler Scripts

**Location**: `server/routes/`

These are Express.js API route handlers that define the backend endpoints.

### Core API Routes

#### `admin.js`
- **Description**: Core administrative API endpoints
- **When to use**: Admin panel operations, user management
- **Requirements**: Admin authentication, proper permissions
- **UI Script**: Yes - handles admin dashboard interactions

#### `admin/users.js`
- **Description**: User management API endpoints
- **When to use**: User CRUD operations, role management
- **Requirements**: Super admin or admin role
- **UI Script**: Yes - user management interface

#### `admin/churches.js`
- **Description**: Church management API endpoints
- **When to use**: Church administration, multi-tenant management
- **Requirements**: Admin permissions, church context
- **UI Script**: Yes - church administration interface

#### `auth.js`
- **Description**: Authentication and authorization endpoints
- **When to use**: Login, logout, session management
- **Requirements**: Valid credentials, session configuration
- **UI Script**: Yes - login/logout functionality

#### `baptism.js`
- **Description**: Baptism record management
- **When to use**: Baptism record CRUD operations
- **Requirements**: Church context, record permissions
- **UI Script**: Yes - baptism record forms

#### `marriage.js`
- **Description**: Marriage record management
- **When to use**: Marriage record operations
- **Requirements**: Church database, priest permissions
- **UI Script**: Yes - marriage record interface

#### `funeral.js`
- **Description**: Funeral record management
- **When to use**: Funeral record operations
- **Requirements**: Church context, appropriate permissions
- **UI Script**: Yes - funeral record forms

### Specialized Routes

#### `ocr.js`
- **Description**: OCR processing endpoints with barcode validation
- **When to use**: Document processing, OCR uploads
- **Requirements**: OCR session, valid barcode
- **UI Script**: Yes - OCR upload interface

#### `public/ocr.js`
- **Description**: Public OCR API endpoints (no authentication)
- **When to use**: Public document processing
- **Requirements**: Rate limiting compliance
- **UI Script**: Yes - public OCR interface

#### `kanban.js` & `kanban/`
- **Description**: Kanban board management
- **When to use**: Project management, task tracking
- **Requirements**: User authentication, board permissions
- **UI Script**: Yes - Kanban board interface

#### `social/`
- **Description**: Social features (blog, chat, notifications)
- **When to use**: Community features, communication
- **Requirements**: User authentication, social permissions
- **UI Script**: Yes - social media interface

#### `runScript.js`
- **Description**: Secure script execution API for admins
- **When to use**: Administrative script execution
- **Requirements**: Super admin or admin role, whitelisted scripts only
- **Security**: High - only pre-approved scripts can be executed

---

## 3. Service Layer Scripts

**Location**: `server/services/`

Business logic and service utilities.

#### `databaseService.js`
- **Description**: Database abstraction layer with proper architecture separation
- **When to use**: Database operations, cross-database queries
- **Requirements**: Database connections configured
- **Features**: Platform DB vs Church DB separation

#### `churchSetupService.js`
- **Description**: Church provisioning and setup service
- **When to use**: New church onboarding, provisioning
- **Requirements**: Church provisioning permissions

#### `ocrProcessingService.js`
- **Description**: OCR processing business logic
- **When to use**: Document processing workflows
- **Requirements**: OCR services configured, processing permissions

#### `templateService.js`
- **Description**: Template management for various document types
- **When to use**: Document generation, template customization
- **Requirements**: Template access, generation permissions

#### `testChurchDataGenerator.js`
- **Description**: Generate test data for church development
- **When to use**: Development, testing, demo preparation
- **Requirements**: Development environment
- **Note**: Good candidate for `window.debugTools`

---

## 4. Frontend/UI Scripts

**Location**: `front-end/src/`

React TypeScript components and utilities for the browser interface.

### Core UI Components

#### `App.tsx`
- **Description**: Main React application component
- **When to use**: Application initialization, routing setup
- **Requirements**: React 18+, TypeScript, MUI theme
- **UI Script**: Yes - main application entry point

#### `main.tsx`
- **Description**: React application entry point and setup
- **When to use**: Application bootstrapping, provider setup
- **Requirements**: React DOM, service worker setup
- **UI Script**: Yes - application initialization

#### `routes/Router.tsx`
- **Description**: React Router configuration with protected routes
- **When to use**: Navigation, route protection, access control
- **Requirements**: Authentication context, permission system
- **UI Script**: Yes - handles all frontend routing

### OCR Interface Components

#### `components/ocr/OcrInterface.tsx`
- **Description**: Enhanced OCR main interface with wizard flow
- **When to use**: Document processing, OCR uploads
- **Requirements**: OCR API access, file upload permissions
- **UI Script**: Yes - complete OCR upload experience
- **Features**: Wizard flow, preview, batch editing

#### `views/apps/ocr/OCRUpload.tsx`
- **Description**: OCR upload component with drag-and-drop
- **When to use**: Document upload interface
- **Requirements**: File upload permissions, OCR processing
- **UI Script**: Yes - drag-and-drop file interface
- **Features**: Multi-file upload, progress tracking, preview

### Layout Components

#### `layouts/full/vertical/sidebar/SidebarProfile/Profile.tsx`
- **Description**: User profile component in sidebar
- **When to use**: User information display, profile management
- **Requirements**: User authentication, profile data
- **UI Script**: Yes - profile image and user info display

### Context Providers

#### `contexts/MenuVisibilityContext.tsx`
- **Description**: Menu visibility state management
- **When to use**: Dynamic menu control, user preferences
- **Requirements**: Local storage access, user preferences
- **UI Script**: Yes - manages menu state

#### `context/AuthContext.tsx`
- **Description**: Authentication context provider
- **When to use**: Authentication state management
- **Requirements**: Authentication API, session management
- **UI Script**: Yes - handles login/logout state

### Configuration

#### `vite.config.ts`
- **Description**: Vite build configuration for frontend
- **When to use**: Frontend build customization, alias setup
- **Requirements**: Node.js build environment
- **Features**: TypeScript support, path aliases, optimization

#### `package.json` (frontend)
- **Description**: Frontend dependencies and build scripts
- **When to use**: Frontend development, building, deployment
- **Requirements**: Node.js 18+, npm/yarn
- **Scripts**: `dev`, `build`, `preview`, `lint`

---

## 5. Debug & Diagnostic Scripts

**Location**: `debug/`

Specialized debugging and diagnostic tools.

#### `test-session-debug.js`
- **Description**: Comprehensive session and authentication debugging
- **When to use**: Session issues, authentication problems
- **Requirements**: Database access, admin credentials
- **Usage**: `node debug/test-session-debug.js`

#### `check-active-sessions.js`
- **Description**: Check currently active sessions in database
- **When to use**: Session monitoring, cleanup verification
- **Requirements**: Database access, session table access
- **Usage**: `node debug/check-active-sessions.js`

#### `cleanup-expired-sessions.js`
- **Description**: Remove expired sessions from database
- **When to use**: Session cleanup, maintenance
- **Requirements**: Database write access
- **Usage**: `node debug/cleanup-expired-sessions.js`

#### `session-sync-debug.js`
- **Description**: Comprehensive session debugging for sync issues
- **When to use**: Session synchronization problems
- **Requirements**: Database access, session configuration
- **Usage**: `node debug/session-sync-debug.js`

#### `direct-session-check.js`
- **Description**: Direct MySQL connection session check
- **When to use**: Bypassing app layer for session diagnosis
- **Requirements**: Direct database access
- **Usage**: `node debug/direct-session-check.js`

#### `fix-session-issues.js`
- **Description**: Diagnose and fix session configuration problems
- **When to use**: Session configuration issues
- **Requirements**: Database access, configuration permissions
- **Usage**: `node debug/fix-session-issues.js`

#### `test-actual-login.js`
- **Description**: Test actual login process and session creation
- **When to use**: Login workflow debugging
- **Requirements**: Valid user credentials, session access
- **Usage**: `node debug/test-actual-login.js`

#### `complete-security-scan.js`
- **Description**: Comprehensive security scan for auth bypasses
- **When to use**: Security audits, vulnerability assessment
- **Requirements**: Codebase access, security permissions
- **Usage**: `node debug/complete-security-scan.js`

---

## 6. Scraper & Data Collection Scripts

**Location**: `server/scrapers/`

Autonomous Orthodox church directory building system.

#### `index.js`
- **Description**: Main orchestrator for Orthodox Church data acquisition
- **When to use**: Building comprehensive church directory
- **Requirements**: Database access, internet connectivity
- **Usage**: `npm run scraper:run`
- **Features**: Multi-jurisdiction scraping, data validation, duplicate detection

#### `cli.js`
- **Description**: Command-line interface for church directory scraper
- **When to use**: Manual scraping operations, testing
- **Requirements**: Command line access, scraper permissions
- **Usage**: `node scrapers/cli.js [options]`

#### `setup-database.js`
- **Description**: Database schema setup for church directory
- **When to use**: Scraper system initialization
- **Requirements**: Database admin access
- **Usage**: `npm run scraper:setup`

#### `test-scraper.js`
- **Description**: Scraper system testing and validation
- **When to use**: Scraper development, validation
- **Requirements**: Test environment, network access
- **Usage**: `npm run scraper:test`

### Jurisdiction-Specific Scrapers

#### `jurisdictions/oca-scraper.js`
- **Description**: Orthodox Church in America scraper
- **When to use**: OCA church data collection
- **Requirements**: OCA website access, scraping permissions

#### `jurisdictions/goarch-scraper.js`
- **Description**: Greek Orthodox Archdiocese scraper
- **When to use**: GOARCH church data collection
- **Requirements**: GOARCH website access

#### `jurisdictions/antiochian-scraper.js`
- **Description**: Antiochian Orthodox Christian Archdiocese scraper
- **When to use**: Antiochian church data collection
- **Requirements**: Antiochian website access

#### `jurisdictions/base-scraper.js`
- **Description**: Base class for jurisdiction-specific scrapers
- **When to use**: Creating new jurisdiction scrapers
- **Requirements**: Development environment
- **Note**: Extensible architecture for new jurisdictions

### Utility Modules

#### `utils/data-cleaner.js`
- **Description**: Data standardization and normalization
- **When to use**: Post-scraping data processing
- **Requirements**: Scraped data access

#### `utils/url-validator.js`
- **Description**: Website accessibility and validity verification
- **When to use**: Church website validation
- **Requirements**: Network access, HTTP validation

#### `sync/sync-manager.js`
- **Description**: Automated data synchronization system
- **When to use**: Ongoing data updates, scheduled sync
- **Requirements**: Cron permissions, sync configuration

### Demo Scripts

#### `step2-demo.js` through `step5-demo.js`
- **Description**: Demonstration scripts for scraper capabilities
- **When to use**: Learning scraper features, presentations
- **Requirements**: Demo environment

---

## 7. Utility Scripts

**Location**: `server/utils/`

Cross-cutting utility functions and helpers.

#### `emailService.js`
- **Description**: Email sending utilities for OCR receipts and notifications
- **When to use**: OCR processing completion, error notifications
- **Requirements**: SMTP configuration, email credentials
- **Features**: OCR receipts, session verification, error notifications

#### `logger.js`
- **Description**: Winston-based logging utility
- **When to use**: Application logging, debugging, monitoring
- **Requirements**: Log directory permissions, log configuration

#### `dbSwitcher.js`
- **Description**: Database switching utility for multi-tenant architecture
- **When to use**: Church-specific database operations
- **Requirements**: Multiple database access, church context

#### `dbConnections.js`
- **Description**: Cross-database connection utilities
- **When to use**: Multi-database operations, OCR processing
- **Requirements**: Database credentials, connection pooling

#### `dateFormatter.js`
- **Description**: Date formatting utilities for various contexts
- **When to use**: Date display, internationalization
- **Requirements**: Date libraries, locale configuration

#### `billingInvoiceGenerator.js`
- **Description**: Invoice generation utilities
- **When to use**: Billing operations, invoice creation
- **Requirements**: Billing permissions, PDF generation

#### `generateCredentials.js`
- **Description**: Secure credential generation for church provisioning
- **When to use**: Church onboarding, user creation
- **Requirements**: Cryptographic libraries, provisioning permissions

### Test and Debug Utilities

#### `create-test-user.js`
- **Description**: Create test users for development
- **When to use**: Development setup, testing
- **Requirements**: Development environment, database access
- **Usage**: `node utils/create-test-user.js`

#### `debug-auth.js`
- **Description**: Authentication debugging utility
- **When to use**: Authentication troubleshooting
- **Requirements**: Database access, user credentials
- **Usage**: `node utils/debug-auth.js`

#### `test-auth.js`
- **Description**: Authentication system testing
- **When to use**: Auth system validation
- **Requirements**: Test environment, database access
- **Usage**: `node utils/test-auth.js`

#### `check-test-user.js`
- **Description**: Check if test user exists and create if needed
- **When to use**: Development environment setup
- **Requirements**: Database access, user creation permissions
- **Usage**: `node utils/check-test-user.js`

---

## 8. Authentication & Session Scripts

**Location**: Various (middleware, utils, routes)

Scripts handling user authentication, session management, and security.

#### `middleware/auth.js`
- **Description**: Authentication middleware with role-based access
- **When to use**: API route protection, permission checking
- **Requirements**: Session configuration, user roles

#### `middleware/sessionValidation.js`
- **Description**: Session validation middleware
- **When to use**: OCR session validation, secure operations
- **Requirements**: Session store, validation rules

#### `middleware/churchSecurity.js`
- **Description**: Church-specific security middleware
- **When to use**: Multi-tenant security, church data isolation
- **Requirements**: Church context, security configuration

#### Session Management Scripts

- `session-manager.js`: Session lifecycle management
- `test-session-termination.js`: Session termination testing
- `setup-user-lockout.js`: User lockout system setup
- `test-lockout-functionality.js`: Lockout system testing

---

## 9. OCR & AI Processing Scripts

**Location**: Various (routes, services, testing)

Scripts for Optical Character Recognition and AI processing.

#### OCR Core Processing

#### `routes/ocr.js`
- **Description**: OCR routes with barcode validation
- **When to use**: Authenticated OCR processing
- **Requirements**: OCR session, barcode validation
- **UI Script**: Yes - authenticated OCR interface

#### `routes/public/ocr.js`
- **Description**: Public OCR API routes
- **When to use**: Public document processing
- **Requirements**: Rate limiting compliance
- **UI Script**: Yes - public OCR interface

#### `routes/ocrSecure.js`
- **Description**: Secure OCR system with enhanced validation
- **When to use**: High-security OCR processing
- **Requirements**: Enhanced security configuration

#### OCR Testing Scripts

- `testing/test-ocr-pipeline.js`: OCR pipeline testing
- `testing/test-ocr-upload.js`: OCR upload testing
- `testing/test-public-ocr.js`: Public OCR endpoint testing
- `testing/debug-ocr-results.js`: OCR result debugging
- `testing/debug-public-ocr.js`: Public OCR debugging

#### AI and Learning Scripts

#### `jobs/auto-learning-runner.js`
- **Description**: AI auto-learning job runner
- **When to use**: Machine learning model training
- **Requirements**: AI services, training data
- **Usage**: `npm run ai:auto-learning`

#### `services/ai/autoLearningTaskService.js`
- **Description**: Auto-learning task management service
- **When to use**: AI task orchestration
- **Requirements**: AI configuration, task permissions

---

## 10. Shell Automation Scripts

**Location**: `server/scripts/` (*.sh files)

Shell scripts for system automation and fixes.

#### System Management

#### `quick-restart.sh`
- **Description**: Quick server restart script
- **When to use**: Development, quick server cycling
- **Requirements**: PM2 or process management access
- **Usage**: `./scripts/quick-restart.sh`

#### `restart-server.sh`
- **Description**: Comprehensive server restart
- **When to use**: Production restarts, configuration reloads
- **Requirements**: Server management permissions
- **Usage**: `./scripts/restart-server.sh`

#### Frontend Issue Resolution

#### `fix-frontend-session-cookies.sh`
- **Description**: Frontend session cookie configuration fixes
- **When to use**: Session issues in frontend
- **Requirements**: Configuration access, server restart permissions
- **Usage**: `./scripts/fix-frontend-session-cookies.sh`

#### `test-frontend-issue.sh`
- **Description**: Frontend issue diagnostic script
- **When to use**: Frontend debugging, browser compatibility issues
- **Requirements**: Browser environment access
- **Usage**: `./scripts/test-frontend-issue.sh`

#### Database Fixes

#### `fix-church-database-simple.sh`
- **Description**: Simple church database fixes
- **When to use**: Church database issues, data integrity problems
- **Requirements**: Database admin access
- **Usage**: `./scripts/fix-church-database-simple.sh`

#### `fix-database-errors.sh`
- **Description**: General database error resolution
- **When to use**: Database connectivity issues, schema problems
- **Requirements**: Database access, error diagnosis
- **Usage**: `./scripts/fix-database-errors.sh`

#### API and Session Fixes

#### `fix-api-response-format.sh`
- **Description**: API response format standardization
- **When to use**: API compatibility issues, response format problems
- **Requirements**: API access, response format configuration
- **Usage**: `./scripts/fix-api-response-format.sh`

#### `test-session-fix.sh`
- **Description**: Session fix testing and validation
- **When to use**: After session configuration changes
- **Requirements**: Session access, test credentials
- **Usage**: `./scripts/test-session-fix.sh`

#### Deployment and Migration

#### `deploy-api-v2-fixes.sh`
- **Description**: API v2 deployment and testing
- **When to use**: API version upgrades, deployment validation
- **Requirements**: Deployment permissions, API access
- **Usage**: `./scripts/deploy-api-v2-fixes.sh`

#### `diagnose-api-v2.sh`
- **Description**: API v2 diagnostic and troubleshooting
- **When to use**: API v2 issues, diagnostic analysis
- **Requirements**: API access, diagnostic permissions
- **Usage**: `./scripts/diagnose-api-v2.sh`

---

## 11. Configuration & Environment Scripts

Scripts for environment setup and configuration management.

#### Environment Configuration

#### `temp/configure-env.js`
- **Description**: Environment configuration script
- **When to use**: Environment setup, configuration management
- **Requirements**: Configuration access, environment permissions
- **Usage**: `node temp/configure-env.js`

#### `temp/apply-translation-schema.js`
- **Description**: Translation schema application
- **When to use**: Internationalization setup, translation updates
- **Requirements**: Database schema access, translation permissions
- **Usage**: `node temp/apply-translation-schema.js`

#### Church and Data Management

#### `temp/cleanup-fake-churches.js`
- **Description**: Clean up fake/test church data
- **When to use**: Data cleanup, production preparation
- **Requirements**: Database admin access, cleanup permissions
- **Usage**: `node temp/cleanup-fake-churches.js`

#### `scripts/find-duplicate-church-names.js`
- **Description**: Find duplicate church names in database
- **When to use**: Data quality checks, duplicate detection
- **Requirements**: Database read access
- **Usage**: `node scripts/find-duplicate-church-names.js`

#### `scripts/delete-duplicate-churches.js`
- **Description**: Delete duplicate church entries
- **When to use**: Data cleanup, duplicate removal
- **Requirements**: Database admin access, backup recommended
- **Usage**: `node scripts/delete-duplicate-churches.js`

#### Social and Community Features

#### `scripts/initialize-social-module.js`
- **Description**: Initialize social features module
- **When to use**: Social features activation, community setup
- **Requirements**: Social module permissions, database access
- **Usage**: `node scripts/initialize-social-module.js`
- **Features**: Blog setup, chat initialization, notification system

---

## NPM Script Commands Summary

### Quick Command Reference

```bash
# System Setup
npm run setup:fresh           # Complete fresh installation
npm run setup:database        # Database setup only
npm run setup:schema          # Core schema only
npm run setup:ocr             # OCR tables only

# Testing & Validation
npm run test:health           # Basic health checks
npm run test:full             # Complete test suite
npm run test:debug            # Debug mode testing
npm run test:ocr              # OCR-focused tests
npm run test:api              # API-focused tests

# Database Management
npm run db:backup             # Create database backup
npm run db:optimize           # Optimize performance
npm run db:validate           # Validate schema

# Deployment & Migration
npm run deploy:production     # Deploy to production
npm run migrate:server        # Migrate to new server

# Maintenance
npm run maintain:status       # System status check
npm run maintain:logs         # Log analysis
npm run maintain:cleanup      # System cleanup

# Legacy Testing (Diagnostic)
npm run legacy:check:quick    # Quick permission test
npm run legacy:check:full     # Comprehensive link checker
npm run legacy:check:session  # Browser session test

# Scraper Operations
npm run scraper:setup         # Setup scraper database
npm run scraper:run           # Full scraping operation
npm run scraper:run-quick     # Quick scraping (no URL validation)
npm run scraper:test          # Test scraper system

# AI & Learning
npm run ai:auto-learning      # Run auto-learning jobs
npm run ai:auto-learning:help # Show AI help
```

---

## Script Status & Recommendations

### ✅ Production Ready
- `master-setup.js` - Consolidated setup system
- `unified-tests.js` - Comprehensive testing
- `database-manager.js` - Database operations
- OCR pipeline scripts
- Authentication middleware
- Session management scripts

### 🔄 Good Candidates for `window.debugTools`
- `test-session-debug.js` - Session debugging
- `check-active-sessions.js` - Session monitoring
- `test-auth.js` - Authentication testing
- `create-test-user.js` - User creation
- Church data validation scripts

### 🎯 Good Candidates for Playwright Tests
- `check-links-permissions.js` - Link validation
- `browser-session-test.js` - Session testing
- Frontend form testing scripts
- OCR upload workflow testing

### ⚠️ Deprecated/Legacy
- `phase0-*.js` scripts - Legacy Phase 0 (keep for reference)
- `step6-demo.js` - Old demo script
- Multiple duplicate `test-ocr-*` scripts (consolidated into `unified-tests.js`)

### 🚨 Security Notes
- `runScript.js` - Whitelist-only script execution (secure)
- All debug scripts require appropriate permissions
- Database scripts require admin access
- Shell scripts should be reviewed before production use

---

## Development Guidelines

### When Creating New Scripts
1. Follow the consolidated architecture pattern
2. Add to appropriate category directory
3. Include proper error handling and logging
4. Add NPM script command if frequently used
5. Document requirements and usage

### Testing Approach
1. Use `unified-tests.js` for systematic testing
2. Create specific test scripts only for complex scenarios
3. Include both positive and negative test cases
4. Document expected outcomes

### Security Considerations
1. All admin scripts require proper authentication
2. Database scripts should include backup recommendations
3. Public-facing scripts must implement rate limiting
4. Sensitive operations should log user activity

---

*This document catalogs 300+ JavaScript scripts in the OrthodoxMetrics project. The system has been significantly consolidated from 73+ scattered scripts into organized, maintainable categories with clear purposes and usage guidelines.*