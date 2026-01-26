# om-md - Source Code Extractor

Extract source code from a directory and its subdirectories into a well-formatted markdown file.

## Installation

### Important: Fix Line Endings First!

Scripts created on Windows (via Samba share) may have CRLF line endings. **Fix them first:**

```bash
cd /var/www/orthodoxmetrics/prod/tools/om-md

# Fix line endings (CRLF -> LF)
sed -i 's/\r$//' *.sh *.py
# Or use dos2unix if available:
# dos2unix *.sh *.py

# Then make executable
chmod +x om-md.sh om-md.py install.sh
```

### Option 1: Bash Script (Recommended for Linux)

```bash
# After fixing line endings, make executable
chmod +x /var/www/orthodoxmetrics/prod/tools/om-md/om-md.sh

# Create symlink for global access (optional)
sudo ln -s /var/www/orthodoxmetrics/prod/tools/om-md/om-md.sh /usr/local/bin/om-md
```

### Option 2: Python Script (Cross-platform)

```bash
# After fixing line endings, make executable
chmod +x /var/www/orthodoxmetrics/prod/tools/om-md/om-md.py

# Create symlink for global access (optional)
sudo ln -s /var/www/orthodoxmetrics/prod/tools/om-md/om-md.py /usr/local/bin/om-md
```

### Option 3: Use Install Script

```bash
cd /var/www/orthodoxmetrics/prod/tools/om-md

# Fix line endings first
sed -i 's/\r$//' *.sh *.py

# Run install script
sudo ./install.sh
```

## Usage

```bash
om-md <directory_path> [output_file]
```

### Arguments

- `directory_path` - Path to the directory to extract source code from (required)
- `output_file` - Optional. Override output file path (default: `docs/OM-MD/MM-DD-YYYY/<directory_name>.md`)

### Examples

```bash
# Extract from refactor-console directory
# Creates: docs/OM-MD/01-26-2026/refactor-console.md
om-md /var/www/orthodoxmetrics/prod/front-end/src/devel-tools/refactor-console

# Extract from components directory with custom output name (override)
# Creates: components-extract.md in current directory
om-md /var/www/orthodoxmetrics/prod/front-end/src/components components-extract.md

# Extract from current directory
# Creates: docs/OM-MD/01-26-2026/utils.md
om-md ./src/utils

# Extract from absolute path
# Creates: docs/OM-MD/01-26-2026/routes.md
om-md /var/www/orthodoxmetrics/prod/server/routes
```

### Output Location

By default, all output files are created in:
```
docs/OM-MD/MM-DD-YYYY/<directory_name>.md
```

Where:
- `MM-DD-YYYY` is the current date (e.g., `01-26-2026`)
- `<directory_name>` is the name of the extracted directory
- The date directory is automatically created if it doesn't exist

**Example**: Running `om-md /path/to/refactor-console` on January 26, 2026 creates:
```
docs/OM-MD/01-26-2026/refactor-console.md
```

If a file with the same name already exists in the date directory, a timestamp is appended:
```
docs/OM-MD/01-26-2026/refactor-console_143022.md
```

## Features

- **Recursive extraction**: Scans all subdirectories
- **Multiple file types**: Supports TypeScript, JavaScript, Python, Java, C/C++, Go, Rust, and many more
- **Table of contents**: Automatically generates TOC with links to each file
- **Syntax highlighting**: Uses appropriate language identifiers for code blocks
- **File metadata**: Includes file size and line count for each file
- **Binary file detection**: Safely handles binary files
- **Timestamp**: Includes generation timestamp in output

## Supported File Types

The tool recognizes and extracts:

- **Scripts**: `.ts`, `.tsx`, `.js`, `.jsx`, `.py`, `.sh`, `.bash`
- **Web**: `.html`, `.css`, `.scss`, `.sass`, `.vue`, `.svelte`
- **Data**: `.json`, `.yaml`, `.yml`, `.xml`, `.toml`
- **Systems**: `.c`, `.cpp`, `.h`, `.java`, `.go`, `.rs`, `.rb`, `.php`
- **Database**: `.sql`
- **Documentation**: `.md`, `.txt`

## Output Format

The generated markdown file includes:

1. **Header**: Directory name, source path, generation timestamp
2. **Table of Contents**: Links to all extracted files
3. **File Sections**: Each file with:
   - File path as heading
   - File metadata (size, line count)
   - Syntax-highlighted code block
   - Separator

## Examples

### Example 1: Extract a feature directory

```bash
om-md /var/www/orthodoxmetrics/prod/front-end/src/features/devel-tools/om-ocr
```

Creates `docs/OM-MD/01-26-2026/om-ocr.md` (date will be current date) with all source files from that directory.

### Example 2: Extract with custom output name (override)

```bash
om-md /var/www/orthodoxmetrics/prod/front-end/src/components my-components.md
```

Creates `my-components.md` in the current directory (overrides default location).

### Example 3: Extract from relative path

```bash
cd /var/www/orthodoxmetrics/prod
om-md ./server/routes
```

Creates `docs/OM-MD/01-26-2026/routes.md` in the project root.

## Notes

- **Default output location**: Files are created in `docs/OM-MD/MM-DD-YYYY/` directory
- **Date directories**: Automatically created based on current date (MM-DD-YYYY format)
- **File conflicts**: If a file already exists, a timestamp (HHMMSS) is appended to the filename
- **Override**: You can specify a custom output file path to override the default location
- **Hidden files**: Files and directories starting with `.` are skipped
- **Binary files**: Detected and marked appropriately (content not displayed)
- **Large files**: May take some time to process

## Troubleshooting

### Permission Denied

If you get permission errors, ensure the script is executable:

```bash
chmod +x tools/om-md/om-md.sh
# or
chmod +x tools/om-md/om-md.py
```

### File Not Found

Ensure the directory path is correct and accessible:

```bash
ls -la /path/to/directory
```

### Large Directories

For very large directories, the extraction may take time. Consider extracting specific subdirectories instead.

## Integration

You can add this to your shell profile (`.bashrc`, `.zshrc`) for easier access:

```bash
alias om-md='/var/www/orthodoxmetrics/prod/tools/om-md/om-md.sh'
```

Or add the tools directory to your PATH:

```bash
export PATH="$PATH:/var/www/orthodoxmetrics/prod/tools/om-md"
```
