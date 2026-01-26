# Records Discovery Output

This directory contains timestamped discovery outputs from running `tools/records/scan_records_docs.sh`.

## Directory Structure

Each discovery run creates a timestamped folder:
```
docs/records/discovery/YYYYMMDD_HHMMSS/
```

## Generated Files

### records_md_files.txt
All markdown (.md) files that contain Records-related keywords, one per line.

**Format**: Plain file paths, one per line
```
./docs/records/RECORDS_RESTORE_STATUS.md
./front-end/src/features/records/README.md
...
```

### records_md_ranked.txt
Markdown files ranked by keyword hit count (most relevant first).

**Format**: `hit_count|file_path|keyword:count,keyword:count,...`
```
45|./docs/records/RECORDS_RESTORE_STATUS.md|records:20,baptism:15,marriage:10
32|./front-end/src/features/records/README.md|records:18,church_id:14
...
```

### records_code_hits.txt
Code search results with file paths, line numbers, and context.

**Format**: ripgrep output with file:line and context lines
```
front-end/src/features/records/baptism/BaptismRecordsPage.tsx:48:const { user } = useAuth();
front-end/src/features/records/baptism/BaptismRecordsPage.tsx:49:const [searchParams, setSearchParams] = useSearchParams();
...
```

### records_components.txt
Records component and page files (frontend).

**Format**: One file path per line
```
front-end/src/features/records-centralized/components/baptism/BaptismRecordsPage.tsx
front-end/src/features/records-centralized/components/marriage/MarriageRecordsPage.tsx
...
```

### records_api_hits.txt
Records API route and service files (backend).

**Format**: One file path per line
```
server/src/routes/records/browse.ts
server/src/routes/records/dashboard.ts
server/src/routes/records/import.ts
...
```

### summary.txt
Discovery summary with statistics and top-ranked files.

**Format**: Human-readable summary
```
Records Discovery Summary
Generated: Mon Jan 25 14:30:00 PST 2026

Documentation Files:
  Total matching .md files: 42

Code Files:
  Code hits: 1234
  Components: 15
  API routes: 8

Top 10 Ranked Documentation Files:
  [45 hits] ./docs/records/RECORDS_RESTORE_STATUS.md
  [32 hits] ./front-end/src/features/records/README.md
  ...
```

## Re-running the Script

To generate a new discovery run:

```bash
# From repository root
bash tools/records/scan_records_docs.sh
```

This will create a new timestamped folder with fresh discovery results.

## Analysis Tips

1. **Start with summary.txt** - Get an overview of what was found
2. **Check records_md_ranked.txt** - Find the most relevant documentation
3. **Review records_components.txt** - Understand the frontend structure
4. **Examine records_api_hits.txt** - Map backend API endpoints
5. **Use records_code_hits.txt** - Find specific code references with context

## Notes

- All paths are relative to repository root
- Files are sorted for easy reading
- Empty results files indicate no matches found
- Script excludes: node_modules, dist, build, .git, .next, .cache
