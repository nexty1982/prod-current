#!/bin/bash
#
# Installation script for om-tools command
# Installs the wrapper script to /usr/local/bin for system-wide access
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WRAPPER_SCRIPT="${SCRIPT_DIR}/om-tools"
INSTALL_PATH="/usr/local/bin/om-tools"

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "❌ This script must be run as root (use sudo)" >&2
    exit 1
fi

# Check if wrapper script exists
if [ ! -f "$WRAPPER_SCRIPT" ]; then
    echo "❌ Error: Cannot find om-tools wrapper script" >&2
    echo "   Expected location: $WRAPPER_SCRIPT" >&2
    exit 1
fi

# Copy the script
echo "📋 Installing om-tools to $INSTALL_PATH..."
cp "$WRAPPER_SCRIPT" "$INSTALL_PATH"

# Make it executable
chmod +x "$INSTALL_PATH"

# Verify installation
if [ -x "$INSTALL_PATH" ]; then
    echo "✅ Successfully installed om-tools"
    echo ""
    echo "Usage:"
    echo "  om-tools              # Run from any directory"
    echo "  om-tools --help      # Show help"
    echo ""
    echo "To uninstall:"
    echo "  sudo rm $INSTALL_PATH"
else
    echo "❌ Installation verification failed" >&2
    exit 1
fi
