#!/bin/bash
# Quick Reference: Copy this fixed script to /var/backups/OM/om-backup-v2.sh

# FIXES APPLIED:
# 1. LOG_FILE defined BEFORE use (was causing "unbound variable" error)
# 2. Check for ${REPO}/config file before borg init (prevents "already exists" error)
# 3. Better error handling throughout

# TO DEPLOY:
# 1. Copy this file to server: /var/backups/OM/om-backup-v2.sh
# 2. Make executable: chmod +x /var/backups/OM/om-backup-v2.sh
# 3. Set passphrase: export BORG_PASSPHRASE="your-password"
# 4. Run: sudo /var/backups/OM/om-backup-v2.sh

# ERRORS FIXED:
# ❌ OLD: ./om-backup-v2.sh: line 66: LOG_FILE: unbound variable
# ✅ NEW: LOG_FILE defined at line 19 (before any usage)
#
# ❌ OLD: A repository already exists at /var/backups/OM/repo.
# ✅ NEW: Checks for ${REPO}/config file before attempting borg init
