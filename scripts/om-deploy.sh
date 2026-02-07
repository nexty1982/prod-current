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
  echo "--- Backend: Building (matching npm run build) ---"
  cd "$SERVER"
  
  # Install dependencies
  echo "  → Installing dependencies..."
  npm install --legacy-peer-deps 2>&1
  
  # Execute build steps (matching package.json "build" script)
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
  
  # Install dependencies
  echo "  → Installing dependencies..."
  if ! npm install --legacy-peer-deps 2>&1; then
    echo "⚠️  npm install failed — removing node_modules and retrying..."
    rm -rf node_modules package-lock.json
    npm install --legacy-peer-deps 2>&1
  fi
  
  # Execute prebuild (clean)
  echo "  → Running prebuild (clean)..."
  npm run clean 2>&1
  
  # Execute build with memory fix (matching package.json "build" script)
  echo "  → Running Vite build with 8GB memory..."
  node --max-old-space-size=8096 node_modules/vite/bin/vite.js build 2>&1
  
  echo "✅ Frontend build complete (output: front-end/dist)"
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
