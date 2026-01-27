# Complete Refactor Inventory & Implementation Plan

**Generated:** 2025-01-XX  
**Purpose:** Comprehensive inventory for moving feature-specific code into `front-end/src/features/*` with strict infrastructure-vs-feature separation and 2-3 build migration plan.

---

## 0. Executive Decision: Canonical Records Feature Root

**DECISION: `front-end/src/features/records-centralized/` is the canonical records feature root.**

### Reasoning:
1. **Active Route Usage**: All active routes in `Router.tsx` import from `records-centralized`:
   - `BaptismRecordsPage` → `features/records-centralized/components/baptism/BaptismRecordsPage`
   - `MarriageRecordsPage` → `features/records-centralized/components/marriage/MarriageRecordsPage`
   - `FuneralRecordsPage` → `features/records-centralized/components/death/FuneralRecordsPage`
   - `CentralizedRecordsPageWrapper` → `features/records-centralized/components/records/RecordsPageWrapper`

2. **Comprehensive Structure**: `records-centralized` has a complete feature structure:
   - `components/` (84 files: 55 tsx, 27 ts, 2 js)
   - `constants/`
   - `context/`
   - `services/`
   - `utils/`
   - `schemas/`

3. **Legacy Status**: `features/records/` appears to be an older/alternative implementation:
   - Contains `RecordsPage.tsx`, `EnhancedRecordsGrid.tsx`, and entry forms
   - Has a different structure (`apps/`, `baptism/`, `marriage/`, `funeral/` as top-level)
   - Only one route uses it: `/apps/church-management/:id/records` → `features/records/apps/church-management/RecordsPageWrapper`

4. **Consolidation Path**: Merge `features/records/` into `records-centralized/`:
   - Move `features/records/baptism/`, `marriage/`, `funeral/` entry forms → `records-centralized/components/forms/entry/`
   - Move `features/records/EnhancedRecordsGrid.tsx` → `records-centralized/components/grids/EnhancedRecordsGrid.tsx`
   - Move `features/records/apps/records-grid/` → `records-centralized/components/grids/legacy/`
   - Move `features/records/apps/records-ui/` → `records-centralized/views/apps/records-ui/`
   - Update the one route that uses `features/records/apps/church-management/RecordsPageWrapper` to use `records-centralized` version

### Duplicate Paths to Merge:
- `features/records/` → **DELETE after merge** (28 files total)
- `features/records/apps/church-management/RecordsPageWrapper.tsx` → Update route to use `records-centralized/components/records/RecordsPageWrapper.tsx`

---

## 1. Keep As-Is (Do Not Move)

These directories remain as foundational app infrastructure:

| Directory | Justification | Exceptions Found |
|-----------|---------------|------------------|
| `front-end/src/app/` | Core app configuration | None |
| `front-end/src/layouts/` | Shared layout components | None |
| `front-end/src/routes/` | Centralized route definitions | None |
| `front-end/src/theme/` | Global theme configuration | None |
| `front-end/src/types/` | Shared TypeScript types | None |
| `front-end/src/assets/` | Global assets | None |
| `front-end/src/utils/` | **General utilities only** (arrayUtils, logger, formatTimestamp, etc.) | None |
| `front-end/src/shared/` | **Shared UI components and utilities** used by 2+ unrelated features | None |
| `front-end/src/store/` | **Global state stores** | **EXCEPTION:** `store/enhancedTableStore.ts` - Used only by records-centralized. **RISK: MEDIUM** - See section 3 |
| `front-end/src/context/` | **Core contexts only** (AuthContext, CustomizerContext, MenuVisibilityContext, NotificationContext, WebSocketContext) | **EXCEPTIONS:** Feature-specific contexts should move (see section 2) |
| `front-end/src/config/` | Global configuration | None |
| `front-end/src/constants/` | Global constants | None |
| `front-end/src/services/` | **Global API clients/interceptors/auth session** (not feature-only services) | None (if exists) |

**Exceptions Requiring Action:**
1. `src/store/enhancedTableStore.ts` - Used by `records-centralized` components only. **Recommendation:** Move to `features/records-centralized/store/enhancedTableStore.ts` (see section 3).
2. `src/context/RecordsContext.tsx` - Records-specific, should move (see section 2).
3. `src/context/OCRContext/` - OCR-specific, should move (see section 2).
4. `src/context/ChurchRecordsContext.tsx` - Church-management-specific, should move (see section 2).

---

## 2. Refactor Targets: Move into `front-end/src/features/*`

### 2.1 Records Feature (`features/records-centralized/`)

| Current Path | Proposed Destination | Feature | Importers Count | Top Importers | Reason | Risk | Notes |
|-------------|---------------------|---------|----------------|--------------|--------|------|-------|
| `src/lib/recordsApi.ts` | `features/records-centralized/api/recordsApi.ts` | records | **~5-10** | `features/records-centralized/components/*`, `features/records/*` | Records-specific API service | LOW | Only used by records features |
| `src/lib/dynamicRecordsApi.ts` | `features/records-centralized/api/dynamicRecordsApi.ts` | records | **~3-5** | `features/records-centralized/components/dynamic/*` | Dynamic records API abstraction | LOW | Records-specific |
| `src/api/church-records.api.ts` | `features/records-centralized/api/churchRecordsApi.ts` | records | **~5-8** | `features/records-centralized/components/*`, `api/church-records.hooks.ts` | Church records CRUD API | LOW | Records-specific |
| `src/api/church-records.hooks.ts` | `features/records-centralized/hooks/useChurchRecords.ts` | records | **~3-5** | `features/records-centralized/components/*` | Records data hooks | LOW | Records-specific |
| `src/records/*` (15 files) | `features/records-centralized/components/legacy/` | records | **~2-3** | Legacy routes, old components | Legacy records implementation | MEDIUM | Old records implementation, consolidate |
| `src/components/records/*` (6 files) | `features/records-centralized/components/forms/` | records | **~5-8** | `features/records/baptism/*`, `features/records/marriage/*`, `features/records/funeral/*` | Record form/table components | LOW | Records-specific UI |
| `src/context/RecordsContext.tsx` | `features/records-centralized/context/RecordsContext.tsx` | records | **~3-5** | `features/records-centralized/components/*` | Records state context | LOW | Records-specific state |
| `src/components/RecordPreviewPane/` | `features/records-centralized/components/RecordPreviewPane/` | records | **~2-3** | `features/records/*`, `components/records/*` | Record preview component | LOW | Records-specific |
| `src/components/RecordGenerator.tsx` | `features/records-centralized/components/RecordGenerator.tsx` | records | **~1-2** | Admin/devel tools | Record generation utility | LOW | Records-specific |
| `src/schemas/record-schemas.ts` | `features/records-centralized/schemas/recordSchemas.ts` | records | **~5-10** | `features/records-centralized/components/*`, validation | Record validation schemas | LOW | Records-specific |
| `src/store/enhancedTableStore.ts` | `features/records-centralized/store/enhancedTableStore.ts` | records | **~2-3** | `features/records-centralized/components/baptism/BaptismRecordsPage.tsx`, `features/records-centralized/components/dynamic/DynamicRecordsInspector.tsx` | Table styling store | MEDIUM | Used only by records, but may be shared later. Move to feature for now. |
| `features/records/*` (28 files) | Merge into `features/records-centralized/` (see merge plan in section 0) | records | **~1-2** | One route: `/apps/church-management/:id/records` | Legacy/alternative implementation | MEDIUM | Merge into canonical root |

### 2.2 OCR Feature (`features/ocr/`)

| Current Path | Proposed Destination | Feature | Importers Count | Top Importers | Reason | Risk | Notes |
|-------------|---------------------|---------|----------------|--------------|--------|------|-------|
| `src/lib/useOcrJobs.ts` | `features/ocr/hooks/useOcrJobs.ts` | ocr | **~3-5** | `features/ocr/pages/*`, `features/devel-tools/om-ocr/*` | OCR jobs management hook | LOW | OCR-specific |
| `src/lib/useOcrSettings.ts` | `features/ocr/hooks/useOcrSettings.ts` | ocr | **~2-3** | `features/ocr/pages/*`, `features/devel-tools/om-ocr/*` | OCR settings hook | LOW | OCR-specific |
| `src/lib/useOcrTests.ts` | `features/ocr/hooks/useOcrTests.ts` | ocr | **~1-2** | `features/devel-tools/om-ocr/*` | OCR testing hook | LOW | OCR-specific |
| `src/context/OCRContext/` | `features/ocr/context/OCRContext.tsx` | ocr | **~3-5** | `features/ocr/pages/*`, `features/devel-tools/om-ocr/*` | OCR state context | LOW | OCR-specific state |
| `src/components/UploadTokenManager.tsx` | `features/ocr/components/UploadTokenManager.tsx` | ocr | **~1-2** | Admin/OCR pages | OCR upload token management | MEDIUM | May be used by admin, verify usage |

### 2.3 Church Management Feature (`features/church-management/`)

| Current Path | Proposed Destination | Feature | Importers Count | Top Importers | Reason | Risk | Notes |
|-------------|---------------------|---------|----------------|--------------|--------|------|-------|
| `src/lib/churchService.ts` | `features/church-management/services/churchService.ts` | church-management | **~5-10** | `features/church/*`, `features/admin/*` | Church CRUD service | LOW | Church-specific |
| `src/lib/liturgicalService.ts` | `features/church-management/services/liturgicalService.ts` | church-management | **~3-5** | `features/church/*`, `features/records-centralized/*` (may be shared) | Liturgical calendar service | MEDIUM | May be shared with records, verify usage |
| `src/lib/orthodoxCalendarService.ts` | `features/church-management/services/orthodoxCalendarService.ts` | church-management | **~3-5** | `features/church/*`, `lib/useOrthodoxCalendar.ts` | Orthodox calendar service | MEDIUM | May be shared, verify |
| `src/lib/useCalendarData.ts` | `features/church-management/hooks/useCalendarData.ts` | church-management | **~2-3** | `features/church/*`, calendar components | Calendar data hook | LOW | Church/calendar-specific |
| `src/lib/useLiturgicalCalendar.ts` | `features/church-management/hooks/useLiturgicalCalendar.ts` | church-management | **~2-3** | `features/church/*` | Liturgical calendar hook | LOW | Church-specific |
| `src/lib/useOrthodoxCalendar.ts` | `features/church-management/hooks/useOrthodoxCalendar.ts` | church-management | **~2-3** | `features/church/*` | Orthodox calendar hook | LOW | Church-specific |
| `src/context/ChurchRecordsContext.tsx` | `features/church-management/context/ChurchRecordsContext.tsx` | church-management | **~3-5** | `features/church/*`, `features/records-centralized/*` (may overlap) | Church records context | MEDIUM | May overlap with records feature |
| `src/context/ChurchRecordsProvider.tsx` | `features/church-management/context/ChurchRecordsProvider.tsx` | church-management | **~2-3** | `features/church/*` | Church records provider | MEDIUM | May overlap with records feature |
| `src/components/calendar/*` (4 files) | `features/church-management/components/calendar/` | church-management | **~2-3** | `features/church/*` | Calendar UI components | LOW | Church/calendar-specific |
| `features/church/*` (22 files) | Rename/consolidate into `features/church-management/` | church-management | **~5-10** | Routes, admin pages | Church management feature | LOW | Consolidate naming |

### 2.4 Admin Feature (`features/admin/`)

| Current Path | Proposed Destination | Feature | Importers Count | Top Importers | Reason | Risk | Notes |
|-------------|---------------------|---------|----------------|--------------|--------|------|-------|
| `src/components/admin/*` (33 files) | `features/admin/components/` | admin | **~10-15** | `features/admin/*`, routes | Admin UI components | LOW | Admin-specific components |
| `src/lib/adminService.ts` | `features/admin/services/adminService.ts` | admin | **~5-8** | `features/admin/*` | Admin service | LOW | Admin-specific |
| `src/lib/useLogFilter.ts` | `features/admin/hooks/useLogFilter.ts` | admin | **~2-3** | `features/admin/*`, `features/devel-tools/*` (may be shared) | Log filtering hook | MEDIUM | May be devel-tools, verify usage |
| `src/lib/useLogStats.ts` | `features/admin/hooks/useLogStats.ts` | admin | **~2-3** | `features/admin/*`, `features/devel-tools/*` (may be shared) | Log statistics hook | MEDIUM | May be devel-tools, verify |
| `src/lib/useLogStream.ts` | `features/admin/hooks/useLogStream.ts` | admin | **~2-3** | `features/admin/*`, `features/devel-tools/*` (may be shared) | Log streaming hook | MEDIUM | May be devel-tools, verify |
| `src/lib/useClientManagement.ts` | `features/admin/hooks/useClientManagement.ts` | admin | **~2-3** | `features/admin/*` | Client management hook | MEDIUM | May be devel-tools, verify |
| `src/lib/useProfileSync.ts` | `features/admin/hooks/useProfileSync.ts` | admin | **~2-3** | `features/admin/*`, `features/apps/user-profile/*` (may be shared) | Profile sync hook | MEDIUM | May be user-profile feature, verify |
| `src/api/admin.api.ts` | `features/admin/api/adminApi.ts` | admin | **~5-8** | `features/admin/*` | Admin API service | LOW | Admin-specific |

### 2.5 Development Tools Feature (`features/devel-tools/`)

| Current Path | Proposed Destination | Feature | Importers Count | Top Importers | Reason | Risk | Notes |
|-------------|---------------------|---------|----------------|--------------|--------|------|-------|
| `src/ai/*` (all files) | `features/devel-tools/ai/` | devel-tools | **~2-3** | `features/devel-tools/*` | AI/ML development tools | LOW | Dev tools for AI features |
| `src/omai/*` (5 files) | `features/devel-tools/omai/` | devel-tools | **~2-3** | `features/devel-tools/*` | OMAI knowledge system | LOW | Dev tool |
| `src/tools/*` (all files) | `features/devel-tools/tools/` | devel-tools | **~3-5** | `features/devel-tools/*`, routes | Development utilities | LOW | Dev tools |
| `src/lib/useComponentRegistry.ts` | `features/devel-tools/hooks/useComponentRegistry.ts` | devel-tools | **~3-5** | `features/devel-tools/*`, `lib/om-ai/editorBridge.ts` | Component registry hook | LOW | Dev tool |
| `src/lib/useInspectorState.ts` | `features/devel-tools/hooks/useInspectorState.ts` | devel-tools | **~2-3** | `features/devel-tools/*` | Inspector state hook | LOW | Dev tool |
| `src/lib/om-ai/editorBridge.ts` | `features/devel-tools/om-ai/editorBridge.ts` | devel-tools | **~2-3** | `features/devel-tools/*` | OMAI editor bridge | LOW | Dev tool |
| `src/components/ComponentInspector.tsx` | `features/devel-tools/components/ComponentInspector.tsx` | devel-tools | **~1-2** | `features/devel-tools/*` | Component inspector UI | LOW | Dev tool |
| `src/components/registry/*` | `features/devel-tools/components/registry/` | devel-tools | **~2-3** | `features/devel-tools/*` | Component registry UI | LOW | Dev tool |
| `src/components/terminal/*` | `features/devel-tools/components/terminal/` | devel-tools | **~1-2** | `features/devel-tools/*` | Terminal UI | LOW | Dev tool |
| `src/components/ui-tools/*` | `features/devel-tools/components/ui-tools/` | devel-tools | **~3-5** | `features/devel-tools/*` | UI development tools | LOW | Dev tool |
| `src/components/VisualRegressionDashboard.tsx` | `features/devel-tools/components/VisualRegressionDashboard.tsx` | devel-tools | **~1-2** | `features/devel-tools/*` | VRT dashboard | LOW | Dev tool |
| `src/components/VRTSettingsPanel.tsx` | `features/devel-tools/components/VRTSettingsPanel.tsx` | devel-tools | **~1-2** | `features/devel-tools/*` | VRT settings | LOW | Dev tool |
| `src/components/GitOpsPanel.tsx` | `features/devel-tools/components/GitOpsPanel.tsx` | devel-tools | **~1-2** | `features/devel-tools/*` | GitOps UI | LOW | Dev tool |
| `src/modules/OMLearn/*` | `features/devel-tools/omlearn/` OR `features/omlearn/` | devel-tools or new | **~2-3** | Routes, admin pages | OMLearn module | MEDIUM | Could be standalone feature |

### 2.6 Apps Feature (`features/apps/`)

| Current Path | Proposed Destination | Feature | Importers Count | Top Importers | Reason | Risk | Notes |
|-------------|---------------------|---------|----------------|--------------|--------|------|-------|
| `src/lib/apps/*` (12 files) | `features/apps/api/` (one file per app) | apps | **~10-15** | `features/apps/*`, `components/apps/*` | App-specific API services | LOW | Apps feature APIs |
| `src/context/BlogContext/` | `features/apps/blog/context/BlogContext.tsx` | apps | **~2-3** | `features/apps/blog/*` | Blog state context | LOW | Blog app |
| `src/context/ChatContext/` | `features/apps/chat/context/ChatContext.tsx` | apps | **~2-3** | `features/apps/chat/*` | Chat state context | LOW | Chat app |
| `src/context/EcommerceContext/` | `features/apps/ecommerce/context/EcommerceContext.tsx` | apps | **~2-3** | `features/apps/ecommerce/*` | Ecommerce state context | LOW | Ecommerce app |
| `src/context/EmailContext/` | `features/apps/email/context/EmailContext.tsx` | apps | **~2-3** | `features/apps/email/*` | Email state context | LOW | Email app |
| `src/context/InvoiceContext/` | `features/apps/invoice/context/InvoiceContext.tsx` | apps | **~2-3** | `features/apps/invoice/*` | Invoice state context | LOW | Invoice app |
| `src/context/NotesContext/` | `features/apps/notes/context/NotesContext.tsx` | apps | **~2-3** | `features/apps/notes/*` | Notes state context | LOW | Notes app |
| `src/context/TicketContext/` | `features/apps/tickets/context/TicketContext.tsx` | apps | **~2-3** | `features/apps/tickets/*` | Ticket state context | LOW | Tickets app |
| `src/context/kanbancontext/` | `features/apps/kanban/context/KanbanContext.tsx` | apps | **~2-3** | `features/apps/kanban/*` | Kanban state context | LOW | Kanban app |
| `src/context/ConatactContext/` | `features/apps/contacts/context/ContactContext.tsx` | apps | **~2-3** | `features/apps/contacts/*` | Contact state context | LOW | Contacts app (fix typo) |
| `src/context/UserDataContext/` | `features/apps/user-profile/context/UserDataContext.tsx` | apps | **~2-3** | `features/apps/user-profile/*` | User data context | MEDIUM | May be shared, verify |

### 2.7 Headlines Feature (`features/headlines/`)

| Current Path | Proposed Destination | Feature | Importers Count | Top Importers | Reason | Risk | Notes |
|-------------|---------------------|---------|----------------|--------------|--------|------|-------|
| `src/components/headlines/*` | `features/headlines/components/` | headlines | **~2-3** | `features/headlines/*`, admin pages | Headlines UI components | LOW | Headlines-specific |

### 2.8 Field Renderer (Shared vs Feature-Local)

| Current Path | Proposed Destination | Feature | Importers Count | Top Importers | Reason | Risk | Notes |
|-------------|---------------------|---------|----------------|--------------|--------|------|-------|
| `src/components/FieldRenderer/` | `features/records-centralized/components/FieldRenderer/` OR `src/shared/components/FieldRenderer/` | records or shared | **~5-10** | `features/records-centralized/*`, `features/records/*`, `features/church/*` | Field rendering component | MEDIUM | Used by records but may be shared. **VERIFY USAGE** - If used by 2+ unrelated features, keep in shared. |

---

## 3. Shared vs Feature-Local Candidates

These items are currently in global folders but appear to be used by only one feature:

| Current Path | Importers Count | Top Importers | Recommendation | New Path |
|-------------|----------------|---------------|----------------|----------|
| `src/lib/recordsApi.ts` | **~5-10** | `features/records-centralized/components/*`, `features/records/*` | Move to records feature | `features/records-centralized/api/recordsApi.ts` |
| `src/lib/dynamicRecordsApi.ts` | **~3-5** | `features/records-centralized/components/dynamic/*` | Move to records feature | `features/records-centralized/api/dynamicRecordsApi.ts` |
| `src/lib/churchService.ts` | **~5-10** | `features/church/*`, `features/admin/*` | Move to church-management feature | `features/church-management/services/churchService.ts` |
| `src/lib/useOcrJobs.ts` | **~3-5** | `features/ocr/pages/*`, `features/devel-tools/om-ocr/*` | Move to OCR feature | `features/ocr/hooks/useOcrJobs.ts` |
| `src/lib/useOcrSettings.ts` | **~2-3** | `features/ocr/pages/*`, `features/devel-tools/om-ocr/*` | Move to OCR feature | `features/ocr/hooks/useOcrSettings.ts` |
| `src/lib/useOcrTests.ts` | **~1-2** | `features/devel-tools/om-ocr/*` | Move to OCR feature | `features/ocr/hooks/useOcrTests.ts` |
| `src/lib/useComponentRegistry.ts` | **~3-5** | `features/devel-tools/*`, `lib/om-ai/editorBridge.ts` | Move to devel-tools feature | `features/devel-tools/hooks/useComponentRegistry.ts` |
| `src/lib/useInspectorState.ts` | **~2-3** | `features/devel-tools/*` | Move to devel-tools feature | `features/devel-tools/hooks/useInspectorState.ts` |
| `src/lib/useCalendarData.ts` | **~2-3** | `features/church/*`, calendar components | Move to church-management feature | `features/church-management/hooks/useCalendarData.ts` |
| `src/lib/useLiturgicalCalendar.ts` | **~2-3** | `features/church/*` | Move to church-management feature | `features/church-management/hooks/useLiturgicalCalendar.ts` |
| `src/lib/useOrthodoxCalendar.ts` | **~2-3** | `features/church/*` | Move to church-management feature | `features/church-management/hooks/useOrthodoxCalendar.ts` |
| `src/store/enhancedTableStore.ts` | **~2-3** | `features/records-centralized/components/baptism/BaptismRecordsPage.tsx`, `features/records-centralized/components/dynamic/DynamicRecordsInspector.tsx` | Move to records feature | `features/records-centralized/store/enhancedTableStore.ts` |
| `src/lib/liturgicalService.ts` | **~3-5** | `features/church/*`, `features/records-centralized/*` (may be shared) | **VERIFY** - If used by both church and records, consider `src/shared/services/liturgicalService.ts` OR move to church-management and have records import from there | `features/church-management/services/liturgicalService.ts` OR `src/shared/services/liturgicalService.ts` |
| `src/lib/orthodoxCalendarService.ts` | **~3-5** | `features/church/*`, `lib/useOrthodoxCalendar.ts` | Move to church-management feature | `features/church-management/services/orthodoxCalendarService.ts` |
| `src/lib/useLogFilter.ts` | **~2-3** | `features/admin/*`, `features/devel-tools/*` (may be shared) | **VERIFY** - If used by both, move to `src/shared/hooks/` OR move to admin and have devel-tools import from there | `features/admin/hooks/useLogFilter.ts` OR `src/shared/hooks/useLogFilter.ts` |
| `src/lib/useLogStats.ts` | **~2-3** | `features/admin/*`, `features/devel-tools/*` (may be shared) | **VERIFY** - Same as useLogFilter | `features/admin/hooks/useLogStats.ts` OR `src/shared/hooks/useLogStats.ts` |
| `src/lib/useLogStream.ts` | **~2-3** | `features/admin/*`, `features/devel-tools/*` (may be shared) | **VERIFY** - Same as useLogFilter | `features/admin/hooks/useLogStream.ts` OR `src/shared/hooks/useLogStream.ts` |
| `src/lib/useClientManagement.ts` | **~2-3** | `features/admin/*` | Move to admin feature | `features/admin/hooks/useClientManagement.ts` |
| `src/lib/useProfileSync.ts` | **~2-3** | `features/admin/*`, `features/apps/user-profile/*` (may be shared) | **VERIFY** - If used by both, move to `src/shared/hooks/` | `features/admin/hooks/useProfileSync.ts` OR `src/shared/hooks/useProfileSync.ts` |

---

## 4. Circular Dependencies and Barrel Export Hazards

### 4.1 Suspected Circular Dependencies

| Cycle | Evidence | Recommended Fix |
|-------|----------|----------------|
| **records-centralized/index.ts → components/index.ts → components/records/index.ts → ...** | Barrel export chain: `records-centralized/index.ts` exports from `components/`, which exports from `records/`, `forms/`, etc. If any component imports from parent barrel, cycle occurs. | **Remove barrel exports** - Replace with direct imports. Only allow barrels for types/constants. |
| **records-centralized/components → records-centralized/services → records-centralized/components** | If components import services that import components (e.g., service uses a component for rendering). | **Break cycle:** Services should not import components. Move shared types to `types/`, move rendering logic to components only. |
| **features/records-centralized → src/store/enhancedTableStore → features/records-centralized** | `enhancedTableStore.ts` is in `src/store/` but only used by records. If store imports from records, cycle. | **Move store to feature:** `features/records-centralized/store/enhancedTableStore.ts` |
| **lib/recordsApi → features/records-centralized/components → lib/recordsApi** | If components import recordsApi and recordsApi imports something from components. | **Break cycle:** API should not import components. Move shared types to `types/` or feature `types/`. |

### 4.2 Barrel Export Hazards

| File | Exports | Violates Policy? | Recommended Fix |
|------|---------|------------------|-----------------|
| `features/records-centralized/index.ts` | `export * from './components'`, `export * from './hooks'`, `export * from './services'`, `export * from './types'`, `export * from './utils'`, `export * from './constants'` | **YES** - Exports React components, hooks, services | **REMOVE** - Replace with direct imports. Only keep if it exports ONLY types/constants. |
| `features/records-centralized/components/index.ts` | `export * from './records'`, `export * from './forms'`, `export * from './entries'`, `export * from './baptism'`, `export * from './marriage'`, `export * from './death'`, etc. | **YES** - Exports React components | **REMOVE** - Replace with direct imports. |
| `features/records-centralized/constants/index.ts` | Exports `FIELD_DEFINITIONS`, `RECORD_TYPES` | **NO** - Only exports constants | **KEEP** - This is allowed (types/constants only) |
| `features/records/apps/records/components/index.ts` | Likely exports React components | **YES** - If exports components | **REMOVE** - Replace with direct imports. |

### 4.3 Recommended Fixes

1. **Remove Component/Hook/Service Barrels:**
   - Delete `features/records-centralized/index.ts` (or convert to types/constants only)
   - Delete `features/records-centralized/components/index.ts`
   - Delete any `index.ts` that exports React components, hooks, or services
   - Replace all imports from these barrels with direct file imports

2. **Break Import Cycles:**
   - **Services → Components:** Services should never import components. Move rendering logic to components.
   - **Pages → Contexts → Services → Pages:** Enforce one-way flow: pages → components → hooks → services → api
   - **Feature A → Feature B internals:** Features should only import from other features' public APIs (types/constants), never internals

3. **Shared Types/Constants:**
   - Move truly shared types to `src/types/`
   - Move feature-specific types to `features/{feature}/types/`
   - Allow barrels ONLY for types/constants (e.g., `features/records-centralized/types/index.ts`)

4. **Public API Modules (if needed):**
   - Only create public API modules if exporting types/constants
   - Example: `features/records-centralized/public.ts` (exports types only, no components)

---

## 5. Proposed Target Feature Folder Structures

### 5.1 Records Feature (`features/records-centralized/`)

```
features/records-centralized/
├── api/
│   ├── recordsApi.ts (from src/lib/recordsApi.ts)
│   ├── dynamicRecordsApi.ts (from src/lib/dynamicRecordsApi.ts)
│   └── churchRecordsApi.ts (from src/api/church-records.api.ts)
├── components/
│   ├── baptism/
│   │   └── BaptismRecordsPage.tsx
│   ├── marriage/
│   │   └── MarriageRecordsPage.tsx
│   ├── death/
│   │   └── FuneralRecordsPage.tsx
│   ├── dynamic/
│   │   ├── DynamicRecordsDisplay.tsx
│   │   ├── AdvancedRecordsGrid.tsx
│   │   ├── DynamicRecordsInspector.tsx
│   │   ├── columnMappers.ts
│   │   ├── cellRenderers.tsx
│   │   ├── columnWidthHelper.ts
│   │   └── buildColGroup.tsx
│   ├── forms/
│   │   ├── entry/
│   │   │   ├── BaptismRecordEntryForm.tsx (from features/records/baptism/)
│   │   │   ├── MarriageRecordEntryForm.tsx (from features/records/marriage/)
│   │   │   └── FuneralRecordEntryForm.tsx (from features/records/funeral/)
│   │   └── (existing form components)
│   ├── records/
│   │   ├── RecordsPageWrapper.tsx
│   │   ├── RecordList.tsx
│   │   └── (existing record components)
│   ├── grids/
│   │   ├── EnhancedRecordsGrid.tsx (from features/records/EnhancedRecordsGrid.tsx)
│   │   └── legacy/ (from features/records/apps/records-grid/)
│   ├── views/
│   │   └── apps/
│   │       ├── records/RecordsUIPage.tsx (from features/records/apps/records-ui/)
│   │       └── (other views)
│   ├── RecordPreviewPane/ (from src/components/RecordPreviewPane/)
│   ├── RecordGenerator.tsx (from src/components/RecordGenerator.tsx)
│   ├── FieldRenderer/ (if records-only, from src/components/FieldRenderer/)
│   └── legacy/ (from src/records/*, src/components/records/*)
├── hooks/
│   └── useChurchRecords.ts (from src/api/church-records.hooks.ts)
├── context/
│   ├── RecordsContext.tsx (from src/context/RecordsContext.tsx)
│   ├── AuthContext.tsx (existing)
│   └── ThemeContext.tsx (existing)
├── services/
│   ├── recordService.ts (existing)
│   └── churchService.ts (existing, may duplicate with church-management)
├── store/
│   └── enhancedTableStore.ts (from src/store/enhancedTableStore.ts)
├── schemas/
│   └── recordSchemas.ts (from src/schemas/record-schemas.ts)
├── types/
│   └── recordTypes.ts (extract shared types)
└── utils/
    └── devLogger.ts (existing)
```

**Note:** Normal vs Advanced split:
- **Normal:** `components/dynamic/DynamicRecordsDisplay.tsx` (MUI Table)
- **Advanced:** `components/dynamic/AdvancedRecordsGrid.tsx` (AG Grid)

### 5.2 OCR Feature (`features/ocr/`)

```
features/ocr/
├── api/
│   └── ocrApi.ts (if exists)
├── components/
│   ├── OCRUploader.tsx (existing)
│   ├── OCRResults.tsx (existing)
│   └── UploadTokenManager.tsx (from src/components/UploadTokenManager.tsx)
├── hooks/
│   ├── useOcrJobs.ts (from src/lib/useOcrJobs.ts)
│   ├── useOcrSettings.ts (from src/lib/useOcrSettings.ts)
│   └── useOcrTests.ts (from src/lib/useOcrTests.ts)
├── context/
│   └── OCRContext.tsx (from src/context/OCRContext/)
├── types/
│   └── ocrTypes.ts
└── utils/
    └── ocrUtils.ts
```

### 5.3 Church Management Feature (`features/church-management/`)

```
features/church-management/
├── api/
│   └── churchApi.ts (if exists)
├── components/
│   ├── church-management/ (from features/church/apps/church-management/)
│   ├── calendar/ (from src/components/calendar/)
│   └── FieldMapperPage.tsx (from features/church/FieldMapperPage.tsx)
├── hooks/
│   ├── useCalendarData.ts (from src/lib/useCalendarData.ts)
│   ├── useLiturgicalCalendar.ts (from src/lib/useLiturgicalCalendar.ts)
│   └── useOrthodoxCalendar.ts (from src/lib/useOrthodoxCalendar.ts)
├── context/
│   ├── ChurchRecordsContext.tsx (from src/context/ChurchRecordsContext.tsx)
│   └── ChurchRecordsProvider.tsx (from src/context/ChurchRecordsProvider.tsx)
├── services/
│   ├── churchService.ts (from src/lib/churchService.ts)
│   ├── liturgicalService.ts (from src/lib/liturgicalService.ts, if not shared)
│   └── orthodoxCalendarService.ts (from src/lib/orthodoxCalendarService.ts)
├── types/
│   └── churchTypes.ts
└── utils/
    └── churchUtils.ts
```

### 5.4 Admin Feature (`features/admin/`)

```
features/admin/
├── api/
│   └── adminApi.ts (from src/api/admin.api.ts)
├── components/
│   └── (all from src/components/admin/*)
├── hooks/
│   ├── useLogFilter.ts (from src/lib/useLogFilter.ts, if admin-only)
│   ├── useLogStats.ts (from src/lib/useLogStats.ts, if admin-only)
│   ├── useLogStream.ts (from src/lib/useLogStream.ts, if admin-only)
│   ├── useClientManagement.ts (from src/lib/useClientManagement.ts)
│   └── useProfileSync.ts (from src/lib/useProfileSync.ts, if admin-only)
├── services/
│   └── adminService.ts (from src/lib/adminService.ts)
├── types/
│   └── adminTypes.ts
└── utils/
    └── adminUtils.ts
```

### 5.5 Development Tools Feature (`features/devel-tools/`)

```
features/devel-tools/
├── ai/
│   ├── git/ (from src/ai/git/)
│   ├── learning/ (from src/ai/learning/)
│   ├── visualTesting/ (from src/ai/visualTesting/)
│   └── vrt/ (from src/ai/vrt/)
├── omai/
│   ├── cli/ (from src/omai/cli/)
│   └── knowledge/ (from src/omai/knowledge/)
├── tools/
│   ├── om-deps/ (from src/tools/om-deps/)
│   ├── omls/ (from src/tools/omls/)
│   └── omtrace/ (from src/tools/omtrace/)
├── omlearn/ (from src/modules/OMLearn/)
├── components/
│   ├── ComponentInspector.tsx (from src/components/ComponentInspector.tsx)
│   ├── VisualRegressionDashboard.tsx (from src/components/VisualRegressionDashboard.tsx)
│   ├── VRTSettingsPanel.tsx (from src/components/VRTSettingsPanel.tsx)
│   ├── GitOpsPanel.tsx (from src/components/GitOpsPanel.tsx)
│   ├── registry/ (from src/components/registry/)
│   ├── terminal/ (from src/components/terminal/)
│   └── ui-tools/ (from src/components/ui-tools/)
├── hooks/
│   ├── useComponentRegistry.ts (from src/lib/useComponentRegistry.ts)
│   └── useInspectorState.ts (from src/lib/useInspectorState.ts)
├── om-ai/
│   └── editorBridge.ts (from src/lib/om-ai/editorBridge.ts)
└── utils/
    └── develUtils.ts
```

### 5.6 Apps Feature (`features/apps/`)

```
features/apps/
├── blog/
│   ├── api/ (from src/lib/apps/blog.ts)
│   ├── components/ (existing)
│   └── context/
│       └── BlogContext.tsx (from src/context/BlogContext/)
├── chat/
│   ├── api/ (from src/lib/apps/chat.ts)
│   ├── components/ (existing)
│   └── context/
│       └── ChatContext.tsx (from src/context/ChatContext/)
├── contacts/
│   ├── api/ (from src/lib/apps/contact.ts)
│   ├── components/ (existing)
│   └── context/
│       └── ContactContext.tsx (from src/context/ConatactContext/, fix typo)
├── ecommerce/
│   ├── api/ (from src/lib/apps/eCommerce.ts)
│   ├── components/ (existing)
│   └── context/
│       └── EcommerceContext.tsx (from src/context/EcommerceContext/)
├── email/
│   ├── api/ (from src/lib/apps/email.ts)
│   ├── components/ (existing)
│   └── context/
│       └── EmailContext.tsx (from src/context/EmailContext/)
├── invoice/
│   ├── api/ (from src/lib/apps/invoice.ts)
│   ├── components/ (existing)
│   └── context/
│       └── InvoiceContext.tsx (from src/context/InvoiceContext/)
├── kanban/
│   ├── api/ (from src/lib/apps/kanban.ts)
│   ├── components/ (existing)
│   └── context/
│       └── KanbanContext.tsx (from src/context/kanbancontext/, fix naming)
├── notes/
│   ├── api/ (from src/lib/apps/notes.ts)
│   ├── components/ (existing)
│   └── context/
│       └── NotesContext.tsx (from src/context/NotesContext/)
├── tickets/
│   ├── api/ (from src/lib/apps/ticket.ts)
│   ├── components/ (existing)
│   └── context/
│       └── TicketContext.tsx (from src/context/TicketContext/)
└── user-profile/
    ├── api/ (from src/lib/apps/userProfile.ts)
    ├── components/ (existing)
    └── context/
        └── UserDataContext.tsx (from src/context/UserDataContext/, if app-specific)
```

### 5.7 Headlines Feature (`features/headlines/`)

```
features/headlines/
├── components/
│   └── (from src/components/headlines/*)
└── utils/
    └── headlinesUtils.ts
```

---

## 6. Implementation Plan (2-3 Builds Total)

### Import Direction Policy (Enforced)

**Allowed Import Directions:**
1. **App Infrastructure → Routes → Features → Feature Internals**
   - `src/routes/` can import from `features/{feature}/pages/` or `features/{feature}/components/`
   - `features/{feature}/pages/` can import from `features/{feature}/components/`, `features/{feature}/hooks/`
   - `features/{feature}/components/` can import from `features/{feature}/hooks/`, `features/{feature}/api/`, `features/{feature}/types/`
   - `features/{feature}/hooks/` can import from `features/{feature}/api/`, `features/{feature}/types/`
   - `features/{feature}/api/` can import from `features/{feature}/types/`, `src/shared/lib/apiClient`

**Forbidden Import Directions:**
- ❌ `features/{feature}/services/` importing `features/{feature}/components/`
- ❌ `features/{feature}/context/` importing `features/{feature}/pages/`
- ❌ `features/{feature}/api/` importing `features/{feature}/components/`
- ❌ `features/{featureA}/` importing `features/{featureB}/components/` (only types/constants allowed)

### Phase A: Preparation (No Build)

**Goal:** Create destinations, confirm import graph, decide canonical records root, remove barrel exports.

- [ ] **Step A.1:** Create all feature subdirectories
  ```bash
  # Records
  mkdir -p front-end/src/features/records-centralized/{api,hooks,store,types}
  
  # OCR
  mkdir -p front-end/src/features/ocr/{api,hooks,context,types,utils}
  
  # Church Management
  mkdir -p front-end/src/features/church-management/{api,hooks,context,services,types,utils}
  
  # Admin
  mkdir -p front-end/src/features/admin/{api,hooks,services,types,utils}
  
  # Devel Tools
  mkdir -p front-end/src/features/devel-tools/{ai,omai,tools,omlearn,components,hooks,om-ai,utils}
  
  # Apps (one per app)
  mkdir -p front-end/src/features/apps/{blog,chat,contacts,ecommerce,email,invoice,kanban,notes,tickets,user-profile}/{api,context}
  
  # Headlines
  mkdir -p front-end/src/features/headlines/{components,utils}
  ```

- [ ] **Step A.2:** Remove barrel exports (replace with direct imports)
  - Delete `features/records-centralized/index.ts` (or convert to types/constants only)
  - Delete `features/records-centralized/components/index.ts`
  - Find all imports from these barrels and replace with direct file imports
  - Use codemod or search-replace:
    ```bash
    # Example: Replace imports from records-centralized barrel
    # FROM: import { X } from '@/features/records-centralized'
    # TO: import { X } from '@/features/records-centralized/components/.../X'
    ```

- [ ] **Step A.3:** Confirm canonical records root decision
  - **DECISION:** `records-centralized` is canonical (see section 0)
  - Document merge plan for `features/records/` → `features/records-centralized/`

- [ ] **Step A.4:** Verify import graph (no cycles)
  - Run TypeScript compiler in check mode: `tsc --noEmit`
  - Fix any import cycles detected
  - Ensure no barrel imports remain

**Deliverable:** All directories created, barrels removed, import graph verified, no build needed.

---

### Phase B: Bulk Move + Import Updates (Build #1)

**Goal:** Move all feature-specific files and update imports in one batch per feature.

**Batch B.1: Records Feature**
- [ ] Move API files:
  - `src/lib/recordsApi.ts` → `features/records-centralized/api/recordsApi.ts`
  - `src/lib/dynamicRecordsApi.ts` → `features/records-centralized/api/dynamicRecordsApi.ts`
  - `src/api/church-records.api.ts` → `features/records-centralized/api/churchRecordsApi.ts`
  - `src/api/church-records.hooks.ts` → `features/records-centralized/hooks/useChurchRecords.ts`

- [ ] Move components:
  - `src/components/records/*` → `features/records-centralized/components/forms/`
  - `src/components/RecordPreviewPane/` → `features/records-centralized/components/RecordPreviewPane/`
  - `src/components/RecordGenerator.tsx` → `features/records-centralized/components/RecordGenerator.tsx`

- [ ] Move context:
  - `src/context/RecordsContext.tsx` → `features/records-centralized/context/RecordsContext.tsx`

- [ ] Move schemas:
  - `src/schemas/record-schemas.ts` → `features/records-centralized/schemas/recordSchemas.ts`

- [ ] Move store:
  - `src/store/enhancedTableStore.ts` → `features/records-centralized/store/enhancedTableStore.ts`

- [ ] Move legacy:
  - `src/records/*` → `features/records-centralized/components/legacy/`

- [ ] Update imports (codemod/search-replace):
  ```bash
  # Update all imports from moved files
  # FROM: import X from '@/lib/recordsApi'
  # TO: import X from '@/features/records-centralized/api/recordsApi'
  
  # FROM: import X from '@/context/RecordsContext'
  # TO: import X from '@/features/records-centralized/context/RecordsContext'
  
  # FROM: import X from '@/store/enhancedTableStore'
  # TO: import X from '@/features/records-centralized/store/enhancedTableStore'
  ```

**Batch B.2: OCR Feature**
- [ ] Move hooks:
  - `src/lib/useOcrJobs.ts` → `features/ocr/hooks/useOcrJobs.ts`
  - `src/lib/useOcrSettings.ts` → `features/ocr/hooks/useOcrSettings.ts`
  - `src/lib/useOcrTests.ts` → `features/ocr/hooks/useOcrTests.ts`

- [ ] Move context:
  - `src/context/OCRContext/` → `features/ocr/context/OCRContext.tsx`

- [ ] Move components (if any):
  - `src/components/UploadTokenManager.tsx` → `features/ocr/components/UploadTokenManager.tsx` (verify usage first)

- [ ] Update imports

**Batch B.3: Church Management Feature**
- [ ] Move services:
  - `src/lib/churchService.ts` → `features/church-management/services/churchService.ts`
  - `src/lib/liturgicalService.ts` → `features/church-management/services/liturgicalService.ts` (if not shared)
  - `src/lib/orthodoxCalendarService.ts` → `features/church-management/services/orthodoxCalendarService.ts`

- [ ] Move hooks:
  - `src/lib/useCalendarData.ts` → `features/church-management/hooks/useCalendarData.ts`
  - `src/lib/useLiturgicalCalendar.ts` → `features/church-management/hooks/useLiturgicalCalendar.ts`
  - `src/lib/useOrthodoxCalendar.ts` → `features/church-management/hooks/useOrthodoxCalendar.ts`

- [ ] Move context:
  - `src/context/ChurchRecordsContext.tsx` → `features/church-management/context/ChurchRecordsContext.tsx`
  - `src/context/ChurchRecordsProvider.tsx` → `features/church-management/context/ChurchRecordsProvider.tsx`

- [ ] Move components:
  - `src/components/calendar/*` → `features/church-management/components/calendar/`

- [ ] Rename/consolidate:
  - `features/church/*` → `features/church-management/` (rename directory)

- [ ] Update imports

**Batch B.4: Admin Feature**
- [ ] Move components:
  - `src/components/admin/*` → `features/admin/components/`

- [ ] Move service:
  - `src/lib/adminService.ts` → `features/admin/services/adminService.ts`

- [ ] Move hooks (verify usage first):
  - `src/lib/useLogFilter.ts` → `features/admin/hooks/useLogFilter.ts` (if admin-only)
  - `src/lib/useLogStats.ts` → `features/admin/hooks/useLogStats.ts` (if admin-only)
  - `src/lib/useLogStream.ts` → `features/admin/hooks/useLogStream.ts` (if admin-only)
  - `src/lib/useClientManagement.ts` → `features/admin/hooks/useClientManagement.ts`
  - `src/lib/useProfileSync.ts` → `features/admin/hooks/useProfileSync.ts` (if admin-only)

- [ ] Move API:
  - `src/api/admin.api.ts` → `features/admin/api/adminApi.ts`

- [ ] Update imports

**Batch B.5: Development Tools Feature**
- [ ] Move AI tools:
  - `src/ai/*` → `features/devel-tools/ai/`

- [ ] Move OMAI:
  - `src/omai/*` → `features/devel-tools/omai/`

- [ ] Move tools:
  - `src/tools/*` → `features/devel-tools/tools/`

- [ ] Move OMLearn:
  - `src/modules/OMLearn/*` → `features/devel-tools/omlearn/`

- [ ] Move hooks:
  - `src/lib/useComponentRegistry.ts` → `features/devel-tools/hooks/useComponentRegistry.ts`
  - `src/lib/useInspectorState.ts` → `features/devel-tools/hooks/useInspectorState.ts`

- [ ] Move components:
  - `src/components/ComponentInspector.tsx` → `features/devel-tools/components/ComponentInspector.tsx`
  - `src/components/VisualRegressionDashboard.tsx` → `features/devel-tools/components/VisualRegressionDashboard.tsx`
  - `src/components/VRTSettingsPanel.tsx` → `features/devel-tools/components/VRTSettingsPanel.tsx`
  - `src/components/GitOpsPanel.tsx` → `features/devel-tools/components/GitOpsPanel.tsx`
  - `src/components/registry/*` → `features/devel-tools/components/registry/`
  - `src/components/terminal/*` → `features/devel-tools/components/terminal/`
  - `src/components/ui-tools/*` → `features/devel-tools/components/ui-tools/`

- [ ] Move OMAI editor bridge:
  - `src/lib/om-ai/editorBridge.ts` → `features/devel-tools/om-ai/editorBridge.ts`

- [ ] Update imports

**Batch B.6: Apps Feature**
- [ ] Move API services:
  - `src/lib/apps/*` → `features/apps/{app}/api/` (one file per app)

- [ ] Move contexts:
  - `src/context/BlogContext/` → `features/apps/blog/context/BlogContext.tsx`
  - `src/context/ChatContext/` → `features/apps/chat/context/ChatContext.tsx`
  - `src/context/EcommerceContext/` → `features/apps/ecommerce/context/EcommerceContext.tsx`
  - `src/context/EmailContext/` → `features/apps/email/context/EmailContext.tsx`
  - `src/context/InvoiceContext/` → `features/apps/invoice/context/InvoiceContext.tsx`
  - `src/context/NotesContext/` → `features/apps/notes/context/NotesContext.tsx`
  - `src/context/TicketContext/` → `features/apps/tickets/context/TicketContext.tsx`
  - `src/context/kanbancontext/` → `features/apps/kanban/context/KanbanContext.tsx` (fix naming)
  - `src/context/ConatactContext/` → `features/apps/contacts/context/ContactContext.tsx` (fix typo)
  - `src/context/UserDataContext/` → `features/apps/user-profile/context/UserDataContext.tsx` (if app-specific)

- [ ] Update imports

**Batch B.7: Headlines Feature**
- [ ] Move components:
  - `src/components/headlines/*` → `features/headlines/components/`

- [ ] Update imports

**Batch B.8: Merge Legacy Records**
- [ ] Merge `features/records/` into `features/records-centralized/`:
  - `features/records/baptism/` → `features/records-centralized/components/forms/entry/`
  - `features/records/marriage/` → `features/records-centralized/components/forms/entry/`
  - `features/records/funeral/` → `features/records-centralized/components/forms/entry/`
  - `features/records/EnhancedRecordsGrid.tsx` → `features/records-centralized/components/grids/EnhancedRecordsGrid.tsx`
  - `features/records/apps/records-grid/` → `features/records-centralized/components/grids/legacy/`
  - `features/records/apps/records-ui/` → `features/records-centralized/views/apps/records-ui/`

- [ ] Update route:
  - Update `Router.tsx` to use `features/records-centralized/components/records/RecordsPageWrapper.tsx` instead of `features/records/apps/church-management/RecordsPageWrapper.tsx`

- [ ] Delete `features/records/` directory

- [ ] Update imports

**After Phase B: Build #1**
```bash
# Type check
npm run typecheck  # or: tsc --noEmit

# Build
npm run build

# Fix any import errors
# Re-run typecheck/build until clean
```

**Deliverable:** All files moved, imports updated, build passes.

---

### Phase C: Cleanup + Cycle Breaking (Build #2)

**Goal:** Remove empty directories, break remaining cycles, final verification.

- [ ] **Step C.1:** Remove empty directories
  - Remove `src/records/` if empty
  - Remove `src/ai/` if empty
  - Remove `src/omai/` if empty
  - Remove `src/tools/` if empty
  - Remove `src/modules/OMLearn/` if moved
  - Remove empty `src/lib/apps/` if empty
  - Remove empty `src/context/` subdirectories if moved
  - Remove `features/records/` (merged)

- [ ] **Step C.2:** Break remaining import cycles
  - Verify no services import components
  - Verify no contexts import pages
  - Verify no feature A imports feature B internals
  - Move shared types to `src/types/` or feature `types/` if needed

- [ ] **Step C.3:** Final import verification
  - Run full import graph analysis
  - Verify import direction policy compliance
  - Fix any violations

- [ ] **Step C.4:** Update route imports
  - Verify all routes import from correct feature paths
  - Update any remaining legacy imports

**After Phase C: Build #2**
```bash
# Type check
npm run typecheck

# Build
npm run build

# Lint
npm run lint

# Fix any remaining issues
# Re-run until all pass
```

**Deliverable:** Clean codebase, no cycles, all builds pass.

---

### Phase D: Optional Verification Build (Build #3 - Only if needed)

**Goal:** Final verification and documentation.

- [ ] **Step D.1:** Run full test suite (if exists)
  ```bash
  npm test
  ```

- [ ] **Step D.2:** Manual testing
  - Test records pages (baptism, marriage, funeral)
  - Test OCR pages
  - Test church management pages
  - Test admin pages
  - Test dev tools pages
  - Test app pages

- [ ] **Step D.3:** Update documentation
  - Update README with new structure
  - Update architecture docs
  - Document import direction policy

**After Phase D: Build #3 (if needed)**
```bash
# Final build
npm run build

# Final typecheck
npm run typecheck
```

**Deliverable:** Fully verified, documented, production-ready.

---

## 7. Checklist Summary

### Pre-Refactor
- [ ] Create backup branch: `git checkout -b refactor/feature-migration-backup`
- [ ] Commit current state: `git commit -am "Pre-refactor backup"`

### Phase A (No Build)
- [ ] Create all feature subdirectories
- [ ] Remove barrel exports (`features/records-centralized/index.ts`, `components/index.ts`)
- [ ] Replace barrel imports with direct imports
- [ ] Confirm canonical records root decision
- [ ] Verify import graph (no cycles): `tsc --noEmit`

### Phase B (Build #1)
- [ ] Move records feature files + update imports
- [ ] Move OCR feature files + update imports
- [ ] Move church-management feature files + update imports
- [ ] Move admin feature files + update imports
- [ ] Move devel-tools feature files + update imports
- [ ] Move apps feature files + update imports
- [ ] Move headlines feature files + update imports
- [ ] Merge `features/records/` into `features/records-centralized/`
- [ ] Update route imports
- [ ] **BUILD #1:** `npm run typecheck && npm run build`

### Phase C (Build #2)
- [ ] Remove empty directories
- [ ] Break remaining import cycles
- [ ] Final import verification
- [ ] Update route imports
- [ ] **BUILD #2:** `npm run typecheck && npm run build && npm run lint`

### Phase D (Build #3 - Optional)
- [ ] Run test suite: `npm test`
- [ ] Manual testing of all features
- [ ] Update documentation
- [ ] **BUILD #3:** `npm run typecheck && npm run build`

---

## 8. Risk Assessment Summary

| Risk Level | Count | Items |
|------------|-------|-------|
| **LOW** | ~60 | Most feature-specific files with clear ownership |
| **MEDIUM** | ~15 | Files that may be shared (liturgicalService, orthodoxCalendarService, useLog*, useClientManagement, useProfileSync, FieldRenderer) |
| **HIGH** | ~5 | Files with unknown usage, potential circular dependencies, or barrel export violations |

**High-Risk Items Requiring Verification:**
1. `src/lib/liturgicalService.ts` - May be used by both church and records
2. `src/lib/orthodoxCalendarService.ts` - May be shared
3. `src/lib/useLogFilter.ts`, `useLogStats.ts`, `useLogStream.ts` - May be used by admin and devel-tools
4. `src/lib/useProfileSync.ts` - May be used by admin and user-profile
5. `src/components/FieldRenderer/` - May be shared across features

**Mitigation:** Verify usage before moving. If shared, move to `src/shared/` or have one feature import from another's public API.

---

## 9. Notes and Considerations

1. **Barrel Export Policy:** NO barrels for components/hooks/services. Only allow barrels for types/constants.

2. **Import Direction:** Enforce one-way flow: pages → components → hooks → services → api. Never: services → components, contexts → pages.

3. **Shared Code:** If code is used by 2+ unrelated features, keep in `src/shared/` or create a shared feature module.

4. **Records Consolidation:** `features/records/` must be merged into `features/records-centralized/` to avoid duplication.

5. **Build Strategy:** 2-3 builds total (Phase B, Phase C, optional Phase D) to catch errors early without excessive rebuilds.

6. **Testing:** Test each feature after Phase B completes. Don't defer all testing to the end.

---

**End of Refactor Inventory**
