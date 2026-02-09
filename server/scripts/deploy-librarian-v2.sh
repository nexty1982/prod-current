#!/usr/bin/env bash
#
# deploy-librarian-v2.sh - Deploy enhanced OM-Librarian V2
#
set -euo pipefail

echo "=========================================="
echo "OM-Librarian V2 Deployment"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVER_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

echo -e "${YELLOW}[1/6]${NC} Checking dependencies..."
cd "$SERVER_DIR"
if npm list node-cron minimatch >/dev/null 2>&1; then
  echo -e "${GREEN}✓${NC} Dependencies installed"
else
  echo -e "${RED}✗${NC} Missing dependencies"
  exit 1
fi

echo ""
echo -e "${YELLOW}[2/6]${NC} Creating destination directories..."
mkdir -p "$SERVER_DIR/../docs/daily"
mkdir -p "$SERVER_DIR/../docs/_inbox"
mkdir -p "$SERVER_DIR/../docs/_artifacts"
mkdir -p "$SERVER_DIR/../front-end/public/docs/library/daily_tasks"
echo -e "${GREEN}✓${NC} Directories created"

echo ""
echo -e "${YELLOW}[3/6]${NC} Backing up current librarian..."
if [ -f "$SERVER_DIR/src/agents/omLibrarian.js" ]; then
  cp "$SERVER_DIR/src/agents/omLibrarian.js" "$SERVER_DIR/src/agents/omLibrarian.v1.backup.js"
  echo -e "${GREEN}✓${NC} Backup created: omLibrarian.v1.backup.js"
else
  echo -e "${YELLOW}⚠${NC} No existing librarian found"
fi

echo ""
echo -e "${YELLOW}[4/6]${NC} Stopping current librarian..."
if pm2 describe om-librarian >/dev/null 2>&1; then
  pm2 stop om-librarian
  echo -e "${GREEN}✓${NC} Librarian stopped"
else
  echo -e "${YELLOW}⚠${NC} Librarian not running"
fi

echo ""
echo -e "${YELLOW}[5/6]${NC} Updating PM2 configuration..."
pm2 delete om-librarian 2>/dev/null || true
pm2 start "$SERVER_DIR/src/agents/omLibrarianV2.js" \
  --name om-librarian \
  --cwd "$SERVER_DIR/.." \
  --log-date-format "YYYY-MM-DD HH:mm:ss Z" \
  --time
pm2 save
echo -e "${GREEN}✓${NC} PM2 configuration updated"

echo ""
echo -e "${YELLOW}[6/6]${NC} Verifying deployment..."
sleep 2
if pm2 describe om-librarian | grep -q "online"; then
  echo -e "${GREEN}✓${NC} OM-Librarian V2 is running"
else
  echo -e "${RED}✗${NC} OM-Librarian V2 failed to start"
  echo "Check logs: pm2 logs om-librarian"
  exit 1
fi

echo ""
echo "=========================================="
echo -e "${GREEN}Deployment Complete!${NC}"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Test daily task ingestion:"
echo "   echo '# Test Daily Task' > /var/www/orthodoxmetrics/prod/test_daily_task.md"
echo "   # Wait a few seconds, then check:"
echo "   curl http://localhost:3001/api/library/files | jq '.files[] | select(.source==\"prod-root-daily\")'"
echo ""
echo "2. Test cleanup (dry-run):"
echo "   curl -X POST http://localhost:3001/api/library/cleanup/dry-run \\"
echo "     -H 'Cookie: orthodoxmetrics.sid=...' | jq"
echo ""
echo "3. View logs:"
echo "   pm2 logs om-librarian"
echo ""
echo "4. Check status:"
echo "   curl http://localhost:3001/api/library/status | jq"
echo ""
echo "Scheduled indexing: Daily at 02:30"
echo "Manual reindex: POST /api/library/reindex"
echo ""
