#!/usr/bin/env bash
#
# Install/update the om-ocr-worker systemd service.
# Idempotent — safe to run multiple times.
#
# Usage:
#   sudo bash scripts/install-om-ocr-worker-systemd.sh
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVICE_SRC="${SCRIPT_DIR}/om-ocr-worker.service"
SERVICE_DEST="/etc/systemd/system/om-ocr-worker.service"
SERVICE_NAME="om-ocr-worker"

echo "=== Installing ${SERVICE_NAME} systemd service ==="

# Check source exists
if [[ ! -f "${SERVICE_SRC}" ]]; then
  echo "ERROR: Unit file not found at ${SERVICE_SRC}"
  exit 1
fi

# Check worker entrypoint exists
WORKER_JS="/var/www/orthodoxmetrics/prod/server/dist/workers/ocrFeederWorkerMain.js"
if [[ ! -f "${WORKER_JS}" ]]; then
  echo "WARNING: Worker entrypoint not found at ${WORKER_JS}"
  echo "         Build the backend first: ./scripts/om-deploy.sh be"
fi

# Copy unit file
echo "Copying ${SERVICE_SRC} -> ${SERVICE_DEST}"
cp "${SERVICE_SRC}" "${SERVICE_DEST}"

# Reload systemd daemon
echo "Reloading systemd daemon..."
systemctl daemon-reload

# Enable service (starts on boot)
echo "Enabling ${SERVICE_NAME}..."
systemctl enable "${SERVICE_NAME}"

# Restart service
echo "Restarting ${SERVICE_NAME}..."
systemctl restart "${SERVICE_NAME}"

# Wait a moment for startup
sleep 2

# Show status
echo ""
echo "=== ${SERVICE_NAME} status ==="
systemctl status "${SERVICE_NAME}" --no-pager || true

echo ""
echo "=== Useful commands ==="
echo "  sudo systemctl status ${SERVICE_NAME}"
echo "  sudo systemctl restart ${SERVICE_NAME}"
echo "  sudo systemctl stop ${SERVICE_NAME}"
echo "  sudo journalctl -u ${SERVICE_NAME} -f"
echo "  sudo journalctl -u ${SERVICE_NAME} -n 50"
echo ""
echo "Done."
