#!/bin/bash
# Pre-commit hook to enforce documentation location rules
# Ensures all .md and .txt files are in docs/ except allowed exceptions

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get list of staged files
STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACM)

# Track violations
VIOLATIONS=0
VIOLATION_FILES=()

# Allowed exceptions (relative to repo root)
ALLOWED_PATTERNS=(
    "^README\.md$"                    # Root README
    "^server/README\.md$"            # Server package README
    "^front-end/README\.md$"         # Frontend package README
    "^ops-hub/README\.md$"           # Ops-hub package README
    "^tools/.*/README\.md$"          # Tools subdirectory READMEs
    "^scripts/.*/README\.md$"        # Scripts subdirectory READMEs
    "^backend/.*/README\.md$"        # Backend subdirectory READMEs
    "^\.github/.*\.md$"              # GitHub workflow docs
    "^\.vscode/.*\.md$"              # VSCode config docs
)

# Check each staged file
for file in $STAGED_FILES; do
    # Only check .md and .txt files
    if [[ "$file" =~ \.(md|txt)$ ]]; then
        # Check if file is in docs/ directory
        if [[ ! "$file" =~ ^docs/ ]]; then
            # Check if file matches any allowed pattern
            ALLOWED=false
            for pattern in "${ALLOWED_PATTERNS[@]}"; do
                if [[ "$file" =~ $pattern ]]; then
                    ALLOWED=true
                    break
                fi
            done
            
            # If not allowed, record violation
            if [ "$ALLOWED" = false ]; then
                VIOLATIONS=$((VIOLATIONS + 1))
                VIOLATION_FILES+=("$file")
            fi
        fi
    fi
done

# Report violations
if [ $VIOLATIONS -gt 0 ]; then
    echo -e "${RED}❌ Documentation location violation detected!${NC}"
    echo ""
    echo -e "${YELLOW}The following files violate the documentation location rule:${NC}"
    for file in "${VIOLATION_FILES[@]}"; do
        echo -e "  ${RED}✗${NC} $file"
    done
    echo ""
    echo -e "${YELLOW}Rule:${NC} All .md and .txt files must be in docs/ except:"
    echo "  - Root README.md"
    echo "  - Package boundary READMEs (server/README.md, front-end/README.md, etc.)"
    echo ""
    echo -e "${YELLOW}Action:${NC} Move these files to docs/ with appropriate subdirectory:"
    echo "  - Feature docs → docs/FEATURES/"
    echo "  - Reference docs → docs/REFERENCE/"
    echo "  - Operations docs → docs/OPERATIONS/"
    echo "  - Archived docs → docs/ARCHIVE/"
    echo ""
    echo -e "See ${GREEN}docs/DEVELOPMENT/documentation_rules.md${NC} for details."
    exit 1
fi

echo -e "${GREEN}✅ Documentation location check passed${NC}"
exit 0
