#!/usr/bin/env bash
# Check if a file is claimed by another developer/agent
# Usage: scripts/check-claims.sh <file-path>
# Returns: 0 if unclaimed, 1 if claimed

set -Eeuo pipefail
cd "$(git rev-parse --show-toplevel)"

CLAIMS_FILE=".claims/active.json"

if [ $# -eq 0 ]; then
  echo "Usage: $0 <file-path> [--by <claimer>]"
  echo ""
  echo "Options:"
  echo "  --by <name>   Only check claims NOT by this claimer"
  echo ""
  echo "Examples:"
  echo "  $0 server/src/routes/auth.js"
  echo "  $0 server/src/routes/auth.js --by claude-code"
  exit 1
fi

FILE_TO_CHECK="$1"
EXCLUDE_CLAIMER=""

if [ "${2:-}" = "--by" ] && [ -n "${3:-}" ]; then
  EXCLUDE_CLAIMER="$3"
fi

if [ ! -f "$CLAIMS_FILE" ]; then
  echo "No claims file found. File is unclaimed."
  exit 0
fi

# Check if file matches any claim
CLAIMS=$(cat "$CLAIMS_FILE")

# Use node for JSON parsing (available in this repo)
RESULT=$(node -e "
const claims = ${CLAIMS};
const fileToCheck = '${FILE_TO_CHECK}';
const excludeClaimer = '${EXCLUDE_CLAIMER}';

for (const claim of claims.claims || []) {
  if (excludeClaimer && claim.claimedBy === excludeClaimer) continue;

  for (const pattern of claim.files || []) {
    // Exact match
    if (pattern === fileToCheck) {
      console.log(JSON.stringify(claim));
      process.exit(1);
    }
    // Wildcard match (e.g., 'server/src/routes/*')
    if (pattern.endsWith('/*')) {
      const dir = pattern.slice(0, -2);
      if (fileToCheck.startsWith(dir + '/')) {
        console.log(JSON.stringify(claim));
        process.exit(1);
      }
    }
  }
}
process.exit(0);
" 2>/dev/null) || true

if [ -n "$RESULT" ]; then
  CLAIMER=$(echo "$RESULT" | node -e "const d=require('fs').readFileSync(0,'utf8');console.log(JSON.parse(d).claimedBy)")
  BRANCH=$(echo "$RESULT" | node -e "const d=require('fs').readFileSync(0,'utf8');console.log(JSON.parse(d).branch)")
  DESC=$(echo "$RESULT" | node -e "const d=require('fs').readFileSync(0,'utf8');console.log(JSON.parse(d).description||'')")

  echo "CLAIMED by: $CLAIMER"
  echo "Branch: $BRANCH"
  [ -n "$DESC" ] && echo "Description: $DESC"
  exit 1
fi

echo "File is unclaimed."
exit 0
