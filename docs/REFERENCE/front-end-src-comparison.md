# Front-End Source Directories Comparison

**Date:** 2026-01-24  
**Comparison:** `front-end/src` vs `front-end/old-src/src`

---

## Executive Summary

| Metric | front-end/src | front-end/old-src/src | Difference |
|--------|---------------|----------------------|------------|
| **Total Files** | 1,795 | 1,571 | +224 files |
| **Total Size** | 55.44 MB | 23.64 MB | +31.79 MB |
| **Files Only Here** | 733 files | 509 files | - |
| **Files in Both** | 1,062 files | 1,062 files | - |
| **Critical Files** | ✅ All present | ✅ All present | - |
| **views/ directory** | ❌ Missing (0 files) | ✅ Present (233 files) | **CRITICAL** |
| **hooks/ directory** | ❌ Missing (0 files) | ✅ Present (15 files) | **CRITICAL** |

---

## File Count Comparison

### Overall Statistics
- **front-end/src:** 1,795 files
- **front-end/old-src/src:** 1,571 files
- **Difference:** +224 files in `front-end/src`

### Directory-by-Directory File Counts

| Directory | front-end/src | front-end/old-src/src | Difference |
|-----------|---------------|----------------------|------------|
| `routes/` | 1 | 1 | 0 |
| `layouts/` | 36 | 39 | -3 |
| `pages/` | 2 | 43 | **-41** |
| `views/` | **0** | **233** | **-233** ⚠️ |
| `hooks/` | **0** | **15** | **-15** ⚠️ |
| `utils/` | 19 | 19 | 0 |
| `context/` | 23 | 21 | +2 |
| `store/` | 2 | 2 | 0 |
| `components/` | 759 | 795 | -36 |
| `features/` | 592 | 1 | +591 |
| `shared/` | 19 | 0 | +19 |
| `api/` | 13 | 30 | -17 |

---

## Critical Files Status

### Files Present in Both
- ✅ `Router.tsx` → `routes/Router.tsx`
- ✅ `App.tsx` → root
- ✅ `main.tsx` → root
- ❌ `index.tsx` → Missing in both

---

## Directory Structure Comparison

### Directories in `front-end/src` (26 total)
- `@om/`, `ai/`, `api/`, `app/`, `assets/`, `auth/`, `components/`, `config/`, `constants/`, `context/`, `core/`, `data/`, `demos/`, `eCommerce/`, `examples/`, `features/`, `layouts/`, `legacy/`, `NavCollapse/`, `NavGroup/`, `NavItem/`, `pages/`, `routes/`, `shared/`, `store/`, `utils/`

### Directories in `front-end/old-src/src` (30 total)
- `@om/`, `ai/`, `api/`, `assets/`, `components/`, `config/`, `constants/`, `context/`, `contexts/`, `data/`, `demos/`, `examples/`, `features/`, `helpers/`, `hooks/`, `layouts/`, `modules/`, `omai/`, `pages/`, `records/`, `routes/`, `schemas/`, `services/`, `store/`, `styles/`, `theme/`, `tools/`, `types/`, `utils/`, `views/`

### Unique Directories

**Only in `front-end/src`:**
- `app/` - New application structure
- `auth/` - Authentication modules
- `core/` - Core functionality
- `eCommerce/` - E-commerce features
- `legacy/` - Legacy code
- `NavCollapse/`, `NavGroup/`, `NavItem/` - Navigation components
- `shared/` - Shared utilities

**Only in `front-end/old-src/src`:**
- `contexts/` - Additional context providers
- `helpers/` - Helper functions
- **`hooks/`** - **Custom React hooks (15 files)** ⚠️
- `modules/` - Module structure
- `omai/` - OM AI features
- `records/` - Records management
- `schemas/` - Schema definitions
- `services/` - Service layer
- `styles/` - Style files
- `theme/` - Theme configuration
- `tools/` - Development tools
- `types/` - TypeScript type definitions
- **`views/`** - **View components (233 files)** ⚠️

---

## Critical Missing Directories

### 1. `views/` Directory
- **Status:** ❌ **MISSING** in `front-end/src`
- **Status:** ✅ **PRESENT** in `front-end/old-src/src` (233 files)
- **Impact:** **CRITICAL** - Contains 233 view components including:
  - `admin/` (34 files)
  - `apps/` (52 files)
  - `authentication/` (17 files)
  - `blog/`, `charts/`, `dashboard/`, `demo/`, `forms/`
  - `mui-trees/`, `muicharts/`, `orthodox-calendar/`
  - `pages/`, `raydar/`, `react-tables/`, `records/`
  - `settings/`, `social/`, `spinner/`, `tables/`
  - `ui-components/`, `widgets/`

### 2. `hooks/` Directory
- **Status:** ❌ **MISSING** in `front-end/src`
- **Status:** ✅ **PRESENT** in `front-end/old-src/src` (15 files)
- **Impact:** **HIGH** - Contains custom React hooks (14 `.ts` files, 1 `.tsx` file)

---

## File Overlap Analysis

### File Distribution
- **Files only in `front-end/src`:** 733 files
- **Files only in `front-end/old-src/src`:** 509 files
- **Files in both:** 1,062 files (shared/common)

### Sample Unique Files

**Only in `front-end/src`:**
- `account.ts`, `admin.api.ts`, `agGridModules.ts`, `constants.ts`
- `@om/components/features/liturgical-calendar-monthly.tsx`
- `app/api/chat-ai/` directory (new AI features)
- `api/account.ts`, `api/admin.api.ts.bak`

**Only in `front-end/old-src/src`:**
- `index.css`, `test-grid.tsx`, `Test.tsx`, `vite-env.d.ts`
- `@om/components/MIGRATION_LOG.md`, `@om/components/README.md`
- `api/client-management.api.ts`, `api/memories.api.ts`
- `api/metrics.api.ts`, `api/orthodox-metrics.api.ts`
- **All files in `views/` directory (233 files)**
- **All files in `hooks/` directory (15 files)**

## Key Differences

### 1. Architecture Evolution
- **`front-end/src`:** More modern structure with `features/` (592 files) and `shared/` directories
- **`front-end/old-src/src`:** Traditional structure with `views/` (233 files) and `modules/`

### 2. Feature Organization
- **`front-end/src`:** Features organized in `features/` directory (592 files)
- **`front-end/old-src/src`:** Features scattered across `views/`, `modules/`, `records/`, etc.

### 3. Missing Critical Components
- **`views/`:** 233 files missing - likely contains many page components
- **`hooks/`:** 15 files missing - custom React hooks
- **`pages/`:** Only 2 files vs 43 in old-src (likely moved to `views/`)

### 4. Size Difference
- **`front-end/src`:** 55.44 MB (larger due to new features, assets, and expanded `features/` directory)
- **`front-end/old-src/src`:** 23.64 MB (smaller, more compact structure)
- **Difference:** +31.79 MB (likely due to new features, images, and expanded codebase)

---

## Recommendations

### Immediate Actions
1. **Restore `views/` directory** from `front-end/old-src/src/views/` to `front-end/src/views/`
2. **Restore `hooks/` directory** from `front-end/old-src/src/hooks/` to `front-end/src/hooks/`
3. **Review `pages/` directory** - Only 2 files vs 43 in old-src (check if content moved to `views/`)

### Migration Strategy
1. **Copy missing directories:**
   ```bash
   cp -r front-end/old-src/src/views front-end/src/
   cp -r front-end/old-src/src/hooks front-end/src/
   ```

2. **Verify imports** - Check if any files reference `views/` or `hooks/` paths

3. **Test application** - Ensure restored directories don't break builds

4. **Gradual migration** - Consider migrating `views/` content to `features/` structure over time

---

## Notes

- The `front-end/src` appears to be a newer, more organized structure with features-based organization
- The `front-end/old-src/src` contains the traditional view-based structure
- Both directories have critical files (`Router.tsx`, `App.tsx`, `main.tsx`) present

### Critical Finding: Import Analysis

**`node_modules` vs Source Code:**
- `node_modules` contains **135,562 files** - these are npm dependencies (packages from `package.json`)
- `node_modules` does **NOT** contain your source code (`views/`, `hooks/`, etc.)
- `node_modules` is fine and contains what's needed to run `npm run dev` (dependencies)
- However, **your source code** (`front-end/src/`) is what actually runs

**Import References Found:**
- ✅ **34 files import from `@/hooks/`** - These will **FAIL** if `hooks/` directory is missing
- ❌ **0 files import from `views/`** - `views/` directory may not be needed (Router uses `features/` instead)

**Conclusion:**
- `hooks/` directory **IS CRITICAL** - 34 imports will break without it
- `views/` directory **may NOT be needed** - no imports found, Router.tsx uses `features/` structure

---

## Next Steps

1. ✅ Document comparison (this file)
2. ⏳ Restore `views/` directory from `old-src` (optional - no imports found)
3. ✅ **Restore `hooks/` directory from `old-src`** - **COMPLETED**
   - ✅ 15 hooks files restored
   - ✅ Critical hooks present: `useClientManagement`, `useComponentRegistry`, `useGlobalErrorStore`, `useInspectorState`, `useLiturgicalCalendar`
   - ✅ **`useAuth` fixed** - Created `useAuth.ts` that re-exports from `@/context/AuthContext`
4. ⏳ Verify application builds correctly
5. ✅ Check for import references to `views/` and `hooks/` - **COMPLETED** (34 imports found for hooks, 0 for views)
6. ⏳ Test application functionality

---

## Restoration Status

### ✅ hooks/ Directory - RESTORED (2026-01-24)
- **Source:** `front-end/old-src/src/hooks/`
- **Destination:** `front-end/src/hooks/`
- **Files restored:** 15 files
- **Total files in front-end/src:** 1,810 (up from 1,795)
- **Status:** ✅ Successfully restored

**Hooks restored:**
1. `useClientManagement.ts` ✅
2. `useComponentRegistry.ts` ✅
3. `useDynamicMenuPermissions.ts` ✅
4. `useFilteredMenuItems.ts` ✅
5. `useGlobalErrorStore.tsx` ✅
6. `useInspectorState.ts` ✅
7. `useLiturgicalCalendar.ts` ✅
8. `useLogFilter.ts` ✅
9. `useLogStats.ts` ✅
10. `useLogStream.ts` ✅
11. `useOcrJobs.ts` ✅
12. `useOcrSettings.ts` ✅
13. `useOcrTests.ts` ✅
14. `useOrthodoxCalendar.ts` ✅
15. `useProfileSync.ts` ✅
16. `useAuth.ts` ✅ **NEW** - Created to fix import path, re-exports from `@/context/AuthContext`

**Note:** `useAuth` was initially missing but has been **FIXED** by creating `useAuth.ts` in hooks directory that re-exports from `@/context/AuthContext`. This allows the existing import `@/hooks/useAuth` to work correctly.
