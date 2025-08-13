# OrthodoxMetrics Site Audit Report
**Date:** August 12, 2025  
**Environment:** Production (`/var/www/orthodoxmetrics/prod`)  
**Audit Type:** Comprehensive Read-Only Analysis

---

## Executive Summary

This audit reveals critical issues requiring immediate attention, particularly around database references, dependency management, and build configuration. The system shows signs of technical debt with multiple deprecated database references, missing dependencies, and large archive files in the codebase.

---

## Ranked Problem List

### CRITICAL ISSUES (Immediate Action Required)

#### [1] [Impact: HIGH] [Effort: MED] [Risk: HIGH] — Deprecated Database References
- **Issue:** 382+ references to deprecated `orthodoxmetrics_auth_db` database throughout the codebase
- **Files Affected:** 
  - `prod/server/routes/admin/users.js` (extensive usage)
  - `prod/server/routes/admin/churches.js` (multiple queries)
  - `prod/server/src/api/admin.js` (user management)
  - `prod/server/src/services/databaseService.js`
  - `prod/server/src/utils/generateCredentials.js`
- **Impact:** Database operations may fail or point to wrong database
- **Fix:** Migrate all references to `orthodoxmetrics_db`

#### [2] [Impact: HIGH] [Effort: LOW] [Risk: MED] — Missing Critical Dependencies
- **Issue:** 12+ missing dependencies in front-end preventing builds
- **Missing Packages:**
  - `@mui/utils` (required by EnhanceTable.tsx)
  - `react-icons` (OrthodoxCalendar.jsx)
  - `@faker-js/faker` (generateDummyRecords.ts)
  - `react-bootstrap` (CertificatePreviewer.tsx)
  - `@react-pdf/renderer` (RecordHeader.tsx)
  - `notistack` (AddChurchPage.tsx)
  - `ag-grid-community` (ChurchManagement.jsx)
  - `react-tabs` (EditChurchModal.jsx)
  - `@dnd-kit/utilities` (Columndragdrop.tsx)
  - `clsx` (ComponentContainerCard.tsx)
  - `react-chartjs-2` (AIAnalyticsDashboard.tsx)
- **Fix:** Install missing dependencies

#### [3] [Impact: HIGH] [Effort: LOW] [Risk: LOW] — Large Archive Files in Codebase
- **Issue:** 658MB of archive files in production directory
- **Files:**
  - `/prod/front-end/docs/backup_2025-07-19T06-00-00-106Z_full.tar.gz` (329MB)
  - `/prod/front-end/docs/files_complete_2025-07-19T06-00-00-106Z.tar.gz` (329MB)
- **Impact:** Bloated repository, slow clones, unnecessary storage costs
- **Fix:** Move to archive storage or remove

---

### HIGH PRIORITY ISSUES

#### [4] [Impact: MED] [Effort: MED] [Risk: LOW] — Extensive Unused Dependencies
- **Issue:** 38 unused production dependencies, 6 unused dev dependencies
- **Unused Production Dependencies:**
  - UI Libraries: `@fortawesome/*`, `@tabler/icons`, `bootstrap`
  - Data Processing: `papaparse`, `pdfmake`, `file-saver`, `uuid`
  - Utilities: `sharp`, `tesseract.js`, `jimp`, `canvas`
  - React Libraries: `react-redux`, `react-csv`, `react-table`, `react-select`
  - State Management: `@reduxjs/toolkit`, `zustand`
- **Impact:** Increased bundle size, security vulnerabilities, maintenance overhead
- **Fix:** Remove unused dependencies

#### [5] [Impact: MED] [Effort: LOW] [Risk: LOW] — Build Configuration Issues
- **Issue:** Missing build scripts and Vite configuration problems
- **Problems:**
  - No `tsconfig.json` in front-end root
  - Vite cannot find `index.html` entry point
  - TypeScript compilation not properly configured
- **Fix:** Configure build system properly

#### [6] [Impact: MED] [Effort: HIGH] [Risk: MED] — PM2 Process Instability
- **Issue:** Backend process showing 396 restarts in 114 minutes
- **Process:** `orthodox-backend` (pid: 302617)
- **Impact:** Service instability, potential data loss, poor user experience
- **Fix:** Investigate crash logs and stabilize backend service

---

### MEDIUM PRIORITY ISSUES

#### [7] [Impact: MED] [Effort: MED] [Risk: LOW] — Environment Variable Inconsistencies
- **Issue:** Mismatch between defined and used environment variables
- **Front-end .env defines:** `VITE_API_BASE_URL`, `VITE_APP_NAME`, `VITE_APP_VERSION`
- **Front-end code uses:** `VITE_OMAI_BASE_URL`, `VITE_APP_ENV` (undefined)
- **Server .env defines:** 14 variables
- **Server code uses:** Additional SMTP variables not defined
- **Fix:** Align environment variable definitions with usage

#### [8] [Impact: LOW] [Effort: MED] [Risk: LOW] — Dead Code and Unused Components
- **Issue:** Multiple backup and corrupted files in production
- **Files:**
  - `ChurchList.tsx.backup`
  - `ChurchForm.tsx.backup`
  - `UserManagement_corrupted.tsx`
  - `UserManagement_backup.tsx`
  - `SessionManagement.tsx.backup`
  - `ActivityLogs.tsx.backup`
- **Fix:** Archive or remove backup files

#### [9] [Impact: LOW] [Effort: LOW] [Risk: LOW] — Route Organization Issues
- **Issue:** Complex nested routing structure with 100+ routes
- **Location:** `prod/front-end/src/routes/Router.tsx`
- **Problems:** Difficult to maintain, potential for route conflicts
- **Fix:** Refactor and organize routes by feature

---

## Fix Roadmap

### Phase 1: Critical Fixes (Week 1)
1. **Database Migration**
   - Create migration script for `orthodoxmetrics_auth_db` to `orthodoxmetrics_db`
   - Update all 382+ references
   - Test thoroughly before deployment

2. **Dependency Resolution**
   - Install missing dependencies
   - Remove unused dependencies
   - Update package.json

3. **Archive Management**
   - Move large archive files to external storage
   - Clean up backup files in codebase

### Phase 2: Stabilization (Week 2)
1. **Backend Service**
   - Investigate PM2 restart issues
   - Fix memory leaks or crashes
   - Implement proper error handling

2. **Build System**
   - Configure Vite properly
   - Create tsconfig.json
   - Fix entry point configuration

3. **Environment Variables**
   - Audit all env variable usage
   - Create comprehensive .env.example
   - Document all required variables

---

## Metrics Summary

- **Critical Issues:** 3
- **High Priority Issues:** 3
- **Medium Priority Issues:** 3
- **Total Files Analyzed:** 1000+
- **Database References to Fix:** 382+
- **Dependencies to Install:** 12
- **Dependencies to Remove:** 44
- **Large Files to Archive:** 2 (658MB total)
- **PM2 Restarts:** 396 in 114 minutes

---

## Conclusion

The system requires immediate attention to critical database and dependency issues. While the infrastructure is operational, the high restart rate and missing dependencies indicate instability. Priority should be given to database migration, dependency resolution, and backend stabilization.

**Next Step:** Await confirmation before proceeding to Phase 2 (Autonomous Fix Implementation).
