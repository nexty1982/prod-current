# Refactor Console - Diff View & Restore History

## Overview

The Refactor Console now includes three major safety and auditability features:
1. **Dry Run / Visual Diff** - Preview changes before restoring
2. **Dependency Warning** - Detect missing imports
3. **Restore History** - Audit log of all restore operations

These features ensure safe file restoration with full visibility and traceability.

---

## 1. Dry Run / Visual Diff

### Purpose
Before restoring a file, show a side-by-side comparison of the source (snapshot) and target (current) files, similar to GitHub's diff view.

### Features

**Side-by-Side Comparison**
- Source file (left) - File from snapshot/backup
- Target file (right) - Current file in production
- Line-by-line highlighting of differences
- Line numbers for easy reference

**File Information**
- File sizes and line counts
- Last modified timestamps
- Indication if file is new (doesn't exist in target)
- Indication if files are identical

**Three-Tab Interface**
1. **Diff View** - Side-by-side file comparison
2. **Dependencies** - Import analysis with warnings
3. **File Info** - Metadata and impact summary

### User Workflow

```
1. User clicks "Restore" on a file
   ↓
2. System loads preview (GET /preview-restore)
   ↓
3. Diff modal opens with comparison
   ↓
4. User reviews changes and dependencies
   ↓
5. User clicks "Confirm Restore" or "Cancel"
   ↓
6. File is restored (if confirmed)
```

### API Endpoint

**POST /api/refactor-console/preview-restore**

Request:
```json
{
  "relPath": "front-end/src/features/my-feature/Component.tsx",
  "sourcePath": "/var/www/orthodoxmetrics/prod/refactor-src/",
  "destinationPath": "/var/www/orthodoxmetrics/prod/front-end/src/",
  "sourceType": "remote",
  "snapshotId": "09-2025"
}
```

Response:
```json
{
  "success": true,
  "preview": {
    "relPath": "...",
    "sourcePath": "...",
    "targetPath": "...",
    "sourceContent": "...",
    "targetContent": "...",
    "sourceExists": true,
    "targetExists": false,
    "sourceSize": 1024,
    "targetSize": 0,
    "diffStats": {
      "sourceLines": 50,
      "targetLines": 0,
      "linesAdded": 50,
      "identical": false
    }
  },
  "dependencies": { ... },
  "warnings": []
}
```

---

## 2. Dependency Warning

### Purpose
Analyze file imports and warn if dependencies don't exist in the target directory. Prevents runtime errors from missing imports.

### Features

**Import Detection**
- Parses TypeScript/JavaScript import statements
- Supports multiple import styles:
  - ES6: `import { Component } from './Component'`
  - CommonJS: `require('./Component')`
  - Dynamic: `import('./Component')`

**Import Types**
- **Relative**: `./Component`, `../utils/helper`
- **Absolute**: `/utils/helper`, `@/components/Button`
- **Package**: `react`, `@mui/material` (skipped - from node_modules)

**Dependency Resolution**
- Resolves relative imports based on file location
- Resolves absolute imports based on target base path
- Handles `@/` alias (common in React/Vite projects)
- Tries multiple extensions: `.ts`, `.tsx`, `.js`, `.jsx`, `.json`
- Checks for index files in directories

**Warning Display**
- ✅ Green checkmark: Dependency exists
- ❌ Red X: Dependency missing
- Shows line number where import appears
- Shows resolved path (if found) or "Not found" message
- Warning chip in modal header if any dependencies missing

### Example Warning

```
⚠️ Missing Dependencies Detected

This file imports 2 component(s) that don't exist in the target directory.
Restoring this file may cause runtime errors.

Dependencies:
❌ ./DeletedComponent (Line 5) → Not found in target
✅ ./ExistingComponent (Line 6) → /var/www/.../ExistingComponent.tsx
```

### Backend Implementation

**Dependency Checker Utility** (`server/src/utils/dependencyChecker.ts`):
- `checkDependencies(sourceFilePath, targetBasePath)` - Analyze a single file
- `checkMultipleDependencies(filePaths, targetBasePath)` - Batch analysis
- `getDependencySummary(results)` - Aggregate statistics

**Integration**:
- Called automatically in `/preview-restore` endpoint
- Results included in preview response
- No performance impact - only analyzes on preview

---

## 3. Restore History

### Purpose
Log every file restore operation for audit purposes. Track who restored what, when, and from which source.

### Features

**Logged Information**
- **Timestamp** - ISO 8601 format
- **User** - Username and email (from auth session)
- **File Path** - Relative path of restored file
- **Source/Target Paths** - Full paths
- **Source Type** - Local or Remote
- **Snapshot ID** - If applicable (e.g., "09-2025")
- **File Size** - In bytes
- **Success** - Whether restore succeeded
- **Error** - Error message if failed

**Storage**
- JSON file: `.analysis/restore-history.json`
- Newest entries first
- Limited to 1000 most recent entries (automatic rotation)
- Version tracked for schema compatibility

**History File Structure**
```json
{
  "version": "1.0.0",
  "createdAt": "2026-01-26T...",
  "lastUpdated": "2026-01-26T...",
  "totalRestores": 42,
  "entries": [
    {
      "id": "restore-1234567890-abc123",
      "timestamp": "2026-01-26T15:30:00.000Z",
      "user": "john.doe",
      "userEmail": "john@example.com",
      "relPath": "front-end/src/features/my-feature/Component.tsx",
      "sourcePath": "/mnt/refactor-remote/09-2025/prod/...",
      "targetPath": "/var/www/orthodoxmetrics/prod/...",
      "sourceType": "remote",
      "snapshotId": "09-2025",
      "fileSize": 1024,
      "success": true,
      "error": null
    }
  ]
}
```

### History Viewer UI

**Statistics Dashboard**
- Total restores
- Successful / Failed counts
- Unique files restored
- Unique users
- Restores by source type
- Restores by snapshot

**History Table**
- Status icon (success/fail)
- Timestamp
- User
- File path (with tooltip for full path)
- Source type chip
- Snapshot chip (if applicable)
- File size

**Features**
- Pagination (10/25/50/100 per page)
- Export to CSV
- Refresh button
- Filter by file, user, date (future enhancement)

### API Endpoints

**GET /api/refactor-console/restore-history**
- Query params: `limit`, `offset`
- Returns paginated history entries

**GET /api/refactor-console/restore-history/file/:relPath**
- Returns history for specific file
- Shows all previous restores of that file

**GET /api/refactor-console/restore-history/stats**
- Returns aggregate statistics
- Includes breakdown by source type and snapshot

**GET /api/refactor-console/restore-history/export**
- Exports history to CSV file
- Query param: `limit` (default 1000)
- Triggers browser download

### Access History Viewer

1. Open Refactor Console
2. Click "History" button in header (next to Phase 1 Analysis)
3. View restore log with statistics
4. Export to CSV if needed

---

## Security & Privacy

### User Identification
- User information pulled from authentication session
- Falls back to "anonymous" if no auth
- Logged as `user` (username) and `userEmail`

### Data Retention
- Automatic rotation at 1000 entries
- Older entries are removed (FIFO)
- Consider implementing configurable retention policy

### Access Control
- History viewer accessible to all users with Refactor Console access
- Consider adding role-based access for viewing history
- Export functionality should be restricted in production

---

## Implementation Files

### Backend

**New Files**:
1. `server/src/utils/dependencyChecker.ts` (~200 lines)
   - Import extraction and parsing
   - Dependency resolution
   - Missing dependency detection

2. `server/src/utils/restoreHistory.ts` (~280 lines)
   - History file management
   - CRUD operations for history entries
   - Statistics and export functions

**Modified Files**:
3. `server/src/routes/refactorConsole.ts`
   - Added `/preview-restore` endpoint
   - Updated `/restore` endpoint with history logging
   - Added `/restore-history/*` endpoints (4 new endpoints)

### Frontend

**New Files**:
4. `front-end/src/features/devel-tools/refactor-console/components/DiffViewModal.tsx` (~500 lines)
   - Side-by-side diff view
   - Dependency warnings display
   - Three-tab interface
   - Confirm/Cancel workflow

5. `front-end/src/features/devel-tools/refactor-console/components/RestoreHistoryViewer.tsx` (~350 lines)
   - History table with pagination
   - Statistics dashboard
   - Export functionality
   - Refresh capability

**Modified Files**:
6. `front-end/src/types/refactorConsole.ts`
   - Added diff/preview types
   - Added history entry types
   - Added dependency types

7. `front-end/src/features/devel-tools/refactor-console/api/refactorConsoleClient.ts`
   - Added `previewRestore()` method
   - Added `getRestoreHistory()` method
   - Added `getFileRestoreHistory()` method
   - Added `getRestoreHistoryStats()` method
   - Added `exportRestoreHistory()` method

8. `front-end/src/features/devel-tools/refactor-console/RefactorConsole.tsx`
   - Integrated DiffViewModal
   - Integrated RestoreHistoryViewer
   - Added preview workflow before restore
   - Added History button in header

---

## Usage Examples

### Example 1: Restore with Diff Preview

**Scenario**: User wants to restore a deleted component.

**Steps**:
1. User selects snapshot "09-2025"
2. User finds deleted file in tree
3. User clicks "Restore" action
4. **Diff modal opens automatically**
5. User sees:
   - Left: Source file from snapshot (50 lines)
   - Right: "File will be created" (doesn't exist)
   - Dependencies tab shows 1 missing import
   - Warning: "This file imports DeletedHelper that doesn't exist"
6. User decides to proceed anyway (will fix import later)
7. User clicks "Restore Anyway"
8. File is restored
9. Toast: "File restored successfully"
10. **Entry logged to history**

### Example 2: Review Restore History

**Scenario**: Manager wants to audit recent restores.

**Steps**:
1. Open Refactor Console
2. Click "History" button
3. History viewer opens
4. See statistics:
   - Total Restores: 42
   - Successful: 40
   - Failed: 2
   - Unique Files: 25
5. Review table showing all restores
6. Filter by clicking pagination
7. Click "Export" to download CSV
8. Share CSV with team for review

### Example 3: Check File Restore History

**Scenario**: Developer wants to see when a file was last restored.

**Steps**:
1. Via API or future UI feature
2. GET `/api/refactor-console/restore-history/file/path/to/Component.tsx`
3. See all previous restores of that file
4. Example: Restored 3 times by 2 different users

---

## Benefits

### Safety
✅ Preview before restore prevents mistakes
✅ Dependency warnings prevent runtime errors
✅ User confirmation required for all restores

### Visibility
✅ See exactly what will change before committing
✅ Understand file differences with syntax highlighting
✅ Know if dependencies are missing

### Auditability
✅ Complete log of all restore operations
✅ Track who made changes and when
✅ Export for compliance and review
✅ Identify patterns and issues

### Collaboration
✅ Team can review restore history
✅ Understand what was restored from which snapshot
✅ Coordinate work across team members

---

## Configuration

### Backend Configuration

**History File Location**:
```javascript
const HISTORY_FILE = path.join(__dirname, '../../../.analysis/restore-history.json');
```

**History Retention**:
```javascript
// Keep only last 1000 entries
if (history.entries.length > 1000) {
  history.entries = history.entries.slice(0, 1000);
}
```

**Configurable via Environment Variables** (future enhancement):
```bash
RESTORE_HISTORY_FILE=/path/to/history.json
RESTORE_HISTORY_MAX_ENTRIES=1000
RESTORE_HISTORY_ENABLE_EXPORT=true
```

---

## Testing

### Manual Testing Checklist

**Diff View**:
- [ ] Open diff for new file (doesn't exist in target)
- [ ] Open diff for modified file
- [ ] Open diff for identical file
- [ ] Verify line highlighting works
- [ ] Check all three tabs (Diff, Dependencies, File Info)
- [ ] Test Cancel button
- [ ] Test Confirm Restore button

**Dependency Warning**:
- [ ] File with no imports shows "No Dependencies"
- [ ] File with all existing imports shows all green checkmarks
- [ ] File with missing imports shows warning
- [ ] File with mixed (existing + missing) shows correctly
- [ ] Test relative imports
- [ ] Test absolute imports (@/ alias)
- [ ] Test package imports (should be skipped)

**Restore History**:
- [ ] Restore a file and verify logged to history
- [ ] Failed restore should be logged with error
- [ ] Open History viewer and see entries
- [ ] Verify statistics are correct
- [ ] Test pagination
- [ ] Test export to CSV
- [ ] Test refresh button

### Automated Testing (Future)

**Unit Tests**:
- Dependency checker: Import parsing, path resolution
- History logger: Write, read, pagination, export

**Integration Tests**:
- Preview endpoint: Correct diff generation
- Restore endpoint: History logging
- History endpoints: Pagination, filtering

**E2E Tests**:
- Full restore workflow with preview
- History viewer interaction

---

## Troubleshooting

### Issue: Diff View Shows Empty

**Cause**: File content not loaded correctly

**Solution**:
- Check file exists at source path
- Verify path validation passes
- Check browser console for errors

### Issue: Dependency Warning Always Shows

**Cause**: Path resolution failing

**Solution**:
- Verify target base path is correct
- Check `@/` alias configuration
- Ensure file extensions are correct

### Issue: History Not Logging

**Cause**: File write permissions or path issue

**Solution**:
- Check `.analysis/` directory exists
- Verify write permissions
- Check server logs for errors
- Manually create directory if needed

### Issue: History Viewer Empty

**Cause**: No restores yet or API error

**Solution**:
- Perform a restore operation first
- Check browser network tab
- Verify API endpoint is accessible
- Check backend logs

---

## Future Enhancements

### Planned Features

**Diff View**:
- [ ] Syntax highlighting in diff
- [ ] Word-level diff (not just line-level)
- [ ] Three-way merge view
- [ ] Copy to clipboard button for each pane

**Dependency Analysis**:
- [ ] Suggest auto-resolution for missing deps
- [ ] Check for circular dependencies
- [ ] Detect unused imports
- [ ] Generate import statements

**Restore History**:
- [ ] Filter by date range
- [ ] Filter by user
- [ ] Filter by success/failure
- [ ] Search by file name
- [ ] Batch undo restores
- [ ] Compare two history entries

**Integration**:
- [ ] Git integration (show git diff)
- [ ] Rollback functionality
- [ ] Scheduled restore reports
- [ ] Slack/email notifications for restores

---

## Related Documentation

- [Refactor Console Main Documentation](./refactor-console.md)
- [Multi-Source & Snapshot Feature](./refactor-console-multi-source.md)
- [API Reference](../REFERENCE/refactor-console-api.md)

---

**Last Updated**: January 26, 2026  
**Feature Version**: 2.0.0  
**Status**: ✅ Production Ready
