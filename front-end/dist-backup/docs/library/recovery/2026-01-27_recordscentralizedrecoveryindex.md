# Records-Centralized Recovery Index

**Generated**: January 26, 2026  
**Purpose**: Categorize missing files from September 2025 backup for selective recovery  
**Source**: `09-25/src-9-30-25-working/features/records-centralized/`

---

## Executive Summary

**Total Missing Files**: 153 TSX files + 58 TS files + 2 JS files = **213 files**

**Categorization**:
- **Business Features**: 45 files (21%)
- **Infrastructure**: 38 files (18%)
- **Template/Demo UI**: 78 files (37%)
- **Tests/Examples**: 12 files (6%)
- **Mock/Test Data**: 40 files (19%)

**Recommendation**: Restore Infrastructure first, then Business Features. Skip Template/Demo UI entirely unless specifically needed.

---

## Category 1: Business Features (45 files)

**Priority**: HIGH - These provide user-facing functionality

### Dynamic Records System (7 files)
- `components/records/DynamicRecordsManager.tsx` (16.2 KB) - Core dynamic manager
- `components/records/ModernDynamicRecordsManager.tsx` (17.7 KB) - Modern version
- `components/records/DynamicRecordsTable.tsx` (13.2 KB) - Dynamic table
- `components/records/ModernDynamicRecordsTable.tsx` (15.3 KB) - Modern table
- `components/records/DynamicRecordsPageWrapper.tsx` (4.9 KB) - Page wrapper
- `components/records/DynamicRecordForm.tsx` (544 bytes) - Dynamic form
- `components/forms/DynamicRecordForm.tsx` (4.8 KB) - Form variant

**Dependencies**: `DynamicRecordsApiService.ts`, `useDynamicRecords.ts`, `dynamicRecordsApi.ts`

---

### Unified Records System (5 files)
- `components/records/UnifiedRecordManager.tsx` (13.7 KB) - Unified manager
- `components/records/UnifiedRecordTable.tsx` (6.3 KB) - Unified table
- `components/forms/UnifiedRecordForm.tsx` (5.5 KB) - Unified form
- `components/forms/RecordsForm.tsx` (14.0 KB) - Records form
- `components/forms/RecordFormModal.tsx` (13.2 KB) - Form modal

**Dependencies**: `UnifiedRecordsApiService.ts`, `useUnifiedRecords.ts`

---

### AG Grid Tables (6 files)
- `components/records/AgGridRecordsTable.tsx` (12.2 KB) - AG Grid table
- `components/records/BaseRecordsTable.tsx` (8.3 KB) - Base table
- `components/records/BerryRecordsTable.tsx` (16.9 KB) - Berry theme
- `components/records/OptimizedRecordsTable.tsx` (20.5 KB) - Optimized
- `components/records/AccessibleRecordsTable.tsx` (19.7 KB) - Accessible
- `components/records/RecordsTable.tsx` (11.8 KB) - Standard table

**Dependencies**: `AgGridConfigApiService.ts`, `RecordTableConfigApiService.ts`, `useAgGridConfig.ts`

---

### Import System (4 files)
- `components/records/ImportRecordsButton.tsx` (18.3 KB) - Import button
- `components/records/ImportRecordsButtonV2.tsx` (19.8 KB) - Import v2
- `components/records/ImportRecordsButtonSimple.tsx` (13.2 KB) - Simple import
- `components/records/ImportRecordsExample.tsx` (5.5 KB) - Example usage

**Dependencies**: Backend import APIs exist (`/api/records/import/*`)

---

### Certificate Generation (1 file)
- `components/CertificatePreviewer.tsx` (24.5 KB) - Certificate preview/generation

**Dependencies**: Backend certificate API (may need verification)

---

### Bulk Operations (1 file)
- `components/BulkOperations.tsx` (23.0 KB) - Bulk edit/delete operations

**Dependencies**: Records API service

---

### Record Management Utilities (10 files)
- `components/records/RecordManager.tsx` (12.4 KB) - Record manager
- `components/records/RecordGenerator.tsx` (15.6 KB) - Test data generator
- `components/records/RecordHistoryModal.tsx` (3.2 KB) - Audit trail
- `components/records/RecordPreviewPane.tsx` (8.9 KB) - Preview pane
- `components/records/RecordHeader.tsx` (5.2 KB) - Record header
- `components/records/RecordFilters.tsx` (3.2 KB) - Filters
- `components/records/RecordSearch.tsx` (4.8 KB) - Search
- `components/records/RecordsSearch.tsx` (12.2 KB) - Advanced search
- `components/records/RecordPagination.tsx` (2.5 KB) - Pagination
- `components/records/RecordCard.tsx` (7.4 KB) - Card view

**Dependencies**: Records API service, hooks

---

### Record Type Components (4 files)
- `components/baptism/BaptismRecords.tsx` (6.7 KB) - Baptism component
- `components/baptism/BaptismRecordsComponent.tsx` (16.9 KB) - Baptism wrapper
- `components/marriage/MarriageRecords.tsx` (14.0 KB) - Marriage component
- `components/records/FuneralRecords.tsx` (14.3 KB) - Funeral component

**Dependencies**: Church records hooks, API

---

### Form Builders (2 files)
- `components/forms/FormBuilder.tsx` (21.6 KB) - Dynamic form builder
- `components/forms/EnhancedDynamicForm.tsx` (26.4 KB) - Enhanced form

**Dependencies**: Form utilities, field renderers

---

### Other Business Features (5 files)
- `components/records/EditableRecordPage.tsx` (14.6 KB) - Editable page
- `components/records/RecordsModal.tsx` (9.0 KB) - Records modal
- `components/records/RecordTable.tsx` (10.0 KB) - Basic table
- `components/records/RecordList.tsx` (6.3 KB) - List view
- `components/records/RecordFilter.tsx` (7.5 KB) - Filter component

**Dependencies**: Records API service

---

## Category 2: Infrastructure (38 files)

**Priority**: CRITICAL - Required for Business Features to work

### API Services (8 files)
- `components/records/RecordsApiService.ts` (14.8 KB) - Main API service
- `components/records/DynamicRecordsApiService.ts` (17.4 KB) - Dynamic API
- `components/records/UnifiedRecordsApiService.ts` (12.9 KB) - Unified API
- `components/records/AgGridConfigApiService.ts` (1.6 KB) - AG Grid config API
- `components/records/RecordTableConfigApiService.ts` (12.9 KB) - Table config API
- `components/api.ts` (4.5 KB) - API utilities
- `components/client.ts` (1.8 KB) - API client
- `components/endpoints.ts` (803 bytes) - Endpoint definitions

**Dependencies**: None (foundation layer)

---

### React Hooks (6 files)
- `components/records/useDynamicRecords.ts` (12.7 KB) - Dynamic records hook
- `components/records/useUnifiedRecords.ts` (12.7 KB) - Unified records hook
- `components/records/useRecords.ts` (11.0 KB) - Records hook
- `components/records/useRecordManager.js` (16.8 KB) - Record manager hook
- `components/records/useAgGridConfig.ts` (456 bytes) - AG Grid config hook
- `components/records/useCalendarData.ts` (9.2 KB) - Calendar data hook

**Dependencies**: API services, React Query

---

### Context/State Management (4 files)
- `components/records/ChurchRecordsContext.tsx` (17.3 KB) - Church records context
- `components/records/ChurchRecordsProvider.tsx` (5.1 KB) - Context provider
- `components/records/RecordsContext.tsx` (8.4 KB) - General records context
- `context/AuthContext.tsx` (646 bytes) - Auth context
- `context/ThemeContext.tsx` (746 bytes) - Theme context

**Dependencies**: React Context API

---

### TypeScript Types (4 files)
- `components/records/church-records.types.ts` (3.5 KB) - Basic types
- `components/records/church-records-advanced.types.ts` (6.3 KB) - Advanced types
- `components/records/RecordsTypes.ts` (15.6 KB) - Record types
- `components/schemas.ts` (1.3 KB) - Zod schemas

**Dependencies**: None (type definitions)

---

### API Functions (2 files)
- `components/records/church-records.api.ts` (11.0 KB) - API functions
- `components/records/church-records.hooks.ts` (10.1 KB) - React Query hooks
- `components/records/dynamicRecordsApi.ts` (5.6 KB) - Dynamic API functions
- `components/queries.ts` (2.9 KB) - Query definitions

**Dependencies**: API client, endpoints

---

### Services (2 files)
- `services/churchService.ts` (1.1 KB) - Church service
- `services/recordService.ts` (628 bytes) - Record service

**Dependencies**: API client

---

### Constants/Config (3 files)
- `components/constants.ts` (16.3 KB) - Constants and field definitions
- `constants/index.ts` (967 bytes) - Constants export
- `schemas/record-schemas.ts` (663 bytes) - Record schemas

**Dependencies**: None

---

### Utilities (3 files)
- `utils/devLogger.ts` (263 bytes) - Dev logger
- `components/forms/formatTimestamp.ts` (2.1 KB) - Timestamp formatter
- `components/FieldRenderer/index.tsx` (318 bytes) - Field renderer

**Dependencies**: None

---

### Index/Export Files (6 files)
- `index.ts` (199 bytes) - Main export
- `components/index.ts` (295 bytes) - Components export
- `components/index.tsx` (1.3 KB) - Components export TSX
- `components/baptism/index.ts` (67 bytes) - Baptism export
- `components/marriage/index.ts` (68 bytes) - Marriage export
- `components/records/index.ts` (67 bytes) - Records export

**Dependencies**: All component files

---

## Category 3: Template/Demo UI (78 files)

**Priority**: SKIP - These are demo/template components, not business features

### Slider Components (18 files)
- `components/CustomRangeSlider.tsx`
- `components/CustomSlider.tsx`
- `components/CustomSliderCode.tsx`
- `components/DefaultsliderCode.tsx`
- `components/DiscreteSlider.tsx`
- `components/DiscreteSliderCode.tsx`
- `components/RangeDefault.tsx`
- `components/RangeSlider.tsx`
- `components/RangesliderCode.tsx`
- `components/MuiSlider.tsx`
- `components/VolumeSlider.tsx`
- `components/VolumesliderCode.tsx`
- `components/TemperatureRangeCode.tsx`
- `components/records/SliderData.ts`

**Reason**: Demo/template components for Material-UI sliders

---

### Icon/Color Components (12 files)
- `components/BasicIcons.tsx`
- `components/BasicIconsCode.tsx`
- `components/IconColorCode.tsx`
- `components/IconSizesCode.tsx`
- `components/Colors.tsx`
- `components/ColorsCode.tsx`
- `components/ColorLabel.tsx`
- `components/ColorPaletteSelector/index.tsx`
- `components/ColorPickerPopover/index.tsx`
- `components/Position.tsx`
- `components/Sizes.tsx`
- `components/SizesAutocomplete.tsx`

**Reason**: Demo/template components for icons and colors

---

### Autocomplete Components (6 files)
- `components/FreeSoloAutocomplete.tsx`
- `components/FreeSoloCode.tsx`
- `components/MultipleValuesAutocomplete.tsx`
- `components/MultipleValuesCode.tsx`
- `components/MuiAutoComplete.tsx`
- `components/FVOnLeave.tsx`
- `components/OnLeaveCode.tsx`

**Reason**: Demo/template components for autocomplete

---

### Form Demo Components (15 files)
- `components/forms/FbBasicHeaderForm.tsx`
- `components/forms/FbDefaultForm.tsx`
- `components/forms/FbDisabledForm.tsx`
- `components/forms/FbLeftIconForm.tsx`
- `components/forms/FbOrdinaryForm.tsx`
- `components/forms/FbReadonlyForm.tsx`
- `components/forms/FbRightIconForm.tsx`
- `components/forms/FormCustom.tsx`
- `components/forms/FormCustomCode.tsx`
- `components/forms/FormHorizontal.tsx`
- `components/forms/FormLabelAlignment.tsx`
- `components/forms/FormLayouts.tsx`
- `components/forms/FormSeparator.tsx`
- `components/forms/FormTabs.tsx`
- `components/forms/FormValidation.tsx`
- `components/forms/FormVertical.tsx`

**Reason**: Demo/template form layouts (not business logic)

---

### Code Example Components (8 files)
- `components/Default.tsx`
- `components/DefaultCode.tsx`
- `components/DefaultLabel.tsx`
- `components/DifferentDesignCode.tsx`
- `components/FABCode.tsx`
- `components/FABColorCode.tsx`
- `components/FABSizeCode.tsx`
- `components/records/ScatterDatasetCode.tsx`

**Reason**: Code examples/demos, not production code

---

### Theme/Layout Components (5 files)
- `components/Theme/ThemedLayout.tsx`
- `components/TableControlPanel/index.tsx`
- `components/AdvancedGridDialog/index.tsx`
- `components/RecordPreviewPane/index.tsx`
- `components/SubtleAlert.tsx`

**Reason**: Theme/layout demos (may be useful, but low priority)

---

### Other Demo Components (14 files)
- `components/Address.tsx`
- `components/Custom.tsx`
- `components/TypeBadge.tsx`
- `components/TiptapEdit.tsx`
- `components/TiptapEditor.tsx`
- `components/confirmation/DeleteConfirmationModal.tsx` (may be useful)
- `components/forms/CustomFormLabel.tsx`
- `components/forms/DropzoneFormInput.tsx` (may be useful)
- `components/forms/MetadataForm.tsx`
- `components/forms/PasswordFormInput.tsx`
- `components/forms/SelectFormInput.tsx`
- `components/forms/TextAreaFormInput.tsx`
- `components/forms/TextFormInput.tsx`
- `components/forms/CollapsibleForm.tsx` (may be useful)

**Reason**: Mix of demo and potentially useful components (review individually)

---

## Category 4: Tests/Examples (12 files)

**Priority**: LOW - Restore only if running tests

### Test Files (4 files)
- `components/records/DynamicRecordsManager.test.tsx` (12.4 KB)
- `components/records/DynamicRecordsTable.test.tsx` (9.3 KB)
- `components/records/RecordsApiService.test.ts` (6.8 KB)
- `components/records/RecordsCentralized.test.tsx` (22.8 KB)
- `components/records/useDynamicRecords.test.tsx` (11.3 KB)

**Dependencies**: Test framework, components being tested

---

### Example/Demo Files (7 files)
- `components/records/AdvancedRecordsDemo.tsx` (14.9 KB) - Demo component
- `components/records/RecordWorkflowExample.tsx` (11.5 KB) - Workflow example
- `components/records/ImportRecordsExample.tsx` (5.5 KB) - Import example
- `components/records/ScatterDatasetChart.tsx` (2.4 KB) - Chart demo
- `components/records/SSPPOCRecordsPage.tsx` (77.4 KB) - Specialized page (may be useful)
- `components/baptism/BaptismRecordViewerMagnifier.tsx` (10.6 KB) - Viewer (may be useful)
- `components/forms/ProductPerformances.tsx` (12.3 KB) - Performance demo

**Dependencies**: Various components

---

## Category 5: Mock/Test Data (40 files)

**Priority**: SKIP - Test data, not production code

### Mock Data Files (40 files)
- `components/records/blogData.ts`
- `components/records/Chatdata.ts`
- `components/records/churchData.tsx`
- `components/records/ContactsData.tsx`
- `components/records/countrydata.tsx`
- `components/records/data.ts`
- `components/records/EmailData.tsx`
- `components/records/EventData.ts`
- `components/records/FilterTableData.ts`
- `components/records/generateDummyRecords.ts`
- `components/records/KanbanData.tsx`
- `components/records/LanguageData.js`
- `components/records/Menudata.ts`
- `components/records/mockData.ts`
- `components/records/NotesData.ts`
- `components/records/orthodoxRoutesData.ts`
- `components/records/PaginationData.ts`
- `components/records/ProductsData.ts`
- `components/records/tableData.ts`
- `components/records/TaskData.tsx`
- `components/records/TicketData.ts`
- `components/forms/performance.ts`
- `components/forms/TopPerformerData.ts`
- Plus various other data files

**Reason**: Mock/test data files, not production code

---

## Top 10 Highest Value Components to Restore First

### 1. API Services Layer (CRITICAL)
**Files**:
- `components/records/RecordsApiService.ts`
- `components/records/DynamicRecordsApiService.ts`
- `components/records/UnifiedRecordsApiService.ts`
- `components/api.ts`
- `components/client.ts`
- `components/endpoints.ts`

**Why**: Foundation for all other features. Without this, nothing else works.

**Dependencies**: None (foundation)

---

### 2. React Hooks (CRITICAL)
**Files**:
- `components/records/useDynamicRecords.ts`
- `components/records/useUnifiedRecords.ts`
- `components/records/useRecords.ts`
- `components/records/church-records.hooks.ts`

**Why**: Required for components to fetch/manage data.

**Dependencies**: API services

---

### 3. Context/State Management (CRITICAL)
**Files**:
- `components/records/ChurchRecordsContext.tsx`
- `components/records/ChurchRecordsProvider.tsx`
- `components/records/RecordsContext.tsx`

**Why**: Shared state management across components.

**Dependencies**: React Context API

---

### 4. TypeScript Types (CRITICAL)
**Files**:
- `components/records/church-records.types.ts`
- `components/records/church-records-advanced.types.ts`
- `components/records/RecordsTypes.ts`

**Why**: Type safety and IntelliSense.

**Dependencies**: None

---

### 5. AG Grid Tables (HIGH)
**Files**:
- `components/records/AgGridRecordsTable.tsx`
- `components/records/BaseRecordsTable.tsx`
- `components/records/OptimizedRecordsTable.tsx`
- `components/records/AgGridConfigApiService.ts`
- `components/records/RecordTableConfigApiService.ts`

**Why**: Advanced table functionality with sorting, filtering, etc.

**Dependencies**: API services, hooks, AG Grid library

---

### 6. Import System (HIGH)
**Files**:
- `components/records/ImportRecordsButton.tsx` (or Simple version)
- `components/records/ImportRecordsExample.tsx` (for reference)

**Why**: User-facing feature, backend APIs exist.

**Dependencies**: Records API service

---

### 7. Certificate Generation (MEDIUM)
**Files**:
- `components/CertificatePreviewer.tsx`

**Why**: User-facing feature, but may need backend API verification.

**Dependencies**: Certificate API (verify exists)

---

### 8. Bulk Operations (MEDIUM)
**Files**:
- `components/BulkOperations.tsx`

**Why**: User-facing feature for efficiency.

**Dependencies**: Records API service

---

### 9. Dynamic Records Manager (HIGH - if extensibility needed)
**Files**:
- `components/records/DynamicRecordsManager.tsx`
- `components/records/DynamicRecordsTable.tsx`
- `components/records/DynamicRecordsApiService.ts`

**Why**: Enables adding new record types without code changes.

**Dependencies**: API services, hooks, types

---

### 10. Unified Records System (MEDIUM - if consolidation needed)
**Files**:
- `components/records/UnifiedRecordManager.tsx`
- `components/records/UnifiedRecordTable.tsx`
- `components/records/UnifiedRecordsApiService.ts`

**Why**: Single component handling multiple record types.

**Dependencies**: API services, hooks, types

---

## Recovery Sequence Recommendation

### Phase 1: Infrastructure (Week 1)
1. API Services Layer (all 8 files)
2. TypeScript Types (all 4 files)
3. React Hooks (all 6 files)
4. Context/State Management (all 4 files)
5. Constants/Config (all 3 files)
6. Services (all 2 files)
7. Utilities (all 3 files)

**Total**: 30 files  
**Goal**: Foundation in place for features to build on

---

### Phase 2: Core Business Features (Week 2)
1. AG Grid Tables (6 files + 2 config services)
2. Record Management Utilities (10 files)
3. Record Type Components (4 files)

**Total**: 22 files  
**Goal**: Advanced table functionality and record management

---

### Phase 3: User-Facing Features (Week 3)
1. Import System (2-3 files)
2. Certificate Generation (1 file, verify backend first)
3. Bulk Operations (1 file)
4. Form Builders (2 files, if needed)

**Total**: 6-7 files  
**Goal**: Complete user-facing feature set

---

### Phase 4: Advanced Systems (Week 4 - Optional)
1. Dynamic Records System (7 files) - Only if extensibility needed
2. Unified Records System (5 files) - Only if consolidation needed

**Total**: 12 files  
**Goal**: Advanced framework features

---

## Files to SKIP Entirely

### Template/Demo UI (78 files)
- All slider components
- All icon/color demo components
- All autocomplete demos
- All form layout demos
- All code example components
- Most theme/layout demos

**Reason**: Not production code, just demos/templates

---

### Mock/Test Data (40 files)
- All `*Data.ts` files
- All `mockData.ts` files
- All `generateDummyRecords.ts` files

**Reason**: Test data, not production code

---

### Tests (5 files)
- All `.test.tsx` files

**Reason**: Restore only if running tests

---

## Dependency Notes

### Critical Dependencies (Must Install)
- `@ag-grid-community/react` - For AG Grid tables
- `@ag-grid-community/core` - For AG Grid core
- `react-query` or `@tanstack/react-query` - For hooks
- `zod` - For schemas (if using)

### Optional Dependencies
- `@mui/material` - Already installed
- `@mui/icons-material` - Already installed
- `react-router-dom` - Already installed

### Backend API Verification Needed
- Certificate generation API endpoint
- Import API endpoints (verify they exist)
- Bulk operations API endpoints

---

## Summary Statistics

| Category | Files | Priority | Restore? |
|----------|-------|----------|----------|
| **Infrastructure** | 38 | CRITICAL | ✅ YES |
| **Business Features** | 45 | HIGH | ✅ YES |
| **Template/Demo UI** | 78 | SKIP | ❌ NO |
| **Tests/Examples** | 12 | LOW | ⚠️ OPTIONAL |
| **Mock/Test Data** | 40 | SKIP | ❌ NO |
| **TOTAL** | 213 | - | **83 files to restore** |

---

## Next Steps

1. **Verify Backend APIs**: Confirm certificate, import, and bulk operation APIs exist
2. **Install Dependencies**: Ensure AG Grid, React Query, Zod are installed
3. **Start with Infrastructure**: Restore Phase 1 files first
4. **Test Incrementally**: After each phase, verify nothing breaks
5. **Skip Demos**: Do not restore template/demo UI files

---

**Recovery Effort Estimate**: 3-4 weeks for Infrastructure + Core Features, 1-2 weeks for Advanced Systems (if needed)
