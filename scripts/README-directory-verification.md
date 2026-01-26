# Directory Verification Scripts

These scripts help identify duplicate directories with similar names (e.g., `frontend` vs `front-end`) to prevent directory naming inconsistencies.

## Available Scripts

**Note**: This project runs on Linux. Use bash or Python scripts for production. PowerShell scripts are for local Windows development/testing only.

### Shell Script (Linux/Bash) ✅ **PREFERRED**
```bash
chmod +x scripts/check-duplicate-directories.sh
./scripts/check-duplicate-directories.sh /var/www/orthodoxmetrics/prod 2
```

### Python (Cross-platform) ✅ **PREFERRED**
```bash
python3 scripts/check-duplicate-directories.py /var/www/orthodoxmetrics/prod 2
```

### PowerShell (Windows-only, legacy) ⚠️ **Local testing only**
```powershell
# Note: This is for local Windows development only
# Production scripts must use bash, JavaScript, or Python
.\scripts\check-duplicate-directories.ps1 -Path Z:\ -Depth 2
```

## Usage

All scripts accept the same parameters:

1. **Path** (optional): Root directory to scan (defaults to current directory)
2. **Depth** (optional): Maximum depth to scan (default: 2, meaning root + 1 level deep)

## What They Do

1. **Scan directories** recursively up to the specified depth
2. **Normalize names** by removing hyphens, underscores, and converting to lowercase
3. **Identify duplicates** by comparing normalized names
4. **Report findings** with recommendations based on known correct directory names

## Output

The scripts will:
- ✅ Report if no duplicates are found
- ⚠️ List groups of similar directory names if duplicates are found
- Provide recommendations for each duplicate (e.g., "Should be: 'front-end'")
- Highlight known issues (e.g., `prod` directory when root IS prod)

## Known Correct Directory Names

The scripts reference these correct names:
- `front-end` (NOT `frontend`)
- `backend`
- `server`
- `services`
- `tools`
- `docs`
- `public`
- `config`
- `scripts`

## Integration with Cursor Rules

These scripts complement the `.cursor/rules/directory-naming-conventions.mdc` rule, which ensures AI agents check for existing directories before creating new ones.

## When to Run

- **Before creating new directories**: Run the script to verify no similar directories exist
- **Periodically**: Run as part of maintenance to identify accumulated duplicates
- **After merges**: Check for conflicts that may have created duplicate directories
- **Before cleanup**: Identify directories that should be consolidated

## Exit Codes

- `0`: No duplicates found
- `1`: Duplicates found (for use in CI/CD pipelines)
