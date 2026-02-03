#!/usr/bin/env bash
#
# bump-version.sh — Bump version across database and all package.json files
#
# Usage:
#   scripts/bump-version.sh patch     # 1.0.0 -> 1.0.1
#   scripts/bump-version.sh minor     # 1.0.0 -> 1.1.0
#   scripts/bump-version.sh major     # 1.0.0 -> 2.0.0
#   scripts/bump-version.sh 1.2.3     # Set explicit version
#   scripts/bump-version.sh --check   # Show current versions (no changes)
#
set -euo pipefail

PROD_DIR="/var/www/orthodoxmetrics/prod"
SERVER_DIR="$PROD_DIR/server"
FRONTEND_DIR="$PROD_DIR/front-end"

# Source credentials from .env
for envfile in "$SERVER_DIR/.env" "$PROD_DIR/.env" "$HOME/.env"; do
  if [ -f "$envfile" ]; then
    set -a
    source "$envfile" 2>/dev/null || true
    set +a
    break
  fi
done

DB_USER="${DB_USER:-${DB_USERNAME:-orthodoxapps}}"
DB_PASS="${DB_PASS:-${DB_PASSWORD:-}}"
DB_NAME="${DB_NAME:-${DB_DATABASE:-orthodoxmetrics_db}}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
RESET='\033[0m'

get_db_version() {
  mariadb -u "$DB_USER" -p"$DB_PASS" -N -s -e \
    "SELECT version_string FROM system_info WHERE id=1;" "$DB_NAME" 2>/dev/null
}

get_pkg_version() {
  local pkg_file="$1"
  python3 -c "import json; print(json.load(open('$pkg_file'))['version'])" 2>/dev/null || echo "unknown"
}

set_pkg_version() {
  local pkg_file="$1"
  local version="$2"
  python3 -c "
import json
with open('$pkg_file', 'r') as f:
    data = json.load(f)
data['version'] = '$version'
with open('$pkg_file', 'w') as f:
    json.dump(data, f, indent=2)
    f.write('\n')
"
}

bump_semver() {
  local version="$1"
  local bump_type="$2"

  IFS='.' read -r major minor patch <<< "$version"

  case "$bump_type" in
    major) echo "$((major + 1)).0.0" ;;
    minor) echo "$major.$((minor + 1)).0" ;;
    patch) echo "$major.$minor.$((patch + 1))" ;;
    *) echo "$version" ;;
  esac
}

show_versions() {
  echo ""
  echo -e "${BOLD}Current Versions${RESET}"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  local db_ver=$(get_db_version)
  local prod_ver=$(get_pkg_version "$PROD_DIR/package.json")
  local srv_ver=$(get_pkg_version "$SERVER_DIR/package.json")
  local fe_ver=$(get_pkg_version "$FRONTEND_DIR/package.json")

  echo -e "  ${CYAN}Database (system_info):${RESET}  $db_ver"
  echo -e "  ${CYAN}prod/package.json:${RESET}       $prod_ver"
  echo -e "  ${CYAN}server/package.json:${RESET}     $srv_ver"
  echo -e "  ${CYAN}front-end/package.json:${RESET}  $fe_ver"
  echo ""

  # Check if all match
  if [ "$db_ver" = "$prod_ver" ] && [ "$db_ver" = "$srv_ver" ] && [ "$db_ver" = "$fe_ver" ]; then
    echo -e "${GREEN}${BOLD}✓ All versions match${RESET}"
  else
    echo -e "${YELLOW}${BOLD}⚠ Version mismatch detected${RESET}"
  fi
  echo ""
}

# Main
if [ $# -eq 0 ]; then
  echo "Usage: $0 {patch|minor|major|<version>|--check}"
  echo ""
  echo "Commands:"
  echo "  patch      Bump patch version (1.0.0 -> 1.0.1)"
  echo "  minor      Bump minor version (1.0.0 -> 1.1.0)"
  echo "  major      Bump major version (1.0.0 -> 2.0.0)"
  echo "  <version>  Set explicit version (e.g., 1.2.3)"
  echo "  --check    Show current versions without making changes"
  echo ""
  show_versions
  exit 0
fi

ACTION="$1"

if [ "$ACTION" = "--check" ]; then
  show_versions
  exit 0
fi

# Get current version from database (source of truth)
CURRENT_VERSION=$(get_db_version)
if [ -z "$CURRENT_VERSION" ] || [ "$CURRENT_VERSION" = "null" ]; then
  echo -e "${RED}Error: Could not read version from database${RESET}"
  exit 1
fi

# Determine new version
case "$ACTION" in
  patch|minor|major)
    NEW_VERSION=$(bump_semver "$CURRENT_VERSION" "$ACTION")
    ;;
  *)
    # Validate semver format
    if [[ ! "$ACTION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
      echo -e "${RED}Error: Invalid version format. Use semver (e.g., 1.2.3)${RESET}"
      exit 1
    fi
    NEW_VERSION="$ACTION"
    ;;
esac

echo ""
echo -e "${BOLD}Version Bump${RESET}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "  Current: ${YELLOW}$CURRENT_VERSION${RESET}"
echo -e "  New:     ${GREEN}$NEW_VERSION${RESET}"
echo ""

# Confirm
read -p "Proceed with version bump? [y/N] " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Aborted."
  exit 0
fi

echo ""
echo -e "${CYAN}Updating versions...${RESET}"

# Update database
echo -n "  Database (system_info)... "
mariadb -u "$DB_USER" -p"$DB_PASS" -e \
  "UPDATE system_info SET version_string='$NEW_VERSION' WHERE id=1;" "$DB_NAME"
echo -e "${GREEN}✓${RESET}"

# Update package.json files
for pkg in "$PROD_DIR/package.json" "$SERVER_DIR/package.json" "$FRONTEND_DIR/package.json"; do
  pkg_name="${pkg#$PROD_DIR/}"
  echo -n "  $pkg_name... "
  set_pkg_version "$pkg" "$NEW_VERSION"
  echo -e "${GREEN}✓${RESET}"
done

echo ""
echo -e "${GREEN}${BOLD}Version bumped to $NEW_VERSION${RESET}"
echo ""
echo "Next steps:"
echo -e "  1. ${CYAN}git add -A && git commit -m \"chore: bump version to $NEW_VERSION\"${RESET}"
echo -e "  2. ${CYAN}git tag v$NEW_VERSION${RESET}"
echo -e "  3. ${CYAN}git push origin --tags${RESET}"
echo ""
