# Records Centralized Feature Documentation

**Date:** December 9, 2025  
**Location:** `src/features/records-centralized/`  
**Purpose:** Comprehensive documentation of the records-centralized feature module, including directory structure, file purposes, and import documentation for all components.

---

## Table of Contents

1. [Overview](#overview)
2. [Directory Structure](#directory-structure)
3. [Root Level Files](#root-level-files)
4. [Components Directory](#components-directory)
5. [Services Directory](#services-directory)
6. [Schemas Directory](#schemas-directory)
7. [Constants Directory](#constants-directory)
8. [Context Directory](#context-directory)
9. [Utils Directory](#utils-directory)
10. [Component Import Documentation](#component-import-documentation)

---

## Overview

The `records-centralized` feature is a comprehensive church records management system that provides:

- **Dynamic Record Management**: Automatically discovers and works with any `om_church_##` tables ending in `_records`
- **Multiple Record Types**: Supports Baptism, Marriage, Funeral, and other record types
- **Unified Components**: Shared components for consistent UX across all record types
- **AG Grid Integration**: Advanced data grid with configuration support
- **Form Management**: Dynamic forms that adapt to table schemas
- **API Services**: Centralized API services for record operations

---

## Directory Structure

```
src/features/records-centralized/
├── components/          # All UI components and sub-components
│   ├── baptism/        # Baptism record components
│   ├── marriage/       # Marriage record components
│   ├── records/        # Core record management components
│   ├── dynamic/        # Dynamic record display components
│   ├── forms/          # Form components and builders
│   ├── confirmation/   # Confirmation modals
│   ├── Theme/          # Theme-related components
│   └── ...             # Various utility components
├── services/           # API service layer
├── schemas/            # Data schemas and type definitions
├── constants/          # Application constants
├── context/            # React context providers
├── utils/              # Utility functions
└── index.ts            # Main export file
```

---

## Root Level Files

### `index.ts`
**Purpose:** Main export file for the records-centralized feature module.

**Exports:**
- All exports from `./components`
- All exports from `./hooks` (if exists)
- All exports from `./services`
- All exports from `./types` (if exists)
- All exports from `./utils`
- All exports from `./constants`

**Usage:** Provides a single entry point for importing records-centralized functionality.

---

## Components Directory

The `components/` directory contains all UI components organized by functionality.

### Main Component Files

#### `components/index.tsx`
**Purpose:** Main records application component that provides the entry point for the records management interface.

**Key Imports:**
- `React, useState` - React hooks for component state
- `Box` from `@mui/material` - Material-UI layout component
- `Breadcrumb` - Navigation breadcrumb component
- `PageContainer` - Page layout wrapper
- `RecordsTable` - Table component for displaying records
- `RecordsSearch` - Search functionality component
- `AppCard` - Card container component
- `RecordProvider` - Context provider for record state

**Functionality:**
- Sets up the main records management page layout
- Provides breadcrumb navigation
- Wraps content in RecordProvider for state management
- Includes mobile sidebar support

---

### Subdirectories

#### `components/baptism/`

**Purpose:** Components specific to Baptism record management.

**Files:**

1. **`BaptismRecordsPage.tsx`**
   - **Purpose:** Main page component for viewing and managing baptism records
   - **Key Imports:**
     - `React, useState, useEffect, useMemo, useCallback` - React hooks
     - `useLocation` from `react-router-dom` - Router location hook
     - Material-UI components: `Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TablePagination, TableSortLabel, TextField, Button, Dialog, Typography, Chip, IconButton, Grid, Alert, CircularProgress, Tooltip, Card, CardContent, Snackbar, Stack, Divider, Drawer, Collapse`
     - Material-UI icons: `Add, Edit, Delete, Search, FilterList, GetApp, Visibility, Palette, Settings, Lock, LockOpen, TableChart, ViewList, ExpandLess`
     - `useTableStyleStore` - Zustand store for table styling
     - `listRecords` from `@/shared/lib/recordsApi` - API function for fetching records
     - `TableControlPanel` - Table control UI component
     - `ColorPaletteSelector` - Color selection component
     - `AGGridViewOnly` - AG Grid view component
     - `ChurchRecord, RecordType` - Type definitions
     - `ImportRecordsButton` - Import functionality component
     - `AdvancedGridDialog` - Advanced grid dialog component
     - `FIELD_DEFINITIONS, RECORD_TYPES` - Constants
     - `DynamicRecordsDisplay, mapFieldDefinitionsToDynamicColumns` - Dynamic display utilities
     - `enhancedTableStore` - Enhanced table state store
   - **Functionality:**
     - Displays baptism records in a table format
     - Supports pagination, sorting, and filtering
     - Provides import/export functionality
     - Includes color coding and styling options
     - Supports dynamic column mapping

2. **`BaptismRecordsComponent.tsx`**
   - **Purpose:** Reusable component for baptism record display
   - **Functionality:** Provides a standardized way to display baptism records

3. **`BaptismRecords.tsx`**
   - **Purpose:** Core baptism records component
   - **Functionality:** Handles baptism record data and display logic

4. **`BaptismRecordViewerMagnifier.tsx`**
   - **Purpose:** Specialized viewer with magnifier functionality for detailed record viewing
   - **Functionality:** Allows zooming and detailed inspection of baptism records

5. **`DynamicRecordsDisplay.tsx`**
   - **Purpose:** Dynamic display component for baptism records
   - **Functionality:** Adapts to different record structures dynamically

6. **`index.ts`** and **`index.tsx`**
   - **Purpose:** Export files for the baptism module

---

#### `components/marriage/`

**Purpose:** Components specific to Marriage record management.

**Files:**

1. **`MarriageRecords.tsx`**
   - **Purpose:** Main component for managing marriage records
   - **Key Imports:**
     - `React, useMemo, useState` - React hooks
     - Material-UI components: `Box, Typography, Button, Chip, IconButton, Tooltip, Alert, Paper`
     - Material-UI icons: `Add, Refresh, Download, Upload, Lock, LockOpen, History, PictureAsPdf, Favorite`
     - Unified components: `ModernDynamicRecordsManager, ModernDynamicRecordsTable, ModernDynamicRecordForm, BulkOperations, AdvancedSearch, AuditTrail`
     - Unified hooks: `useUnifiedRecords, useUnifiedRecordMutations, useRecordTableConfig, useAgGridConfig, useSearchableFields, useSortableFields`
     - `UnifiedRecordForm` - Unified form component
     - `RECORD_TYPES, FIELD_DEFINITIONS, THEME_COLORS` - Constants
   - **Functionality:**
     - Manages marriage records using unified components
     - Supports CRUD operations
     - Includes bulk operations
     - Provides advanced search and filtering
     - Audit trail functionality

2. **`index.ts`**
   - **Purpose:** Export file for marriage module

---

#### `components/records/`

**Purpose:** Core record management components - the largest and most important subdirectory.

**Key Files:**

1. **`RecordsPageWrapper.tsx`**
   - **Purpose:** Wrapper component that extracts route parameters and passes them to the records page
   - **Key Imports:**
     - `React` - React library
     - `useParams` from `react-router-dom` - Route parameter extraction
     - `useSafeSearchParams` - Safe search parameter hook
     - `RecordsUIPage` - Main records UI page component
   - **Functionality:**
     - Extracts `churchId` from URL parameters
     - Handles invalid church ID errors
     - Passes parameters to RecordsPage component

2. **`DynamicRecordsManager.tsx`**
   - **Purpose:** Automatically discovers and works with any `om_church_##` tables ending in `_records` using column positions
   - **Key Imports:**
     - `React, useState, useMemo` - React hooks
     - Material-UI components: `Box, Typography, Button, Chip, IconButton, Tooltip, Alert, Paper, Select, MenuItem, FormControl, InputLabel, CircularProgress`
     - Material-UI icons: `Add, Refresh, Download, Upload, Lock, LockOpen, TableChart, Settings`
     - Dynamic hooks: `useRecordTables, useDynamicRecords, useDynamicRecordMutations, useDynamicRecordImportExport, useTableColumns, useFormFields, useSearchFilters`
     - `DynamicRecordForm` - Dynamic form component
     - `RecordsSearch, RecordsModal` - Search and modal components
     - `DynamicRecordsTable` - Dynamic table component
     - `THEME_COLORS` - Theme constants
   - **Functionality:**
     - Discovers available record tables for a church
     - Manages records using column positions instead of field names
     - Supports table locking/unlocking
     - Provides import/export functionality
     - Handles form display and record editing

3. **`AgGridRecordsTable.tsx`**
   - **Purpose:** Advanced data grid with configuration support and template integration using AG Grid
   - **Key Imports:**
     - `React, useMemo, useCallback, useRef, useEffect, useState` - React hooks
     - `AgGridReact` from `ag-grid-react` - AG Grid React component
     - `ColDef, GridApi, ColumnApi, GridReadyEvent, CellValueChangedEvent, SelectionChangedEvent` from `ag-grid-community` - AG Grid types
     - Material-UI components: `Box, Typography, Alert, CircularProgress, Button, Chip, Tooltip, IconButton`
     - Material-UI icons: `Refresh, Download, Settings`
     - Unified hooks: `useUnifiedRecords, useUnifiedRecordMutations, useAgGridConfig, useTableSchema, useFieldDefinitions, getCurrentTemplate`
     - Type definitions: `RecordData, RecordFilters, UnifiedTableSchema, AgGridConfig`
   - **Functionality:**
     - Displays records in an advanced AG Grid
     - Supports configuration templates
     - Handles record selection, editing, deletion
     - Supports bulk operations
     - Provides export functionality
     - Inline editing support

4. **`DynamicRecordsTable.tsx`**
   - **Purpose:** Dynamic table component that adapts to any table schema
   - **Functionality:**
     - Automatically infers columns from data
     - Supports dynamic column mapping
     - Handles pagination, sorting, filtering

5. **`ModernDynamicRecordsManager.tsx`**
   - **Purpose:** Modern implementation of dynamic records manager with enhanced features
   - **Functionality:**
     - Enhanced UI/UX
     - Better performance optimizations
     - Advanced filtering and search

6. **`ModernDynamicRecordsTable.tsx`**
   - **Purpose:** Modern table implementation with performance optimizations
   - **Functionality:**
     - Virtual scrolling
     - Optimized rendering
     - Enhanced user experience

7. **`UnifiedRecordManager.tsx`**
   - **Purpose:** Unified manager that works across all record types
   - **Functionality:**
     - Consistent interface for all record types
     - Shared functionality

8. **`UnifiedRecordTable.tsx`**
   - **Purpose:** Unified table component for all record types
   - **Functionality:**
     - Consistent table display
     - Shared features across record types

9. **`RecordsApiService.ts`**
   - **Purpose:** API service for record operations
   - **Functionality:**
     - CRUD operations
     - Pagination support
     - Filtering and sorting

10. **`DynamicRecordsApiService.ts`**
    - **Purpose:** API service for dynamic record operations
    - **Functionality:**
      - Dynamic table discovery
      - Schema fetching
      - Record operations using column positions

11. **`UnifiedRecordsApiService.ts`**
    - **Purpose:** Unified API service for all record types
    - **Functionality:**
      - Consistent API interface
      - Shared error handling

12. **`church-records.types.ts`**
    - **Purpose:** TypeScript type definitions for church records
    - **Key Types:**
      - `User` - User interface
      - `AuthResponse` - Authentication response
      - `BaptismRecord` - Baptism record structure
      - `MarriageRecord` - Marriage record structure
      - `FuneralRecord` - Funeral record structure
      - `OCRUploadResponse` - OCR upload response
      - `OCRStatus` - OCR processing status
      - `LiturgicalEvent` - Liturgical event structure

13. **`church-records-advanced.types.ts`**
    - **Purpose:** Advanced type definitions for church records
    - **Functionality:**
      - Extended type definitions
      - Advanced record structures

14. **`church-records.api.ts`**
    - **Purpose:** API functions for church records
    - **Functionality:**
      - API endpoint definitions
      - Request/response handling

15. **`church-records.hooks.ts`**
    - **Purpose:** React hooks for church records
    - **Functionality:**
      - Custom hooks for data fetching
      - State management hooks

16. **`useDynamicRecords.ts`**
    - **Purpose:** Custom hooks for dynamic record operations
    - **Key Imports:**
      - `useState, useCallback, useMemo` from React
      - `useQuery, useMutation, useQueryClient` from `@tanstack/react-query`
      - `createDynamicRecordsApiService, RecordFilters, RecordSort, PaginatedResponse, TableSchema, RecordData`
    - **Functionality:**
      - `useRecordTables` - Hook for discovering available record tables
      - `useTableSchema` - Hook for getting table schema
      - `useDynamicRecords` - Hook for managing records with pagination, filtering, and sorting
      - `useDynamicRecordMutations` - Hook for create/update/delete operations
      - `useDynamicRecordImportExport` - Hook for import/export operations
      - `useTableColumns` - Hook for column management
      - `useFormFields` - Hook for form field generation
      - `useSearchFilters` - Hook for search and filter functionality

17. **`useUnifiedRecords.ts`**
    - **Purpose:** Unified hooks for all record types
    - **Functionality:**
      - Consistent hook interface
      - Shared functionality

18. **`useAgGridConfig.ts`**
    - **Purpose:** Hook for AG Grid configuration
    - **Functionality:**
      - Column definition generation
      - Grid configuration management

19. **`useRecords.ts`**
    - **Purpose:** General hooks for record operations
    - **Functionality:**
      - Basic record operations
      - Data fetching

20. **`useCalendarData.ts`**
    - **Purpose:** Hook for calendar-related record data
    - **Functionality:**
      - Calendar view support
      - Date-based filtering

21. **`RecordCard.tsx`**
    - **Purpose:** Card component for displaying individual records
    - **Functionality:**
      - Card-based record display
      - Compact record view

22. **`RecordFilter.tsx`** and **`RecordFilters.tsx`**
    - **Purpose:** Filter components for records
    - **Functionality:**
      - Filter UI components
      - Filter logic

23. **`RecordSearch.tsx`** and **`RecordsSearch.tsx`**
    - **Purpose:** Search components for records
    - **Functionality:**
      - Search UI
      - Search functionality

24. **`RecordPagination.tsx`**
    - **Purpose:** Pagination component for records
    - **Functionality:**
      - Page navigation
      - Page size selection

25. **`RecordSidebar.tsx`**
    - **Purpose:** Sidebar component for record navigation
    - **Functionality:**
      - Navigation menu
      - Filter sidebar

26. **`RecordHeader.tsx`**
    - **Purpose:** Header component for record pages
    - **Functionality:**
      - Page title
      - Action buttons

27. **`RecordPreviewPane.tsx`**
    - **Purpose:** Preview pane for record details
    - **Functionality:**
      - Record detail view
      - Quick preview

28. **`RecordHistoryModal.tsx`**
    - **Purpose:** Modal for displaying record history
    - **Functionality:**
      - Audit trail display
      - Change history

29. **`RecordGenerator.tsx`**
    - **Purpose:** Component for generating records
    - **Functionality:**
      - Record creation wizard
      - Bulk record generation

30. **`RecordWorkflowExample.tsx`**
    - **Purpose:** Example workflow component
    - **Functionality:**
      - Workflow demonstration
      - Example implementation

31. **`ImportRecordsButton.tsx`**, **`ImportRecordsButtonSimple.tsx`**, **`ImportRecordsButtonV2.tsx`**
    - **Purpose:** Various import button implementations
    - **Functionality:**
      - Import functionality
      - File upload handling

32. **`ImportRecordsExample.tsx`**
    - **Purpose:** Example implementation of record import
    - **Functionality:**
      - Import demonstration
      - Usage examples

33. **`EditableRecordPage.tsx`**
    - **Purpose:** Page for editing records
    - **Functionality:**
      - Record editing interface
      - Form handling

34. **`FuneralRecords.tsx`**
    - **Purpose:** Component for managing funeral records
    - **Key Imports:**
      - Similar to MarriageRecords.tsx
      - Unified components and hooks
    - **Functionality:**
      - Funeral record management
      - CRUD operations

35. **`DatabaseStatus.tsx`**
    - **Purpose:** Component for displaying database status
    - **Functionality:**
      - Connection status
      - Health monitoring

36. **`SystemMetadataSection.tsx`**
    - **Purpose:** Component for displaying system metadata
    - **Functionality:**
      - Metadata display
      - System information

37. **`ChurchRecordsContext.tsx`** and **`ChurchRecordsProvider.tsx`**
    - **Purpose:** Context providers for church records
    - **Functionality:**
      - State management
      - Data sharing

38. **`RecordsContext.tsx`**
    - **Purpose:** General records context
    - **Functionality:**
      - Shared state
      - Context API

39. **`RecordsModal.tsx`**
    - **Purpose:** Modal component for records
    - **Functionality:**
      - Modal dialogs
      - Record forms in modals

40. **`RecordsTable.tsx`**
    - **Purpose:** Basic table component for records
    - **Functionality:**
      - Simple table display
      - Basic operations

41. **`RecordTable.tsx`**
    - **Purpose:** Enhanced table component
    - **Functionality:**
      - Advanced table features
      - Enhanced display

42. **`BaseRecordsTable.tsx`**
    - **Purpose:** Base table component that other tables extend
    - **Functionality:**
      - Shared table logic
      - Base implementation

43. **`BerryRecordsTable.tsx`**
    - **Purpose:** Berry-themed table component
    - **Functionality:**
      - Custom styling
      - Berry design system

44. **`AccessibleRecordsTable.tsx`**
    - **Purpose:** Accessibility-focused table component
    - **Functionality:**
      - ARIA support
      - Keyboard navigation
      - Screen reader support

45. **`OptimizedRecordsTable.tsx`**
    - **Purpose:** Performance-optimized table component
    - **Functionality:**
      - Virtual scrolling
      - Memoization
      - Performance optimizations

46. **`AdvancedRecordsDemo.tsx`**
    - **Purpose:** Demo component for advanced features
    - **Functionality:**
      - Feature demonstration
      - Examples

47. **`SSPPOCRecordsPage.tsx`**
    - **Purpose:** Proof of concept page
    - **Functionality:**
      - POC implementation
      - Experimental features

48. **`RecordTableConfigApiService.ts`** and **`AgGridConfigApiService.ts`**
    - **Purpose:** API services for table configuration
    - **Functionality:**
      - Configuration management
      - Template handling

49. **`RecordsTypes.ts`**
    - **Purpose:** TypeScript type definitions
    - **Functionality:**
      - Type exports
      - Type definitions

50. **`RecordsApiService.test.ts`**
    - **Purpose:** Test file for RecordsApiService
    - **Functionality:**
      - Unit tests
      - Service testing

51. **`RecordsCentralized.test.tsx`**
    - **Purpose:** Test file for centralized records
    - **Functionality:**
      - Component tests
      - Integration tests

52. **`DynamicRecordsTable.test.tsx`** and **`DynamicRecordsManager.test.tsx`**
    - **Purpose:** Test files for dynamic components
    - **Functionality:**
      - Component tests
      - Hook tests

53. **`useDynamicRecords.test.tsx`**
    - **Purpose:** Test file for useDynamicRecords hook
    - **Functionality:**
      - Hook testing
      - Unit tests

54. **Data Files:**
    - `mockData.ts` - Mock data for testing
    - `tableData.ts` - Table data definitions
    - `churchData.tsx` - Church data component
    - `countrydata.tsx` - Country data component
    - `blogData.ts` - Blog data
    - `Chatdata.ts` - Chat data
    - `ContactsData.tsx` - Contacts data
    - `EmailData.tsx` - Email data
    - `EventData.ts` - Event data
    - `FilterTableData.ts` - Filter table data
    - `KanbanData.tsx` - Kanban data
    - `LanguageData.js` - Language data
    - `Menudata.ts` - Menu data
    - `NotesData.ts` - Notes data
    - `orthodoxRoutesData.ts` - Orthodox routes data
    - `PaginationData.ts` - Pagination data
    - `ProductsData.ts` - Products data
    - `SliderData.ts` - Slider data
    - `TaskData.tsx` - Task data
    - `TicketData.ts` - Ticket data
    - `generateDummyRecords.ts` - Dummy record generator
    - `data.ts` - General data definitions
    - `useRecordManager.js` - Legacy record manager hook

---

#### `components/dynamic/`

**Purpose:** Dynamic record display components that adapt to any table structure.

**Files:**

1. **`DynamicRecordsDisplay.tsx`**
   - **Purpose:** Canonical dynamic records display component that works with any record structure
   - **Key Imports:**
     - `React, useMemo, useState` - React hooks
     - Material-UI components: `Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TableSortLabel, Paper, IconButton, Tooltip, CircularProgress, Typography, Box, Menu, MenuItem, ListItemIcon, ListItemText, Grid, Card, CardContent, Chip`
     - Material-UI icons: `Visibility, Edit, Delete, MoreVert`
     - `inferColumnsFromRecords, mapFieldDefinitionsToDynamicColumns` - Column inference utilities
     - `renderCellValue` - Cell rendering utility
   - **Functionality:**
     - Automatically infers columns from record data
     - Supports multiple layout variants (table, dense, cards)
     - Handles sorting, filtering, pagination
     - Provides action buttons (view, edit, delete)
     - Supports custom cell renderers
     - Theme customization
     - Field rules and formatting

2. **`DynamicRecordsInspector.tsx`**
   - **Purpose:** Inspector component for examining dynamic records
   - **Functionality:**
     - Record inspection
     - Schema analysis
     - Debugging tools

3. **`cellRenderers.tsx`**
   - **Purpose:** Cell renderer utilities for dynamic records
   - **Key Imports:**
     - `React` - React library
     - `Typography` from Material-UI
     - `detectFieldType` from columnMappers
   - **Functions:**
     - `formatDate(value)` - Formats date values for display
     - `renderCellValue(value, fieldName, dateFields)` - Renders cell values with appropriate formatting
   - **Functionality:**
     - Date formatting
     - Null value handling
     - Text truncation
     - Type-specific rendering

4. **`columnMappers.ts`**
   - **Purpose:** Column mapping utilities for dynamic records
   - **Key Functions:**
     - `humanizeFieldName(fieldName)` - Converts field names to human-readable format
     - `isDateField(fieldName, sampleValues)` - Detects if a field is a date field
     - `inferColumnsFromRecords(records, options)` - Infers column structure from records
     - `mapFieldDefinitionsToDynamicColumns(recordType)` - Maps field definitions to dynamic columns
     - `detectFieldType(fieldName, sampleValues)` - Detects field type from samples
   - **Functionality:**
     - Column inference
     - Field name transformation
     - Type detection
     - Column mapping

5. **`index.ts`**
   - **Purpose:** Export file for dynamic module

6. **Backup Files:**
   - `DynamicRecordsDisplay.tsx.backup` - Backup of display component
   - `DynamicRecordsInspector.tsx.bak` - Backup of inspector component

---

#### `components/forms/`

**Purpose:** Form components and form builders for record management.

**Key Files:**

1. **`DynamicRecordForm.tsx`**
   - **Purpose:** Dynamic form component that works with any table schema using column positions
   - **Key Imports:**
     - `React, useMemo` - React hooks
     - `RecordsForm, RecordsModal` - Form components
     - `useDynamicRecordMutations, useFormFields, useDynamicDropdownOptions` - Custom hooks
   - **Functionality:**
     - Generates forms from table schema
     - Supports dropdown options
     - Handles create/update operations
     - Date field formatting
     - Validation

2. **`UnifiedRecordForm.tsx`**
   - **Purpose:** Unified form component that works across all record types
   - **Key Imports:**
     - `React, useMemo` - React hooks
     - `RecordsForm` - Base form component
     - `FormField, useUnifiedRecordMutations, useDropdownOptions` - Unified hooks
     - `RecordsModal` - Modal component
     - `FIELD_DEFINITIONS, RECORD_TYPES` - Constants
   - **Functionality:**
     - Consistent form interface across record types
     - Field definition mapping
     - Dropdown option integration
     - Form validation
     - Success/error handling

3. **`ModernDynamicRecordForm.tsx`**
   - **Purpose:** Modern implementation of dynamic record form
   - **Functionality:**
     - Enhanced UI/UX
     - Better performance
     - Advanced features

4. **`EnhancedDynamicForm.tsx`**
   - **Purpose:** Enhanced dynamic form with additional features
   - **Functionality:**
     - Advanced validation
     - Conditional fields
     - Enhanced UX

5. **`RecordsForm.tsx`**
   - **Purpose:** Base records form component
   - **Functionality:**
     - Form structure
     - Field rendering
     - Validation

6. **`RecordFormModal.tsx`**
   - **Purpose:** Modal wrapper for record forms
   - **Functionality:**
     - Modal display
     - Form integration
     - Close handling

7. **`FormBuilder.tsx`**
   - **Purpose:** Form builder component for creating custom forms
   - **Functionality:**
     - Dynamic form generation
     - Field configuration
     - Layout management

8. **`FormDialog.tsx`**
   - **Purpose:** Dialog component for forms
   - **Functionality:**
     - Dialog display
     - Form integration

9. **`FormLayouts.tsx`**
   - **Purpose:** Form layout components
   - **Functionality:**
     - Layout variants
     - Responsive layouts

10. **`FormHorizontal.tsx`** and **`FormVertical.tsx`**
    - **Purpose:** Horizontal and vertical form layouts
    - **Functionality:**
      - Layout options
      - Field arrangement

11. **`FormTabs.tsx`**
    - **Purpose:** Tabbed form component
    - **Functionality:**
      - Tab navigation
      - Form sections

12. **`FormValidation.tsx`**
    - **Purpose:** Form validation utilities
    - **Functionality:**
      - Validation rules
      - Error handling

13. **`FormLabelAlignment.tsx`**
    - **Purpose:** Label alignment component
    - **Functionality:**
      - Label positioning
      - Alignment options

14. **`FormSeparator.tsx`**
    - **Purpose:** Form separator component
    - **Functionality:**
      - Visual separation
      - Section dividers

15. **`FormCustom.tsx`** and **`FormCustomCode.tsx`**
    - **Purpose:** Custom form components
    - **Functionality:**
      - Custom form implementations
      - Code examples

16. **`CollapsibleForm.tsx`**
    - **Purpose:** Collapsible form sections
    - **Functionality:**
      - Expandable sections
      - Accordion-style forms

17. **`MetadataForm.tsx`**
    - **Purpose:** Form for editing metadata
    - **Functionality:**
      - Metadata fields
      - System information

18. **Form Input Components:**
    - `TextFormInput.tsx` - Text input component
    - `TextAreaFormInput.tsx` - Textarea input component
    - `SelectFormInput.tsx` - Select dropdown component
    - `PasswordFormInput.tsx` - Password input component
    - `DropzoneFormInput.tsx` - File upload component
    - `CustomFormLabel.tsx` - Custom label component

19. **Form Builder Variants:**
    - `FbBasicHeaderForm.tsx` - Basic header form
    - `FbDefaultForm.tsx` - Default form variant
    - `FbDisabledForm.tsx` - Disabled form variant
    - `FbLeftIconForm.tsx` - Left icon form
    - `FbOrdinaryForm.tsx` - Ordinary form
    - `FbReadonlyForm.tsx` - Read-only form
    - `FbRightIconForm.tsx` - Right icon form

20. **Utility Files:**
    - `formatTimestamp.ts` - Timestamp formatting utility
    - `performance.ts` - Performance utilities
    - `ProductPerformances.tsx` - Product performance component
    - `TopPerformerData.ts` - Top performer data
    - `UserFormModal.tsx` - User form modal
    - `index.ts` - Export file

---

#### `components/confirmation/`

**Purpose:** Confirmation modal components.

**Files:**

1. **`DeleteConfirmationModal.tsx`**
   - **Purpose:** Modal for confirming record deletion
   - **Functionality:**
     - Delete confirmation
     - Warning messages
     - Action buttons

2. **`index.ts`**
   - **Purpose:** Export file

---

#### `components/Theme/`

**Purpose:** Theme-related components.

**Files:**

1. **`ThemedLayout.tsx`**
   - **Purpose:** Themed layout component
   - **Functionality:**
     - Theme application
     - Layout styling

---

### Other Component Files

#### API and Client Files

1. **`components/api.ts`**
   - **Purpose:** Records API - Front-end helpers for dynamic records
   - **Key Functions:**
     - `fetchTables(churchId)` - Fetches available `*_records` tables for a church
     - `fetchRecords(churchId, table, options)` - Fetches records with columns, mapping, and pagination
     - `fetchRecordsEnhanced(churchId, table, options)` - Alternative method using enhanced records endpoint
   - **Functionality:**
     - Table discovery
     - Record fetching with pagination
     - Sorting and filtering support
     - Enhanced endpoint support

2. **`components/client.ts`**
   - **Purpose:** Field Mapper API Client - HTTP client with auth handling and error normalization
   - **Key Imports:**
     - None (standalone client)
   - **Key Classes:**
     - `FieldMapperApiError` - Custom error class for API errors
   - **Functions:**
     - `apiJson<T>(url, options)` - Generic API request function with authentication
   - **Functionality:**
     - Authentication token handling
     - Error normalization
     - JSON request/response handling
     - Network error handling

3. **`components/endpoints.ts`**
   - **Purpose:** Field Mapper API Endpoints - Centralized endpoint definitions
   - **Constants:**
     - `API_BASE` - Base API path
     - `endpoints` - Object with endpoint functions:
       - `columnSample(churchId, recordType)` - GET column samples
       - `getMapping(churchId, recordType)` - GET field mapping
       - `saveMapping(churchId, recordType)` - PUT field mapping
       - `knownFields(recordType)` - GET known fields
   - **Functionality:**
     - Centralized endpoint definitions
     - Type-safe endpoint generation

4. **`components/queries.ts`**
   - **Purpose:** Field Mapper Queries - TanStack Query hooks for field mapper operations
   - **Key Imports:**
     - `useQuery, useMutation, useQueryClient` from `@tanstack/react-query`
     - `apiJson` from `./client`
     - `endpoints` from `./endpoints`
     - Zod schemas: `KnownField, Column, FieldMapping, KnownFieldSchema, ColumnSchema, FieldMappingSchema`
     - `z` from `zod`
   - **Hooks:**
     - `useKnownFields(recordType)` - Fetches known fields for a record type
     - `useColumnSample(churchId, recordType)` - Fetches column samples
     - `useFieldMapping(churchId, recordType)` - Fetches field mapping
     - `useSaveFieldMapping(churchId, recordType)` - Saves field mapping
   - **Functionality:**
     - React Query integration
     - Caching and stale time management
     - Mutation handling
     - Schema validation with Zod

5. **`components/schemas.ts`**
   - **Purpose:** Field Mapper Schemas - Zod schemas and types for the field mapper module
   - **Key Imports:**
     - `z` from `zod`
   - **Schemas:**
     - `KnownFieldSchema` - Schema for known fields
     - `ColumnSchema` - Schema for columns
     - `MappingItemSchema` - Schema for mapping items
     - `FieldMappingSchema` - Schema for field mappings
   - **Types:**
     - `KnownField` - Known field type
     - `Column` - Column type
     - `MappingItem` - Mapping item type
     - `FieldMapping` - Field mapping type
   - **Functionality:**
     - Type-safe schema definitions
     - Runtime validation
     - Type inference

6. **`components/constants.ts`**
   - **Purpose:** Component-level constants
   - **Functionality:**
     - Shared constants
     - Configuration values

---

#### Utility Components

1. **`components/BulkOperations.tsx`**
   - **Purpose:** Component for bulk record operations
   - **Functionality:**
     - Bulk delete
     - Bulk update
     - Bulk export

2. **`components/CertificatePreviewer.tsx`**
   - **Purpose:** Component for previewing certificates
   - **Functionality:**
     - Certificate rendering
     - PDF preview

3. **`components/ColorLabel.tsx`**
   - **Purpose:** Color-coded label component
   - **Functionality:**
     - Color coding
     - Label display

4. **`components/ColorPaletteSelector/index.tsx`**
   - **Purpose:** Color palette selection component
   - **Functionality:**
     - Color selection
     - Palette management

5. **`components/ColorPickerPopover/index.tsx`**
   - **Purpose:** Color picker popover component
   - **Functionality:**
     - Color picking
     - Popover display

6. **`components/TableControlPanel/index.tsx`**
   - **Purpose:** Control panel for table operations
   - **Functionality:**
     - Table controls
     - Action buttons

7. **`components/RecordPreviewPane/index.tsx`**
   - **Purpose:** Preview pane for record details
   - **Functionality:**
     - Record preview
     - Detail display

8. **`components/AdvancedGridDialog/index.tsx`**
   - **Purpose:** Advanced grid dialog component
   - **Functionality:**
     - Grid configuration
     - Dialog display

9. **`components/FieldRenderer/index.tsx`**
   - **Purpose:** Field renderer component
   - **Functionality:**
     - Field display
     - Type-specific rendering

10. **`components/TypeBadge.tsx`**
    - **Purpose:** Badge component for record types
    - **Functionality:**
      - Type display
      - Badge styling

11. **`components/SubtleAlert.tsx`**
    - **Purpose:** Subtle alert component
    - **Functionality:**
      - Alert display
      - Notification system

12. **Various Slider Components:**
    - `CustomSlider.tsx`, `CustomRangeSlider.tsx` - Custom slider components
    - `DiscreteSlider.tsx` - Discrete slider
    - `VolumeSlider.tsx` - Volume slider
    - `RangeSlider.tsx` - Range slider
    - Various code example files for sliders

13. **Autocomplete Components:**
    - `FreeSoloAutocomplete.tsx` - Free solo autocomplete
    - `MultipleValuesAutocomplete.tsx` - Multiple values autocomplete
    - `MuiAutoComplete.tsx` - Material-UI autocomplete wrapper
    - `SizesAutocomplete.tsx` - Size autocomplete

14. **Icon Components:**
    - `BasicIcons.tsx` - Basic icon components
    - `BasicIconsCode.tsx` - Icon code examples

15. **Color Components:**
    - `Colors.tsx` - Color components
    - `ColorsCode.tsx` - Color code examples

16. **Form Validation:**
    - `FVOnLeave.tsx` - Form validation on leave
    - `OnLeaveCode.tsx` - On leave code examples

17. **Editor Components:**
    - `TiptapEditor.tsx` - TipTap rich text editor
    - `TiptapEdit.tsx` - TipTap edit component

18. **Other Utility Components:**
    - `Address.tsx` - Address component
    - `Position.tsx` - Position component
    - `Default.tsx`, `DefaultCode.tsx` - Default components
    - `DefaultLabel.tsx` - Default label
    - `DefaultsliderCode.tsx` - Default slider code
    - `Custom.tsx` - Custom component
    - Various code example files

---

### Index Files

- **`components/index.tsx`** - Main component export
- **`components/index.ts`** - Type exports
- **`components/records/index.ts`** - Records module exports
- **`components/forms/index.ts`** - Forms module exports
- **`components/baptism/index.ts`** and **`index.tsx`** - Baptism module exports
- **`components/marriage/index.ts`** - Marriage module exports
- **`components/dynamic/index.ts`** - Dynamic module exports
- **`components/confirmation/index.ts`** - Confirmation module exports
- Various other index files for subdirectories

---

## Services Directory

### `services/recordService.ts`

**Purpose:** Record Service for Orthodox Metrics - Placeholder implementation for record operations.

**Key Functions:**
- `createRecord(record)` - Creates a new record
- `updateRecord(id, record)` - Updates an existing record
- `deleteRecord(id)` - Deletes a record
- `getRecords(filters)` - Fetches records with optional filters

**Functionality:**
- Placeholder service implementation
- Console logging for debugging
- Basic CRUD operations
- Filter support

---

### `services/churchService.ts`

**Purpose:** Church Service for Orthodox Metrics - Placeholder implementation for church operations.

**Key Imports:**
- None (standalone service)

**Types:**
- `Church` interface - Church data structure

**Key Functions:**
- `fetchChurches()` - Fetches all churches
- `fetchChurchRecords(churchId, endpoint, filters)` - Fetches records for a specific church
- `getChurch(id)` - Gets a single church
- `createChurch(church)` - Creates a new church
- `updateChurch(id, church)` - Updates a church
- `deleteChurch(id)` - Deletes a church

**Functionality:**
- Placeholder service implementation
- Church CRUD operations
- Record fetching per church
- Filter support

---

## Schemas Directory

### `schemas/record-schemas.ts`

**Purpose:** Record Schemas for Orthodox Metrics - Placeholder implementation for record schema definitions.

**Key Types:**
- `RecordSchema` interface - Schema structure with id, name, and fields
- `RecordField` interface - Field structure with id, name, type, required flag, and options

**Key Functions:**
- `createRecordWithFields(recordType, fields)` - Creates a record schema with fields
- `getRecordSchema(recordType)` - Gets a record schema for a type

**Functionality:**
- Schema definition structure
- Field type definitions
- Schema creation utilities
- Placeholder implementation

---

## Constants Directory

### `constants/index.ts`

**Purpose:** Constants for records-centralized features - Field definitions and record type constants.

**Key Constants:**

1. **`FIELD_DEFINITIONS`** - Object containing field definitions for different record types:
   - `baptism` - Fields: name, date, location
   - `marriage` - Fields: brideName, groomName, date, location
   - `funeral` - Fields: name, date, location

2. **`RECORD_TYPES`** - Object with record type constants:
   - `BAPTISM: 'baptism'`
   - `MARRIAGE: 'marriage'`
   - `FUNERAL: 'funeral'`

**Functionality:**
- Centralized field definitions
- Record type constants
- Reusable across components

---

## Context Directory

### `context/AuthContext.tsx`

**Purpose:** Authentication context for records-centralized features.

**Key Imports:**
- `React, createContext, useContext` - React context API

**Types:**
- `AuthContextType` interface - Contains user and isAuthenticated flag

**Hooks:**
- `useAuth()` - Custom hook for accessing auth context

**Components:**
- `AuthProvider` - Context provider component

**Functionality:**
- Authentication state management
- User information
- Context-based auth access
- Placeholder implementation (returns null user and false isAuthenticated)

---

### `context/ThemeContext.tsx`

**Purpose:** Theme context for records-centralized features.

**Key Imports:**
- `React, createContext, useContext` - React context API

**Types:**
- `ThemeContextType` interface - Contains theme, themeConfig, and setTheme function

**Hooks:**
- `useTheme()` - Custom hook for accessing theme context

**Components:**
- `ThemeProvider` - Context provider component

**Functionality:**
- Theme state management
- Theme configuration
- Theme switching
- Placeholder implementation (empty theme object)

---

## Utils Directory

### `utils/devLogger.ts`

**Purpose:** Development Logger for Orthodox Metrics - Placeholder implementation for development logging.

**Key Functions:**
- `devLogStateChange(component, state)` - Logs state changes in development mode

**Functionality:**
- Development-only logging
- Component state tracking
- Console logging
- Environment-based activation (only in development)

---

## Component Import Documentation

This section provides detailed documentation of imports used in key components.

### BaptismRecordsPage.tsx Imports

1. **React Hooks:**
   - `React, useState, useEffect, useMemo, useCallback` - Core React functionality and hooks for state management, side effects, memoization, and callbacks

2. **React Router:**
   - `useLocation` - Hook for accessing current route location

3. **Material-UI Components:**
   - `Box` - Layout container component
   - `Paper` - Surface component for elevation
   - `Table, TableBody, TableCell, TableContainer, TableHead, TableRow` - Table components for data display
   - `TablePagination` - Pagination controls for tables
   - `TableSortLabel` - Sortable column headers
   - `TextField` - Text input component
   - `Button` - Button component
   - `Dialog, DialogTitle, DialogContent, DialogActions` - Dialog/modal components
   - `Typography` - Text typography component
   - `Chip` - Chip/badge component
   - `IconButton` - Icon button component
   - `MenuItem, Select, FormControl, InputLabel` - Select dropdown components
   - `Grid` - Grid layout system
   - `Alert` - Alert/notification component
   - `CircularProgress` - Loading spinner
   - `Tooltip` - Tooltip component
   - `Card, CardContent` - Card components
   - `Snackbar` - Snackbar notification
   - `Stack` - Stack layout component
   - `Divider` - Divider component
   - `Drawer` - Drawer/sidebar component
   - `Collapse` - Collapsible component

4. **Material-UI Icons:**
   - `Add, Edit, Delete` - Action icons
   - `Search, FilterList` - Search and filter icons
   - `GetApp` - Export/download icon
   - `Visibility` - View icon
   - `Palette` - Color/styling icon
   - `Settings` - Settings icon
   - `Lock, LockOpen` - Lock status icons
   - `TableChart` - Table icon
   - `ViewList` - List view icon
   - `ExpandLess` - Expand/collapse icon

5. **State Management:**
   - `useTableStyleStore` - Zustand store for table styling preferences

6. **API:**
   - `listRecords` - Function for fetching records from API
   - `TableKey, SortDir` - Type definitions for API parameters

7. **UI Components:**
   - `TableControlPanel` - Control panel for table operations
   - `ColorPaletteSelector` - Component for selecting color palettes
   - `AGGridViewOnly` - AG Grid view-only component
   - `ImportRecordsButton` - Button component for importing records
   - `AdvancedGridDialog` - Dialog for advanced grid configuration

8. **Types:**
   - `ChurchRecord` - Type definition for church records
   - `RecordType` - Type definition for record types

9. **Constants:**
   - `FIELD_DEFINITIONS` - Field definitions for record types
   - `RECORD_TYPES` - Record type constants

10. **Utilities:**
    - `DynamicRecordsDisplay` - Component for dynamic record display
    - `mapFieldDefinitionsToDynamicColumns` - Function for mapping field definitions to columns
    - `enhancedTableStore` - Store for enhanced table state

---

### DynamicRecordsManager.tsx Imports

1. **React:**
   - `React, useState, useMemo` - React core and hooks

2. **Material-UI:**
   - Layout: `Box, Paper`
   - Typography: `Typography`
   - Actions: `Button, IconButton`
   - Feedback: `Alert, CircularProgress, Tooltip`
   - Input: `Select, MenuItem, FormControl, InputLabel`
   - Display: `Chip`

3. **Material-UI Icons:**
   - `Add, Refresh, Download, Upload` - Action icons
   - `Lock, LockOpen` - Lock status icons
   - `TableChart, Settings` - Feature icons

4. **Custom Hooks:**
   - `useRecordTables` - Hook for discovering record tables
   - `useDynamicRecords` - Hook for fetching and managing records
   - `useDynamicRecordMutations` - Hook for create/update/delete operations
   - `useDynamicRecordImportExport` - Hook for import/export functionality
   - `useTableColumns` - Hook for column management
   - `useFormFields` - Hook for form field generation
   - `useSearchFilters` - Hook for search and filtering

5. **Components:**
   - `DynamicRecordForm` - Form component for records
   - `RecordsSearch` - Search component
   - `RecordsModal` - Modal component
   - `DynamicRecordsTable` - Table component

6. **Constants:**
   - `THEME_COLORS` - Theme color constants

---

### AgGridRecordsTable.tsx Imports

1. **React:**
   - `React, useMemo, useCallback, useRef, useEffect, useState` - React hooks

2. **AG Grid:**
   - `AgGridReact` - Main AG Grid React component
   - `ColDef, GridApi, ColumnApi, GridReadyEvent, CellValueChangedEvent, SelectionChangedEvent` - AG Grid types and event types

3. **Material-UI:**
   - `Box, Typography, Alert, CircularProgress, Button, Chip, Tooltip, IconButton` - UI components
   - `Refresh, Download, Settings` - Icons

4. **Unified Hooks:**
   - `useUnifiedRecords` - Unified records hook
   - `useUnifiedRecordMutations` - Unified mutations hook
   - `useAgGridConfig` - AG Grid configuration hook
   - `useTableSchema` - Table schema hook
   - `useFieldDefinitions` - Field definitions hook
   - `getCurrentTemplate` - Template getter function

5. **Types:**
   - `RecordData, RecordFilters, UnifiedTableSchema, AgGridConfig` - Type definitions

---

### DynamicRecordsDisplay.tsx Imports

1. **React:**
   - `React, useMemo, useState` - React hooks

2. **Material-UI Table:**
   - `Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TableSortLabel` - Table components

3. **Material-UI Layout:**
   - `Paper, Box, Grid, Card, CardContent` - Layout components

4. **Material-UI Actions:**
   - `IconButton, Tooltip, Menu, MenuItem, ListItemIcon, ListItemText` - Interactive components

5. **Material-UI Feedback:**
   - `CircularProgress` - Loading indicator
   - `Typography` - Text component
   - `Chip` - Badge component

6. **Material-UI Icons:**
   - `Visibility, Edit, Delete, MoreVert` - Action icons

7. **Utilities:**
   - `inferColumnsFromRecords` - Column inference function
   - `mapFieldDefinitionsToDynamicColumns` - Column mapping function
   - `renderCellValue` - Cell rendering function

---

### DynamicRecordForm.tsx Imports

1. **React:**
   - `React, useMemo` - React hooks

2. **Unified Components:**
   - `RecordsForm` - Base form component
   - `RecordsModal` - Modal wrapper

3. **Unified Hooks:**
   - `useDynamicRecordMutations` - Mutations hook
   - `useFormFields` - Form fields hook
   - `useDynamicDropdownOptions` - Dropdown options hook

---

### UnifiedRecordForm.tsx Imports

1. **React:**
   - `React, useMemo` - React hooks

2. **Form Components:**
   - `RecordsForm` - Base form component

3. **Unified Hooks:**
   - `FormField` - Form field type
   - `useUnifiedRecordMutations` - Unified mutations hook
   - `useDropdownOptions` - Dropdown options hook

4. **UI Components:**
   - `RecordsModal` - Modal component

5. **Constants:**
   - `FIELD_DEFINITIONS, RECORD_TYPES` - Field and type constants

---

### MarriageRecords.tsx Imports

1. **React:**
   - `React, useMemo, useState` - React hooks

2. **Material-UI:**
   - `Box, Typography, Button, Chip, IconButton, Tooltip, Alert, Paper` - UI components

3. **Material-UI Icons:**
   - `Add, Refresh, Download, Upload, Lock, LockOpen, History, PictureAsPdf, Favorite` - Icons

4. **Unified Components:**
   - `ModernDynamicRecordsManager, ModernDynamicRecordsTable, ModernDynamicRecordForm` - Modern components
   - `BulkOperations, AdvancedSearch, AuditTrail` - Feature components

5. **Unified Hooks:**
   - `useUnifiedRecords, useUnifiedRecordMutations, useRecordTableConfig, useAgGridConfig, useSearchableFields, useSortableFields` - Hooks

6. **Form:**
   - `UnifiedRecordForm` - Unified form component

7. **Constants:**
   - `RECORD_TYPES, FIELD_DEFINITIONS, THEME_COLORS` - Constants

---

### FuneralRecords.tsx Imports

Similar to MarriageRecords.tsx with:
- `LocalFlorist` icon instead of `Favorite`
- Same unified components and hooks structure

---

## Summary

The `records-centralized` feature is a comprehensive, well-organized module for managing church records. It provides:

1. **Modular Architecture:** Clear separation of concerns with dedicated directories for components, services, schemas, constants, context, and utilities.

2. **Dynamic Capabilities:** Components that automatically adapt to different table structures using column positions rather than field names.

3. **Unified Components:** Shared components and hooks that provide consistent functionality across all record types (Baptism, Marriage, Funeral).

4. **Advanced Features:** AG Grid integration, dynamic forms, import/export, bulk operations, advanced search, and audit trails.

5. **Type Safety:** Comprehensive TypeScript type definitions for all data structures and operations.

6. **Modern React Patterns:** Uses React hooks, context API, TanStack Query for data fetching, and modern state management.

7. **Extensibility:** Well-structured to support new record types and features through the unified component system.

This documentation provides a complete reference for understanding and working with the records-centralized feature module.

