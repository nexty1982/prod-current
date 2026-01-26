# Decommissioning Requirements (Mandatory)

**These requirements MUST be executed as the final phase of every task that involves refactoring, adding new features, or modifying existing code paths.**

## Purpose

Prevent technical debt accumulation by identifying and removing legacy/duplicate code paths, ensuring only the canonical implementation remains in the codebase.

## Three Categories of Decommissioning

Decommissioning must cover **all three categories** below, with proof provided for each:

### Category 1: Duplicate Implementations

**Definition:** Multiple pages/tools/components doing the same job.

**What to Look For:**
- Multiple route files handling the same feature
- Duplicate UI components with similar functionality
- Alternative implementations of the same tool/page
- Multiple API wrappers for the same endpoints

**Investigation Steps:**
1. Search for feature name variations across codebase
2. Compare functionality of duplicate implementations
3. Identify which is referenced in Router.tsx and MenuItems.ts
4. Check git history to see which is actively maintained

**Tools:**
```bash
# Find duplicate route files
find server/routes -name "*feature*.js"
grep -r "feature-name" server/routes

# Find duplicate components
find front-end/src -name "*Feature*" -o -name "*feature*"
grep -r "feature-name" front-end/src

# Find duplicate API wrappers
grep -r "feature-name" front-end/src/api
```

**Required Proof:**
- List of duplicate implementations found
- Confirmation of which is referenced in Router.tsx/MenuItems.ts
- List of files deleted
- Grep results showing no remaining references

---

### Category 2: Deprecated Code Paths

**Definition:** Old endpoints, old provisioning methods, or outdated implementation patterns that have been superseded.

**What to Look For:**
- Old API endpoints that are no longer used
- Legacy provisioning methods (e.g., old church creation flows)
- Deprecated route handlers
- Old utility functions replaced by new implementations
- Commented-out or disabled code paths

**Investigation Steps:**
1. Check `server/index.js` for mounted routes
2. Compare old vs new endpoint implementations
3. Search for references to old endpoints in frontend
4. Check for deprecated provisioning methods
5. Review migration history/comments

**Tools:**
```bash
# Check mounted routes
grep -n "app.use.*feature" server/index.js

# Find old endpoint references
grep -r "old-endpoint" server/
grep -r "old-endpoint" front-end/src/

# Find deprecated provisioning methods
grep -r "provision\|wizard\|bootstrap\|seed" server/ | grep -i "old\|legacy\|deprecated"
```

**Required Proof:**
- List of deprecated endpoints/methods identified
- Confirmation of which paths are actually mounted/used
- List of deprecated files/functions removed
- Grep results showing no remaining references to deprecated paths
- Evidence that new implementation is being used instead

---

### Category 3: Legacy Storage Mechanisms

**Definition:** Old storage methods (e.g., localStorage, file-based, old DB tables) that have been superseded by new storage (e.g., database-backed, new schema).

**What to Look For:**
- localStorage usage when DB storage is now available
- File-based storage when DB storage exists
- Old database tables/columns that are no longer used
- Multiple storage mechanisms for the same data
- Migration from one storage to another

**Investigation Steps:**
1. Identify what data is stored and where
2. Check for multiple storage locations for same data
3. Verify which storage mechanism is actively used
4. Check for migration code or dual-write patterns
5. Identify localStorage keys that should be migrated

**Tools:**
```bash
# Find localStorage usage
grep -r "localStorage" front-end/src/
grep -r "sessionStorage" front-end/src/

# Find file-based storage
grep -r "fs\.writeFile\|fs\.readFile" server/
grep -r "multer\|upload" server/routes

# Find database storage
grep -r "INSERT INTO\|UPDATE.*SET" server/routes
grep -r "getAppPool\|getChurchDbConnection" server/

# Find old table references
grep -r "old_table_name\|legacy_table" server/
```

**Required Proof:**
- List of legacy storage mechanisms identified
- Confirmation of which storage is actively used
- Evidence of data migration (if applicable)
- List of legacy storage code removed
- Grep results showing no remaining references to legacy storage
- Confirmation that new storage mechanism is being used

---

## Mandatory Steps (Apply to All Categories)

### Step 1: Identify All Instances

For each category, systematically search and document:
- **Category 1:** All duplicate implementations
- **Category 2:** All deprecated code paths
- **Category 3:** All legacy storage mechanisms

### Step 2: Confirm Production Usage

- Check which implementation/path/storage is actually used
- Verify Router.tsx and MenuItems.ts references
- Check server/index.js for mounted routes
- Review active code paths vs commented/disabled code

### Step 3: Remove Unused Code

**Backend:**
- Delete unused route files
- Remove unused handler functions
- Delete deprecated utility modules
- Remove unused middleware
- Drop unused database tables (if safe)

**Frontend:**
- Delete unused API wrapper methods
- Remove deprecated components/pages
- Clean up unused hooks/utilities
- Consolidate duplicate directories
- Remove localStorage keys (after migration)

### Step 4: Update Callers

- Find all references to old implementations/paths/storage
- Replace with new implementation
- Update imports
- Fix broken references
- Migrate data if needed (Category 3)

### Step 5: Provide Proof for Each Category

**Required Deliverables:**

1. **Category 1 Proof (Duplicate Implementations):**
   - List of duplicate implementations found
   - Which one is referenced in Router.tsx/MenuItems.ts
   - List of duplicate files deleted
   - Grep results: `grep -r "duplicate-feature" front-end/src/` → NO RESULTS

2. **Category 2 Proof (Deprecated Code Paths):**
   - List of deprecated endpoints/methods
   - Which paths are mounted in server/index.js
   - List of deprecated files deleted
   - Grep results: `grep -r "old-endpoint" server/` → NO RESULTS

3. **Category 3 Proof (Legacy Storage Mechanisms):**
   - List of legacy storage mechanisms
   - Which storage is actively used
   - Data migration evidence (if applicable)
   - List of legacy storage code removed
   - Grep results: `grep -r "localStorage.*old-key" front-end/src/` → NO RESULTS
   - Confirmation new storage is being used

4. **Build Verification (All Categories):**
   ```bash
   # Backend
   cd server && npm run build  # or equivalent
   
   # Frontend
   cd front-end && npm run build
   cd front-end && npm run typecheck  # if TypeScript
   ```

## Example Checklist

For each task, complete this checklist for **ALL THREE CATEGORIES**:

### Category 1: Duplicate Implementations
- [ ] Identified all duplicate implementations
- [ ] Confirmed which is referenced in Router.tsx and MenuItems.ts
- [ ] Removed duplicate route files
- [ ] Removed duplicate components/pages
- [ ] Removed duplicate API wrappers
- [ ] Updated all callers to use canonical implementation
- [ ] **Proof:** Grep results show no remaining references to duplicates
- [ ] **Proof:** List of deleted duplicate files provided

### Category 2: Deprecated Code Paths
- [ ] Identified all deprecated endpoints/methods
- [ ] Confirmed which paths are mounted in server/index.js
- [ ] Removed deprecated route handlers
- [ ] Removed deprecated utility functions
- [ ] Removed deprecated middleware
- [ ] Updated all callers to use new endpoints
- [ ] **Proof:** Grep results show no remaining references to deprecated paths
- [ ] **Proof:** List of deleted deprecated files provided

### Category 3: Legacy Storage Mechanisms
- [ ] Identified all legacy storage mechanisms (localStorage, files, old DB tables)
- [ ] Confirmed which storage is actively used
- [ ] Migrated data from legacy to new storage (if applicable)
- [ ] Removed legacy storage code
- [ ] Removed unused localStorage keys
- [ ] Removed unused database tables/columns (if safe)
- [ ] Updated all code to use new storage mechanism
- [ ] **Proof:** Grep results show no remaining references to legacy storage
- [ ] **Proof:** Evidence that new storage is being used
- [ ] **Proof:** List of removed legacy storage code provided

### Build Verification (All Categories)
- [ ] Confirmed backend builds successfully
- [ ] Confirmed frontend builds successfully
- [ ] Confirmed frontend typechecks successfully (if TypeScript)
- [ ] **Proof:** Build output/logs provided

## Proof Requirements Summary

For each decommissioning task, provide:

1. **Category 1 Proof (Duplicates):**
   - List of duplicates found
   - Which is canonical (Router.tsx/MenuItems.ts reference)
   - Files deleted
   - Grep proof: no remaining references

2. **Category 2 Proof (Deprecated Paths):**
   - List of deprecated paths
   - Which are mounted (server/index.js)
   - Files deleted
   - Grep proof: no remaining references

3. **Category 3 Proof (Legacy Storage):**
   - List of legacy storage mechanisms
   - Which is active
   - Migration evidence (if applicable)
   - Code removed
   - Grep proof: no remaining references
   - Proof new storage is used

4. **Build Proof (All Categories):**
   - Backend build success
   - Frontend build success
   - TypeScript typecheck success (if applicable)

## Notes

- **Safety First:** If unsure whether code is used, check git history, search for references, and verify with team before deleting
- **Documentation:** Update any documentation that references removed paths
- **Git:** Commit decommissioning changes separately with clear message: `chore: remove legacy [feature] implementation`
- **Data Migration:** For Category 3, ensure data is migrated before removing legacy storage code
- **Backward Compatibility:** Consider if legacy paths need to remain for backward compatibility (document if so)

---

**This document should be referenced at the end of every refactoring/feature task.**
