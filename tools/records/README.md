# Records Discovery Scripts

This directory contains scripts for discovering and mapping Records-related documentation and code files.

## scan_records_docs.sh

A portable bash script that scans the repository for:
- Records-related documentation (.md files)
- Records code files (frontend components, backend routes)

### Requirements

- **bash** (standard on Linux/WSL)
- **ripgrep (rg)** - Required. Install with:
  - Ubuntu/Debian: `sudo apt-get install ripgrep`
  - macOS: `brew install ripgrep`
  - Windows (WSL): `sudo apt-get install ripgrep`
- Standard Unix tools: `find`, `sed`, `awk`, `sort`, `xargs` (usually pre-installed)

### Usage

```bash
# From repository root
./tools/records/scan_records_docs.sh

# Or with bash explicitly
bash tools/records/scan_records_docs.sh
```

### Output

The script generates outputs in:
```
docs/records/discovery/<timestamp>/
```

Where `<timestamp>` is in format `YYYYMMDD_HHMMSS`.

### Generated Files

1. **records_md_files.txt** - All matching markdown files (one per line)
2. **records_md_ranked.txt** - Markdown files ranked by keyword hit count (format: `count|file|keywords`)
3. **records_code_hits.txt** - Code search results with file:line and context
4. **records_components.txt** - Records component/page files
5. **records_api_hits.txt** - Records API route/service files
6. **summary.txt** - Discovery summary statistics

### Troubleshooting

**Error: ripgrep (rg) is required**
- Install ripgrep using the commands above

**Script fails with permission denied**
- Make script executable: `chmod +x tools/records/scan_records_docs.sh`
- Or run with: `bash tools/records/scan_records_docs.sh`

**No output files generated**
- Check that you're running from repository root
- Verify ripgrep is installed: `rg --version`
- Check script output for errors
