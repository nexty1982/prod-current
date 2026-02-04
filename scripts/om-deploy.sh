#!/bin/bash
set -Eeuo pipefail

ROOT="/var/www/orthodoxmetrics/prod"
SERVER="$ROOT/server"
FRONT="$ROOT/front-end"

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
  echo "--- Backend: Building with fresh modules ---"
  cd "$SERVER"
  npm run build:clean 2>&1 || true
  npm install --legacy-peer-deps 2>&1
  npm run build 2>&1
fi

# --- Frontend ---
if [[ "$TARGET" == "frontend" || "$TARGET" == "all" ]]; then
  echo "--- Frontend: Building with Memory Fix ---"
  cd "$FRONT"
  npm run clean:all 2>&1 || true
  if ! npm install --legacy-peer-deps 2>&1; then
    echo "⚠️  npm install failed — removing node_modules and retrying..."
    rm -rf node_modules package-lock.json
    npm install --legacy-peer-deps 2>&1
  fi

  NODE_OPTIONS="--max-old-space-size=4096" npm run build 2>&1

  echo "--- Syncing Dynamic Nginx Roots ---"
  cp -r dist/* "$FRONT/dist-latest/" 2>&1
  cp -r dist/* "$FRONT/dist-stable/" 2>&1
  echo "✅ Synced dist to dist-latest and dist-stable"
fi

# --- Restart Services ---
echo "--- PM2 Service Refresh ---"
cd "$ROOT"
if [[ "$TARGET" == "backend" || "$TARGET" == "all" ]]; then
  pm2 reload all --update-env 2>&1 || pm2 restart all --update-env 2>&1
elif [[ "$TARGET" == "frontend" ]]; then
  echo "ℹ️  Frontend-only deploy — skipping PM2 restart"
fi

# --- Health Check (always run for backend) ---
if [[ "$TARGET" == "backend" || "$TARGET" == "all" ]]; then
  echo "--- Health Check ---"
  for i in {1..30}; do
    if curl -fsS "http://127.0.0.1:3001/api/health" >/dev/null 2>&1; then
      echo "✅ Backend healthy on :3001"
      break
    fi
    if [[ $i -eq 30 ]]; then
      echo "❌ Backend health check failed."
      exit 1
    fi
    sleep 1
  done
fi

echo "✅ Deploy complete [$TARGET]"
