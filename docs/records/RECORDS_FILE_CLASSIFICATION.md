# Records File Classification

**Generated**: January 25, 2026  
**Purpose**: Classify all records-related files into categories (CANONICAL, EXPERIMENTAL, LEGACY, DEAD/UTILITY) to enable safe recovery of work without regressions

**Rules**: 
- ✅ Analysis and labeling only
- ❌ No behavior changes
- ❌ No file deletions
- ❌ No refactoring

---

## Classification Legend

- **CANONICAL**: Actively used by current records pages (see `RECORDS_CANONICAL_SET.md`)
- **EXPERIMENTAL**: Newer work, not wired into current system, likely valuable for future integration
- **LEGACY**: Old system, replaced by current approach, useful for reference
- **DEAD/UTILITY**: Dummy data, examples, unused helpers, or files with no recoverable logic

---

## Canonical Files

These files are actively used by the current Records system. See `RECORDS_CANONICAL_SET.md` for full details.

| Path | Classification | Reason | Recoverable Logic |
|------|---------------|--------|-------------------|
| `front-end/src/features/records-centralized/components/baptism/BaptismRecordsPage.tsx` | CANONICAL | Primary baptism records page, actively used | N/A (already canonical) |
| `front-end/src/features/records-centralized/components/marriage/MarriageRecordsPage.tsx` | CANONICAL | Primary marriage records page, actively used | N/A (already canonical) |
| `front-end/src/features/records-centralized/components/death/FuneralRecordsPage.tsx` | CANONICAL | Primary funeral records page, actively used | N/A (already canonical) |
| `front-end/src/context/AuthContext.tsx` | CANONICAL | Provides `useAuth()` hook used by all Records pages | N/A (already canonical) |
| `front-end/src/features/records-centralized/components/records/RecordsPageWrapper.tsx` | CANONICAL | Tabbed wrapper for centralized route, wraps canonical pages | N/A (already canonical) |
| `server/src/api/baptism.js` | CANONICAL | API endpoint called by BaptismRecordsPage | N/A (already canonical) |
| `server/src/api/marriage.js` | CANONICAL | API endpoint called by MarriageRecordsPage | N/A (already canonical) |
| `server/src/api/funeral.js` | CANONICAL | API endpoint called by FuneralRecordsPage | N/A (already canonical) |
| `server/src/api/churches.js` | CANONICAL | Provides `/api/my/churches` endpoint used for church context resolution | N/A (already canonical) |
| `server/src/utils/dbSwitcher.js` | CANONICAL | Database connection switching utility used by all canonical API routes | N/A (already canonical) |
| `server/src/api/admin.js` | CANONICAL | Contains table creation schemas for canonical database tables | N/A (already canonical) |

---

## Experimental Files

These files contain newer work that is not currently wired into the canonical system but may contain valuable logic for future integration.

| Path | Classification | Reason | Recoverable Logic |
|------|---------------|--------|-------------------|
| `front-end/src/context/ChurchRecordsContext.tsx` | EXPERIMENTAL | Unified records context with advanced filtering, pagination, and multi-type support. Not used by canonical pages but contains valuable unified state management logic. | ✅ Yes - Unified state management, advanced filtering (type, parish, clergy, date ranges), pagination logic, multi-record-type fetching |
| `front-end/src/context/ChurchRecordsProvider.tsx` | EXPERIMENTAL | Provider wrapper for ChurchRecordsContext. Part of unified context system not yet integrated. | ✅ Yes - Context provider pattern for unified records state |
| `front-end/src/shared/lib/fetchWithChurchContext.ts` | EXPERIMENTAL | Utility for automatically adding church context headers to fetch requests. Not used by canonical pages but provides cleaner API abstraction. | ✅ Yes - Automatic church context header injection, church ID extraction from URL/storage |
| `server/src/routes/records/browse.ts` | EXPERIMENTAL | Unified browse API endpoint supporting all record types. Alternative API structure not used by canonical pages but provides cleaner unified interface. | ✅ Yes - Unified API endpoint pattern, advanced filtering (date ranges, certificate/book/page/entry), search across multiple fields |
| `server/src/routes/records/dashboard.ts` | EXPERIMENTAL | Dashboard statistics API with trends, duplicates, recent records. Backend implemented but not integrated into UI. | ✅ Yes - Dashboard statistics logic, trend analysis, duplicate detection, year-over-year comparisons |
| `server/src/routes/records/import.ts` | EXPERIMENTAL | Import API routes for CSV/JSON/SQL/XML imports with field mapping. Backend fully implemented, frontend UI not integrated. | ✅ Yes - File upload handling, format detection, preview parsing, field mapping, async import processing |
| `server/src/modules/records/importService.ts` | EXPERIMENTAL | Import service logic for parsing and importing records. Supports multiple formats and idempotency. | ✅ Yes - CSV/JSON/SQL/XML parsing, field mapping, idempotent imports, error handling, job tracking |
| `front-end/src/features/records-centralized/components/dynamic/DynamicRecordsInspector.tsx` | EXPERIMENTAL | Dynamic records inspector component for examining record structures. Not wired into canonical pages. | ✅ Yes - Dynamic schema inspection, record structure analysis, debugging utilities |
| `front-end/src/features/records/EnhancedRecordsGrid.tsx` | EXPERIMENTAL | Enhanced records grid component with advanced features. Not used by canonical pages. | ✅ Yes - Advanced grid features, enhanced UI/UX patterns |
| `front-end/src/api/church-records.hooks.ts` | EXPERIMENTAL | React Query hooks for church records API. Provides data fetching patterns not used by canonical pages. | ✅ Yes - React Query integration patterns, caching strategies, mutation handling |
| `front-end/src/api/church-records.api.ts` | EXPERIMENTAL | API client functions for church records. Provides abstraction layer not used by canonical pages. | ✅ Yes - API client patterns, request/response handling, error normalization |
| `front-end/src/types/church-records.types.ts` | EXPERIMENTAL | TypeScript type definitions for church records. May contain more complete types than canonical pages use. | ✅ Yes - Type definitions, interfaces, type safety patterns |
| `front-end/src/types/church-records-advanced.types.ts` | EXPERIMENTAL | Advanced type definitions for church records. Extended types for advanced features. | ✅ Yes - Advanced type definitions, extended interfaces |

---

## Legacy Files

These files are from older systems that have been replaced by the current canonical approach. They are useful for reference but not actively used.

| Path | Classification | Reason | Recoverable Logic |
|------|---------------|--------|-------------------|
| `front-end/src/context/RecordsContext.tsx` | LEGACY | General records context from older unified system. Replaced by specialized component approach. | ⚠️ Limited - Basic context patterns, but architecture replaced |
| `front-end/src/components/apps/records/recordGrid/RecordSidebar.tsx` | LEGACY | Sidebar component from legacy grid system. Replaced by tab-based navigation in canonical pages. | ⚠️ Limited - Navigation patterns, but UI approach replaced |
| `front-end/src/components/apps/records/recordGrid/RecordSearch.tsx` | LEGACY | Search component from legacy grid system. Replaced by inline search in canonical pages. | ⚠️ Limited - Search UI patterns, but implementation replaced |
| `front-end/src/components/BaptismRecordsComponent.tsx` | LEGACY | Legacy baptism records component. Replaced by BaptismRecordsPage.tsx. | ⚠️ Limited - Component patterns, but fully replaced |
| `front-end/src/features/records/apps/church-management/RecordsPageWrapper.tsx` | LEGACY | Legacy records page wrapper from church management feature. Different from canonical RecordsPageWrapper. | ⚠️ Limited - Wrapper patterns, but different use case |
| `front-end/src/features/records/apps/records-ui/index.tsx` | LEGACY | Legacy unified records UI component. Replaced by specialized pages. | ⚠️ Limited - Unified UI patterns, but architecture replaced |
| `server/src/api/records.js` | LEGACY | Legacy unified records API. Replaced by individual record type APIs (baptism.js, marriage.js, funeral.js). | ⚠️ Limited - API patterns, but replaced by specialized endpoints |
| `server/src/api/importRecords.js` | LEGACY | Legacy import records API. Replaced by routes/records/import.ts. | ⚠️ Limited - Import patterns, but replaced by newer implementation |

---

## Dead/Utility Files

These files contain dummy data, examples, unused helpers, or have no recoverable logic for production use.

| Path | Classification | Reason | Recoverable Logic |
|------|---------------|--------|-------------------|
| `front-end/src/utils/generateDummyRecords.ts` | DEAD/UTILITY | Utility for generating dummy/test records. Not used in production, for development/testing only. | ❌ No - Test data generation only |
| `front-end/src/examples/ImportRecordsExample.tsx` | DEAD/UTILITY | Example component demonstrating import functionality. Not used in production. | ⚠️ Limited - Example patterns only, not production code |
| `front-end/src/features/ImportRecordsButtonSimple.tsx` | DEAD/UTILITY | Simple import button component. Not integrated into canonical pages. | ⚠️ Limited - Button component patterns, but not wired |
| `front-end/src/components/ImportRecordsButton.tsx` | DEAD/UTILITY | Import button component. Not integrated into canonical pages. | ⚠️ Limited - Button component patterns, but not wired |
| `front-end/src/components/ImportRecordsButtonV2.tsx` | DEAD/UTILITY | Version 2 of import button component. Not integrated into canonical pages. | ⚠️ Limited - Enhanced button patterns, but not wired |
| `front-end/src/components/ImportRecordsButtonSimple.tsx` | DEAD/UTILITY | Simple import button (duplicate path). Not integrated into canonical pages. | ⚠️ Limited - Button patterns, but not wired |
| `front-end/src/shared/ui/RecordsRouteErrorBoundary.tsx` | DEAD/UTILITY | Error boundary component for records routes. May be used but not critical to core functionality. | ⚠️ Limited - Error boundary patterns, but not core logic |
| `front-end/src/features/pages/frontend-pages/GreekRecordsViewer.tsx` | DEAD/UTILITY | Greek records viewer page. Specialized viewer, not part of main Records system. | ⚠️ Limited - Viewer patterns, but specialized use case |
| `front-end/src/features/forms/RecordSectionCard.tsx` | DEAD/UTILITY | Form section card component. May be used in forms but not core Records pages. | ⚠️ Limited - Form card patterns, but not core Records logic |
| `front-end/src/features/devel-tools/om-ocr/components/RecordSchemaInfoPopover.tsx` | DEAD/UTILITY | OCR tool component for record schema info. Part of OCR tools, not main Records system. | ⚠️ Limited - Schema info patterns, but OCR-specific |
| `front-end/src/core/types/RecordsTypes.ts` | DEAD/UTILITY | Core type definitions. May overlap with other type files, possibly unused. | ⚠️ Limited - Type definitions, but may be duplicate/unused |

---

## Additional Files Not in Manifest

These files were mentioned in discovery but need classification:

| Path | Classification | Reason | Recoverable Logic |
|------|---------------|--------|-------------------|
| `front-end/src/features/records/baptism/BaptismRecordEntryPage.tsx` | EXPERIMENTAL | Record entry page for creating/editing baptism records. Referenced in routes but forms not fully implemented. | ✅ Yes - Form patterns, validation logic, record creation/editing workflows |
| `front-end/src/features/records/marriage/MarriageRecordEntryPage.tsx` | EXPERIMENTAL | Record entry page for creating/editing marriage records. Referenced in routes but forms not fully implemented. | ✅ Yes - Form patterns, validation logic, record creation/editing workflows |
| `front-end/src/features/records/funeral/FuneralRecordEntryPage.tsx` | EXPERIMENTAL | Record entry page for creating/editing funeral records. Referenced in routes but forms not fully implemented. | ✅ Yes - Form patterns, validation logic, record creation/editing workflows |

---

## Recoverable Work Summary

### Experimental Files with Valuable Logic

#### 1. Unified Context System
**Files**:
- `front-end/src/context/ChurchRecordsContext.tsx`
- `front-end/src/context/ChurchRecordsProvider.tsx`

**Recoverable Logic**:
- **Unified state management**: Single context for managing all record types
- **Advanced filtering**: Filter by type, parish, clergy, date ranges
- **Multi-record-type fetching**: Fetch baptism, marriage, and funeral records in one call
- **Pagination state management**: Centralized pagination logic

**Integration Target**: Could be integrated into canonical pages to replace individual `useState` hooks with unified context, enabling cross-record-type filtering and unified state.

**Type**: UI enhancements, unified context

---

#### 2. Church Context Utility
**Files**:
- `front-end/src/shared/lib/fetchWithChurchContext.ts`

**Recoverable Logic**:
- **Automatic header injection**: Automatically adds `X-Church-Id` header to fetch requests
- **Church ID resolution**: Extracts church ID from URL, localStorage, or sessionStorage
- **Cleaner API abstraction**: Provides wrapper around `fetch()` for church-aware requests

**Integration Target**: Could replace direct `fetch()` calls in canonical pages to ensure consistent church context handling.

**Type**: UI enhancements, API abstraction

---

#### 3. Unified Browse API
**Files**:
- `server/src/routes/records/browse.ts`

**Recoverable Logic**:
- **Unified endpoint pattern**: Single endpoint `/api/records/:type` for all record types
- **Advanced filtering**: Date ranges, certificate/book/page/entry filtering
- **Search across multiple fields**: Different search logic for marriages (groom/bride names) vs others
- **Consistent response format**: Unified pagination and response structure

**Integration Target**: Could replace individual `/api/{type}-records` endpoints with unified pattern, or be used as alternative API structure.

**Type**: API enhancements, unified API

---

#### 4. Dashboard Statistics
**Files**:
- `server/src/routes/records/dashboard.ts`

**Recoverable Logic**:
- **Statistics aggregation**: Counts per record type, trends over time
- **Duplicate detection**: Finds records with duplicate certificate numbers
- **Recent records**: Last N records per type
- **Year-over-year comparisons**: Current vs previous year statistics
- **Import job tracking**: Recent import jobs and their status

**Integration Target**: Could be integrated into canonical pages as dashboard widgets or statistics panels.

**Type**: UI enhancements, dashboard integration

---

#### 5. Import System
**Files**:
- `server/src/routes/records/import.ts`
- `server/src/modules/records/importService.ts`

**Recoverable Logic**:
- **Multi-format support**: CSV, JSON, SQL, XML parsing
- **Format detection**: Automatic format detection from filename and mime type
- **Field mapping**: Suggests and applies field mappings from source to canonical fields
- **Preview functionality**: Preview import data before committing
- **Async processing**: Background job processing with status tracking
- **Idempotency**: Handles duplicate records safely

**Integration Target**: Could be integrated into canonical pages as import UI (upload button, preview modal, mapping interface).

**Type**: UI enhancements, import functionality

---

#### 6. Record Entry Forms
**Files**:
- `front-end/src/features/records/baptism/BaptismRecordEntryPage.tsx`
- `front-end/src/features/records/marriage/MarriageRecordEntryPage.tsx`
- `front-end/src/features/records/funeral/FuneralRecordEntryPage.tsx`

**Recoverable Logic**:
- **Form patterns**: Form structure for creating/editing records
- **Validation logic**: Field validation patterns
- **Record creation/editing workflows**: Complete CRUD workflows

**Integration Target**: Could be integrated into canonical pages to enable Create/Edit functionality (currently only navigation exists, no actual forms).

**Type**: UI enhancements, form patterns

---

#### 7. Dynamic Records Inspector
**Files**:
- `front-end/src/features/records-centralized/components/dynamic/DynamicRecordsInspector.tsx`

**Recoverable Logic**:
- **Schema inspection**: Dynamic schema analysis
- **Record structure analysis**: Understanding record structures at runtime
- **Debugging utilities**: Tools for examining record data

**Integration Target**: Could be integrated as developer tool or advanced feature for power users.

**Type**: UI enhancements, developer tools

---

#### 8. Enhanced Records Grid
**Files**:
- `front-end/src/features/records/EnhancedRecordsGrid.tsx`

**Recoverable Logic**:
- **Advanced grid features**: Enhanced UI/UX patterns beyond basic Material-UI table
- **Performance optimizations**: Possibly virtual scrolling or other optimizations

**Integration Target**: Could replace or enhance the Material-UI tables in canonical pages.

**Type**: UI enhancements, advanced grid

---

#### 9. API Client Patterns
**Files**:
- `front-end/src/api/church-records.hooks.ts`
- `front-end/src/api/church-records.api.ts`
- `front-end/src/types/church-records.types.ts`
- `front-end/src/types/church-records-advanced.types.ts`

**Recoverable Logic**:
- **React Query integration**: Caching, stale time management, mutation handling
- **API client abstraction**: Cleaner API call patterns
- **Type safety**: Comprehensive TypeScript types

**Integration Target**: Could replace direct `fetch()` calls in canonical pages with React Query hooks for better caching and state management.

**Type**: UI enhancements, API abstraction, type safety

---

### Integration Priority

**High Priority** (Core Functionality):
1. Record Entry Forms - Enable Create/Edit functionality
2. Import System - Enable data import functionality
3. Church Context Utility - Ensure consistent church context handling

**Medium Priority** (Enhanced Features):
4. Unified Context System - Better state management
5. Dashboard Statistics - Add statistics widgets
6. API Client Patterns - Better caching and state management

**Low Priority** (Nice to Have):
7. Unified Browse API - Alternative API structure
8. Dynamic Records Inspector - Developer tools
9. Enhanced Records Grid - Advanced UI features

---

## Notes

- **No Integration Yet**: This classification is for mapping purposes only. No integration work should be done until restoration plan is finalized.

- **Recoverable Logic**: Files marked with ✅ Yes contain logic that could be extracted and integrated into canonical files. Files marked with ⚠️ Limited contain patterns that may be useful but are less critical.

- **Canonical Files**: Files already in the canonical set should not be modified during recovery work unless explicitly part of a restoration plan.

- **Experimental Files**: These represent newer work that may not be fully tested or integrated. Careful review and testing required before integration.

- **Legacy Files**: These represent old patterns that were replaced. May contain useful reference material but should not be restored as-is.

- **Dead/Utility Files**: These are safe to ignore or remove, but may contain example patterns useful for reference.
