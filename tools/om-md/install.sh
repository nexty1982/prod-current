#!/bin/bash
#
# Installation script for om-md
# Run this on your Linux server to set up om-md for global access
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INSTALL_DIR="/usr/local/bin"

echo "Installing om-md..."

# Check if running as root or with sudo
if [ "$EUID" -ne 0 ]; then
    echo "This script needs sudo privileges to install to $INSTALL_DIR"
    echo "Please run: sudo $0"
    exit 1
fi

# Choose which script to use (bash or python)
if command -v python3 &> /dev/null; then
    SCRIPT="$SCRIPT_DIR/om-md.py"
    echo "Using Python version"
else
    SCRIPT="$SCRIPT_DIR/om-md.sh"
    echo "Using Bash version"
fi

# Make script executable
chmod +x "$SCRIPT"

# Create symlink
if [ -L "$INSTALL_DIR/om-md" ]; then
    echo "Removing existing symlink..."
    rm "$INSTALL_DIR/om-md"
fi

ln -s "$SCRIPT" "$INSTALL_DIR/om-md"
chmod +x "$INSTALL_DIR/om-md"

echo "✓ om-md installed successfully!"
echo ""
echo "You can now use 'om-md' from anywhere:"
echo "  om-md /path/to/directory"
echo ""
echo "Example:"
echo "  om-md /var/www/orthodoxmetrics/prod/front-end/src/devel-tools/refactor-console"
