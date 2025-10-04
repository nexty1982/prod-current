#!/bin/bash

# Phase 1: Execute user-management refactoring via omtrace
echo "=== Phase 1: User Management Refactoring ==="
echo "Using omtrace --refactor for all moves"
echo ""

# Change to front-end directory
cd /var/www/orthodoxmetrics/prod/front-end

# Step 1: Dry-run for all components
echo "Step 1: Dry-run planning for all components..."
echo ""

# UserManagement.tsx
echo "Planning UserManagement.tsx..."
pnpm run omtrace -- src/views/admin/UserManagement.tsx --refactor --dry-run --pick-first
echo ""

# SessionManagement.tsx
echo "Planning SessionManagement.tsx..."
pnpm run omtrace -- src/views/admin/SessionManagement.tsx --refactor --dry-run --pick-first
echo ""

# RoleManagement.tsx
echo "Planning RoleManagement.tsx..."
pnpm run omtrace -- src/views/admin/RoleManagement.tsx --refactor --dry-run --pick-first
echo ""

# MenuManagement.tsx
echo "Planning MenuManagement.tsx..."
pnpm run omtrace -- src/views/admin/MenuManagement.tsx --refactor --dry-run --pick-first
echo ""

# MenuPermissions.tsx
echo "Planning MenuPermissions.tsx..."
pnpm run omtrace -- src/views/admin/MenuPermissions.tsx --refactor --dry-run --pick-first
echo ""

echo "Step 1 Complete: Dry-run planning finished"
echo ""
echo "Step 2: Execute refactoring with --yes flag..."
echo "Run this script again with --execute flag to apply changes"
echo ""

if [ "$1" = "--execute" ]; then
    echo "=== EXECUTING REFACTORING ==="
    echo ""
    
    # UserManagement.tsx
    echo "Moving UserManagement.tsx..."
    pnpm run omtrace -- src/views/admin/UserManagement.tsx --refactor --yes --pick-first
    echo ""
    
    # SessionManagement.tsx
    echo "Moving SessionManagement.tsx..."
    pnpm run omtrace -- src/views/admin/SessionManagement.tsx --refactor --yes --pick-first
    echo ""
    
    # RoleManagement.tsx
    echo "Moving RoleManagement.tsx..."
    pnpm run omtrace -- src/views/admin/RoleManagement.tsx --refactor --yes --pick-first
    echo ""
    
    # MenuManagement.tsx
    echo "Moving MenuManagement.tsx..."
    pnpm run omtrace -- src/views/admin/MenuManagement.tsx --refactor --yes --pick-first
    echo ""
    
    # MenuPermissions.tsx
    echo "Moving MenuPermissions.tsx..."
    pnpm run omtrace -- src/views/admin/MenuPermissions.tsx --refactor --yes --pick-first
    echo ""
    
    echo "=== Phase 1 Complete ==="
    echo "All 5 components moved to new structure"
    echo "Next: Update registry and test routes"
fi
