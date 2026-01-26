# Phase 1: Discovery & Gap Analysis - Implementation Guide

## Overview

Phase 1 performs a comprehensive one-way mapping analysis comparing the September 2025 backup (`refactor-src/`) with the current production codebase (`front-end/src/`). It identifies restorable files, verifies dependencies, checks API endpoints, and provides integration guidance.

## Architecture

### Backend Service
**File**: `server/src/services/phase1RecoveryAnalysis.ts`

**Main Function**: `performPhase1Analysis()`

**Key Features**:
1. **Directory Comparison**: Compares `refactor-src/` with `front-end/src/`
2. **MD5 Hash Comparison**: Identifies modified files (different hashes)
3. **Documentation Scanning**: Extracts API endpoints from `docs/**/*.md`
4. **Server Route Verification**: Checks if endpoints exist in `server/src/routes/`
5. **Import Analysis**: Uses ts-morph to resolve import dependencies
6. **AST Integration Points**: Finds MenuItems.ts and Router.tsx for integration guidance

### API Endpoint
**Route**: `GET /api/refactor-console/phase1-analysis`

**Response**: `Phase1Report` JSON object

**Example**:
```bash
curl http://localhost:3001/api/refactor-console/phase1-analysis
```

### Frontend Integration
**Component**: `RefactorConsole.tsx`

**Features**:
- "Phase 1 Analysis" button in header
- Displays restorable files list
- Shows dependency and endpoint status
- Requirement Preview modal for detailed analysis
- JSON report export functionality

## Path Mapping

### Source (Backup)
- **Path**: `/var/www/orthodoxmetrics/prod/refactor-src/`
- **Purpose**: Read-only source for comparison
- **Status**: Files here are candidates for restoration

### Target (Live)
- **Path**: `/var/www/orthodoxmetrics/prod/front-end/src/`
- **Purpose**: Current production codebase
- **Protection**: Files with different MD5 hashes are marked as `modified_in_target` and protected from overwrite

## File Status Types

1. **`missing_in_target`**: File exists in backup but not in production → **Restorable**
2. **`modified_in_target`**: File exists in both but MD5 hash differs → **Protected** (won't overwrite)
3. **`identical`**: File exists in both with same hash → No action needed
4. **`exists_only_in_target`**: File exists in production but not in backup → New file

## Documentation Scanning

### Endpoint Extraction Patterns

The scanner searches for endpoints using these patterns:
- `GET /api/path`
- `POST /api/path`
- `` `GET /api/path` ``
- `## API Reference` sections
- `Endpoint:` labels

### Endpoint Verification

For each endpoint found in docs:
1. Scans all files in `server/src/routes/**/*.{js,ts}`
2. Searches for route definitions matching the endpoint path
3. Marks as `existsInServer: true/false`
4. Records the route file where found

## Dependency Analysis

### Import Resolution

For each restorable file:
1. Extracts all `import` statements using ts-morph
2. Attempts to resolve relative imports (`./`, `../`)
3. Checks for file existence with common extensions (`.ts`, `.tsx`, `.js`, `.jsx`)
4. Verifies alias imports (`@/`) resolve correctly
5. Marks node_modules imports as resolved

### Resolution Status

- **`resolved: true`**: Import path resolves to an existing file
- **`resolved: false`**: Import path cannot be resolved
- **`error`**: Error message if resolution failed

## AST Integration Points

### MenuItems.ts
- **Location**: `front-end/src/layouts/full/vertical/sidebar/MenuItems.ts`
- **Purpose**: Find where to add menu items for restored features
- **Output**: Line number and code block showing array structure

### Router.tsx
- **Location**: `front-end/src/routes/Router.tsx`
- **Purpose**: Find where to add routes for restored features
- **Output**: Line number and code block showing route structure

## Report Structure

```typescript
interface Phase1Report {
  generatedAt: string;
  sourcePath: string;
  targetPath: string;
  summary: {
    totalFilesInSource: number;
    missingInTarget: number;      // Restorable files
    modifiedInTarget: number;     // Protected files
    identical: number;
    existsOnlyInTarget: number;
  };
  restorableFiles: FileComparison[];
  modifiedFiles: FileComparison[];
  documentation: {
    endpointsFound: number;
    endpointsVerified: number;     // Found in server routes
    endpointsMissing: number;     // Not found in server routes
  };
  files: FileAnalysis[];          // Detailed analysis per file
  integrationPoints: {
    menuItems: ASTIntegrationPoint | null;
    router: ASTIntegrationPoint | null;
  };
}
```

## Usage

### 1. Run Phase 1 Analysis

Click the **"Phase 1 Analysis"** button in Refactor Console header.

### 2. View Restorable Files

After analysis completes:
- Restorable files are listed in a dedicated section
- Shows import and endpoint status for each file
- Click on a file to see detailed requirement preview

### 3. Requirement Preview Modal

Click any restorable file to open the modal showing:
- ✅/❌ Dependency status for all imports
- ✅/❌ Endpoint status (Found in Docs vs. Active in Server)
- Projected code blocks for Router.tsx and MenuItems.ts

### 4. Export JSON Report

Click **"Export JSON Report"** to download the complete analysis as JSON.

## Example Workflow

1. **Run Analysis**: Click "Phase 1 Analysis" button
2. **Review Summary**: Check stats for restorable files and endpoint verification
3. **Select File**: Click on a restorable file to see requirements
4. **Check Dependencies**: Verify all imports resolve (green checkmarks)
5. **Check Endpoints**: Verify required API endpoints exist in server
6. **Review Integration**: See projected code for Router and MenuItems
7. **Restore File**: Use restore action if dependencies are satisfied

## Constraints

### Read-Only Analysis
- **No file system writes**: Analysis only reads files, never writes
- **JSON report only**: Results are returned as JSON, not written to disk
- **Safe operation**: Can be run repeatedly without side effects

### Collision Protection
- Files with different MD5 hashes are marked as `modified_in_target`
- These files are **protected** from being overwritten
- Manual review required before restoring modified files

## Troubleshooting

### Backup Source Not Found
If `refactor-src/` doesn't exist:
- Check that backup directory is mounted/accessible
- Verify path: `/var/www/orthodoxmetrics/prod/refactor-src/`
- Update `BACKUP_SOURCE` constant if needed

### ts-morph Not Available
If ts-morph is not installed:
- Import analysis falls back to regex-based extraction
- Dependency resolution will be limited
- Install: `npm install ts-morph` in server directory

### Endpoints Not Found
If endpoints are marked as missing:
- Check that route files exist in `server/src/routes/`
- Verify endpoint path format matches route definitions
- Some endpoints may need to be implemented

## Integration with Refactor Console

Phase 1 analysis integrates seamlessly with the existing Refactor Console:
- Uses same UI components and styling
- Shares types and API client
- Can be run alongside regular scans
- Results displayed in dedicated section

## Next Steps

After Phase 1 analysis:
1. Review restorable files and their requirements
2. Implement missing API endpoints if needed
3. Resolve import dependencies
4. Use projected code blocks to integrate features
5. Restore files one at a time, verifying each step
