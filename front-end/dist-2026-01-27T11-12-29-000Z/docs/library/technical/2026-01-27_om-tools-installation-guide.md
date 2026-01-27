# OM-Tools Installation Guide

**Purpose:** Install `om-tools` command for system-wide access to OrthodoxMetrics operations suite.

## Quick Installation

### Option 1: Using Installation Script (Recommended)

```bash
# Run the installation script
sudo /var/www/orthodoxmetrics/prod/scripts/install-om-tools.sh

# Verify installation
om-tools --help
```

### Option 2: Manual Installation

```bash
# Copy the wrapper script to a directory in PATH
sudo cp /var/www/orthodoxmetrics/prod/scripts/om-tools /usr/local/bin/om-tools

# Make it executable
sudo chmod +x /usr/local/bin/om-tools

# Verify installation
om-tools --help
```

## What It Does

The `om-tools` command is a wrapper script that:
- Finds the OrthodoxMetrics repository root (`/var/www/orthodoxmetrics/prod`)
- Changes to that directory
- Executes `python3 tools/om_recovery/om_recovery.py` with all passed arguments
- Can be run from any directory on the server

## Usage Examples

```bash
# Run from any directory
om-tools

# Pass arguments
om-tools --help
om-tools --version

# Use any menu option
om-tools
# Then select menu items as normal
```

## File Locations

- **Wrapper Script:** `/var/www/orthodoxmetrics/prod/scripts/om-tools`
- **Installed Location:** `/usr/local/bin/om-tools` (after installation)
- **Python Script:** `/var/www/orthodoxmetrics/prod/tools/om_recovery/om_recovery.py`

## Troubleshooting

**Error: Cannot find om_recovery.py**
- Verify the repo root path is correct: `/var/www/orthodoxmetrics/prod`
- Check that `tools/om_recovery/om_recovery.py` exists

**Error: Permission denied**
- Ensure the script is executable: `chmod +x /usr/local/bin/om-tools`
- Check that `/usr/local/bin` is in your PATH: `echo $PATH`

**Command not found**
- Verify installation: `ls -l /usr/local/bin/om-tools`
- Check PATH: `which om-tools`
- If needed, add `/usr/local/bin` to PATH in your shell profile

## Uninstallation

```bash
sudo rm /usr/local/bin/om-tools
```
