# Frontend Backup Comparison

## Overview

This directory contains comparison results between:
- **Backup**: `09-25/src-9-30-25-working` (September 2025 backup)
- **Current**: `front-end/src` (current production code)

## Files Generated

1. **investigation.csv** - Raw comparison data (CSV format, can be opened in Excel)
2. **investigation.xlsx** - Excel workbook (generated from CSV)

## Comparison Summary

Based on the scan:
- **Total files in backup**: ~5,722 files
- **Total files in current**: ~1,945 files
- **Files only in backup**: ~4,142 files
- **Files only in current**: ~365 files
- **Files in both**: ~1,580 files

## Columns in Report

1. **File Path** - Relative path from source directory
2. **Status** - One of:
   - "Only in Backup" - File exists only in September backup
   - "Only in Current" - File exists only in current code
   - "Modified" - File exists in both but size changed
   - "Unchanged" - File exists in both with same size
3. **Backup Size (bytes)** - File size in backup
4. **Backup Lines** - Line count in backup (N/A in fast mode)
5. **Current Size (bytes)** - File size in current
6. **Current Lines** - Line count in current (N/A in fast mode)
7. **Size Diff (bytes)** - Difference in file size
8. **Lines Diff** - Difference in line count (N/A in fast mode)
9. **Size Change %** - Percentage change in size
10. **Backup Path** - Full path to backup file
11. **Current Path** - Full path to current file

## Scripts Used

- `tools/compare_frontend_backup_fast.ps1` - Fast comparison (size only, no line counting)
- `tools/compare_frontend_backup_optimized.ps1` - Full comparison (includes line counting, slower)
- `tools/csv_to_excel.ps1` - Converts CSV to Excel format

## Generating the Report

### Step 1: Run Comparison (if not already done)

```powershell
cd z:\
powershell -ExecutionPolicy Bypass -File tools/compare_frontend_backup_fast.ps1
```

This creates `prod/docs/investigation.csv`

### Step 2: Convert to Excel

```powershell
cd z:\
powershell -ExecutionPolicy Bypass -File tools/csv_to_excel.ps1
```

This creates `prod/docs/investigation.xlsx`

## Notes

- The fast comparison script skips line counting for speed (marked as "N/A")
- For full line counts, use `compare_frontend_backup_optimized.ps1` (much slower)
- CSV files can be opened directly in Excel if Excel conversion fails
- Excluded directories: `node_modules`, `.git`, `dist`, `build`, `.next`

## Analysis Tips

1. **Filter by Status** in Excel to see:
   - Files removed since September (Only in Backup)
   - New files added (Only in Current)
   - Modified files (Modified)

2. **Sort by Size Diff** to find largest changes

3. **Use Excel filters** to focus on specific file types or directories

4. **Check "Only in Backup"** files to identify what was removed/deleted

5. **Check "Only in Current"** files to identify new additions
