# Refactor Inventory: Feature-Specific Code Migration

**Generated:** 2025-01-XX  
**Purpose:** Complete inventory for moving feature-specific code into `front-end/src/features/*` while preserving foundational infrastructure.

---

## 1. Keep As-Is (Do Not Move)

These directories must remain in place as foundational app infrastructure:

| Directory | Justification |
|-----------|---------------|
| `front-end/src/app/` | Core app configuration and setup |
| `front-end/src/layouts/` | Shared layout components used across all features |
| `front-end/src/routes/` | Centralized route definitions (pages live in features, routes stay here) |
| `front-end/src/theme/` | Global theme configuration and MUI theme setup |
| `front-end/src/types/` | Shared TypeScript types used across multiple features |
| `front-end/src/assets/` | Global assets (images, fonts, icons) |
| `front-end/src/utils/` | **General utilities only** (arrayUtils, logger, formatTimestamp, etc.) |
| `front-end/src/shared/` | **Shared UI components and utilities** used by 2+ unrelated features |
| `front-end/src/store/` | **Global state stores** (enhancedTableStore, useTableStyleStore) - but see notes below |
| `front-end/src/context/` | **Core contexts only** (AuthContext, CustomizerContext, MenuVisibilityContext, NotificationContext, WebSocketContext) |
| `front-end/src/config/` | Global configuration files (featureFlags, api.config, etc.) |
| `front-end/src/constants/` | Global constants (notifications.ts, constants.ts) |

**Exceptions Found:**
- `front-end/src/store/enhancedTableStore.ts` - **RISK: MEDIUM** - Used by records-centralized but may be shared. Review usage before moving.
- `front-end/src/context/` contains feature-specific contexts that should move (see section 2)

---

## 2. Refactor Targets: Move into `front-end/src/features/*`

### 2.1 Records Feature (`features/records/`)

| Current Path | Proposed Destination | Feature | Reason | Risk | Notes |
|-------------|---------------------|---------|--------|------|-------|
| `src/lib/recordsApi.ts` | `features/records/api/recordsApi.ts` | records | Records-specific API service | LOW | Only used by records features |
| `src/lib/dynamicRecordsApi.ts` | `features/records/api/dynamicRecordsApi.ts` | records | Dynamic records API abstraction | LOW | Records-specific |
| `src/api/church-records.api.ts` | `features/records/api/churchRecordsApi.ts` | records | Church records CRUD API | LOW | Records-specific |
| `src/api/church-records.hooks.ts` | `features/records/hooks/useChurchRecords.ts` | records | Records data hooks | LOW | Records-specific |
| `src/records/*` (all 15 files) | `features/records/components/legacy/` | records | Legacy records components | MEDIUM | Old records implementation, consolidate |
| `src/components/records/*` (6 files) | `features/records/components/` | records | Record form/table components | LOW | Records-specific UI |
| `src/context/RecordsContext.tsx` | `features/records/context/RecordsContext.tsx` | records | Records state context | LOW | Records-specific state |
| `src/components/RecordPreviewPane/` | `features/records/components/RecordPreviewPane/` | records | Record preview component | LOW | Records-specific |
| `src/components/RecordGenerator.tsx` | `features/records/components/RecordGenerator.tsx` | records | Record generation utility | LOW | Records-specific |
| `src/schemas/record-schemas.ts` | `features/records/schemas/recordSchemas.ts` | records | Record validation schemas | LOW | Records-specific |

**Note:** `features/records-centralized/` already exists and is well-organized. Consider merging `features/records/` into it or vice versa.

### 2.2 OCR Feature (`features/ocr/`)

| Current Path | Proposed Destination | Feature | Reason | Risk | Notes |
|-------------|---------------------|---------|--------|------|-------|
| `src/lib/useOcrJobs.ts` | `features/ocr/hooks/useOcrJobs.ts` | ocr | OCR jobs management hook | LOW | OCR-specific |
| `src/lib/useOcrSettings.ts` | `features/ocr/hooks/useOcrSettings.ts` | ocr | OCR settings hook | LOW | OCR-specific |
| `src/lib/useOcrTests.ts` | `features/ocr/hooks/useOcrTests.ts` | ocr | OCR testing hook | LOW | OCR-specific |
| `src/context/OCRContext/` | `features/ocr/context/OCRContext.tsx` | ocr | OCR state context | LOW | OCR-specific state |
| `src/components/UploadTokenManager.tsx` | `features/ocr/components/UploadTokenManager.tsx` | ocr | OCR upload token management | MEDIUM | May be used by admin, verify usage |

**Note:** `features/ocr/` already exists with 11 files. These additions will consolidate OCR code.

### 2.3 Church Management Feature (`features/church-management/`)

| Current Path | Proposed Destination | Feature | Reason | Risk | Notes |
|-------------|---------------------|---------|--------|------|-------|
| `src/lib/churchService.ts` | `features/church-management/services/churchService.ts` | church-management | Church CRUD service | LOW | Church-specific |
| `src/lib/liturgicalService.ts` | `features/church-management/services/liturgicalService.ts` | church-management | Liturgical calendar service | MEDIUM | May be shared with records, verify |
| `src/lib/orthodoxCalendarService.ts` | `features/church-management/services/orthodoxCalendarService.ts` | church-management | Orthodox calendar service | MEDIUM | May be shared, verify |
| `src/lib/useCalendarData.ts` | `features/church-management/hooks/useCalendarData.ts` | church-management | Calendar data hook | LOW | Church/calendar-specific |
| `src/lib/useLiturgicalCalendar.ts` | `features/church-management/hooks/useLiturgicalCalendar.ts` | church-management | Liturgical calendar hook | LOW | Church-specific |
| `src/lib/useOrthodoxCalendar.ts` | `features/church-management/hooks/useOrthodoxCalendar.ts` | church-management | Orthodox calendar hook | LOW | Church-specific |
| `src/context/ChurchRecordsContext.tsx` | `features/church-management/context/ChurchRecordsContext.tsx` | church-management | Church records context | MEDIUM | May overlap with records feature |
| `src/context/ChurchRecordsProvider.tsx` | `features/church-management/context/ChurchRecordsProvider.tsx` | church-management | Church records provider | MEDIUM | May overlap with records feature |
| `src/components/calendar/*` (4 files) | `features/church-management/components/calendar/` | church-management | Calendar UI components | LOW | Church/calendar-specific |

**Note:** `features/church/` already exists with 22 files. Consider renaming to `church-management/` or consolidating.

### 2.4 Admin Feature (`features/admin/`)

| Current Path | Proposed Destination | Feature | Reason | Risk | Notes |
|-------------|---------------------|---------|--------|------|-------|
| `src/components/admin/*` (33 files) | `features/admin/components/` | admin | Admin UI components | LOW | Admin-specific components |
| `src/lib/adminService.ts` | `features/admin/services/adminService.ts` | admin | Admin service | LOW | Admin-specific |
| `src/lib/useLogFilter.ts` | `features/admin/hooks/useLogFilter.ts` | admin | Log filtering hook | MEDIUM | May be devel-tools, verify usage |
| `src/lib/useLogStats.ts` | `features/admin/hooks/useLogStats.ts` | admin | Log statistics hook | MEDIUM | May be devel-tools, verify usage |
| `src/lib/useLogStream.ts` | `features/admin/hooks/useLogStream.ts` | admin | Log streaming hook | MEDIUM | May be devel-tools, verify usage |
| `src/lib/useClientManagement.ts` | `features/admin/hooks/useClientManagement.ts` | admin | Client management hook | MEDIUM | May be devel-tools, verify usage |
| `src/lib/useProfileSync.ts` | `features/admin/hooks/useProfileSync.ts` | admin | Profile sync hook | MEDIUM | May be user-profile feature, verify |
| `src/api/admin.api.ts` | `features/admin/api/adminApi.ts` | admin | Admin API service | LOW | Admin-specific |

**Note:** `features/admin/` already exists with 105 files. These additions will consolidate admin code.

### 2.5 Development Tools Feature (`features/devel-tools/`)

| Current Path | Proposed Destination | Feature | Reason | Risk | Notes |
|-------------|---------------------|---------|--------|------|-------|
| `src/ai/*` (all files) | `features/devel-tools/ai/` | devel-tools | AI/ML development tools | LOW | Dev tools for AI features |
| `src/omai/*` (5 files) | `features/devel-tools/omai/` | devel-tools | OMAI knowledge system | LOW | Dev tool |
| `src/tools/*` (all files) | `features/devel-tools/tools/` | devel-tools | Development utilities | LOW | Dev tools |
| `src/lib/useComponentRegistry.ts` | `features/devel-tools/hooks/useComponentRegistry.ts` | devel-tools | Component registry hook | LOW | Dev tool |
| `src/lib/useInspectorState.ts` | `features/devel-tools/hooks/useInspectorState.ts` | devel-tools | Inspector state hook | LOW | Dev tool |
| `src/lib/om-ai/*` (editorBridge.ts) | `features/devel-tools/om-ai/editorBridge.ts` | devel-tools | OMAI editor bridge | LOW | Dev tool |
| `src/components/ComponentInspector.tsx` | `features/devel-tools/components/ComponentInspector.tsx` | devel-tools | Component inspector UI | LOW | Dev tool |
| `src/components/registry/*` | `features/devel-tools/components/registry/` | devel-tools | Component registry UI | LOW | Dev tool |
| `src/components/terminal/*` | `features/devel-tools/components/terminal/` | devel-tools | Terminal UI | LOW | Dev tool |
| `src/components/ui-tools/*` | `features/devel-tools/components/ui-tools/` | devel-tools | UI development tools | LOW | Dev tool |
| `src/components/VisualRegressionDashboard.tsx` | `features/devel-tools/components/VisualRegressionDashboard.tsx` | devel-tools | VRT dashboard | LOW | Dev tool |
| `src/components/VRTSettingsPanel.tsx` | `features/devel-tools/components/VRTSettingsPanel.tsx` | devel-tools | VRT settings | LOW | Dev tool |
| `src/components/GitOpsPanel.tsx` | `features/devel-tools/components/GitOpsPanel.tsx` | devel-tools | GitOps UI | LOW | Dev tool |
| `src/modules/OMLearn/*` | `features/devel-tools/omlearn/` OR `features/omlearn/` | devel-tools or new | OMLearn module | MEDIUM | Could be standalone feature |

**Note:** `features/devel-tools/` already exists with 109 files. These additions will consolidate dev tools.

### 2.6 Apps Feature (`features/apps/`)

| Current Path | Proposed Destination | Feature | Reason | Risk | Notes |
|-------------|---------------------|---------|--------|------|-------|
| `src/lib/apps/*` (12 files) | `features/apps/api/` | apps | App-specific API services | LOW | Apps feature APIs |
| `src/context/BlogContext/` | `features/apps/blog/context/BlogContext.tsx` | apps | Blog state context | LOW | Blog app |
| `src/context/ChatContext/` | `features/apps/chat/context/ChatContext.tsx` | apps | Chat state context | LOW | Chat app |
| `src/context/EcommerceContext/` | `features/apps/ecommerce/context/EcommerceContext.tsx` | apps | Ecommerce state context | LOW | Ecommerce app |
| `src/context/EmailContext/` | `features/apps/email/context/EmailContext.tsx` | apps | Email state context | LOW | Email app |
| `src/context/InvoiceContext/` | `features/apps/invoice/context/InvoiceContext.tsx` | apps | Invoice state context | LOW | Invoice app |
| `src/context/NotesContext/` | `features/apps/notes/context/NotesContext.tsx` | apps | Notes state context | LOW | Notes app |
| `src/context/TicketContext/` | `features/apps/tickets/context/TicketContext.tsx` | apps | Ticket state context | LOW | Tickets app |
| `src/context/kanbancontext/` | `features/apps/kanban/context/KanbanContext.tsx` | apps | Kanban state context | LOW | Kanban app |
| `src/context/ConatactContext/` | `features/apps/contacts/context/ContactContext.tsx` | apps | Contact state context | LOW | Contacts app (fix typo) |
| `src/context/UserDataContext/` | `features/apps/user-profile/context/UserDataContext.tsx` | apps | User data context | MEDIUM | May be shared, verify |

**Note:** `features/apps/` already exists with 25 files. These context moves will consolidate app state.

### 2.7 Headlines Feature (`features/headlines/`)

| Current Path | Proposed Destination | Feature | Reason | Risk | Notes |
|-------------|---------------------|---------|--------|------|-------|
| `src/components/headlines/*` | `features/headlines/components/` | headlines | Headlines UI components | LOW | Headlines-specific |

**Note:** `features/headlines/` already exists with 1 file. This consolidates headlines code.

### 2.8 Field Renderer (Shared vs Feature-Local)

| Current Path | Proposed Destination | Feature | Reason | Risk | Notes |
|-------------|---------------------|---------|--------|------|-------|
| `src/components/FieldRenderer/` | `features/records/components/FieldRenderer/` OR `src/shared/components/FieldRenderer/` | records or shared | Field rendering component | MEDIUM | Used by records but may be shared. **VERIFY USAGE** |

---

## 3. Shared vs Feature-Local Candidates

These items are currently in global folders but appear to be used by only one feature:

| Current Path | Usage Analysis | Recommendation | Import Count | Primary Importer(s) |
|-------------|----------------|----------------|--------------|---------------------|
| `src/lib/recordsApi.ts` | Only records features | Move to `features/records/api/` | Unknown | Records components |
| `src/lib/churchService.ts` | Only church features | Move to `features/church-management/services/` | Unknown | Church components |
| `src/lib/useOcrJobs.ts` | Only OCR features | Move to `features/ocr/hooks/` | Unknown | OCR components |
| `src/lib/useOcrSettings.ts` | Only OCR features | Move to `features/ocr/hooks/` | Unknown | OCR components |
| `src/lib/useOcrTests.ts` | Only OCR features | Move to `features/ocr/hooks/` | Unknown | OCR components |
| `src/lib/dynamicRecordsApi.ts` | Only records features | Move to `features/records/api/` | Unknown | Records components |
| `src/lib/liturgicalService.ts` | Church + records? | **VERIFY** - May stay in `src/lib/` if shared | Unknown | Church, records? |
| `src/lib/orthodoxCalendarService.ts` | Church + records? | **VERIFY** - May stay in `src/lib/` if shared | Unknown | Church, records? |
| `src/lib/useCalendarData.ts` | Church features | Move to `features/church-management/hooks/` | Unknown | Church components |
| `src/lib/useLiturgicalCalendar.ts` | Church features | Move to `features/church-management/hooks/` | Unknown | Church components |
| `src/lib/useOrthodoxCalendar.ts` | Church features | Move to `features/church-management/hooks/` | Unknown | Church components |
| `src/lib/useComponentRegistry.ts` | Dev tools only | Move to `features/devel-tools/hooks/` | Unknown | Dev tools |
| `src/lib/useInspectorState.ts` | Dev tools only | Move to `features/devel-tools/hooks/` | Unknown | Dev tools |
| `src/lib/useLogFilter.ts` | Admin/devel-tools? | **VERIFY** - Check if used by admin or devel-tools | Unknown | Admin? |
| `src/lib/useLogStats.ts` | Admin/devel-tools? | **VERIFY** - Check if used by admin or devel-tools | Unknown | Admin? |
| `src/lib/useLogStream.ts` | Admin/devel-tools? | **VERIFY** - Check if used by admin or devel-tools | Unknown | Admin? |
| `src/lib/useClientManagement.ts` | Admin/devel-tools? | **VERIFY** - Check if used by admin or devel-tools | Unknown | Admin? |
| `src/lib/useProfileSync.ts` | Admin/user-profile? | **VERIFY** - Check if used by admin or user-profile | Unknown | Admin? |

**Action Required:** Run import analysis to confirm usage before moving these items.

---

## 4. Suspected Circular Dependencies / Barrel Export Hazards

### 4.1 Barrel Exports Creating Cycles

| File | Issue | Recommendation |
|------|-------|----------------|
| `src/features/records-centralized/index.ts` | Exports everything from components, hooks, services, types, utils, constants | **RISK: MEDIUM** - May create cycles if components import from services that import from components. Split into specific exports or remove barrel. |
| `src/lib/auth.ts` | Re-exports from `@om/auth` | **RISK: LOW** - Re-export pattern, but verify no cycles |
| `src/lib/*` (multiple files) | Many lib files export hooks/services that may import from features | **RISK: MEDIUM** - After moving feature-specific lib files, verify no remaining cycles |

### 4.2 Cross-Import Patterns

| Pattern | Issue | Recommendation |
|---------|-------|----------------|
| Features importing from `@/lib/recordsApi` | After move, features will import from `@/features/records/api/recordsApi` | **FIX:** Update all imports after move. Use codemod. |
| Features importing from `@/context/RecordsContext` | After move, features will import from `@/features/records/context/RecordsContext` | **FIX:** Update all imports after move. Use codemod. |
| `src/store/enhancedTableStore.ts` imported by `features/records-centralized` | Store in `src/store/` but used by records feature | **RISK: MEDIUM** - Consider moving to `features/records/store/` if only used by records, or keep in `src/store/` if shared. **VERIFY USAGE.** |
| Pages importing from contexts that import from services that import from pages | Potential cycle | **FIX:** Ensure pages → components → services → api (one-way flow). No pages → services directly. |

### 4.3 Recommended Fixes

1. **Remove or Split Barrel Exports:**
   - `src/features/records-centralized/index.ts` - Split into specific named exports or remove entirely
   - Verify no other feature barrels create cycles

2. **Enforce Import Rules:**
   - Pages should only import from: components, hooks, types, utils (within feature)
   - Components should import from: hooks, types, utils, api (within feature)
   - Services should import from: api, types, utils (within feature)
   - Never: pages → services, pages → api directly

3. **Shared Types/Constants:**
   - Move truly shared types to `src/types/`
   - Move feature-specific types to `features/{feature}/types/`
   - Avoid: `features/{feature}/types` importing from `features/{other-feature}/types`

---

## 5. Proposed New Feature Folder Structure

### 5.1 Records Feature (`features/records/` or merge into `records-centralized/`)

```
features/records/ (or records-centralized/)
├── api/
│   ├── recordsApi.ts
│   ├── dynamicRecordsApi.ts
│   └── churchRecordsApi.ts
├── components/
│   ├── baptism/
│   ├── marriage/
│   ├── funeral/
│   ├── dynamic/
│   ├── forms/
│   ├── RecordPreviewPane/
│   ├── RecordGenerator.tsx
│   └── legacy/ (from src/records/*)
├── hooks/
│   └── useChurchRecords.ts
├── context/
│   └── RecordsContext.tsx
├── schemas/
│   └── recordSchemas.ts
├── types/
│   └── recordTypes.ts
└── utils/
    └── recordUtils.ts
```

### 5.2 OCR Feature (`features/ocr/`)

```
features/ocr/
├── api/
│   └── ocrApi.ts
├── components/
│   ├── OCRUploader.tsx
│   ├── OCRResults.tsx
│   └── UploadTokenManager.tsx
├── hooks/
│   ├── useOcrJobs.ts
│   ├── useOcrSettings.ts
│   └── useOcrTests.ts
├── context/
│   └── OCRContext.tsx
├── types/
│   └── ocrTypes.ts
└── utils/
    └── ocrUtils.ts
```

### 5.3 Church Management Feature (`features/church-management/`)

```
features/church-management/
├── api/
│   └── churchApi.ts
├── components/
│   ├── church-management/
│   ├── calendar/
│   └── FieldMapperPage.tsx
├── hooks/
│   ├── useCalendarData.ts
│   ├── useLiturgicalCalendar.ts
│   └── useOrthodoxCalendar.ts
├── context/
│   ├── ChurchRecordsContext.tsx
│   └── ChurchRecordsProvider.tsx
├── services/
│   ├── churchService.ts
│   ├── liturgicalService.ts
│   └── orthodoxCalendarService.ts
├── types/
│   └── churchTypes.ts
└── utils/
    └── churchUtils.ts
```

### 5.4 Admin Feature (`features/admin/`)

```
features/admin/
├── api/
│   └── adminApi.ts
├── components/
│   └── (all from src/components/admin/*)
├── hooks/
│   ├── useLogFilter.ts
│   ├── useLogStats.ts
│   ├── useLogStream.ts
│   ├── useClientManagement.ts
│   └── useProfileSync.ts (if admin-only)
├── services/
│   └── adminService.ts
├── types/
│   └── adminTypes.ts
└── utils/
    └── adminUtils.ts
```

### 5.5 Development Tools Feature (`features/devel-tools/`)

```
features/devel-tools/
├── ai/
│   ├── git/
│   ├── learning/
│   ├── visualTesting/
│   └── vrt/
├── omai/
│   ├── cli/
│   └── knowledge/
├── tools/
│   ├── om-deps/
│   ├── omls/
│   └── omtrace/
├── omlearn/ (or separate feature)
│   └── (from src/modules/OMLearn/*)
├── components/
│   ├── ComponentInspector.tsx
│   ├── VisualRegressionDashboard.tsx
│   ├── VRTSettingsPanel.tsx
│   ├── GitOpsPanel.tsx
│   ├── registry/
│   ├── terminal/
│   └── ui-tools/
├── hooks/
│   ├── useComponentRegistry.ts
│   └── useInspectorState.ts
├── om-ai/
│   └── editorBridge.ts
└── utils/
    └── develUtils.ts
```

### 5.6 Apps Feature (`features/apps/`)

```
features/apps/
├── blog/
│   ├── api/
│   ├── components/
│   └── context/
├── chat/
│   ├── api/
│   ├── components/
│   └── context/
├── contacts/
│   ├── api/
│   ├── components/
│   └── context/
├── ecommerce/
│   ├── api/
│   ├── components/
│   └── context/
├── email/
│   ├── api/
│   ├── components/
│   └── context/
├── invoice/
│   ├── api/
│   ├── components/
│   └── context/
├── kanban/
│   ├── api/
│   ├── components/
│   └── context/
├── notes/
│   ├── api/
│   ├── components/
│   └── context/
├── tickets/
│   ├── api/
│   ├── components/
│   └── context/
└── user-profile/
    ├── api/
    ├── components/
    └── context/
```

---

## 6. Implementation Plan (Min Builds)

### Phase 1: Preparation (No Code Changes)

- [ ] **Step 1.1:** Run import analysis to confirm usage of shared vs feature-local items
  - Use `grep` or AST parser to find all imports of `src/lib/*`, `src/api/*`, `src/context/*`
  - Document which features use which lib/api/context files
  - Resolve "VERIFY" items in section 3

- [ ] **Step 1.2:** Identify and document circular dependencies
  - Use dependency graph tool or manual analysis
  - Document all cycles before starting moves

- [ ] **Step 1.3:** Create backup branch
  - `git checkout -b refactor/feature-migration-backup`
  - Commit current state

### Phase 2: Create Feature Directories (No Code Changes)

- [ ] **Step 2.1:** Create all new feature subdirectories
  - `features/records/api/`, `features/records/hooks/`, `features/records/context/`, etc.
  - `features/ocr/hooks/`, `features/ocr/context/`, etc.
  - `features/church-management/services/`, `features/church-management/hooks/`, etc.
  - `features/admin/components/`, `features/admin/hooks/`, etc.
  - `features/devel-tools/ai/`, `features/devel-tools/omai/`, `features/devel-tools/tools/`, etc.
  - `features/apps/{app}/context/` for each app

- [ ] **Step 2.2:** Create placeholder `index.ts` files in new directories (to prevent import errors)

### Phase 3: Move Files by Feature (Batch 1: Records)

- [ ] **Step 3.1:** Move records API files
  - `src/lib/recordsApi.ts` → `features/records/api/recordsApi.ts`
  - `src/lib/dynamicRecordsApi.ts` → `features/records/api/dynamicRecordsApi.ts`
  - `src/api/church-records.api.ts` → `features/records/api/churchRecordsApi.ts`
  - `src/api/church-records.hooks.ts` → `features/records/hooks/useChurchRecords.ts`

- [ ] **Step 3.2:** Move records components
  - `src/components/records/*` → `features/records/components/`
  - `src/components/RecordPreviewPane/` → `features/records/components/RecordPreviewPane/`
  - `src/components/RecordGenerator.tsx` → `features/records/components/RecordGenerator.tsx`

- [ ] **Step 3.3:** Move records context
  - `src/context/RecordsContext.tsx` → `features/records/context/RecordsContext.tsx`

- [ ] **Step 3.4:** Move records schemas
  - `src/schemas/record-schemas.ts` → `features/records/schemas/recordSchemas.ts`

- [ ] **Step 3.5:** Move legacy records
  - `src/records/*` → `features/records/components/legacy/`

- [ ] **Step 3.6:** Update all imports for records feature
  - Use codemod or search-replace:
    - `@/lib/recordsApi` → `@/features/records/api/recordsApi`
    - `@/lib/dynamicRecordsApi` → `@/features/records/api/dynamicRecordsApi`
    - `@/api/church-records.api` → `@/features/records/api/churchRecordsApi`
    - `@/api/church-records.hooks` → `@/features/records/hooks/useChurchRecords`
    - `@/components/records/*` → `@/features/records/components/*`
    - `@/context/RecordsContext` → `@/features/records/context/RecordsContext`
    - `@/schemas/record-schemas` → `@/features/records/schemas/recordSchemas`

- [ ] **Step 3.7:** Build and test
  - `npm run build` (or equivalent)
  - Fix any import errors
  - Test records pages

### Phase 4: Move Files by Feature (Batch 2: OCR)

- [ ] **Step 4.1:** Move OCR hooks
  - `src/lib/useOcrJobs.ts` → `features/ocr/hooks/useOcrJobs.ts`
  - `src/lib/useOcrSettings.ts` → `features/ocr/hooks/useOcrSettings.ts`
  - `src/lib/useOcrTests.ts` → `features/ocr/hooks/useOcrTests.ts`

- [ ] **Step 4.2:** Move OCR context
  - `src/context/OCRContext/` → `features/ocr/context/OCRContext.tsx`

- [ ] **Step 4.3:** Move OCR components (if any in src/components)
  - `src/components/UploadTokenManager.tsx` → `features/ocr/components/UploadTokenManager.tsx` (verify usage first)

- [ ] **Step 4.4:** Update all imports for OCR feature
  - `@/lib/useOcrJobs` → `@/features/ocr/hooks/useOcrJobs`
  - `@/lib/useOcrSettings` → `@/features/ocr/hooks/useOcrSettings`
  - `@/lib/useOcrTests` → `@/features/ocr/hooks/useOcrTests`
  - `@/context/OCRContext` → `@/features/ocr/context/OCRContext`

- [ ] **Step 4.5:** Build and test
  - `npm run build`
  - Fix import errors
  - Test OCR pages

### Phase 5: Move Files by Feature (Batch 3: Church Management)

- [ ] **Step 5.1:** Move church services
  - `src/lib/churchService.ts` → `features/church-management/services/churchService.ts`
  - `src/lib/liturgicalService.ts` → `features/church-management/services/liturgicalService.ts` (if not shared)
  - `src/lib/orthodoxCalendarService.ts` → `features/church-management/services/orthodoxCalendarService.ts` (if not shared)

- [ ] **Step 5.2:** Move church hooks
  - `src/lib/useCalendarData.ts` → `features/church-management/hooks/useCalendarData.ts`
  - `src/lib/useLiturgicalCalendar.ts` → `features/church-management/hooks/useLiturgicalCalendar.ts`
  - `src/lib/useOrthodoxCalendar.ts` → `features/church-management/hooks/useOrthodoxCalendar.ts`

- [ ] **Step 5.3:** Move church context
  - `src/context/ChurchRecordsContext.tsx` → `features/church-management/context/ChurchRecordsContext.tsx`
  - `src/context/ChurchRecordsProvider.tsx` → `features/church-management/context/ChurchRecordsProvider.tsx`

- [ ] **Step 5.4:** Move church components
  - `src/components/calendar/*` → `features/church-management/components/calendar/`

- [ ] **Step 5.5:** Update all imports for church-management feature
  - `@/lib/churchService` → `@/features/church-management/services/churchService`
  - `@/lib/liturgicalService` → `@/features/church-management/services/liturgicalService`
  - `@/lib/orthodoxCalendarService` → `@/features/church-management/services/orthodoxCalendarService`
  - `@/lib/useCalendarData` → `@/features/church-management/hooks/useCalendarData`
  - `@/lib/useLiturgicalCalendar` → `@/features/church-management/hooks/useLiturgicalCalendar`
  - `@/lib/useOrthodoxCalendar` → `@/features/church-management/hooks/useOrthodoxCalendar`
  - `@/context/ChurchRecordsContext` → `@/features/church-management/context/ChurchRecordsContext`
  - `@/components/calendar/*` → `@/features/church-management/components/calendar/*`

- [ ] **Step 5.6:** Build and test
  - `npm run build`
  - Fix import errors
  - Test church management pages

### Phase 6: Move Files by Feature (Batch 4: Admin)

- [ ] **Step 6.1:** Move admin components
  - `src/components/admin/*` → `features/admin/components/`

- [ ] **Step 6.2:** Move admin service
  - `src/lib/adminService.ts` → `features/admin/services/adminService.ts`

- [ ] **Step 6.3:** Move admin hooks (verify usage first)
  - `src/lib/useLogFilter.ts` → `features/admin/hooks/useLogFilter.ts` (if admin-only)
  - `src/lib/useLogStats.ts` → `features/admin/hooks/useLogStats.ts` (if admin-only)
  - `src/lib/useLogStream.ts` → `features/admin/hooks/useLogStream.ts` (if admin-only)
  - `src/lib/useClientManagement.ts` → `features/admin/hooks/useClientManagement.ts` (if admin-only)
  - `src/lib/useProfileSync.ts` → `features/admin/hooks/useProfileSync.ts` (if admin-only)

- [ ] **Step 6.4:** Move admin API
  - `src/api/admin.api.ts` → `features/admin/api/adminApi.ts`

- [ ] **Step 6.5:** Update all imports for admin feature
  - `@/components/admin/*` → `@/features/admin/components/*`
  - `@/lib/adminService` → `@/features/admin/services/adminService`
  - `@/api/admin.api` → `@/features/admin/api/adminApi`

- [ ] **Step 6.6:** Build and test
  - `npm run build`
  - Fix import errors
  - Test admin pages

### Phase 7: Move Files by Feature (Batch 5: Development Tools)

- [ ] **Step 7.1:** Move AI tools
  - `src/ai/*` → `features/devel-tools/ai/`

- [ ] **Step 7.2:** Move OMAI
  - `src/omai/*` → `features/devel-tools/omai/`

- [ ] **Step 7.3:** Move tools
  - `src/tools/*` → `features/devel-tools/tools/`

- [ ] **Step 7.4:** Move OMLearn (or create new feature)
  - `src/modules/OMLearn/*` → `features/devel-tools/omlearn/` OR `features/omlearn/`

- [ ] **Step 7.5:** Move dev tool hooks
  - `src/lib/useComponentRegistry.ts` → `features/devel-tools/hooks/useComponentRegistry.ts`
  - `src/lib/useInspectorState.ts` → `features/devel-tools/hooks/useInspectorState.ts`

- [ ] **Step 7.6:** Move dev tool components
  - `src/components/ComponentInspector.tsx` → `features/devel-tools/components/ComponentInspector.tsx`
  - `src/components/VisualRegressionDashboard.tsx` → `features/devel-tools/components/VisualRegressionDashboard.tsx`
  - `src/components/VRTSettingsPanel.tsx` → `features/devel-tools/components/VRTSettingsPanel.tsx`
  - `src/components/GitOpsPanel.tsx` → `features/devel-tools/components/GitOpsPanel.tsx`
  - `src/components/registry/*` → `features/devel-tools/components/registry/`
  - `src/components/terminal/*` → `features/devel-tools/components/terminal/`
  - `src/components/ui-tools/*` → `features/devel-tools/components/ui-tools/`

- [ ] **Step 7.7:** Move OMAI editor bridge
  - `src/lib/om-ai/editorBridge.ts` → `features/devel-tools/om-ai/editorBridge.ts`

- [ ] **Step 7.8:** Update all imports for devel-tools feature
  - Update all imports from `src/ai/*`, `src/omai/*`, `src/tools/*`, `src/modules/OMLearn/*`, etc.

- [ ] **Step 7.9:** Build and test
  - `npm run build`
  - Fix import errors
  - Test dev tools pages

### Phase 8: Move Files by Feature (Batch 6: Apps)

- [ ] **Step 8.1:** Move app API services
  - `src/lib/apps/*` → `features/apps/{app}/api/` (one file per app)

- [ ] **Step 8.2:** Move app contexts
  - `src/context/BlogContext/` → `features/apps/blog/context/BlogContext.tsx`
  - `src/context/ChatContext/` → `features/apps/chat/context/ChatContext.tsx`
  - `src/context/EcommerceContext/` → `features/apps/ecommerce/context/EcommerceContext.tsx`
  - `src/context/EmailContext/` → `features/apps/email/context/EmailContext.tsx`
  - `src/context/InvoiceContext/` → `features/apps/invoice/context/InvoiceContext.tsx`
  - `src/context/NotesContext/` → `features/apps/notes/context/NotesContext.tsx`
  - `src/context/TicketContext/` → `features/apps/tickets/context/TicketContext.tsx`
  - `src/context/kanbancontext/` → `features/apps/kanban/context/KanbanContext.tsx`
  - `src/context/ConatactContext/` → `features/apps/contacts/context/ContactContext.tsx` (fix typo)
  - `src/context/UserDataContext/` → `features/apps/user-profile/context/UserDataContext.tsx` (if app-specific)

- [ ] **Step 8.3:** Update all imports for apps feature
  - Update all imports from `src/lib/apps/*` and `src/context/{App}Context/*`

- [ ] **Step 8.4:** Build and test
  - `npm run build`
  - Fix import errors
  - Test app pages

### Phase 9: Move Files by Feature (Batch 7: Headlines)

- [ ] **Step 9.1:** Move headlines components
  - `src/components/headlines/*` → `features/headlines/components/`

- [ ] **Step 9.2:** Update imports
  - `@/components/headlines/*` → `@/features/headlines/components/*`

- [ ] **Step 9.3:** Build and test
  - `npm run build`
  - Fix import errors

### Phase 10: Cleanup and Verification

- [ ] **Step 10.1:** Remove empty directories
  - Remove `src/records/` if empty
  - Remove `src/ai/` if empty
  - Remove `src/omai/` if empty
  - Remove `src/tools/` if empty
  - Remove `src/modules/OMLearn/` if moved
  - Remove empty `src/lib/apps/` if empty
  - Remove empty `src/context/` subdirectories if moved

- [ ] **Step 10.2:** Verify no broken imports
  - Run full build
  - Run linter
  - Fix any remaining import errors

- [ ] **Step 10.3:** Update barrel exports
  - Remove or split `src/features/records-centralized/index.ts` if it creates cycles
  - Update any other barrel exports that create cycles

- [ ] **Step 10.4:** Verify circular dependencies are resolved
  - Run dependency graph analysis
  - Document any remaining cycles

- [ ] **Step 10.5:** Update documentation
  - Update README with new structure
  - Update any architecture docs

- [ ] **Step 10.6:** Final build and test
  - Full build
  - Run test suite (if exists)
  - Manual testing of key features

---

## 7. Risk Assessment Summary

| Risk Level | Count | Items |
|------------|-------|-------|
| **LOW** | ~60 | Most feature-specific files with clear ownership |
| **MEDIUM** | ~15 | Files that may be shared (liturgicalService, orthodoxCalendarService, useLog*, useClientManagement, useProfileSync, enhancedTableStore, FieldRenderer) |
| **HIGH** | ~5 | Files with unknown usage or potential circular dependencies (barrel exports, cross-feature imports) |

**High-Risk Items Requiring Verification:**
1. `src/store/enhancedTableStore.ts` - Used by records but may be shared
2. `src/lib/liturgicalService.ts` - May be used by both church and records
3. `src/lib/orthodoxCalendarService.ts` - May be used by both church and records
4. `src/components/FieldRenderer/` - May be shared across features
5. `src/features/records-centralized/index.ts` - Barrel export may create cycles

---

## 8. Notes and Considerations

1. **Merging Features:** Consider merging `features/records/` into `features/records-centralized/` or vice versa to avoid duplication.

2. **Shared Services:** If `liturgicalService` or `orthodoxCalendarService` are used by both church and records, consider:
   - Keeping them in `src/lib/` (if truly shared)
   - Creating `features/shared/services/` (if only shared between 2-3 features)
   - Duplicating with feature-specific wrappers (if implementations diverge)

3. **Context Consolidation:** Some contexts may be redundant (e.g., `RecordsContext` vs `ChurchRecordsContext`). Review and consolidate after moves.

4. **Import Path Updates:** Use codemod or script to update imports automatically. Manual updates are error-prone.

5. **Build Frequency:** Build after each phase (7 builds total) to catch errors early. Don't wait until the end.

6. **Testing:** Test each feature after its phase completes. Don't defer all testing to the end.

---

**End of Refactor Inventory**
