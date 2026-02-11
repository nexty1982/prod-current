#!/bin/bash
ECOSYSTEM_FILE="prod/ecosystem.system.js"
PM2_HOME="${PM2_HOME:-$HOME/.pm2}"
BACKUP_DIR="$HOME/.pm2-backup-$(date +%Y%m%d-%H%M%S)"

echo ">>> PM2 HARD RESET STARTING"
echo ">>> Using ecosystem: $ECOSYSTEM_FILE"
echo ">>> PM2 home: $PM2_HOME"
echo ">>> Backup dir: $BACKUP_DIR"

# 1. Stop EVERYTHING PM2 knows about
pm2 stop all || true
pm2 delete all || true
pm2 kill || true

# 2. Kill any orphaned PM2 / Node processes
pkill -9 -f pm2 || true
pkill -9 -f node || true

# 3. Move ~/.pm2 out of the way (full backup)
if [ -d "$PM2_HOME" ]; then
  mkdir -p "$BACKUP_DIR"
  mv "$PM2_HOME" "$BACKUP_DIR/"
fi

# 4. Recreate a clean PM2 home
mkdir -p "$PM2_HOME"
chmod 700 "$PM2_HOME"

# 5. Reinstall PM2 globally (guarantees clean runtime)
npm uninstall -g pm2 || true
npm install -g pm2@latest

# 6. Sanity check
pm2 ping

# 7. Start fresh from ecosystem
pm2 start "$ECOSYSTEM_FILE"

# 8. Persist state
pm2 save

# 9. Show status
pm2 ls

echo ">>> PM2 HARD RESET COMPLETE"
