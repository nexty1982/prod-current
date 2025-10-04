#!/bin/bash
# example-usage.sh - Example of how to use the git template system

echo "🔧 Git Branch Template System - Usage Examples"
echo "=============================================="
echo ""

echo "1️⃣ Basic usage (with defaults):"
echo "   ./scripts/create-getall-fix-branch.sh"
echo "   → Creates branch: fix/church-mgmt-getAll-$(date +%Y%m%d)"
echo ""

echo "2️⃣ With custom task ID:"
echo "   TASK_ID=\"task-456-fix-getall\" ./scripts/create-getall-fix-branch.sh"
echo ""

echo "3️⃣ With task ID and issue reference:"
echo "   TASK_ID=\"task-456-fix-getall\" ISSUE_REF=\"#789\" ./scripts/create-getall-fix-branch.sh"
echo ""

echo "4️⃣ Using environment variables:"
echo "   export TASK_ID=\"feature/church-search-improvement\""
echo "   export ISSUE_REF=\"#123\""
echo "   ./scripts/create-getall-fix-branch.sh"
echo ""

echo "📋 Template location: .github/.commit-templates/getall-fix.md"
echo "📖 Documentation: scripts/README-git-templates.md"
echo ""

echo "⚠️  Remember: Make your code changes BEFORE running the script!"
echo "   The script will stage all changes and commit them automatically."
