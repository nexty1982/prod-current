#!/bin/bash
# quick-branch.sh - Quick branch creation with intelligent defaults

set -Eeuo pipefail

# Show usage if no arguments and no staged changes
if [[ $# -eq 0 ]] && git diff --cached --quiet; then
    echo "🚀 Quick Branch Creator"
    echo "======================"
    echo ""
    echo "Usage:"
    echo "  $0 [task-id] [issue-ref]"
    echo ""
    echo "Examples:"
    echo "  $0                                    # Use date-based default"
    echo "  $0 fix-church-getall                 # Custom task ID"
    echo "  $0 fix-church-getall \"#123\"          # With issue reference"
    echo ""
    echo "💡 Make your changes first, then run this script!"
    exit 0
fi

# Set variables based on arguments
if [[ $# -ge 1 ]]; then
    export TASK_ID="$1"
fi

if [[ $# -ge 2 ]]; then
    export ISSUE_REF="$2"
fi

# Run the main script
exec ./scripts/create-getall-fix-branch.sh
