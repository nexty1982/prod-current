# Removable Files and Directories Analysis

**Date:** 2025-12-08  
**Scope:** `src/*` (excluding `src/features`)

## Summary

This document identifies files and directories in `src/` that can potentially be removed. Files are categorized by certainty level.

---

## HIGH CERTAINTY (90-100%) - Safe to Remove

### 1. Broken/Deprecated Files
- **`src/legacy/main.tsx.broken`** - Broken file, not imported anywhere
  - **Certainty:** 100%
  - **Reason:** Has `.broken` extension, clearly marked as broken

### 2. Deprecated API Files
- **`src/legacy/orthodox-metrics.api.ts`** - Deprecated API file
  - **Certainty:** 95%
  - **Reason:** 
    - File contains deprecation notice
    - Only self-references (exports empty object)
    - No imports found in codebase
    - Functionality moved to modular APIs (`admin.api.ts`, `user.api.ts`, `metrics.api.ts`)

### 3. Old Source Directory
- **`src/legacy/src-old/`** - Entire directory
  - **Certainty:** 95%
  - **Reason:**
    - Contains old API client and user-profile code
    - No imports found referencing this directory
    - Clearly marked as "old" in path name
  - **Contents:**
    - `api/`
    - `apiClient.ts`
    - `user-profile/`

---

## MEDIUM-HIGH CERTAINTY (70-89%) - Likely Safe to Remove

### 4. Demo Files
- **`src/demos/TableThemeEditor.tsx`** - Demo component
  - **Certainty:** 85%
  - **Reason:**
    - No imports found in codebase
    - Not referenced in Router.tsx
    - Demo/example file (typically not used in production)

### 5. Example Files
- **`src/examples/ImportRecordsExample.tsx`** - Example usage file
  - **Certainty:** 85%
  - **Reason:**
    - No imports found in codebase
    - Not referenced in Router.tsx
    - Example file (documentation/learning purpose)
- **`src/examples/RecordWorkflowExample.tsx`** - Example usage file
  - **Certainty:** 85%
  - **Reason:** Same as above

### 6. Sandbox Directory
- **`src/sandbox/field-mapper/`** - Sandbox/test code
  - **Certainty:** 80%
  - **Reason:**
    - Sandbox directory (typically for testing/experimentation)
    - Contains test files (`__tests__/field-mapper.spec.tsx`)
    - Not referenced in Router.tsx
    - May be experimental code
  - **Note:** Review before deletion - may contain useful components

---

## MEDIUM CERTAINTY (50-69%) - Review Before Removal

### 7. Legacy Directory Structure
- **`src/legacy/`** - Large legacy directory
  - **Certainty:** 60%
  - **Reason:**
    - Contains many subdirectories that may still be in use
    - Some files may be imported via relative paths
    - Needs careful review before bulk deletion
  - **Recommendation:** 
    - Review each subdirectory individually
    - Check for imports before removing
    - Start with clearly marked deprecated files

### 8. Test Files
- Various `*.test.tsx`, `*.spec.tsx` files
  - **Certainty:** 50%
  - **Reason:**
    - Test files may be needed for CI/CD
    - Some may be outdated, others may be active
    - Review individually

---

## LOW CERTAINTY (30-49%) - Keep for Now

### 9. Core Directories
These are likely in active use:
- `src/layouts/` - Layout components (likely used)
- `src/routes/` - Routing configuration (definitely used)
- `src/shared/` - Shared utilities (likely used)
- `src/context/` - React contexts (likely used)
- `src/components/` - Shared components (likely used)
- `src/lib/` - Library code (likely used)
- `src/utils/` - Utility functions (likely used)
- `src/types/` - TypeScript types (likely used)
- `src/theme/` - Theme configuration (likely used)
- `src/store/` - State management (likely used)

---

## Recommendations

### Immediate Actions (High Certainty)
1. ✅ **Delete** `src/legacy/main.tsx.broken`
2. ✅ **Delete** `src/legacy/orthodox-metrics.api.ts` (after verifying no imports)
3. ✅ **Delete** `src/legacy/src-old/` directory (after verifying no imports)

### Review Before Action (Medium-High Certainty)
4. 🔍 **Review** `src/demos/` - Check if TableThemeEditor is used anywhere
5. 🔍 **Review** `src/examples/` - Check if example files are referenced in docs
6. 🔍 **Review** `src/sandbox/` - Check if field-mapper components are used

### Future Cleanup (Medium Certainty)
7. 📋 **Audit** `src/legacy/` directory structure
   - Check each subdirectory for active usage
   - Create migration plan for any still-used legacy code
   - Move to `src/features/` if still needed

---

## Verification Commands

To verify before deletion, run:

```powershell
# Check for imports of orthodox-metrics.api.ts
Select-String -Path "src\**\*.tsx","src\**\*.ts" -Pattern "orthodox-metrics\.api|orthodMetricsAPI"

# Check for imports of demos
Select-String -Path "src\**\*.tsx","src\**\*.ts" -Pattern "from.*demos|import.*demos"

# Check for imports of examples
Select-String -Path "src\**\*.tsx","src\**\*.ts" -Pattern "from.*examples|import.*examples"

# Check for imports of src-old
Select-String -Path "src\**\*.tsx","src\**\*.ts" -Pattern "src-old"
```

---

## Files to Delete (High Certainty)

```
src/legacy/main.tsx.broken
src/legacy/orthodox-metrics.api.ts
src/legacy/src-old/ (entire directory)
```

## Directories to Review (Medium-High Certainty)

```
src/demos/
src/examples/
src/sandbox/
```

---

**Note:** Always verify imports before deletion. Some files may be imported using dynamic imports or string-based paths that are harder to detect.

