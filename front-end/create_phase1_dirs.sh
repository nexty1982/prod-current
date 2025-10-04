#!/bin/bash

# Phase 1: Create directory structure for user-management batch
echo "Creating Phase 1 directory structure..."

# Create user-management directories
mkdir -p src/components/user-management/usr-core
mkdir -p src/components/user-management/usr-roles

echo "Created directories:"
echo "  - src/components/user-management/usr-core"
echo "  - src/components/user-management/usr-roles"

echo "Phase 1 directories ready for omtrace refactoring."
