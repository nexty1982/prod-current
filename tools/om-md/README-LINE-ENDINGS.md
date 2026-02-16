# Fixing Line Endings Issue

If you see this error:
```
-bash: ./install.sh: /bin/bash^M: bad interpreter: No such file or directory
```

The script has Windows CRLF line endings instead of Unix LF. Fix it:

## Quick Fix (on Linux)

```bash
# Fix all scripts in om-md directory
cd /var/www/orthodoxmetrics/prod/tools/om-md
sed -i 's/\r$//' *.sh *.py

# Or use dos2unix if available
dos2unix *.sh *.py

# Then make executable
chmod +x *.sh *.py
```

## Fix All Project Scripts

```bash
# Run the fix-all-scripts utility
cd /var/www/orthodoxmetrics/prod
chmod +x tools/fix-all-scripts.sh
./tools/fix-all-scripts.sh
```

## Verify Line Endings

```bash
# Check if file has CRLF (should return nothing if correct)
file script.sh | grep CRLF

# Or check for ^M characters
cat -A script.sh | grep '\^M'
```

## Prevention

The `.editorconfig` file should enforce LF for scripts, but if scripts are created on Windows via Samba share, they may still have CRLF. Always fix line endings after creating scripts on Windows.
