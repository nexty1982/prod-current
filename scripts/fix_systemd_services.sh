#!/bin/bash
KEEP="orthodox-backend.service"
REMOVE=("orthodoxmetrics-backend.service" "orthodoxmetrics.service")

echo "=== Existing related units ==="
systemctl list-unit-files | awk 'NR==1 || /orthodox-backend\.service|orthodoxmetrics-backend\.service|orthodoxmetrics\.service/ {print}'
echo ""

echo "=== Status snapshot (before) ==="
for u in "$KEEP" "${REMOVE[@]}"; do
  systemctl status "$u" --no-pager -l 2>/dev/null || true
  echo ""
done

echo "=== Stopping/disabling old units ==="
for u in "${REMOVE[@]}"; do
  sudo systemctl stop "$u" 2>/dev/null || true
  sudo systemctl disable "$u" 2>/dev/null || true
done

echo "=== Removing old unit files from /etc/systemd/system ==="
for u in "${REMOVE[@]}"; do
  sudo rm -f "/etc/systemd/system/$u"
done

echo "=== systemd reload + clear failed state ==="
sudo systemctl daemon-reload
sudo systemctl reset-failed

echo "=== Ensure canonical unit is enabled & running ==="
sudo systemctl enable "$KEEP"
sudo systemctl restart "$KEEP"
sudo systemctl is-active --quiet "$KEEP"

echo "=== Status snapshot (after) ==="
systemctl status "$KEEP" --no-pager -l
echo ""
systemctl is-system-running || true
