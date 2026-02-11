#!/bin/bash
set -Eeuo pipefail

ROOT="/var/www/orthodoxmetrics/prod"
SERVER="$ROOT/server"
FRONT="$ROOT/front-end"

SERVICE_NAME="orthodox-backend"
HEALTH_URL="http://127.0.0.1:3001/api/system/health"

usage() {
  echo "Usage: om-deploy.sh [backend|frontend|all]"
  echo ""
  echo "  backend   - Build and deploy backend only"
  echo "  frontend  - Build and deploy frontend only"
  echo "  all       - Build and deploy both (default)"
  exit 1
}

TARGET="${1:-all}"

case "$TARGET" in
  backend|frontend|all) ;;
  -h|--help) usage ;;
  *) echo "❌ Unknown target: $TARGET"; usage ;;
esac

echo "=== OM Deploy [$TARGET]: $(date -Is) ==="

# --- Backend ---
if [[ "$TARGET" == "backend" || "$TARGET" == "all" ]]; then
  echo "--- Backend: Building (matching npm run build) ---"
  cd "$SERVER"

  echo "  → Installing dependencies..."
  npm install --legacy-peer-deps 2>&1

  echo "  → Running build:clean..."
  npm run build:clean 2>&1

  echo "  → Running build:ts (TypeScript compilation + router fix)..."
  npm run build:ts 2>&1

  echo "  → Running build:copy (copying non-TS files)..."
  npm run build:copy 2>&1

  echo "  → Running build:post-library..."
  npm run build:post-library 2>&1

  echo "  → Running build:verify..."
  npm run build:verify 2>&1

  echo "  → Running build:verify:imports..."
  npm run build:verify:imports 2>&1

  echo "  → Running build:flush-sessions..."
  npm run build:flush-sessions 2>&1

  echo "✅ Backend build complete"
fi

# --- Frontend ---
if [[ "$TARGET" == "frontend" || "$TARGET" == "all" ]]; then
  echo "--- Frontend: Building (matching npm run build) ---"
  cd "$FRONT"

  echo "  → Installing dependencies..."
  if ! npm install --legacy-peer-deps 2>&1; then
    echo "⚠️  npm install failed — removing node_modules and retrying..."
    rm -rf node_modules package-lock.json
    npm install --legacy-peer-deps 2>&1
  fi

  echo "  → Running prebuild (clean)..."
  npm run clean 2>&1

  echo "  → Running Vite build with 8GB memory..."
  node --max-old-space-size=8096 node_modules/vite/bin/vite.js build 2>&1

  echo "✅ Frontend build complete (output: front-end/dist)"
fi

# --- Restart Services ---
if [[ "$TARGET" == "backend" || "$TARGET" == "all" ]]; then
  echo "--- systemd Service Refresh ---"
  sudo systemctl restart "$SERVICE_NAME" 2>&1 || {
    echo "❌ Failed to restart service: $SERVICE_NAME"
    sudo systemctl status "$SERVICE_NAME" --no-pager -l || true
    sudo journalctl -u "$SERVICE_NAME" -n 200 --no-pager || true
    exit 1
  }
else
  echo "ℹ️  Frontend-only deploy — skipping backend restart"
fi

# --- Health Check (always run for backend) ---
if [[ "$TARGET" == "backend" || "$TARGET" == "all" ]]; then
  echo "--- Health Check ---"
  for i in {1..60}; do
    if curl -fsS "$HEALTH_URL" >/dev/null 2>&1; then
      echo "✅ Backend healthy on :3001 (attempt $i)"
      break
    fi
    if [[ $i -eq 60 ]]; then
      echo "❌ Backend health check failed after 120s."
      sudo systemctl status "$SERVICE_NAME" --no-pager -l || true
      sudo journalctl -u "$SERVICE_NAME" -n 200 --no-pager || true
      exit 1
    fi
    sleep 2
  done
fi

echo "✅ Deploy complete [$TARGET]"
