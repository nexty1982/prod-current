# OrthodoxMetrics Front-End: Baptism, Marriage, and Funeral Records Analysis

**Analysis Date:** December 19, 2024  
**Source:** `front-end/src/routes/Router.tsx` and component imports

## Active Routes Summary

Based on analysis of `front-end/src/routes/Router.tsx`, the following routes are **actively used** for sacrament records:

| Sacrament | Route Path | Page Component Name | Page Component File Path | Data Source Type | Data Source Path or Endpoint |
|-----------|------------|---------------------|--------------------------|------------------|------------------------------|
| **Baptism** | `/apps/records-ui` | `RecordsUIPage` | `front-end/src/features/records/apps/records/RecordsUIPage.tsx` | API | `/api/baptism-records` |
| **Baptism** | `/apps/records-ui/:churchId` | `RecordsUIPage` | `front-end/src/features/records/apps/records/RecordsUIPage.tsx` | API | `/api/baptism-records` |
| **Marriage** | `/apps/records-ui` | `RecordsUIPage` | `front-end/src/features/records/apps/records/RecordsUIPage.tsx` | API | `/api/marriage-records` |
| **Marriage** | `/apps/records-ui/:churchId` | `RecordsUIPage` | `front-end/src/features/records/apps/records/RecordsUIPage.tsx` | API | `/api/marriage-records` |
| **Funeral** | `/apps/records-ui` | `RecordsUIPage` | `front-end/src/features/records/apps/records/RecordsUIPage.tsx` | API | `/api/funeral-records` |
| **Funeral** | `/apps/records-ui/:churchId` | `RecordsUIPage` | `front-end/src/features/records/apps/records/RecordsUIPage.tsx` | API | `/api/funeral-records` |
| **All** | `/apps/records/centralized` | `CentralizedRecordsPageWrapper` | `front-end/src/features/records-centralized/components/records/RecordsPageWrapper.tsx` | API | `/api/baptism-records`, `/api/marriage-records`, `/api/funeral-records` |

## Detailed Component Analysis

### Primary Active Component: `RecordsUIPage`

**File:** `front-end/src/features/records/apps/records/RecordsUIPage.tsx`

**Key Imports:**
- `listRecords` from `@/shared/lib/recordsApi` - Main API client
- `AddRecordModal`, `ImportRecordsModal` from `./components` - Modal components
- `RecordsActionButtons` from `@/features/records/BrandButtons` - Action buttons

**API Client:** `front-end/src/shared/lib/recordsApi.ts`
- **Baptism Endpoint:** `/api/baptism-records`
- **Marriage Endpoint:** `/api/marriage-records`
- **Funeral Endpoint:** `/api/funeral-records`
- **Additional Endpoint:** `/api/admin/churches` (for church list)

**Field Mappings (UI → API):**
- **Baptism:** `baptismDate` → `reception_date`, `birthDate` → `birth_date`, `firstName` → `first_name`, `lastName` → `last_name`
- **Marriage:** `marriageDate` → `mdate`, `groomFirstName` → `groom_first_name`, `groomLastName` → `groom_last_name`, `brideFirstName` → `bride_first_name`, `brideLastName` → `bride_last_name`
- **Funeral:** `deathDate` → `death_date`, `funeralDate` → `burial_date`, `firstName` → `first_name`, `lastName` → `last_name`, `age` → `age`, `burialLocation` → `burial_location`

### Secondary Component: `CentralizedRecordsPageWrapper`

**File:** `front-end/src/features/records-centralized/components/records/RecordsPageWrapper.tsx`

**Status:** ⚠️ **HAS BUG** - References `RecordsPage` component that doesn't exist (line 30). Should use `RecordsUIPage` instead.

**Intended Import:** `RecordsUIPage` from `@/features/records-centralized/views/apps/records/RecordsUIPage` (file doesn't exist)

## Directory Structure - Active Files

### Baptism Records

**Active Directories:**
- `front-end/src/features/records/apps/records/` - Main RecordsUIPage component (handles all three sacrament types)
- `front-end/src/shared/lib/recordsApi.ts` - API client with baptism endpoint mapping
- `front-end/src/features/records-centralized/components/baptism/` - Contains `BaptismRecords.tsx` (may be used by other parts, but not directly in Router)

**Likely Dead Code:**
- `front-end/src/legacy/features/records-centralized/components/baptism/` - Legacy directory
- `front-end/src/legacy/features/records/records/BaptismRecordsPage.tsx` - Legacy component
- `front-end/src/features/records-centralized/components/baptism/BaptismRecordsPage.tsx` - Commented out in Router (line 73)
- `front-end/src/features/records-centralized/components/baptism/BaptismRecordsComponent.tsx` - Not referenced in active routes

### Marriage Records

**Active Directories:**
- `front-end/src/features/records/apps/records/` - Main RecordsUIPage component (handles all three sacrament types)
- `front-end/src/shared/lib/recordsApi.ts` - API client with marriage endpoint mapping

**Likely Dead Code:**
- `front-end/src/legacy/features/records-centralized/components/marriage/` - Legacy directory
- `front-end/src/features/records-centralized/components/marriage/MarriageRecords.tsx` - Commented out in Router (line 74)
- `front-end/src/features/records-centralized/components/marriage/MarriageRecordsPage.tsx` - Not found, likely removed

### Funeral Records

**Active Directories:**
- `front-end/src/features/records/apps/records/` - Main RecordsUIPage component (handles all three sacrament types)
- `front-end/src/shared/lib/recordsApi.ts` - API client with funeral endpoint mapping

**Likely Dead Code:**
- `front-end/src/legacy/features/records-centralized/components/records/FuneralRecords.tsx` - Legacy component
- `front-end/src/features/records-centralized/components/records/FuneralRecords.tsx` - Commented out in Router (line 75)

## Summary by Sacrament

### Baptism Records

**Active Files:**
- `front-end/src/features/records/apps/records/RecordsUIPage.tsx` - Unified component for all records
- `front-end/src/shared/lib/recordsApi.ts` - API client
- `front-end/src/features/records/apps/records-ui/index.tsx` - Wrapper component

**Active Directories:**
- `front-end/src/features/records/apps/records/` - Main records UI
- `front-end/src/shared/lib/` - Shared API utilities

**Dead Code (Likely Unused):**
- `front-end/src/legacy/features/records-centralized/components/baptism/` - Entire legacy directory
- `front-end/src/features/records-centralized/components/baptism/BaptismRecordsPage.tsx` - Commented out route
- `front-end/src/legacy/features/records/records/BaptismRecordsPage.tsx` - Legacy component

### Marriage Records

**Active Files:**
- `front-end/src/features/records/apps/records/RecordsUIPage.tsx` - Unified component for all records
- `front-end/src/shared/lib/recordsApi.ts` - API client
- `front-end/src/features/records/apps/records-ui/index.tsx` - Wrapper component

**Active Directories:**
- `front-end/src/features/records/apps/records/` - Main records UI
- `front-end/src/shared/lib/` - Shared API utilities

**Dead Code (Likely Unused):**
- `front-end/src/legacy/features/records-centralized/components/marriage/` - Entire legacy directory
- `front-end/src/features/records-centralized/components/marriage/MarriageRecords.tsx` - Commented out route

### Funeral Records

**Active Files:**
- `front-end/src/features/records/apps/records/RecordsUIPage.tsx` - Unified component for all records
- `front-end/src/shared/lib/recordsApi.ts` - API client
- `front-end/src/features/records/apps/records-ui/index.tsx` - Wrapper component

**Active Directories:**
- `front-end/src/features/records/apps/records/` - Main records UI
- `front-end/src/shared/lib/` - Shared API utilities

**Dead Code (Likely Unused):**
- `front-end/src/legacy/features/records-centralized/components/records/FuneralRecords.tsx` - Legacy component
- `front-end/src/features/records-centralized/components/records/FuneralRecords.tsx` - Commented out route

## Notes

1. **Unified Component Approach:** All three sacrament types (Baptism, Marriage, Funeral) are handled by a single unified component (`RecordsUIPage`) that uses tabs to switch between record types.

2. **No Static Data Files:** No JSON files, TS schema files, or column definition files were found in the records directories. All data comes from API endpoints.

3. **API-First Architecture:** The application uses a REST API architecture with endpoints:
   - `/api/baptism-records`
   - `/api/marriage-records`
   - `/api/funeral-records`

4. **Field Mapping:** The API client (`recordsApi.ts`) handles field name translation between UI (camelCase) and API (snake_case) formats.

5. **Router Issues:** 
   - `CentralizedRecordsPageWrapper` has a bug (references non-existent `RecordsPage`)
   - Several routes are commented out in Router.tsx (lines 73-75, 867-873)

6. **Legacy Code:** Multiple legacy directories exist but are not referenced in the active Router configuration.

