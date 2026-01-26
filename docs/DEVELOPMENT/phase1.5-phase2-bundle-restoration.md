# Phase 1.5 & Phase 2: Bundle Restoration & Automated Integration

## Overview

Phase 1.5 adds intelligent UI features for identifying feature bundles and verifying server-side readiness. Phase 2 implements autonomous restoration execution with automated system registration.

## Phase 1.5: Automated Status & Bundle Logic

### Components Created

#### 1. RestorationStatusBadge Component
**File**: `front-end/src/features/devel-tools/refactor-console/components/RestorationStatusBadge.tsx`

**Status States**:
- **Ready (Green)**: All imports resolved, all endpoints verified
- **Missing Deps (Yellow)**: Some imports missing but may exist in backup bundle
- **Server Blocker (Red)**: Required API endpoints not found in server
- **Unknown**: Status cannot be determined

**Features**:
- Visual badge with icon and color coding
- Shows bundle size when applicable
- Tooltip with detailed description

#### 2. Bundle Resolver Utility
**File**: `front-end/src/features/devel-tools/refactor-console/utils/bundleResolver.ts`

**Functions**:
- `calculateBundle(rootFile, allFiles, fileAnalyses)`: Recursively follows imports to build feature bundles
- `calculateAllBundles(restorableFiles, fileAnalyses)`: Creates bundles for all restorable files

**Bundle Structure**:
```typescript
interface FeatureBundle {
  rootFile: FileComparison;
  files: FileComparison[];           // All files in bundle
  components: FileComparison[];       // Component files
  hooks: FileComparison[];            // Hook files
  services: FileComparison[];        // Service files
  pages: FileComparison[];           // Page files
  allImportsResolved: boolean;
  missingImports: ImportDependency[];
  requiredEndpoints: EndpointReference[];
  status: 'ready' | 'missing_deps' | 'server_blocker' | 'unknown';
}
```

**Bundle Resolution Logic**:
1. Starts with root file (page or top-level file)
2. Recursively follows all import statements
3. Groups dependencies by category (components, hooks, services, pages)
4. Checks if imports resolve in backup or production
5. Maps required endpoints from documentation
6. Determines overall restoration status

#### 3. Updated useRefactorScan Hook
**File**: `front-end/src/features/devel-tools/refactor-console/hooks/useRefactorScan.ts`

**New Features**:
- `phase1Report`: Stores Phase 1 analysis results
- `bundles`: Map of calculated feature bundles
- `calculateBundle(rootFileRelPath)`: Get bundle for specific file

**Bundle Calculation**:
- Automatically calculates bundles when Phase 1 report is available
- Uses memoization for performance
- Updates when Phase 1 report changes

### Autonomous Requirements Mapping

The system automatically:
1. **Maps files to documentation**: Searches `docs/**/*.md` for endpoint references
2. **Verifies endpoints**: Checks if endpoints exist in `server/src/routes/`
3. **Resolves dependencies**: Follows import chains to identify all required files
4. **Categorizes files**: Groups into pages, components, hooks, services

## Phase 2: Autonomous Restoration Execution

### Backend Service

#### Bundle Restore Service
**File**: `server/src/services/bundleRestoreService.ts`

**Main Function**: `restoreBundle(request: RestoreBundleRequest)`

**Process**:
1. **File Restoration**:
   - Copies files from `refactor-src/` to `front-end/src/`
   - Creates target directories as needed
   - Uses `fs-extra` for atomic operations

2. **AST-Based Registration**:
   - **Router.tsx**: Adds route entry using ts-morph AST manipulation
   - **MenuItems.ts**: Adds menu item using ts-morph AST manipulation
   - Falls back to regex-based insertion if ts-morph unavailable

3. **Syntax Verification**:
   - Validates TypeScript/JavaScript syntax after modifications
   - Checks balanced brackets and parentheses
   - Attempts compilation with `tsc --noEmit`

4. **Rollback on Errors**:
   - If syntax check fails, restores backup files
   - Removes copied files if registration fails
   - Prevents application downtime

5. **Self-Healing**:
   - Restarts server using `pm2 restart orthodoxmetrics-server`
   - Refreshes scan data automatically

**API Endpoint**: `POST /api/refactor-console/restore-bundle`

**Request Body**:
```typescript
{
  bundleFiles: string[];      // Array of relative paths
  routePath?: string;         // Route path (e.g., '/apps/baptism')
  menuLabel?: string;         // Menu item label
  menuIcon?: string;          // Icon name (default: 'FileCode')
}
```

**Response**:
```typescript
{
  success: boolean;
  message: string;
  restoredFiles: string[];
  routeAdded?: boolean;
  menuItemAdded?: boolean;
  rollbackPerformed?: boolean;
}
```

### Frontend Components

#### RestoreBundleButton Component
**File**: `front-end/src/features/devel-tools/refactor-console/components/RestoreBundleButton.tsx`

**Features**:
- Shows restoration status badge
- Displays bundle size
- Confirmation dialog before restoration
- Auto-generates route path and menu label
- Calls restore API endpoint
- Refreshes analysis after completion

**Restoration Flow**:
1. User clicks "Restore Bundle"
2. Confirmation dialog appears
3. User confirms
4. API call with bundle files and metadata
5. Success/error toast notification
6. Auto-refresh Phase 1 analysis and scan

### Updated RefactorConsole Component

**New Features**:
- Displays bundles instead of individual files
- Shows bundle composition (components, hooks, services)
- Restore Bundle button for each bundle
- Requirement preview integration
- Export JSON report functionality

## Usage Workflow

### Step 1: Run Phase 1 Analysis
1. Click "Phase 1 Analysis" button
2. Wait for analysis to complete
3. Review summary statistics

### Step 2: Review Bundles
1. View restorable bundles section
2. Check status badges:
   - ✅ **Ready**: Safe to restore
   - ⚠️ **Missing Deps**: May need additional files
   - ❌ **Server Blocker**: Endpoints missing
3. Click eye icon to view detailed requirements

### Step 3: Restore Bundle
1. Click "Restore Bundle" on ready bundle
2. Confirm restoration in dialog
3. System automatically:
   - Copies files from backup
   - Adds route to Router.tsx
   - Adds menu item to MenuItems.ts
   - Verifies syntax
   - Restarts server
   - Refreshes scan

### Step 4: Verify Restoration
1. Check restored files appear in scan
2. Verify route appears in Router.tsx
3. Verify menu item appears in MenuItems.ts
4. Test restored feature in application

## Safety Features

### Collision Protection
- Files with different MD5 hashes are protected
- Modified files cannot be overwritten
- Manual review required for conflicts

### Syntax Verification
- TypeScript compilation check after AST modifications
- Balanced bracket/parenthesis validation
- Automatic rollback on syntax errors

### Rollback Mechanism
- Backup files created before modifications
- Automatic restoration on errors
- Prevents application downtime

### Error Handling
- Comprehensive try-catch blocks
- Detailed error messages
- Graceful degradation (regex fallback if ts-morph unavailable)

## Technical Details

### AST Manipulation
- Uses ts-morph for TypeScript AST parsing
- Finds route/menu arrays using variable declarations
- Adds elements to array literals
- Saves and verifies syntax

### Regex Fallback
- Pattern matching for route/menu arrays
- String manipulation for insertion
- Used when ts-morph unavailable

### Server Restart
- Uses `pm2 restart orthodoxmetrics-server`
- 30-second timeout
- Non-blocking (doesn't fail entire operation)

## Constraints

### Read-Only Analysis
- Phase 1 analysis is read-only
- No file system writes during analysis
- JSON report only

### Write Operations
- Phase 2 restoration writes to file system
- Requires proper permissions
- Creates backup files before modifications

### ts-morph Dependency
- Optional dependency
- Falls back to regex if unavailable
- Recommended for best results

## Troubleshooting

### Bundles Not Showing
- Ensure Phase 1 analysis completed successfully
- Check that restorable files exist
- Verify bundle calculation logic

### Restoration Fails
- Check file permissions
- Verify backup source exists
- Review server logs for errors
- Check syntax verification output

### Syntax Errors After Restoration
- Automatic rollback should occur
- Check backup files in same directory
- Manual restoration may be needed

### Server Restart Fails
- Check pm2 is installed and configured
- Verify server process name
- Check system permissions

## Future Enhancements

1. **Batch Operations**: Restore multiple bundles at once
2. **Dependency Graph Visualization**: Visual representation of bundle dependencies
3. **Dry Run Mode**: Preview changes without applying
4. **Conflict Resolution UI**: Interactive conflict resolution
5. **Restoration History**: Track restoration operations
6. **Undo Functionality**: Reverse restoration operations
