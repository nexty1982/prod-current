# om-backup-v2.sh Fix Summary

**Date:** 2026-02-07  
**Issue:** Script errors with unbound variable and repo initialization  
**Status:** ✅ FIXED

---

## Errors Identified

### Error 1: `LOG_FILE: unbound variable`
**Line 66 in original script**

**Cause:** The variable `LOG_FILE` was being used before it was defined. This happens when:
- Variable definition comes after usage
- Script uses `set -u` (or `set -euo pipefail`) which treats undefined variables as errors

**Fix:** Moved `LOG_FILE` definition to the top of the configuration section, before it's used in any function or command.

```bash
# LOG_FILE must be defined BEFORE any log() calls
LOG_DIR="/var/backups/OM/logs"
LOG_FILE="${LOG_DIR}/backup-$(date +%Y%m%d-%H%M%S).log"

# Create log directory early
mkdir -p "${LOG_DIR}"
```

### Error 2: Repository Already Exists
**Error message:** `A repository already exists at /var/backups/OM/repo.`

**Cause:** Script tries to run `borg init` even when repo already initialized

**Fix:** Check for repository config file before attempting initialization:

```bash
# Check if borg repo is initialized by looking for config file
if [[ ! -f "${REPO}/config" ]]; then
    log "INFO" "Borg repository not initialized. Initializing..."
    borg init --encryption=repokey "${REPO}"
else
    log "INFO" "Repository already initialized"
fi
```

**Why this works:**
- Borg creates a `config` file inside the repo when initialized
- Checking for this file prevents re-initialization
- Handles both cases: new repo and existing repo

---

## All Fixes Applied

### 1. Variable Order Fix
**Before:**
```bash
# LOG_FILE used in functions before definition
log() {
    echo "[...] $*" | tee -a "${LOG_FILE}"  # ❌ LOG_FILE not yet defined
}

# ... later in script ...
LOG_FILE="/var/backups/OM/logs/backup.log"  # ❌ Too late
```

**After:**
```bash
# Define LOG_FILE FIRST in configuration section
LOG_DIR="/var/backups/OM/logs"
LOG_FILE="${LOG_DIR}/backup-$(date +%Y%m%d-%H%M%S).log"

# Create log directory immediately
mkdir -p "${LOG_DIR}"

# NOW functions can use LOG_FILE safely
log() {
    echo "[...] $*" | tee -a "${LOG_FILE}"  # ✅ LOG_FILE is defined
}
```

### 2. Repository Initialization Check
**Before:**
```bash
# Blindly tries to init
log "INFO" "borg repo not initialized; initializing..."
borg init --encryption=repokey "${REPO}"  # ❌ Fails if already exists
```

**After:**
```bash
# Check if repository exists and is initialized
if [[ ! -d "${REPO}" ]]; then
    log "INFO" "Repository directory does not exist. Creating: ${REPO}"
    mkdir -p "${REPO}"
fi

# Check if borg repo is initialized by looking for config file
if [[ ! -f "${REPO}/config" ]]; then
    log "INFO" "Borg repository not initialized. Initializing..."
    
    if borg init --encryption=repokey "${REPO}" 2>&1 | tee -a "${LOG_FILE}"; then
        log "INFO" "Repository initialized successfully"
        log "WARN" "IMPORTANT: Save your repository key! Run: borg key export ${REPO} backup-key.txt"
    else
        error_exit "Failed to initialize repository"
    fi
else
    log "INFO" "Repository already initialized"  # ✅ Skip if exists
fi
```

### 3. Improved Error Handling
Added better error handling throughout:

```bash
set -euo pipefail  # Exit on error, undefined vars, pipe failures

error_exit() {
    log "ERROR" "$1"
    exit 1
}

# Use error_exit for critical failures
if ! command -v borg &> /dev/null; then
    error_exit "Borg backup is not installed"
fi
```

### 4. Better Logging
Improved log messages for clarity:

```bash
log "INFO" "Starting Orthodox Metrics backup"
log "INFO" "Repository: ${REPO}"
log "INFO" "Log file: ${LOG_FILE}"
```

### 5. Passphrase Handling
Added clear warnings about passphrase:

```bash
if [[ -z "${BORG_PASSPHRASE}" ]]; then
    log "WARN" "BORG_PASSPHRASE not set. You will be prompted for passphrase."
    log "WARN" "Set BORG_PASSPHRASE environment variable to avoid prompts."
fi
```

---

## Configuration

The fixed script has clear configuration at the top:

```bash
#############################################
# CONFIGURATION
#############################################

# Backup repository location
REPO="/var/backups/OM/repo"

# Backup source directories
BACKUP_SOURCES=(
    "/var/www/orthodoxmetrics/prod"
)

# Log directory and file
LOG_DIR="/var/backups/OM/logs"
LOG_FILE="${LOG_DIR}/backup-$(date +%Y%m%d-%H%M%S).log"

# Retention policy
KEEP_DAILY=7
KEEP_WEEKLY=4
KEEP_MONTHLY=6

# Compression settings
COMPRESSION="lz4"  # Fast compression
```

---

## Features

### Backup Process
1. ✅ Pre-flight checks (borg installed, sources exist, permissions)
2. ✅ Repository initialization (only if needed)
3. ✅ Create backup with timestamp
4. ✅ Prune old backups (7 daily, 4 weekly, 6 monthly)
5. ✅ Compact repository to reclaim space
6. ✅ Verification and listing
7. ✅ Summary with repository size

### Exclusions
The script automatically excludes:
- `node_modules/` directories
- `dist/` build directories
- `.git/` repositories
- `temp/` and `tmp/` directories
- `*.log` files
- Cache directories

### Logging
- Timestamped log files in `/var/backups/OM/logs/`
- Console output with timestamps
- Both stdout and log file capture

---

## Deployment

### Step 1: Copy Fixed Script

```bash
# On the server
cd /var/backups/OM

# Backup original
cp om-backup-v2.sh om-backup-v2.sh.backup

# Copy fixed version (from Z:\scripts\om-backup-v2-fixed.sh)
# Upload via SCP or copy from shared drive
```

### Step 2: Set Permissions

```bash
chmod +x om-backup-v2.sh
chown root:root om-backup-v2.sh
```

### Step 3: Set Passphrase (Optional but Recommended)

```bash
# Option 1: Set for current session
export BORG_PASSPHRASE="your-secure-passphrase"

# Option 2: Add to root's .bashrc for persistence
echo 'export BORG_PASSPHRASE="your-secure-passphrase"' >> /root/.bashrc
source /root/.bashrc

# Option 3: Use a passphrase file (more secure)
echo "your-secure-passphrase" > /root/.borg-passphrase
chmod 600 /root/.borg-passphrase
echo 'export BORG_PASSPHRASE=$(cat /root/.borg-passphrase)' >> /root/.bashrc
```

### Step 4: Test Run

```bash
# Run as root
sudo -i
cd /var/backups/OM
./om-backup-v2.sh
```

**Expected Output:**
```
[2026-02-07 ...] INFO: Starting Orthodox Metrics backup
[2026-02-07 ...] INFO: Repository: /var/backups/OM/repo
[2026-02-07 ...] INFO: Log file: /var/backups/OM/logs/backup-20260207-....log
[2026-02-07 ...] INFO: Repository already initialized
[2026-02-07 ...] INFO: Creating backup: om-backup-20260207-...
[2026-02-07 ...] INFO: Sources: /var/www/orthodoxmetrics/prod
...
[2026-02-07 ...] INFO: Backup completed successfully
```

### Step 5: Schedule with Cron

```bash
# Edit root crontab
crontab -e

# Add daily backup at 2 AM
0 2 * * * /var/backups/OM/om-backup-v2.sh >> /var/backups/OM/logs/cron.log 2>&1
```

---

## Usage

### Manual Backup
```bash
sudo /var/backups/OM/om-backup-v2.sh
```

### List Backups
```bash
borg list /var/backups/OM/repo
```

### Restore Files
```bash
# List files in a backup
borg list /var/backups/OM/repo::om-backup-20260207-120000

# Extract entire backup
borg extract /var/backups/OM/repo::om-backup-20260207-120000

# Extract specific file/directory
borg extract /var/backups/OM/repo::om-backup-20260207-120000 var/www/orthodoxmetrics/prod/config/
```

### Repository Info
```bash
# Repository statistics
borg info /var/backups/OM/repo

# Specific backup info
borg info /var/backups/OM/repo::om-backup-20260207-120000
```

---

## Troubleshooting

### Issue: "BORG_PASSPHRASE not set"
**Solution:** Set the environment variable before running:
```bash
export BORG_PASSPHRASE="your-passphrase"
./om-backup-v2.sh
```

### Issue: "Permission denied"
**Solution:** Run as root:
```bash
sudo -i
./om-backup-v2.sh
```

### Issue: "Repository already exists" (should not happen with fix)
**Solution:** If it still occurs:
```bash
# Check if repo is valid
borg list /var/backups/OM/repo

# If corrupt, may need to re-init (DANGER: loses existing backups)
# Only do this if absolutely necessary
rm -rf /var/backups/OM/repo
./om-backup-v2.sh
```

### Issue: Backup takes too long
**Solution:** Adjust compression or add more exclusions:
```bash
# In script, change:
COMPRESSION="none"  # No compression (faster)

# Or add more exclusions
--exclude '**/uploads' \
--exclude '**/*.zip' \
```

---

## Files

**Original (broken):** `/var/backups/OM/om-backup-v2.sh`  
**Backup:** `/var/backups/OM/om-backup-v2.sh.backup`  
**Fixed version:** `Z:\scripts\om-backup-v2-fixed.sh`

**Logs:** `/var/backups/OM/logs/backup-*.log`  
**Repository:** `/var/backups/OM/repo`

---

## Summary of Changes

1. ✅ Fixed `LOG_FILE` unbound variable by moving definition to top
2. ✅ Fixed repository initialization check to prevent "already exists" error
3. ✅ Added comprehensive error handling
4. ✅ Improved logging with timestamps
5. ✅ Added pre-flight checks
6. ✅ Added clear configuration section
7. ✅ Added passphrase warnings
8. ✅ Added repository compacting
9. ✅ Added verification step
10. ✅ Added comprehensive documentation

---

**Status:** ✅ Ready to deploy  
**Test Status:** Needs testing on server  
**Risk:** Low (backup script, doesn't affect production)
