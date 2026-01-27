# Refactor Console Multi-Source Implementation Plan

**Generated:** $(date)

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

### server/src/utils/pathResolver.ts

**Description**: New utility to handle local vs remote path resolution and Samba mount management

**Required Changes**:
- Create new file
- Implement `isSambaPath(path: string): boolean`
- Implement `ensureSambaMounted(): Promise<void>`
- Implement `getMountPoint(remotePath: string): string`
- Use `child_process.exec` to check mount status
- Use `child_process.exec` to mount if not mounted
- Hardcode remote connection: `192.168.1.221:/var/refactor-src/`
- Mount to `/mnt/refactor-remote`

**Status**: ⚠️ File needs to be created

**Estimated Size**: ~150 lines

---

### server/src/utils/snapshotScanner.ts

**Description**: New utility to discover MM-YYYY/prod snapshot folders

**Required Changes**:
- Create new file
- Implement `scanForSnapshots(sourcePath: string): Promise<Snapshot[]>`
- Regex pattern: `/^\d{2}-\d{4}$/`
- Check for `/prod` subdirectory
- Return array of `{id: string, label: string, path: string, date: Date}`
- Sort by date descending

**Status**: ⚠️ File needs to be created

**Estimated Size**: ~100 lines

---

### server/src/routes/refactorConsole.ts

**Description**: Main API routes file - needs updates to handle dynamic source paths and snapshots

**Required Changes**:
- Add GET `/api/refactor-console/snapshots` endpoint
  - Import `snapshotScanner`
  - Call `scanForSnapshots` with source path
  - Return list of available snapshots
- Update GET `/api/refactor-console/scan` endpoint
  - Accept `sourceType` query param: `'local' | 'remote'`
  - Accept `snapshotId` query param (e.g., `'09-2025'`)
  - If remote, call `ensureSambaMounted()` before scanning
  - If `snapshotId` provided, append `/MM-YYYY/prod` to source path
  - Pass resolved path to `performScan()`
- Update POST `/api/refactor-console/restore` endpoint
  - Support dynamic source paths with snapshots
  - Ensure Samba is mounted if remote
  - Resolve full path before restore
- Update `performScan()` function signature
  - Accept `sourcePath` parameter
  - Update all glob patterns to use dynamic `sourcePath`
  - Update path resolution logic
- Update directory tree generator
  - Root at the selected snapshot folder
  - Adjust relative path calculation

**Status**: ✅ File exists

**Current size**: 1357 lines

**Estimated Changes**: ~200 lines to modify

---

### front-end/src/types/refactorConsole.ts

**Description**: TypeScript types - needs new interfaces for snapshots and source types

**Required Changes**:
- Add `SourceType` type: `'local' | 'remote'`
- Add `Snapshot` interface:
  - `id: string` (e.g., `'09-2025'`)
  - `label: string` (e.g., `'September 2025'`)
  - `path: string` (full path)
  - `date: string` (ISO date)
- Update `PathConfig` interface
  - Add `sourceType?: SourceType`
  - Add `snapshotId?: string`
- Update `RefactorScan` interface
  - Add `sourceType?: SourceType`
  - Add `snapshotId?: string`
  - Update `sourcePath` to reflect resolved path

**Status**: ✅ File exists

**Current size**: 172 lines

**Estimated Changes**: ~30 lines to add

---

### front-end/src/features/devel-tools/refactor-console/api/refactorConsoleClient.ts

**Description**: API client - needs new methods for fetching snapshots and updated scan parameters

**Required Changes**:
- Add `fetchSnapshots(sourcePath?: string): Promise<Snapshot[]>`
  - GET `/api/refactor-console/snapshots`
- Update `scan()` method signature
  - Add `sourceType?: 'local' | 'remote'`
  - Add `snapshotId?: string`
  - Append to query params
- Update `restore()` method
  - Add `sourceType` parameter
  - Add `snapshotId` parameter
- Update `validatePaths()` if needed
  - Support snapshot path validation

**Status**: ✅ File exists (need to check location)

**Estimated Changes**: ~50 lines to modify

---

### front-end/src/features/devel-tools/refactor-console/RefactorConsole.tsx

**Description**: Main React component - needs UI enhancements for source type and snapshot selection

**Required Changes**:
- Add state for `sourceType: 'local' | 'remote'`
- Add state for `selectedSnapshot: string | null`
- Add state for `availableSnapshots: Snapshot[]`
- Add `useEffect` to load available snapshots on mount
- Add Source Type toggle component (Radio group or Switch)
  - Local File System
  - Remote Samba
- Add Snapshot Selection dropdown
  - Only show when snapshots are available
  - Populate with `availableSnapshots`
  - Show label (e.g., `'September 2025 (09-2025)'`)
  - `onChange`: update `selectedSnapshot` state
- Update `refreshScan()` to pass `sourceType` and `snapshotId`
- Update Path Configuration panel
  - Show current source type
  - Show current snapshot if selected
  - Update validation to support snapshot paths

**Status**: ✅ File exists

**Current size**: 1352 lines

**Estimated Changes**: ~150 lines to modify

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
- **Existing Validation**: Leverage existing `validateAndSanitizePath()` function in backend

---

## Testing Requirements

### Unit Tests
- `pathResolver.ts`: Test path detection, mount checking, mount execution
- `snapshotScanner.ts`: Test regex matching, directory scanning, sorting

### Integration Tests
- API endpoint `/snapshots`: Test snapshot discovery
- API endpoint `/scan`: Test with different `sourceType` and `snapshotId` combinations
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
|------|---------------------|-----------|----------|
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

5. **Risk**: WSL/Samba path translation issues
   - **Mitigation**: Server runs on Linux, so no WSL issues in production

---

## Architecture Decisions

### Why Hardcode Samba Path?
Per requirements, the remote connection is hardcoded. This simplifies initial implementation but could be made configurable later.

### Why MM-YYYY Pattern?
This matches the existing backup folder structure (e.g., `09-2025/prod`). The pattern is simple to validate and human-readable.

### Why Separate pathResolver and snapshotScanner?
Separation of concerns:
- `pathResolver`: Handles mounting and path resolution
- `snapshotScanner`: Handles discovery of available snapshots

### Why Not Use Existing Path Configuration?
The existing path configuration is for the main source/destination paths. Snapshots are a layer on top of that, allowing selection of historical states.

---

## Next Steps

1. ✅ **Review this plan** with stakeholders
2. **Decide on implementation approach**: All at once or phased?
3. **Create backup** of current implementation (Git commit before changes)
4. **Begin with backend utilities** (pathResolver, snapshotScanner)
5. **Implement and test incrementally**

---

## Questions for Review

Before proceeding with implementation, please confirm:

1. **Samba Mount Permissions**: Does the server process have permission to mount Samba shares? Should we use `autofs` or manual mounting?

2. **Snapshot Path Structure**: Is the `MM-YYYY/prod` pattern correct? Are there variations we should support?

3. **UI Placement**: Where exactly in the UI should the Source Type toggle and Snapshot dropdown be placed? In the Path Configuration panel or in the main toolbar?

4. **Default Behavior**: Should the system default to local or remote source? Should it auto-select the latest snapshot?

5. **Caching**: Should snapshot lists be cached? For how long?

6. **Error Handling**: How should the UI handle mount failures or network errors?

---

## Approval

Once reviewed and approved, I will proceed with implementation in the recommended order.

**Status**: ⏸️ Awaiting review and approval
