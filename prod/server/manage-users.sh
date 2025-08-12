#!/bin/bash

# User Management Wrapper Script
# This script provides an easy way to manage users from the server directory

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
USER_SCRIPT="$SCRIPT_DIR/scripts/user-management.js"

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed or not in PATH"
    exit 1
fi

# Check if the user management script exists
if [[ ! -f "$USER_SCRIPT" ]]; then
    echo "❌ User management script not found at: $USER_SCRIPT"
    exit 1
fi

# Change to the server directory to ensure proper module resolution
cd "$SCRIPT_DIR"

# Run the user management script with all arguments
node "$USER_SCRIPT" "$@"
