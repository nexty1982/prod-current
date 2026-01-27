# Refactor Console - Multi-Source & Snapshot Feature

## Overview

The Refactor Console now supports scanning from multiple sources including local file systems and remote Samba shares. It can automatically discover and select historical snapshots organized by date.

## Key Features

### 🔀 Multi-Source Support

**Local File System**
- Scan files from the local production server
- Fast access with no network latency
- Default source type

**Remote Samba**
- Access historical backups from remote server
- Automatic mount verification
- Graceful fallback on mount failures

### 📅 Snapshot Discovery

**Automatic Detection**
- Scans for date-formatted folders (`MM-YYYY`)
- Validates `prod/` subdirectory structure
- Sorts by date (most recent first)
- Auto-selects latest snapshot

**Snapshot Format**
```
/mnt/refactor-remote/
├── 09-2025/
│   └── prod/
│       ├── front-end/
│       └── server/
├── 10-2025/
│   └── prod/
│       ├── front-end/
│       └── server/
└── 01-2026/
    └── prod/
        ├── front-end/
        └── server/
```

### 💾 Persistent Configuration

All settings are saved to browser localStorage:
- Source type selection (Local/Remote)
- Selected snapshot
- Custom paths

Settings persist across browser sessions and page refreshes.

## User Interface

### Source Type Toggle

Located in the **Path Configuration** panel (click gear icon):

```
┌─────────────────────────────────────────┐
│  Source Type                            │
├─────────────────────────────────────────┤
│  [Local File System] [Remote Samba]    │
└─────────────────────────────────────────┘
```

- **Local File System**: Scan current production files
- **Remote Samba**: Scan from remote Samba share

### Snapshot Selection

Located in the **Path Configuration** panel:

```
┌─────────────────────────────────────────┐
│  Snapshot (MM-YYYY)                     │
├─────────────────────────────────────────┤
│  ▼ Current / Latest                     │
│    ├── January 2026 (01-2026)          │
│    ├── December 2025 (12-2025)         │
│    ├── November 2025 (11-2025)         │
│    └── September 2025 (09-2025)        │
└─────────────────────────────────────────┘
```

- Dropdown shows all available snapshots
- Format: "Month Year (MM-YYYY)"
- Most recent snapshot at top
- Select "Current / Latest" to use current files

### Visual Indicators

The main header shows current configuration:

```
Refactor Console  [Local] [📅 09-2025]
```

- **[Local]** or **[Remote]**: Current source type
- **[📅 MM-YYYY]**: Selected snapshot (if any)

## Usage

### Basic Workflow

1. **Open Refactor Console**
   - Navigate to Developer Tools → Refactor Console

2. **Configure Source** (optional)
   - Click gear icon to open Path Configuration
   - Choose source type: Local or Remote
   - Select a snapshot from dropdown

3. **Scan**
   - Click "Refresh" button
   - Wait for scan to complete
   - View results in tree view

4. **Restore Files**
   - Find missing or modified files
   - Click restore action
   - File is copied from snapshot to production

### Example: Restore from Historical Snapshot

**Scenario**: You need to restore a file that was deleted 3 months ago.

**Steps**:
1. Open Refactor Console
2. Click gear icon → Path Configuration
3. Select "Remote Samba" source type
4. Select snapshot "09-2025" (September 2025)
5. Click "Refresh"
6. Search for the deleted file in the tree
7. File shows as "Missing in Production"
8. Click "Restore" action
9. Confirm restoration
10. File is copied from September backup to current production

### Example: Compare Current vs Snapshot

**Scenario**: Compare current code with a snapshot from last month.

**Steps**:
1. Scan with "Current / Latest" (no snapshot)
2. Note file count and modifications
3. Select snapshot "12-2025"
4. Click "Refresh"
5. Compare scan results
6. Identify differences

## API Endpoints

### GET /api/refactor-console/snapshots

Discover available snapshots.

**Query Parameters**:
- `sourceType`: 'local' or 'remote' (default: 'local')
- `sourcePath`: Optional custom source path

**Response**:
```json
{
  "ok": true,
  "sourceType": "remote",
  "basePath": "/mnt/refactor-remote",
  "snapshots": [
    {
      "id": "01-2026",
      "label": "January 2026",
      "path": "/mnt/refactor-remote/01-2026/prod",
      "date": "2026-01-01T00:00:00.000Z",
      "month": 1,
      "year": 2026,
      "exists": true,
      "isValid": true
    }
  ],
  "defaultSnapshot": { ... },
  "stats": {
    "total": 12,
    "valid": 12,
    "invalid": 0,
    "oldest": { ... },
    "newest": { ... },
    "yearCounts": { "2025": 4, "2026": 8 }
  }
}
```

### GET /api/refactor-console/scan

Scan codebase with source and snapshot parameters.

**Query Parameters**:
- `sourceType`: 'local' or 'remote'
- `snapshotId`: Snapshot ID (e.g., '09-2025')
- `rebuild`: '1' to force rebuild
- `compareWithBackup`: '1' for gap analysis

**Example**:
```
GET /api/refactor-console/scan?sourceType=remote&snapshotId=09-2025&rebuild=1
```

### POST /api/refactor-console/restore

Restore file from snapshot.

**Request Body**:
```json
{
  "relPath": "front-end/src/features/my-feature/Component.tsx",
  "sourceType": "remote",
  "snapshotId": "09-2025"
}
```

## Configuration

### Remote Samba Connection

**Hardcoded Values**:
- Host: `192.168.1.221`
- Path: `/var/refactor-src/`
- Mount: `/mnt/refactor-remote`

**Setup Required**:
See [Samba Setup Guide](../DEVELOPMENT/refactor-console-samba-setup.md) for configuration instructions.

### Snapshot Pattern

**Format**: `MM-YYYY/prod`

**Examples**:
- `09-2025/prod/` ✅ Valid
- `01-2026/prod/` ✅ Valid
- `2025-09/prod/` ❌ Invalid (wrong format)
- `09-2025/` ❌ Invalid (missing prod subdirectory)

### Validation Rules

1. **Month**: 01-12 (zero-padded)
2. **Year**: 2020-2100 (4 digits)
3. **Separator**: Hyphen (-)
4. **Subdirectory**: Must have `/prod/` subdirectory

## Error Handling

### Samba Mount Not Available

**Symptom**: 
- Toast warning: "Remote Samba share is not mounted"
- Dropdown shows "No snapshots available"

**Solution**:
1. Check mount status: `mount | grep refactor-remote`
2. Verify fstab/autofs configuration
3. See [Samba Setup Guide](../DEVELOPMENT/refactor-console-samba-setup.md)

### Snapshot Not Found

**Symptom**:
- Error: "Snapshot 09-2025 does not exist or is invalid"

**Solution**:
1. Verify snapshot directory exists
2. Verify `prod/` subdirectory exists
3. Check file permissions

### Scan Fails

**Symptom**:
- Error during scan
- No results returned

**Solution**:
1. Check selected source and snapshot
2. Verify network connectivity (if remote)
3. Check server logs
4. Try switching to local source

## Limitations

1. **Pattern Fixed**: Only `MM-YYYY/prod` format supported
2. **No Dynamic Mounting**: Requires pre-configured Samba mount
3. **Read-Only**: Snapshots are read-only, cannot modify
4. **Single Remote**: Only one remote source configured

## Best Practices

### Snapshot Organization

**Recommended Structure**:
```
/mnt/refactor-remote/
├── 01-2025/prod/  (January 2025 backup)
├── 02-2025/prod/  (February 2025 backup)
├── 03-2025/prod/  (March 2025 backup)
...
├── 12-2025/prod/  (December 2025 backup)
└── 01-2026/prod/  (January 2026 backup)
```

**Naming Convention**:
- One snapshot per month
- Use creation date, not modification date
- Include full production tree in `prod/` subdirectory

### Snapshot Retention

**Suggested Policy**:
- Keep last 12 months (rolling)
- Archive older snapshots to cold storage
- Document snapshot contents in README

### Performance

**Tips**:
- Local scans are faster than remote
- Snapshots are cached for 10 minutes
- Use "Current / Latest" for fastest scans
- Enable Samba caching in mount options

### Security

**Best Practices**:
- Use read-only Samba mounts
- Restrict Samba access to server IP only
- Store credentials securely
- Audit restore operations
- Verify restored files before committing

## Troubleshooting

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| No snapshots appear | Samba not mounted | Check mount, see setup guide |
| Scan is slow | Network latency | Use local source or optimize Samba |
| Restore fails | Permission denied | Check file permissions |
| Wrong snapshot selected | Cached selection | Clear browser localStorage |

### Debug Mode

Enable debug logging in browser console:

```javascript
localStorage.setItem('debug', 'refactor-console:*');
```

Disable:

```javascript
localStorage.removeItem('debug');
```

### Health Check

Verify API connectivity:

```bash
curl http://localhost:3001/api/refactor-console/health
```

Expected response:
```json
{
  "ok": true,
  "service": "refactor-console",
  "ts": "2026-01-26T...",
  "uptimeSec": 12345
}
```

## Future Enhancements

### Planned Features

- [ ] Snapshot comparison view
- [ ] Bulk file restore
- [ ] Snapshot metadata display
- [ ] Custom snapshot patterns
- [ ] Multiple remote sources
- [ ] Snapshot search/filter
- [ ] Snapshot creation from UI

### Feedback

To request features or report issues:
1. Check existing issues in project tracker
2. Create new issue with detailed description
3. Tag with `refactor-console` label

## Related Documentation

- [Refactor Console Main Documentation](./refactor-console.md)
- [Samba Setup Guide](../DEVELOPMENT/refactor-console-samba-setup.md)
- [Path Configuration](../REFERENCE/refactor-console-paths.md)
- [API Reference](../REFERENCE/refactor-console-api.md)

---

**Last Updated**: January 26, 2026  
**Feature Version**: 1.0.0
