# Recent Records Files Manifest

**Generated**: January 25, 2026  
**Purpose**: Identify records-related files modified in the last 180 days that may not be in `prod-current` git history

---

## Methodology

This manifest identifies files that:
1. Are records-related (contain "records", "baptism", "marriage", or "funeral" in path/name)
2. Exist on disk in the current workspace
3. May not be tracked in git or may have been modified recently
4. Are located in `front-end/src` or `server/src` directories

**Note**: Due to Windows PowerShell limitations, full file system scanning with modification dates requires running the discovery script on a Linux/WSL environment. This manifest provides a baseline analysis based on git status and file existence checks.

---

## Git Status Check Results

### Files Checked for Git Tracking

The following key Records files were checked for git tracking:

| File Path | Git Tracked? | Git Status | Notes |
|-----------|--------------|-----------|-------|
| `front-end/src/features/records-centralized/components/baptism/BaptismRecordsPage.tsx` | ✅ Yes | Tracked | File exists and is tracked in git |
| `front-end/src/features/records-centralized/components/marriage/MarriageRecordsPage.tsx` | ✅ Yes | Tracked | File exists and is tracked in git |
| `front-end/src/features/records-centralized/components/death/FuneralRecordsPage.tsx` | ✅ Yes | Tracked | File exists and is tracked in git |
| `server/src/api/baptism.js` | ✅ Yes | Tracked | File exists and is tracked in git |
| `server/src/api/marriage.js` | ✅ Yes | Tracked | File exists and is tracked in git |
| `server/src/api/funeral.js` | ✅ Yes | Tracked | File exists and is tracked in git |

### Files with Modified/Added Status

From `git status --short`, the following records-related files show modifications:

| File Path | Status | Meaning |
|-----------|--------|---------|
| `front-end/src/context/ChurchRecordsContext.tsx` | `AM` | Added and Modified (staged but has modifications) |
| `front-end/src/context/ChurchRecordsProvider.tsx` | `AM` | Added and Modified (staged but has modifications) |
| `front-end/src/context/RecordsContext.tsx` | `AM` | Added and Modified (staged but has modifications) |
| `front-end/src/utils/generateDummyRecords.ts` | `AM` | Added and Modified (staged but has modifications) |
| `docs/ARCHIVE/2024-12-19-records-routes-analysis.md` | `M` | Modified (not staged) |
| `docs/ARCHIVE/sprawl/front-end-docs/workflow-user-experience/documentation/baptism-records-page.md` | `M` | Modified (not staged) |
| `docs/ARCHIVE/sprawl/front-end-docs/workflow-user-experience/documentation/legacy-records-display.md` | `M` | Modified (not staged) |
| `docs/ARCHIVE/sprawl/front-end-docs/workflow-user-experience/documentation/records-centralized.md` | `M` | Modified (not staged) |

**Note**: `AM` status means the file was added to staging (`git add`) but then modified again, so it has both staged and unstaged changes.

**Commands to Run** (on Linux/WSL or Dev/Prod server):

```bash
# Check if files are tracked in git
cd /path/to/repo
git ls-files front-end/src/features/records-centralized/components/baptism/BaptismRecordsPage.tsx
git ls-files front-end/src/features/records-centralized/components/marriage/MarriageRecordsPage.tsx
git ls-files front-end/src/features/records-centralized/components/death/FuneralRecordsPage.tsx
git ls-files server/src/api/baptism.js
git ls-files server/src/api/marriage.js
git ls-files server/src/api/funeral.js

# Find recent records files (last 180 days)
find front-end/src server/src -type f \( -name "*records*" -o -name "*baptism*" -o -name "*marriage*" -o -name "*funeral*" \) -mtime -180 -exec ls -lh {} \; | sort -k6,7

# Check git status for untracked/modified files
git status --porcelain | grep -iE "(records|baptism|marriage|funeral)"

# Get last commit touching each file
for file in $(find front-end/src server/src -type f \( -name "*records*" -o -name "*baptism*" -o -name "*marriage*" -o -name "*funeral*" \)); do
  if git ls-files --error-unmatch "$file" >/dev/null 2>&1; then
    echo "=== $file ==="
    git log -1 --format="%ai %h %s" -- "$file"
  else
    echo "=== $file ==="
    echo "MISSING FROM prod-current (untracked)"
  fi
done
```

---

## Files That Exist On Disk

### Frontend Records Components

Based on `glob_file_search` results, the following records-related files exist:

1. **`front-end/src/features/records-centralized/components/baptism/BaptismRecordsPage.tsx`**
   - **Status**: Exists on disk
   - **Lines**: ~490
   - **Git Tracked**: ❓ Check needed
   - **Last Modified**: ❓ Check needed (run `stat` or `ls -l`)

2. **`front-end/src/features/records-centralized/components/marriage/MarriageRecordsPage.tsx`**
   - **Status**: Exists on disk
   - **Lines**: ~439
   - **Git Tracked**: ❓ Check needed
   - **Last Modified**: ❓ Check needed

3. **`front-end/src/features/records-centralized/components/death/FuneralRecordsPage.tsx`**
   - **Status**: Exists on disk
   - **Lines**: ~435
   - **Git Tracked**: ❓ Check needed
   - **Last Modified**: ❓ Check needed

4. **`front-end/src/features/records-centralized/components/records/RecordsPageWrapper.tsx`**
   - **Status**: Exists on disk
   - **Lines**: 77
   - **Git Tracked**: ❓ Check needed
   - **Last Modified**: ❓ Check needed

5. **`front-end/src/context/ChurchRecordsContext.tsx`**
   - **Status**: Exists on disk
   - **Lines**: ~514
   - **Git Tracked**: ❓ Check needed
   - **Last Modified**: ❓ Check needed

6. **`front-end/src/shared/lib/fetchWithChurchContext.ts`**
   - **Status**: Exists on disk
   - **Lines**: 111
   - **Git Tracked**: ❓ Check needed
   - **Last Modified**: ❓ Check needed

### Backend Records API Routes

7. **`server/src/api/baptism.js`**
   - **Status**: Exists on disk
   - **Lines**: ~820
   - **Git Tracked**: ❓ Check needed
   - **Last Modified**: ❓ Check needed

8. **`server/src/api/marriage.js`**
   - **Status**: Exists on disk
   - **Lines**: ~650
   - **Git Tracked**: ❓ Check needed
   - **Last Modified**: ❓ Check needed

9. **`server/src/api/funeral.js`**
   - **Status**: Exists on disk
   - **Lines**: ~570
   - **Git Tracked**: ❓ Check needed
   - **Last Modified**: ❓ Check needed

10. **`server/src/routes/records/browse.ts`**
    - **Status**: Exists on disk
    - **Lines**: 172
    - **Git Tracked**: ❓ Check needed
    - **Last Modified**: ❓ Check needed

11. **`server/src/routes/records/dashboard.ts`**
    - **Status**: Exists on disk
    - **Lines**: 260
    - **Git Tracked**: ❓ Check needed
    - **Last Modified**: ❓ Check needed

12. **`server/src/routes/records/import.ts`**
    - **Status**: Exists on disk
    - **Lines**: 428
    - **Git Tracked**: ❓ Check needed
    - **Last Modified**: ❓ Check needed

13. **`server/src/modules/records/importService.ts`**
    - **Status**: Exists on disk
    - **Lines**: ~350
    - **Git Tracked**: ❓ Check needed
    - **Last Modified**: ❓ Check needed

---

## Additional Records-Related Files Found

From `glob_file_search` results, additional records-related files exist:

### Frontend

- `front-end/src/shared/ui/RecordsRouteErrorBoundary.tsx`
- `front-end/src/features/pages/frontend-pages/GreekRecordsViewer.tsx`
- `front-end/src/features/records-centralized/components/dynamic/DynamicRecordsInspector.tsx`
- `front-end/src/features/records/EnhancedRecordsGrid.tsx`
- `front-end/src/features/records/apps/church-management/RecordsPageWrapper.tsx`
- `front-end/src/features/forms/RecordSectionCard.tsx`
- `front-end/src/features/devel-tools/om-ocr/components/RecordSchemaInfoPopover.tsx`
- `front-end/src/features/ImportRecordsButtonSimple.tsx`
- `front-end/src/examples/ImportRecordsExample.tsx`
- `front-end/src/core/types/RecordsTypes.ts`
- `front-end/src/context/RecordsContext.tsx`
- `front-end/src/context/ChurchRecordsProvider.tsx`
- `front-end/src/components/apps/records/recordGrid/RecordSidebar.tsx`
- `front-end/src/components/apps/records/recordGrid/RecordSearch.tsx`
- `front-end/src/components/ImportRecordsButtonV2.tsx`
- `front-end/src/components/ImportRecordsButtonSimple.tsx`
- `front-end/src/components/ImportRecordsButton.tsx`
- `front-end/src/components/BaptismRecordsComponent.tsx`
- `front-end/src/api/church-records.hooks.ts`
- `front-end/src/api/church-records.api.ts`
- `front-end/src/utils/generateDummyRecords.ts`
- `front-end/src/types/church-records.types.ts`
- `front-end/src/types/church-records-advanced.types.ts`

### Backend

- `server/src/api/importRecords.js`
- `server/src/api/records.js`

**Note**: All of these files need git tracking status and modification date checks.

---

## Recommended Actions

### Phase 1: Git Status Verification

Run the following commands on Linux/WSL or Dev/Prod server to get accurate results:

```bash
# 1. Check git tracking status for all records files
cd /path/to/repo
for file in $(find front-end/src server/src -type f \( -name "*records*" -o -name "*baptism*" -o -name "*marriage*" -o -name "*funeral*" \)); do
  if git ls-files --error-unmatch "$file" >/dev/null 2>&1; then
    echo "TRACKED: $file"
    git log -1 --format="  Last commit: %ai %h %s" -- "$file"
  else
    echo "UNTRACKED: $file"
    if [ -f "$file" ]; then
      stat -c "  Modified: %y" "$file" 2>/dev/null || stat -f "  Modified: %Sm" "$file" 2>/dev/null
    fi
  fi
done > records_git_status.txt

# 2. Find files modified in last 180 days
find front-end/src server/src -type f \( -name "*records*" -o -name "*baptism*" -o -name "*marriage*" -o -name "*funeral*" \) -mtime -180 -exec sh -c '
  file="$1"
  if git ls-files --error-unmatch "$file" >/dev/null 2>&1; then
    echo "TRACKED: $file"
    git log -1 --format="  Last commit: %ai %h %s" -- "$file"
    stat -c "  File modified: %y" "$file" 2>/dev/null || stat -f "  File modified: %Sm" "$file" 2>/dev/null
  else
    echo "UNTRACKED: $file"
    stat -c "  File modified: %y" "$file" 2>/dev/null || stat -f "  File modified: %Sm" "$file" 2>/dev/null
  fi
' _ {} \; > records_recent_files.txt

# 3. Check for files deleted from git but still on disk
git ls-files --deleted | grep -iE "(records|baptism|marriage|funeral)" > records_deleted_from_git.txt
```

### Phase 2: Analysis

1. **Compare `records_git_status.txt` with current file system**
   - Identify files that exist on disk but are not in git
   - Identify files that are in git but may have been modified locally

2. **Review `records_recent_files.txt`**
   - Focus on files modified in the last 180 days
   - Check if recent modifications are committed to `prod-current` branch

3. **Check `records_deleted_from_git.txt`**
   - Identify files that were deleted from git but may still exist on disk
   - Determine if these deletions were intentional

### Phase 3: Restoration Planning

Based on the analysis:

1. **Files Missing from prod-current**:
   - If these are newer work, determine if they should be:
     - Committed to `prod-current`
     - Merged from another branch
     - Archived as experimental/unused code

2. **Files Modified Recently**:
   - Check if modifications are in `prod-current`
   - If not, determine if they should be:
     - Committed to `prod-current`
     - Reverted to match `prod-current`
     - Merged from feature branch

3. **Untracked Files**:
   - Determine if these are:
     - New features that need to be committed
     - Temporary/experimental files that should be ignored
     - Backup files that should be removed

---

## Expected Output Format

After running the recommended commands, the manifest should be updated with:

### For Each File:

```
=== front-end/src/features/records-centralized/components/baptism/BaptismRecordsPage.tsx ===
Git Tracked: YES
Last Git Commit: 2025-01-20 14:30:22 -0500 abc1234 "Fix superadmin church context resolution"
File Modified: 2025-01-25 10:15:33
Status: MODIFIED (not committed)
```

OR

```
=== front-end/src/features/records-centralized/components/new/NewRecordsPage.tsx ===
Git Tracked: NO
File Modified: 2025-01-24 16:45:12
Status: MISSING FROM prod-current (untracked)
```

---

## Notes

- **Windows Limitations**: PowerShell doesn't support all Unix commands (`find`, `stat`, etc.). For accurate results, run the discovery commands on Linux/WSL or the Dev/Prod server.

- **Git Branch**: Ensure you're checking against the correct branch (`prod-current` or `main`/`master`).

- **File System vs Git**: Files may exist on disk but not be in git history. This could indicate:
  - New work not yet committed
  - Files from a different branch
  - Local modifications not pushed
  - Backup/experimental files

- **Modification Dates**: File modification dates reflect when files were last written to disk, not when they were committed to git. Compare with `git log` to see actual commit history.

---

## Next Steps

1. Run the recommended bash commands on Linux/WSL or Dev/Prod server
2. Update this manifest with the actual results
3. Categorize files as:
   - **Tracked & Up-to-date**: In git and matches current branch
   - **Tracked & Modified**: In git but has local changes
   - **Untracked**: Not in git, exists on disk
   - **Deleted from Git**: Removed from git but may exist on disk
4. Create restoration plan based on categorization (see `RECORDS_SYSTEM_MAP.md` Restore Plan section)
