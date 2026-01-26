# Refactor Console - Gap Analysis Feature

## Overview

The Gap Analysis feature allows you to compare your current production codebase with the September 2025 backup to identify:
- **Missing files**: Files that existed in the backup but are missing in production
- **Modified files**: Files that exist in both but have been modified (different MD5 hash)
- **New files**: Files that exist in production but weren't in the backup

## How to Use

### 1. Enable Recovery Mode

1. Navigate to the Refactor Console (`/devel/refactor-console`)
2. Click the **"Recovery Mode"** button in the toolbar
3. The button will turn purple when enabled
4. The scan will automatically refresh with gap analysis enabled

### 2. View Recovery Status

Files are visually marked with recovery status indicators:

- **Purple border/icon**: Missing in production (exists in backup only)
- **Orange border/icon**: Modified since backup (different hash)
- **Green border/icon**: New file (not in backup)
- **Gray icon**: Unchanged since backup

### 3. Filter by Recovery Status

When Recovery Mode is enabled, additional filters appear:

- **"Show missing files only"** checkbox - Shows only files missing in production
- **Quick filter buttons**:
  - **Missing** - Files that need to be restored
  - **Modified** - Files that have changed since backup
  - **New Files** - Files created after backup

### 4. Sort by Recovery Status

Additional sort options appear when Recovery Mode is enabled:

- **Recovery Status (Missing First)** - Prioritizes missing files
- **Recovery Status (New First)** - Shows new files first

### 5. Restore Missing Files

1. Find a file marked as "MISSING" (purple indicator)
2. Hover over the file to see action buttons
3. Click the **restore icon** (↻) button
4. Confirm the restoration in the dialog
5. The file will be copied from backup to production
6. The scan will refresh automatically to show updated status

## Backend Configuration

The backup path is configured in `server/src/routes/refactorConsole.ts`:

```typescript
const BACKUP_ROOT = '/var/www/orthodoxmetrics/backup';
```

**Update this path** if your September 2025 backup is stored in a different location.

## API Endpoints

### GET `/api/refactor-console/scan?compareWithBackup=1`

Performs a scan with gap analysis enabled.

**Query Parameters:**
- `rebuild` (optional): Set to `1` to force a rebuild (ignore cache)
- `compareWithBackup` (optional): Set to `1` to enable gap analysis

**Response:**
- Includes `gapAnalysisEnabled: true` when enabled
- Includes `backupPath` in response
- Summary includes `missingInProd`, `modifiedSinceBackup`, `newFiles` counts
- File nodes include `recoveryStatus`, `backupPath`, and `hash` fields

### POST `/api/refactor-console/restore`

Restores a file from backup to production.

**Request Body:**
```json
{
  "relPath": "front-end/src/features/devel-tools/refactor-console/RefactorConsole.tsx"
}
```

**Response:**
```json
{
  "success": true,
  "message": "File restored: front-end/src/features/...",
  "restoredPath": "/var/www/orthodoxmetrics/prod/front-end/src/..."
}
```

## Recovery Status Types

- `missing_in_prod`: File exists in backup but not in production
- `modified_since_backup`: File exists in both but MD5 hash differs
- `new_file`: File exists in production but not in backup
- `unchanged`: File exists in both with same hash

## Visual Indicators

### Tree View
- **Purple left border + purple background**: Missing file
- **Orange left border + orange background**: Modified file
- **Green left border + green background**: New file
- **No border**: Unchanged file

### Badges
- **MISSING** badge (purple): Missing in production
- **MODIFIED** badge (orange): Modified since backup
- **NEW** badge (green): New file
- **UNCHANGED** badge (gray): Unchanged

### Icons
- **FileX icon** (purple): Missing file indicator
- **AlertTriangle icon** (orange): Modified file indicator
- **FileCheck icon** (green): New file indicator
- **CheckCircle icon** (gray): Unchanged file indicator

## Statistics Summary

When Recovery Mode is enabled, the stats summary shows:

1. **Missing in Prod** (purple) - Count of files that need restoration
2. **Modified** (orange) - Count of files changed since backup
3. **New Files** (green) - Count of new files created
4. **Production Ready** (green) - Files classified as production-ready
5. **Legacy/Duplicates** (red) - Legacy or duplicate files

## Use Cases

### Identify Lost Logic
- Enable Recovery Mode
- Filter by "Missing" status
- Review files that existed in September but are gone now
- Restore critical files

### Review Manual Changes
- Enable Recovery Mode
- Sort by "Recently Modified"
- Filter by "Modified" status
- Review files changed since backup to identify accidental duplicates

### Prioritize Critical Files
- Enable Recovery Mode
- Filter by "Missing" + "Orange" classification (High Risk)
- Focus on missing files that affect auth or core providers
- Restore them first

## Technical Details

### Hash Comparison
Files are compared using MD5 hashes of their content. This ensures accurate detection of modifications even if file metadata (timestamps) differ.

### Backup Directory Structure
The backup should mirror the production structure:
```
/var/www/orthodoxmetrics/backup/
├── front-end/
│   └── src/
└── server/
```

### Performance
- Gap analysis adds ~30-60 seconds to scan time (depending on backup size)
- Results are cached for 10 minutes (same as regular scans)
- Use `rebuild=1` to force a fresh scan

## Troubleshooting

### Backup Directory Not Found
If you see a warning about backup directory not found:
1. Check that `BACKUP_ROOT` in `refactorConsole.ts` points to the correct location
2. Verify the backup directory exists and is readable
3. Ensure the backup has the same structure as production

### Files Not Showing as Missing
- Ensure the backup directory structure matches production
- Check that relative paths are consistent between backup and prod
- Verify file extensions match (case-sensitive on Linux)

### Restore Fails
- Check file permissions on production directory
- Verify backup file exists and is readable
- Check server logs for detailed error messages

## Future Enhancements

Potential improvements:
- Bulk restore multiple files
- Preview diff before restoring modified files
- Export recovery report
- Integration with git to track restored files
- Automatic backup verification
