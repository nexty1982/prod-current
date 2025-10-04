#!/bin/bash
# setup-commit-template.sh - Creates the commit template for getAll fix branches

set -Eeuo pipefail
cd "$(git rev-parse --show-toplevel)"

mkdir -p .github/.commit-templates
cat > .github/.commit-templates/getall-fix.md <<'INNER_EOF'
fix(churches): harden URLSearchParams/FormData to prevent `getAll` crash

Context
- Church Management page throws: "Cannot read properties of undefined (reading 'getAll')" when query params are missing or malformed.

Root Cause
- Code assumed `useSearchParams()` always returns a real `URLSearchParams` and called `getAll` unguarded.
- Similar risk with `FormData#getAll`.

Changes
- Added `useSafeSearchParams` fallback to `new URLSearchParams(location.search || '')`.
- Introduced helpers `getOne` and `getMany` with safe defaults.
- Added `safeGetAll(fd, key)` guard for FormData.
- Sanitized API query building to avoid undefined values.

Risk/Impact
- Localized to Church Management page and small util; no server changes.

Validation
- Loads with and without query params.
- Filters like `?status=active&tag=west&tag=pilot` work.
- TS build passes; list renders existing churches.

Rollback Plan
- Revert this commit; page returns to previous behavior.

Refs
- Task: ${TASK_ID:-N/A}
- Issue: ${ISSUE_REF:-N/A}
INNER_EOF

echo "✅ Commit template created at .github/.commit-templates/getall-fix.md"
