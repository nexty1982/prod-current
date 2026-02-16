# OM-Ops - Operations Suite

**OM-Ops** (formerly OM-Recovery Suite) is a comprehensive operations management tool for the OrthodoxMetrics server. It provides safe, repeatable, and idempotent operations workflows including backups, analysis, changelog tracking, PM2 management, Git operations, and project roadmapping.

> **Note**: The CLI name `om-recovery` remains available as an alias for backward compatibility.

## Overview

**OM-Ops** provides a unified interface for server operations:

### Core Features
- **PM2 Operations**: Manage orthodox-backend process lifecycle
- **Git Operations**: Workflow tools for repository management
- **Backups**: Timestamped backups of all system components
- **Analysis**: Codebase analysis with growth tracking
- **Changelog**: Daily work session tracking
- **System Summary**: Operational health dashboard
- **Motivation Summary**: Daily accomplishments tracking
- **Roadmap & Milestones**: Project milestone tracking
- **Nginx Operations**: Nginx configuration and proxy management
- **Uploads & Paths Health**: Upload directory permissions and path validation
- **Build / Dist Integrity**: Build artifact validation and rebuild workflows

### Backup Components
- Full production filesystem (sanitized, excludes secrets)
- Server code only
- Front-end code only
- Images
- Nginx configuration
- System configuration files (redacted)
- MySQL database dumps

## Requirements

- Linux server environment
- Python 3 (stdlib only, no external dependencies)
- Root/sudo access
- MySQL client tools (`mysqldump`) for database backups
- Standard Unix utilities (`tar`, `gzip`)

## Installation

1. Copy the `om_recovery` directory to your server:
   ```bash
   cp -r tools/om_recovery /var/www/orthodoxmetrics/prod/tools/
   ```

2. Make the launcher executable:
   ```bash
   chmod +x /var/www/orthodoxmetrics/prod/tools/om_recovery/om-recovery
   ```

3. Ensure backup directories exist:
   ```bash
   mkdir -p /var/backups/OM/{config,database,front-end,images,nginx,prod,server}
   ```

## Usage

### Interactive Menu

Run the launcher script:
```bash
sudo /var/www/orthodoxmetrics/prod/tools/om_recovery/om-recovery
```

Or directly:
```bash
sudo python3 /var/www/orthodoxmetrics/prod/tools/om_recovery/om_recovery.py
```

### Main Menu Structure

**OM-Ops** uses a hierarchical menu system:

1. **PM2 Operations** - Manage orthodox-backend process
2. **Git Operations** - Repository workflow tools
3. **Backups** - Backup management (original features)
4. **Analysis** - Codebase analysis (original features)
5. **Changelog** - Work session tracking (original features)
6. **System Summary** - Operational health dashboard
7. **Motivation Summary** - Daily accomplishments
8. **Roadmap & Milestones** - Project milestone tracking
9. **Nginx Operations** - Nginx configuration and proxy management
10. **Uploads & Paths Health** - Upload directory and path validation
11. **Build / Dist Integrity** - Build artifact validation and rebuilds
0. **Exit** - Quit the program

Each main menu option opens a submenu with specific operations.

### Dry Run Mode

Test what would be backed up without creating files:
```bash
sudo /var/www/orthodoxmetrics/prod/tools/om_recovery/om-recovery --dry-run
```

## Backup Locations

All backups are stored in `/var/backups/OM/` organized by category:

```
/var/backups/OM/
├── config/          # Configuration backups
├── database/        # MySQL dumps
├── front-end/       # Frontend code backups
├── images/          # Image backups
├── nginx/           # Nginx config backups
├── prod/            # Full production backups
└── server/          # Server code backups
```

## File Naming Convention

Backups use timestamped filenames:
- Code/config backups: `{category}-YYYY-MM-DD_HHMM.tar.gz`
- Database backups: `db-YYYY-MM-DD_HHMM.tar.gz`
- Metadata: `{category}-YYYY-MM-DD_HHMM.json` (alongside tarball)

Example:
- `prod-2026-01-22_1430.tar.gz`
- `db-2026-01-22_1430.tar.gz`
- `prod-2026-01-22_1430.json`

## Exclusions

The following are automatically excluded from code backups:

- `node_modules/` - Node.js dependencies
- `dist/`, `build/` - Build artifacts
- `.vite/`, `.cache/`, `.tmp/` - Cache directories
- `logs/`, `*.log` - Log files
- `.git/` - Git repository data
- `_cursor_session_backup/` - Cursor session backups
- `.venv*`, `.venv_image` - Python virtual environments
- `.env*` - Environment files (excluded from code backups, redacted in config backups)

## Security Features

1. **Secret Redaction**: `.env` files are never included in code backups. Config backups contain only redacted templates with key names but no values.

2. **Database Credentials**: MySQL credentials are read from environment files but never stored in backup outputs or logs.

3. **Root Access**: Script requires root/sudo to access system directories and create backups.

4. **Metadata**: Each backup includes a JSON metadata file with SHA256 checksums for verification.

## Verification

Use option 9 from the menu to verify the latest backups. This will:
- Find the most recent backup in each category
- Test tarball integrity using `tar`
- Display file sizes and creation times
- Report PASS/FAIL status

## Logging

Operations are logged to:
```
/var/backups/OM/om-ops.log          # Primary operations log (new)
/var/backups/OM/om-recovery.log     # Legacy backup log (preserved)
```

All operations (PM2, Git, backups, analysis, etc.) are logged to `om-ops.log` with timestamps and operation details.

## Database Backup Details

Database backups include:
- `orthodoxmetrics_db` (main database)
- `orthodoxmetrics_auth_db` (authentication database, if present)

Each backup contains:
- Compressed SQL dumps (`.sql.gz`)
- `meta.json` with backup metadata (credentials redacted)

The script automatically discovers database names from environment files (`DB_NAME`, `DB_AUTH_NAME`, etc.).

## Configuration Backup Details

Config backups include:
- `/etc/nginx/nginx.conf`
- `/etc/nginx/sites-available/`
- `/etc/nginx/sites-enabled/`
- `/etc/systemd/system/pm2-root.service` (if exists)
- PM2 ecosystem files (if present in repo)
- Redacted `.env.production` templates

## Examples

### Run a full backup cycle:
```bash
sudo /var/www/orthodoxmetrics/prod/tools/om_recovery/om-recovery
# Select option 8 (Run ALL backups)
```

### Verify backups:
```bash
sudo /var/www/orthodoxmetrics/prod/tools/om_recovery/om-recovery
# Select option 9 (Verify latest backups)
```

### Test without creating files:
```bash
sudo /var/www/orthodoxmetrics/prod/tools/om_recovery/om-recovery --dry-run
# Select option 8 to see what would be backed up
```

### Run analysis (non-interactive):
```bash
# Analyze server directory
sudo /var/www/orthodoxmetrics/prod/tools/om_recovery/om-recovery --analyze server

# Analyze front-end with full duplicate detection
sudo /var/www/orthodoxmetrics/prod/tools/om_recovery/om-recovery --analyze front-end --dedupe-mode full

# Analyze with custom stale threshold
sudo /var/www/orthodoxmetrics/prod/tools/om_recovery/om-recovery --analyze prod --stale-days 365
```

## Troubleshooting

### "Permission denied" errors
- Ensure you're running with `sudo` or as root
- Check that backup directories are writable

### Database backup failures
- Verify MySQL credentials in `.env.production` files
- Ensure `mysqldump` is installed and accessible
- Check that database names are correct

### Missing files in backups
- Check exclusion patterns - files may be intentionally excluded
- Verify source paths exist and are accessible
- Review log file for detailed error messages

## Future Enhancements

The script is designed to be easily extensible:
- Add new backup categories by updating `BACKUP_CONFIG` dictionary
- Modify exclusion patterns per category
- Extend metadata format as needed

## Analysis Features

The OM-Recovery Suite includes comprehensive read-only analysis capabilities:

### What Gets Analyzed

1. **Inventory**
   - Total file and directory counts
   - Total size breakdown
   - Largest files and directories
   - File type distribution by extension
   - Recently modified files (24h/7d/30d)
   - Stale files (not modified in N days)

2. **Junk Detection**
   - Identifies common build artifacts: `node_modules/`, `dist/`, `build/`
   - Cache directories: `.vite/`, `.cache/`, `.tmp/`
   - Backup artifacts: `_cursor_session_backup/`, `.venv*/`
   - Log files: `*.log`, `logs/`
   - Git data: `.git/`
   - Coverage reports: `coverage/`
   - Large files (>50MB)
   - Backup tarballs/zip files in repo

3. **Duplicate Detection**
   - **Quick mode** (default): Groups files by (filename + size)
   - **Full mode**: SHA256 hashing for files ≤ 20MB (configurable)
   - Reports duplicate groups with all paths

4. **Recommendations**
   - Identifies likely unneeded files
   - Build outputs alongside source
   - Orphaned large files
   - Very old artifacts

### Analysis Output

Each analysis run creates:

```
/var/backups/OM/analysis/runs/YYYY-MM-DD_HHMMSS/
├── analysis.json      # Complete analysis results (machine-readable)
├── duplicates.csv     # Duplicate files list (if duplicates found)
└── meta.json         # Run metadata (timestamp, scope, stats)
```

The interactive HTML report is updated at:
```
/var/backups/OM/analysis/report.html
```

### HTML Report Features

- **Run Selector**: Switch between different analysis runs
- **Summary Cards**: Quick overview of totals, junk size, stale files
- **Interactive Tabs**:
  - Overview: File types, scope info, summary stats
  - Largest Files: Searchable table of largest files
  - Junk Findings: Categorized junk with paths
  - Duplicates: Groups of duplicate files
  - Stale Files: Files not modified recently
- **Search**: Client-side search filtering for tables
- **Copyable Commands**: Shell commands for cleanup (does not execute)

### CLI Options

```bash
--analyze SCOPE          Run analysis (prod|server|front-end|entire)
--dedupe-mode MODE       Duplicate detection (quick|full, default: quick)
--max-hash-mb SIZE       Max file size to hash in MB (default: 20)
--stale-days DAYS        Days threshold for stale files (default: 180)
```

### Growth Dashboard

The analysis report includes a **Growth Dashboard** tab that visualizes codebase growth over time:

**Features:**
- **Time-series charts**: Interactive SVG charts showing:
  - Total size (bytes) over time
  - Total files count over time
  - Junk bytes over time
  - Stale files count over time
  - Duplicate bytes over time (if detected)

- **Daily summary table**: Shows per-run deltas:
  - Date and scope
  - Total bytes delta vs previous run (same scope)
  - Total files delta vs previous run
  - Junk bytes delta
  - Visual indicators (↑/↓) with color coding

- **Today's Work Summary**: If changelog is enabled:
  - Number of sessions per day
  - Session titles and outcomes
  - Total entries count
  - Links to changelog report

**Filters:**
- Scope filter: View all scopes or filter by prod/server/front-end/entire
- Date range: Last 7/30/90 days or all time

**Technical details:**
- Charts use embedded SVG (no external libraries)
- Data derived from stored run history in `index.json`
- Tooltips show exact values on hover
- Fully offline (no network requests)

### Analysis Safety

- **Read-only**: Never modifies or deletes files
- **Production-safe**: Safe to run on live systems
- **Fast**: Avoids expensive hashing by default
- **Non-intrusive**: Only reads file metadata and contents when needed

### Changelog Storage Format

- **entries.jsonl**: Append-only log file (one JSON object per line). New entries are appended without rewriting existing entries.
- **session.json**: Metadata only (no entries array). Contains session_id, title, status, timestamps, entry_count, etc.
- **Backward compatibility**: Old sessions with entries in session.json are automatically migrated (entries read from entries.jsonl, not re-appended).

## Development Changelog

The OM-Recovery Suite includes a Development Changelog feature that tracks daily work sessions and bundles related prompts/follow-ups into a single session.

### What Gets Tracked

A "Work Session" bundles related development tasks:
- **Title**: Descriptive name for the session
- **Status**: ACTIVE (ongoing) or CLOSED (completed)
- **Tags**: Optional labels for categorization
- **Scope**: prod | server | front-end | mixed
- **Entries**: Append-only log of prompts, follow-ups, results, decisions, commands, and notes

Each entry includes:
- Timestamp
- Actor: user | cursor | assistant | system
- Type: prompt | followup | result | decision | command | note
- Content (text)
- Optional attachments (file paths)
- Optional outcome (success/fail)

### Changelog Storage

Sessions are stored in:
```
/var/backups/OM/changelog/
├── index.json              # Session summaries
├── report.html             # Interactive HTML report
├── active_session.json     # Pointer to current active session
└── sessions/
    └── YYYY-MM-DD/
        └── SESSIONID__HHMMSS__slug/
            ├── session.json    # Session metadata
            ├── entries.jsonl   # Append-only entries log
            └── meta.json       # Quick reference
```

### Changelog Menu Options

20. **Start new work session** - Begin tracking a new development session
21. **Append entry to active session** - Add a prompt, follow-up, result, etc.
22. **Close active session** - Mark current session as complete
23. **List sessions** - View sessions from last N days
24. **Generate / refresh changelog HTML report** - Update interactive report
25. **Open latest changelog report path** - Display path and viewing instructions
26. **Prune old sessions** - Keep only sessions from last N days

### Changelog CLI Options

```bash
# Start a new session
--changelog start --title "Session Title" [--tags "tag1,tag2"] [--scope server|front-end|mixed]

# Add an entry to active session
--changelog add --type prompt|followup|result|note --actor user|cursor --text "Entry content"

# Close active session
--changelog close [--summary "Summary text"] [--outcome success|fail]

# Generate HTML report
--changelog report

# List sessions
--changelog list [--days 7]
```

### Changelog Features

- **Single Active Session**: Only one ACTIVE session at a time (automatically closes previous when starting new)
- **Auto-Append Integration**: Backup and analysis operations automatically append entries to active session
- **Append-Only History**: Sessions and entries are never overwritten
- **Interactive HTML Report**: Browse sessions, filter by date/tags/status/scope, view timeline of entries
- **Copyable Content**: Copy prompts and command snippets from the report

### Changelog Workflow Example

```bash
# 1. Start a work session
sudo om-recovery --changelog start --title "Record Table Config Stabilization" --scope server

# 2. Add entries as you work
sudo om-recovery --changelog add --type prompt --actor user --text "Implement record table configuration"
sudo om-recovery --changelog add --type followup --actor cursor --text "Added validation rules"
sudo om-recovery --changelog add --type result --actor system --text "Configuration saved successfully"

# 3. Close session when done
sudo om-recovery --changelog close --summary "Successfully stabilized record table config" --outcome success

# 4. Generate/refresh report
sudo om-recovery --changelog report
```

### Changelog Safety

- **Append-only**: Never overwrites previous sessions or entries
- **Production-safe**: Read-only tracking, doesn't modify codebase
- **Audit Trail**: Creates automatic entries for backup/analysis operations during active sessions

## PM2 Operations

Manage the orthodox-backend PM2 process:

- **Setup/Re-setup**: Configure PM2 for orthodox-backend (idempotent)
- **Status**: View current PM2 status and metrics
- **Restart/Start/Stop**: Control process lifecycle
- **Logs**: View and follow PM2 logs
- **Reset Restarts**: Safely reset restart counter
- **Show Env**: Display PM2 environment (secrets redacted)

All PM2 commands are logged to `om-ops.log`. Operations are idempotent and production-safe.

## Git Operations

Repository workflow tools with guardrails:

- **Status**: Show current branch and changes
- **Checkpoint Branch**: Create timestamped checkpoint branch
- **Commit All**: Commit changes with safety checks (warns about large/problematic files)
- **Push Branch**: Push to origin with upstream tracking
- **Push Daily Summary**: Push artifacts to repository
- **Last Commits**: View recent commit history

**Safety features**:
- Never force pushes (unless explicit confirmation)
- Warns before committing large files (>50MB)
- Warns about problematic patterns (node_modules, dist, .venv, .so)
- Offers to create commit before push if repo is dirty

## System Summary

Generates operational health dashboard:

**Data sources**:
- PM2 status (restarts, uptime, memory, CPU)
- Backend health endpoint (`http://127.0.0.1:3001/api/system/health`)
- Nginx configuration status
- Disk usage (`df -h`)
- Recent errors from PM2 logs

**Output**:
- `/var/backups/OM/summary/report.html` - Interactive HTML dashboard
- `/var/backups/OM/summary/runs/YYYY-MM-DD_HHMMSS/summary.json` - JSON data

## Motivation Summary

Tracks daily accomplishments from changelog:

- Aggregates today's work sessions
- Shows successful outcomes and entry counts
- Highlights top accomplishments
- Generates uplifting progress summary

**Output**:
- `/var/backups/OM/motivation/report.html` - Daily accomplishments report
- `/var/backups/OM/motivation/runs/YYYY-MM-DD_HHMMSS/motivation.json` - JSON data

## Roadmap & Milestones

Visual milestone tracking system:

- **View Roadmap**: Display current milestones by status
- **Add Milestone**: Create new milestone with title, owner, notes
- **Update Milestone**: Update status, percent complete, notes
- **Mark Complete**: Set milestone to 100% complete
- **Generate HTML**: Create interactive roadmap board

**Storage**:
- `/var/backups/OM/roadmap/roadmap.json` - Milestone data
- `/var/backups/OM/roadmap/report.html` - Interactive board view

**Milestone statuses**: planned, in_progress, complete, blocked

## Nginx Operations

Manage Nginx configuration and API proxy settings:

- **Status & Version**: Show nginx version and systemctl status
- **Validate Config**: Run `nginx -t` to validate configuration
- **Show Proxy Settings**: Parse and display current API proxy configuration
- **Generate Baseline**: Create safe API proxy baseline (dry-run diff)
- **Apply Baseline**: Apply proxy baseline with automatic backup and validation
- **Tail Logs**: View and follow nginx error logs

**Safety features**:
- Automatic backup before applying changes
- Config validation before reload
- Automatic restore if validation fails
- Requires "YES APPLY" confirmation for destructive actions

## Uploads & Paths Health

Validate and fix upload directory permissions:

- **Check Directories**: Verify upload dirs exist, permissions, writability
- **Fix Missing Dirs**: Create missing directories with proper ownership
- **Smoke Test**: Test upload endpoint (safe, read-only)
- **Show Configured Paths**: Display current path configuration (redacted)

**Guardrails**:
- Requires "YES APPLY" confirmation to create directories
- Detects service user (nginx/www-data) automatically
- Tests writability before reporting
- Never modifies production data during smoke test

## Build / Dist Integrity

Validate build artifacts and manage rebuilds:

- **Build State**: Show current dist directories and file counts
- **Verify Backend Dist**: Check key files and syntax validation
- **Backend Rebuild**: npm ci/install + build + PM2 restart (with health check)
- **Frontend Rebuild**: npm ci/install + build
- **Recent Errors**: Extract error signatures from PM2 logs

**Safety features**:
- Syntax validation before reporting
- Health endpoint check after rebuild
- Requires "YES APPLY" confirmation for rebuilds
- Dry-run mode available
- Logs all build steps and durations

## Integration

**Auto-changelog integration**: When operations run during an active changelog session, entries are automatically appended:
- PM2 operations (restart, start, stop, setup)
- Git operations (commit, push, checkpoint)
- Summary generation (system, motivation)
- Roadmap updates
- Nginx operations (status, validate, apply)
- Uploads operations (check, fix)
- Build operations (verify, rebuild)

This creates a complete audit trail of daily operations.

## Notes

- All operations are idempotent - safe to run multiple times
- Backups are timestamped and independent
- Analysis runs are immutable - never overwrite previous runs
- Changelog entries are append-only (stored in entries.jsonl)
- Script uses only Python standard library for maximum compatibility
- All operations logged to `/var/backups/OM/om-ops.log`
- Production-safe: read-only analysis, guarded Git operations, safe PM2 management
