#!/bin/bash
cd "$(git rev-parse --show-toplevel 2>/dev/null || pwd)"

pm2 stop all || true
pm2 delete all || true
pm2 kill || true

if command -v pm2 >/dev/null 2>&1; then
  pm2 unstartup systemd || true
fi

systemctl disable pm2-root || true
systemctl disable pm2-$(whoami) || true
systemctl stop pm2-root || true
systemctl stop pm2-$(whoami) || true

rm -f /etc/systemd/system/pm2-root.service
rm -f /etc/systemd/system/pm2-$(whoami).service
rm -rf /etc/systemd/system/pm2*.service

systemctl daemon-reload
systemctl reset-failed

npm uninstall -g pm2 || true

rm -rf ~/.pm2
rm -rf /home/next/.pm2
