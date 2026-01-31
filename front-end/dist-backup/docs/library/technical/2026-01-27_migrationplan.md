# 📋 Scripts Organization Migration Plan

## 🎯 **Migration Summary**

The server scripts directory has been reorganized from 73 scattered scripts into a logical, maintainable structure with clear categories and consolidated functionality.

## 📂 **New Directory Structure**

```
scripts/
├── 📂 setup/           # Initial setup and installation
│   └── master-setup.js         # Consolidated Phase 1 + 2 setup
├── 📂 database/        # Database management and migrations
│   └── database-manager.js     # Unified DB operations
├── 📂 testing/         # All testing and validation scripts
│   └── unified-tests.js        # Consolidated test suite
├── 📂 deployment/      # Production deployment scripts
├── 📂 maintenance/     # Ongoing maintenance and utilities
├── 📂 migration/       # Server migration tools
└── 📂 legacy/          # Deprecated scripts (to be moved)
```

## 🗃️ **Scripts to Consolidate**

### **✅ COMPLETED**

#### **Setup Scripts → `setup/master-setup.js`**
- ✅ `phase1-master-runner.js` - Database schema setup
- ✅ `phase2-master-runner.js` - OCR pipeline setup 
- ✅ `phase1-complete.js` - Phase validation
- ✅ `phase2-complete.js` - Phase validation

#### **Testing Scripts → `testing/unified-tests.js`**
- ✅ `test-ocr-pipeline.js` - OCR testing
- ✅ `test-ocr-complete.js` - OCR validation
- ✅ `test-ocr-router.js` - OCR router testing
- ✅ `test-ocr-simple.js` - Basic OCR tests
- ✅ `test-ocr-upload.js` - Upload testing
- ✅ `test-ocr-no-translation.js` - OCR without translation
- ✅ `test-public-ocr.js` - Public OCR endpoint
- ✅ `test-public-ocr-upload.js` - Public upload testing
- ✅ `debug-ocr-results.js` - OCR debugging
- ✅ `debug-public-ocr.js` - Public OCR debugging
- ✅ `debug-public-ocr-detailed.js` - Detailed OCR debugging
- ✅ `debug-public-ocr-simple.js` - Simple OCR debugging
- ✅ `test-api-routes.js` - API testing
- ✅ `test-church-api.js` - Church API testing
- ✅ `test-church-creation.js` - Church creation testing

#### **Database Scripts → `database/database-manager.js`**
- ✅ `setup-ocr-tables.js` - OCR table creation
- ✅ `fix-database-tables.js` - Database repairs
- ✅ `database-maintenance.js` - Maintenance operations
- ✅ `fix-ocr-schema.js` - OCR schema fixes
- ✅ `update-enhanced-ocr-schema.js` - Schema updates
- ✅ `check-database-connection.js` - Connection testing

## 🚀 **Next Steps to Complete**

### **📦 Move Remaining Scripts**

#### **1. Database Scripts → `database/`**
```bash
# Migration scripts
mv migrate-church-info.js database/
mv run_migration.js database/

# Schema scripts  
mv phase1-create-ocr-schema.js database/
mv phase1-create-db-utilities.js database/
mv phase1-verify-records-db.js database/

# Fix scripts
mv phase0-fix-translation-columns.js database/
mv phase0-fix-entities-column.js database/
mv phase0-fix-issues.js database/
mv fix-kanban-quotes.js database/
mv fix-quotes.js database/
```

#### **2. Setup Scripts → `setup/`**
```bash
# Registration scripts
mv register-existing-church.js setup/
mv register-ssppoc-church.js setup/
mv setup-default-kanban-boards.js setup/
mv createClientDatabase.js setup/

# Demo scripts
mv step6-standalone-demo.js setup/
mv step6-demo.js setup/
```

#### **3. Testing Scripts → `testing/`**
```bash
# Integration tests
mv test-import-records.js testing/
mv test-preprocessing.js testing/
mv test-ocr-jobs-api.js testing/
mv browser-session-test.js testing/

# Performance tests
mv quick-permission-test.js testing/
mv check-links-permissions.js testing/
```

#### **4. Maintenance Scripts → `maintenance/`**
```bash
# Status scripts
mv check-runner.js maintenance/
mv diagnose-churches-api.js maintenance/
mv debug-churches-api.js maintenance/
mv verify-ocr-scripts.js maintenance/

# Analysis scripts
mv analyze-ocr-patterns.js maintenance/
mv convert-ocr-data.js maintenance/
mv generate-ocr-text-files.js maintenance/
```

#### **5. Deployment Scripts → `deployment/`**
```bash
# Phase scripts (deploy-focused)
mv phase2-create-transfer-service.js deployment/
mv phase2-create-api-endpoints.js deployment/
mv phase2-create-field-mapping.js deployment/
mv phase2-create-text-parsers.js deployment/
mv phase2-test-integration.js deployment/
mv phase2-verify-phase1.js deployment/
```

#### **6. Legacy Scripts → `legacy/`**
```bash
# Phase 0 scripts (legacy)
mv phase0-*.js legacy/

# Old validation scripts
mv phase1-create-typescript-interfaces.js legacy/
mv phase0-retry-failed-jobs.js legacy/
mv phase0-final-verification.js legacy/
mv phase0-ocr-system-test.js legacy/
mv phase0-check-ocr-status.js legacy/
mv phase0-database-test.js legacy/
```

## 📋 **Updated NPM Scripts**

### **✅ New Organized Commands**

#### **Setup & Installation**
```bash
npm run setup:fresh        # Complete fresh installation
npm run setup:database     # Database setup only
npm run setup:schema       # Core schema only
npm run setup:ocr          # OCR tables only
```

#### **Testing & Validation**
```bash
npm run test:health         # Basic health check
npm run test:full          # Complete test suite
npm run test:debug         # Debug mode testing
npm run test:ocr           # OCR-focused tests
npm run test:api           # API-focused tests
```

#### **Database Management**
```bash
npm run db:backup          # Create backup
npm run db:optimize        # Optimize performance
npm run db:validate        # Validate schema
```

#### **Deployment & Migration**
```bash
npm run deploy:production  # Deploy to production
npm run migrate:server     # Migrate to new server
```

#### **Maintenance**
```bash
npm run maintain:status    # System status check
npm run maintain:logs      # Log analysis
npm run maintain:cleanup   # Cleanup operations
```

## 🗑️ **Scripts Marked for Deletion**

### **Duplicate/Obsolete Scripts**
- `test-db-utilities.ts` (TypeScript version exists)
- Multiple duplicate test-ocr-* variants
- Old phase0-* scripts (functionality moved to setup)
- Redundant debug-* scripts (consolidated)

### **Template/Example Files**
- `saints_peter_and_paul_orthodox_church_db_schema.sql`
- `base_ocr_template_schema_20250713_221952.sql`
- `clientDatabaseTemplate.sql`
- `registry-extraction-report.json`

## ✅ **Benefits of New Structure**

### **🎯 Improved Developer Experience**
- **Clear purpose**: Each script category has a specific function
- **Consistent naming**: Logical naming conventions
- **Reduced duplication**: Consolidated similar functionality
- **Better documentation**: Each script includes help and examples

### **🔧 Easier Maintenance**
- **Centralized logic**: Related operations in single files
- **Reduced complexity**: Fewer files to manage
- **Clear dependencies**: Logical script execution order
- **Version control**: Easier to track changes

### **🚀 Better Operations**
- **Standardized commands**: Consistent npm script interface
- **Error handling**: Unified error reporting and logging
- **Dry-run support**: Preview operations before execution
- **Backup integration**: Automatic backup creation

## 📋 **Migration Checklist**

- [x] Create new directory structure
- [x] Create consolidated setup script
- [x] Create unified testing suite  
- [x] Create database manager
- [x] Update package.json scripts
- [ ] Move remaining scripts to appropriate directories
- [ ] Update documentation references
- [ ] Test all new consolidated scripts
- [ ] Remove obsolete/duplicate scripts
- [ ] Update deployment documentation

## 🎉 **Final State**

After migration completion:
- **73 scripts** → **~20 organized scripts**
- **Clear categories** with specific purposes
- **Consistent CLI interface** via npm scripts
- **Comprehensive help** and documentation
- **Automated backups** and dry-run support
- **Unified logging** and error handling
