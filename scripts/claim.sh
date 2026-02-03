#!/usr/bin/env bash
# Manage file claims for collaborative development
# Usage:
#   scripts/claim.sh add <claimer> <branch> <description> <file1> [file2...]
#   scripts/claim.sh release <claimer>
#   scripts/claim.sh list

set -Eeuo pipefail
cd "$(git rev-parse --show-toplevel)"

CLAIMS_FILE=".claims/active.json"

# Ensure claims file exists
if [ ! -f "$CLAIMS_FILE" ]; then
  echo '{"claims":[]}' > "$CLAIMS_FILE"
fi

ACTION="${1:-list}"

case "$ACTION" in
  add)
    if [ $# -lt 5 ]; then
      echo "Usage: $0 add <claimer> <branch> <description> <file1> [file2...]"
      echo "Example: $0 add claude-code fix/auth-bug 'Fixing auth timeout' server/src/auth.js"
      exit 1
    fi

    CLAIMER="$2"
    BRANCH="$3"
    DESC="$4"
    shift 4
    FILES=("$@")

    # Convert files array to JSON
    FILES_JSON=$(printf '%s\n' "${FILES[@]}" | node -e "
      const lines = require('fs').readFileSync(0,'utf8').trim().split('\n');
      console.log(JSON.stringify(lines));
    ")

    # Add claim
    node -e "
      const fs = require('fs');
      const data = JSON.parse(fs.readFileSync('${CLAIMS_FILE}', 'utf8'));
      data.claims.push({
        files: ${FILES_JSON},
        claimedBy: '${CLAIMER}',
        branch: '${BRANCH}',
        claimedAt: new Date().toISOString(),
        description: '${DESC}'
      });
      fs.writeFileSync('${CLAIMS_FILE}', JSON.stringify(data, null, 2) + '\n');
    "

    echo "Claimed ${#FILES[@]} file(s) for $CLAIMER on branch $BRANCH"
    git add "$CLAIMS_FILE"
    echo "Staged $CLAIMS_FILE - commit to share claim with team"
    ;;

  release)
    if [ $# -lt 2 ]; then
      echo "Usage: $0 release <claimer> [branch]"
      echo "Example: $0 release claude-code"
      echo "Example: $0 release claude-code fix/auth-bug"
      exit 1
    fi

    CLAIMER="$2"
    BRANCH="${3:-}"

    node -e "
      const fs = require('fs');
      const data = JSON.parse(fs.readFileSync('${CLAIMS_FILE}', 'utf8'));
      const before = data.claims.length;
      data.claims = data.claims.filter(c => {
        if (c.claimedBy !== '${CLAIMER}') return true;
        if ('${BRANCH}' && c.branch !== '${BRANCH}') return true;
        return false;
      });
      const released = before - data.claims.length;
      fs.writeFileSync('${CLAIMS_FILE}', JSON.stringify(data, null, 2) + '\n');
      console.log('Released ' + released + ' claim(s) for ${CLAIMER}');
    "

    git add "$CLAIMS_FILE"
    echo "Staged $CLAIMS_FILE - commit to share release with team"
    ;;

  list)
    echo "Active Claims:"
    echo "=============="
    node -e "
      const fs = require('fs');
      const data = JSON.parse(fs.readFileSync('${CLAIMS_FILE}', 'utf8'));
      if (data.claims.length === 0) {
        console.log('No active claims.');
        process.exit(0);
      }
      for (const c of data.claims) {
        console.log('');
        console.log('Claimer: ' + c.claimedBy);
        console.log('Branch:  ' + c.branch);
        console.log('Since:   ' + c.claimedAt);
        console.log('Desc:    ' + (c.description || '-'));
        console.log('Files:');
        for (const f of c.files) console.log('  - ' + f);
      }
    "
    ;;

  *)
    echo "Usage: $0 {add|release|list}"
    exit 1
    ;;
esac
