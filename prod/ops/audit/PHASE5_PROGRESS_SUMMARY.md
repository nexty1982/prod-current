# Phase 5 Progress Summary: Legacy Records System

## Completed Steps

### Step 0: Preflight ✅
- Verified Node v22.16.0, npm 11.4.2
- Confirmed existing tables: baptism_records, marriage_records, funeral_records
- Found existing sacrament import infrastructure

### Step 1: Import Tracking Tables ✅
- Created `import_jobs` table for tracking import operations
- Created `import_files` table for file storage metadata
- Created `import_field_mappings` table for saving field mappings
- Added missing columns to existing record tables:
  - certificate_no, book_no, page_no, entry_no, source_hash
- Added unique constraints for idempotent imports
- Added indexes for fast browsing

## Existing Infrastructure Found

### Database Tables
- `baptism_records` - Existing table with basic structure
- `marriage_records` - For marriage sacraments
- `funeral_records` - For funeral records
- All tables now have church_id for multi-tenancy

### Import Tools
- `ops/sacrament_import.ts` - TypeScript import script
  - Supports CSV imports with YAML mapping
  - Idempotent via source_hash
  - Handles date parsing and normalization
  - Church-scoped operations

### SQL Schema
- `server/database/05_sacrament_tables.sql` - Original table definitions
- `server/database/06_records_imports.sql` - Import tracking infrastructure

## Next Steps Required

### Step 2: Backend Import API (Pending)
Need to create:
- `server/src/routes/records/import.ts`
  - POST /api/records/import/upload
  - POST /api/records/import/preview
  - POST /api/records/import/commit
- `server/src/modules/records/importService.ts`
  - Format detection (CSV, JSON, SQL, XML)
  - Parsers for each format
  - Source hash computation
  - Upsert logic

### Step 3: Frontend - Legacy Records (Priority)
- `front-end/src/pages/LegacyRecordsPage.tsx`
- `front-end/src/components/records/LegacyImportWizard.tsx`
  - Upload step
  - Mapping step
  - Preview step
  - Import step

### Step 4: Frontend - Records Browser
- `front-end/src/pages/RecordsBrowserPage.tsx`
- Tabbed interface for three record types
- Filtering and pagination
- Detail views

### Step 5: Frontend - Records Dashboard
- `front-end/src/pages/RecordsDashboardPage.tsx`
- Statistics cards
- Import history chart
- Quick actions

### Step 6: Multi-tenancy Enforcement
- Ensure all operations use req.tenantId
- Storage paths: uploads/<churchId>/<jobId>/
- File size limits and mime type restrictions

### Step 7: Verification
- Test imports for all formats
- Verify idempotency
- Check church isolation

## Architecture Decisions

### Import Strategy
- **Idempotent**: Using source_hash for deduplication
- **Church-scoped**: All operations filtered by church_id
- **Format-agnostic**: Support CSV, JSON, SQL, XML
- **Streaming**: Handle large files efficiently

### Data Model
- **Flexible**: JSON columns for variable data (godparents, witnesses)
- **Normalized**: Separate first/middle/last names
- **Searchable**: Indexes on dates and names
- **Traceable**: source_system and source_row_id for audit

### Security
- **Multi-tenant**: Row-level isolation by church_id
- **File validation**: Size limits and mime type checks
- **SQL injection prevention**: Whitelist for SQL imports
- **Authentication required**: All endpoints protected

## Dependencies to Install
```bash
npm install fast-csv xml2js multer
npm install -D @types/multer
```

## Commits Made
1. `chore(phase5): snapshot before records UX - existing sacrament infrastructure`
2. `feat(db): import tracking + scoped uniques for records`

## Risk Assessment
- **Low Risk**: Additive changes only, no data loss
- **Medium Risk**: Need careful handling of duplicate detection
- **Mitigation**: Comprehensive testing before production use

## Success Metrics
- ✅ Import tracking infrastructure in place
- ✅ Existing import script can be leveraged
- ⏳ API endpoints need implementation
- ⏳ Frontend UI needs creation
- ⏳ End-to-end testing required

## Time Estimate
- Backend API: 2-3 hours
- Frontend Wizard: 3-4 hours  
- Browser & Dashboard: 2-3 hours
- Testing & Refinement: 2 hours
- **Total**: ~10-12 hours for complete implementation
