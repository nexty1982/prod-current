# Fixing Script Line Endings Issue

## Problem

Scripts created on Windows (via Samba share) have Windows CRLF (`\r\n`) line endings instead of Unix LF (`\n`). This causes errors on Linux:

```
-bash: ./script.sh: /bin/bash^M: bad interpreter: No such file or directory
```

The `^M` is the carriage return character (`\r`) that breaks script execution on Linux.

## Solution

### Quick Fix for Specific Scripts

```bash
# Fix a single script
sed -i 's/\r$//' script.sh

# Fix all scripts in a directory
cd /path/to/directory
sed -i 's/\r$//' *.sh *.py *.js

# Or use dos2unix (if installed)
dos2unix script.sh
dos2unix *.sh *.py
```

### Fix All Project Scripts

Use the provided utility script:

```bash
cd /var/www/orthodoxmetrics/prod

# Fix line endings first (if the script itself has CRLF)
sed -i 's/\r$//' tools/fix-all-scripts.sh

# Make executable and run
chmod +x tools/fix-all-scripts.sh
./tools/fix-all-scripts.sh
```

This will:
- Scan `tools/`, `scripts/`, and `server/` directories
- Find all `.sh`, `.bash`, `.py`, and `.js` files
- Convert CRLF to LF line endings
- Report how many files were fixed

### Fix om-md Scripts Specifically

```bash
cd /var/www/orthodoxmetrics/prod/tools/om-md

# Fix all scripts
sed -i 's/\r$//' *.sh *.py

# Make executable
chmod +x *.sh *.py

# Verify
file *.sh *.py | grep -v "LF"
# Should return nothing if all fixed
```

## Verification

Check if a script has CRLF line endings:

```bash
# Method 1: Use file command
file script.sh
# Should show "ASCII text" or "shell script" (not "CRLF" or "CR line")

# Method 2: Check for ^M characters
cat -A script.sh | grep '\^M'
# Should return nothing if correct

# Method 3: Check first line
head -1 script.sh | od -c
# Should not show \r characters
```

## Prevention

### Editor Configuration

The `.editorconfig` file is configured to enforce LF for scripts:

```ini
[*.{sh,bash,py,js}]
end_of_line = lf
```

However, files created on Windows via Samba may still have CRLF. Always fix line endings after creating scripts on Windows.

### Cursor Rules

Two Cursor rules enforce proper line endings:
1. `script-line-endings.mdc` - Enforces LF for all scripts
2. `script-language-standards.mdc` - Includes line ending requirements

### Git Configuration

Configure Git to handle line endings correctly:

```bash
# Disable automatic CRLF conversion
git config core.autocrlf false

# Normalize existing files
git add --renormalize .
```

## Common Errors

If you see these errors, the script has CRLF line endings:

```
-bash: ./script.sh: /bin/bash^M: bad interpreter: No such file or directory
/bin/bash^M: bad interpreter: No such file or directory
```

**Fix**: Run `sed -i 's/\r$//' script.sh` or use `dos2unix script.sh`

## Automated Fix

Add this to your deployment/setup scripts:

```bash
# Fix line endings for all scripts before execution
find /var/www/orthodoxmetrics/prod -type f \( -name "*.sh" -o -name "*.bash" \) -exec sed -i 's/\r$//' {} \;
```

## References

- See `.cursor/rules/script-line-endings.mdc` for complete rules
- See `.editorconfig` for editor configuration
- See `tools/fix-all-scripts.sh` for automated fix utility
