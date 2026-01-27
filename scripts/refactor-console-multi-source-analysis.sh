#!/bin/bash
# Refactor Console Multi-Source Analysis Script
# Collects information about files that need modification for Samba/Multi-source support

set -euo pipefail

echo "======================================================================"
echo "Refactor Console Multi-Source Implementation Analysis"
echo "======================================================================"
echo ""
echo "Task: Implement Multi-Source & Samba Support for Refactor Console"
echo "Date: $(date)"
echo ""

# Define colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Output file for detailed report
REPORT_FILE=".analysis/refactor-console-multi-source-plan.md"
mkdir -p "$(dirname "$REPORT_FILE")"

echo "Generating detailed analysis report: $REPORT_FILE"
echo ""

# Start building the report
cat > "$REPORT_FILE" << 'EOF'
# Refactor Console Multi-Source Implementation Plan

## Overview

This document outlines the changes needed to implement multi-source and Samba support for the Refactor Console feature.

## Requirements Summary

1. **Backend - Samba Mount Integration**
   - Hardcode remote connection: `192.168.1.221:/var/refactor-src/`
   - Create utility in `server/src/utils/pathResolver.ts` to check if path is local or remote
   - Use `child_process` to ensure Samba share is mounted (to `/mnt/refactor-remote`)
   - Mount before scanning

2. **Backend - Dynamic Date-Folder Discovery**
   - Implement "Snapshot Scanner" that looks for `MM-YYYY/prod` pattern
   - Logic:
     - Scan source directory
     - Regex match folders formatted as `\d{2}-\d{4}`
     - If folder matches and contains `/prod` subdirectory, add to available snapshots
   - Return list of available snapshots to frontend

3. **Frontend - UI Enhancements**
   - Add "Source Type" toggle: [Local File System] | [Remote Samba]
   - Add "Snapshot Selection" dropdown populated with MM-YYYY folders from backend
   - When snapshot selected (e.g., `09-2025`), update sourcePath to: `/var/refactor-src/09-2025/prod`

4. **Backend - API Updates**
   - Ensure `/scan` and `/restore` endpoints handle deep-nested paths
   - Update directory tree generator to root at selected `MM-YYYY/prod` folder

---

## Files to Modify

EOF

# Function to check file existence and add to report
check_file() {
    local file="$1"
    local description="$2"
    local action="$3"
    
    echo "" >> "$REPORT_FILE"
    echo "### $file" >> "$REPORT_FILE"
    echo "" >> "$REPORT_FILE"
    echo "**Description**: $description" >> "$REPORT_FILE"
    echo "" >> "$REPORT_FILE"
    echo "**Required Changes**: $action" >> "$REPORT_FILE"
    echo "" >> "$REPORT_FILE"
    
    if [ -f "$file" ]; then
        echo -e "${GREEN}✓${NC} Found: $file"
        echo "**Status**: ✅ File exists" >> "$REPORT_FILE"
        
        # Get line count
        local lines=$(wc -l < "$file")
        echo "**Current size**: $lines lines" >> "$REPORT_FILE"
        echo "" >> "$REPORT_FILE"
        echo "\`\`\`" >> "$REPORT_FILE"
        echo "Current location: $file" >> "$REPORT_FILE"
        echo "Lines: $lines" >> "$REPORT_FILE"
        echo "\`\`\`" >> "$REPORT_FILE"
    else
        echo -e "${YELLOW}⚠${NC}  Need to create: $file"
        echo "**Status**: ⚠️ File needs to be created" >> "$REPORT_FILE"
    fi
    
    echo "" >> "$REPORT_FILE"
}

# Analyze backend files
echo -e "${BLUE}=== Backend Files ===${NC}"
echo ""

check_file \
    "server/src/utils/pathResolver.ts" \
    "New utility to handle local vs remote path resolution and Samba mount management" \
    "- Create new file
- Implement isSambaPath(path: string): boolean
- Implement ensureSambaMounted(): Promise<void>
- Implement getMountPoint(remotePath: string): string
- Use child_process.exec to check mount status
- Use child_process.exec to mount if not mounted
- Hardcode remote connection: 192.168.1.221:/var/refactor-src/
- Mount to /mnt/refactor-remote"

check_file \
    "server/src/utils/snapshotScanner.ts" \
    "New utility to discover MM-YYYY/prod snapshot folders" \
    "- Create new file
- Implement scanForSnapshots(sourcePath: string): Promise<Snapshot[]>
- Regex pattern: /^\d{2}-\d{4}$/
- Check for /prod subdirectory
- Return array of {id: string, label: string, path: string, date: Date}
- Sort by date descending"

check_file \
    "server/src/routes/refactorConsole.ts" \
    "Main API routes file - needs updates to handle dynamic source paths and snapshots" \
    "- Add GET /api/refactor-console/snapshots endpoint
  - Import snapshotScanner
  - Call scanForSnapshots with source path
  - Return list of available snapshots
- Update GET /api/refactor-console/scan endpoint
  - Accept 'sourceType' query param: 'local' | 'remote'
  - Accept 'snapshotId' query param (e.g., '09-2025')
  - If remote, call ensureSambaMounted() before scanning
  - If snapshotId provided, append '/MM-YYYY/prod' to source path
  - Pass resolved path to performScan()
- Update POST /api/refactor-console/restore endpoint
  - Support dynamic source paths with snapshots
  - Ensure Samba is mounted if remote
  - Resolve full path before restore
- Update performScan() function signature
  - Accept sourcePath parameter
  - Update all glob patterns to use dynamic sourcePath
  - Update path resolution logic
- Update directory tree generator
  - Root at the selected snapshot folder
  - Adjust relative path calculation"

# Analyze frontend files
echo -e "${BLUE}=== Frontend Files ===${NC}"
echo ""

check_file \
    "front-end/src/features/devel-tools/refactor-console/RefactorConsole.tsx" \
    "Main React component - needs UI enhancements for source type and snapshot selection" \
    "- Add state for sourceType: 'local' | 'remote'
- Add state for selectedSnapshot: string | null
- Add state for availableSnapshots: Snapshot[]
- Add useEffect to load available snapshots on mount
- Add Source Type toggle component (Radio group or Switch)
  - Local File System
  - Remote Samba
- Add Snapshot Selection dropdown
  - Only show when snapshots are available
  - Populate with availableSnapshots
  - Show label (e.g., 'September 2025 (09-2025)')
  - OnChange: update selectedSnapshot state
- Update refreshScan() to pass sourceType and snapshotId
- Update Path Configuration panel
  - Show current source type
  - Show current snapshot if selected
  - Update validation to support snapshot paths"

check_file \
    "front-end/src/features/devel-tools/refactor-console/api/refactorConsoleClient.ts" \
    "API client - needs new methods for fetching snapshots and updated scan parameters" \
    "- Add fetchSnapshots(sourcePath?: string): Promise<Snapshot[]>
  - GET /api/refactor-console/snapshots
- Update scan() method signature
  - Add sourceType?: 'local' | 'remote'
  - Add snapshotId?: string
  - Append to query params
- Update restore() method
  - Add sourceType parameter
  - Add snapshotId parameter
- Update validatePaths() if needed
  - Support snapshot path validation"

check_file \
    "front-end/src/types/refactorConsole.ts" \
    "TypeScript types - needs new interfaces for snapshots and source types" \
    "- Add SourceType type: 'local' | 'remote'
- Add Snapshot interface:
  - id: string (e.g., '09-2025')
  - label: string (e.g., 'September 2025')
  - path: string (full path)
  - date: string (ISO date)
- Update PathConfig interface
  - Add sourceType?: SourceType
  - Add snapshotId?: string
- Update RefactorScan interface
  - Add sourceType?: SourceType
  - Add snapshotId?: string
  - Update sourcePath to reflect resolved path"

# Add additional considerations
cat >> "$REPORT_FILE" << 'EOF'

---

## Implementation Steps (Recommended Order)

1. **Create Backend Utilities**
   - Create `pathResolver.ts` with Samba mount logic
   - Create `snapshotScanner.ts` with snapshot discovery logic
   - Test independently

2. **Update Backend API**
   - Add `/snapshots` endpoint
   - Update `/scan` endpoint with new parameters
   - Update `/restore` endpoint with new parameters
   - Test with manual API calls

3. **Update Frontend Types**
   - Add new TypeScript interfaces
   - Update existing interfaces

4. **Update API Client**
   - Add `fetchSnapshots()` method
   - Update `scan()` method signature
   - Update `restore()` method signature

5. **Update UI Component**
   - Add Source Type toggle
   - Add Snapshot Selection dropdown
   - Update state management
   - Connect to API client
   - Test UI interactions

6. **Integration Testing**
   - Test local source selection
   - Test remote Samba source selection
   - Test snapshot selection
   - Test scan with different configurations
   - Test restore with different configurations

---

## Security Considerations

- **Path Traversal**: Ensure snapshot paths are validated and don't allow directory traversal
- **Samba Credentials**: Ensure Samba mount credentials are secure (consider using keyring or secure storage)
- **Mount Point Permissions**: Ensure `/mnt/refactor-remote` has correct permissions
- **Input Validation**: Validate all snapshot IDs and source types before use

---

## Testing Requirements

### Unit Tests
- `pathResolver.ts`: Test path detection, mount checking, mount execution
- `snapshotScanner.ts`: Test regex matching, directory scanning, sorting

### Integration Tests
- API endpoint `/snapshots`: Test snapshot discovery
- API endpoint `/scan`: Test with different sourceType and snapshotId combinations
- API endpoint `/restore`: Test with snapshot paths

### E2E Tests
- Full flow: Select remote source → Select snapshot → Scan → View results → Restore file

---

## Configuration

### Hardcoded Values (as per requirements)
- Remote Samba path: `192.168.1.221:/var/refactor-src/`
- Mount point: `/mnt/refactor-remote`
- Snapshot pattern: `\d{2}-\d{4}/prod`

### Environment Variables (optional enhancements)
Consider making these configurable via environment variables in the future:
- `REFACTOR_SAMBA_REMOTE` (default: `192.168.1.221:/var/refactor-src/`)
- `REFACTOR_MOUNT_POINT` (default: `/mnt/refactor-remote`)

---

## Estimated Complexity

| File | Lines to Add/Modify | Complexity | Priority |
|------|-------------------|-----------|----------|
| `pathResolver.ts` | ~150 lines (new) | Medium | High |
| `snapshotScanner.ts` | ~100 lines (new) | Low | High |
| `refactorConsole.ts` (backend) | ~200 lines (modify) | High | High |
| `refactorConsole.ts` (types) | ~30 lines (add) | Low | Medium |
| `refactorConsoleClient.ts` | ~50 lines (modify) | Low | Medium |
| `RefactorConsole.tsx` | ~150 lines (modify) | Medium | Medium |

**Total Estimated Changes**: ~680 lines across 6 files

---

## Dependencies

### Backend
- `fs-extra`: Already in use
- `child_process`: Node.js built-in (for mount commands)
- `path`: Node.js built-in

### Frontend
- No new dependencies required
- Uses existing MUI components for UI

---

## Risks & Mitigation

1. **Risk**: Samba mount requires root/sudo permissions
   - **Mitigation**: Pre-configure `/etc/fstab` or use `autofs`, OR run server as user with mount permissions

2. **Risk**: Snapshot folders may not follow exact MM-YYYY/prod pattern
   - **Mitigation**: Make regex configurable, add fallback patterns

3. **Risk**: Large snapshot directories may slow down scanning
   - **Mitigation**: Add pagination or lazy loading for snapshot list

4. **Risk**: Network latency with remote Samba mount
   - **Mitigation**: Add loading indicators, implement caching

---

## Next Steps

1. **Review this plan** with stakeholders
2. **Decide on implementation approach**: All at once or phased?
3. **Create backup** of current implementation
4. **Begin with backend utilities** (pathResolver, snapshotScanner)
5. **Implement and test incrementally**

EOF

echo -e "${GREEN}✓${NC} Analysis complete!"
echo ""
echo "Report saved to: $REPORT_FILE"
echo ""

# Summary
echo "======================================================================"
echo "SUMMARY"
echo "======================================================================"
echo ""
echo "Files to create:"
echo "  - server/src/utils/pathResolver.ts"
echo "  - server/src/utils/snapshotScanner.ts"
echo ""
echo "Files to modify:"
echo "  - server/src/routes/refactorConsole.ts"
echo "  - front-end/src/types/refactorConsole.ts"
echo "  - front-end/src/features/devel-tools/refactor-console/api/refactorConsoleClient.ts"
echo "  - front-end/src/features/devel-tools/refactor-console/RefactorConsole.tsx"
echo ""
echo "Estimated changes: ~680 lines across 6 files"
echo ""
echo "======================================================================"
echo ""
echo "Please review the detailed report at: $REPORT_FILE"
echo ""
echo "Would you like to proceed with implementation after review?"
echo ""
