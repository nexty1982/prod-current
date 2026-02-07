# OM PM2 Reset Script - Update v1.1

**Date**: February 6, 2026  
**Version**: 1.1  
**Status**: ✅ Bug fix applied

---

## 🐛 Bug Fixed

### Issue
The script was counting PM2 modules (pm2-logrotate, pm2-server-monit) as application processes, which caused:
- Incorrect process count display
- "[PM2][WARN] No process found" when trying to stop "all" (because only modules existed)
- Confusion about what was being managed

### Root Cause
The script used `pm2 jlist` which includes both:
- **Application processes** (orthodox-backend, om-librarian) 
- **PM2 modules** (pm2-logrotate, pm2-server-monit)

PM2 modules should **NOT** be stopped or deleted - they are PM2's internal services.

---

## ✅ Solution

### Changes Made

1. **Smart Process Filtering**
   - Now filters out PM2 modules (any process with name starting with "pm2-")
   - Only counts and operates on actual application processes
   - Uses `jq` to filter: `select(.name | startswith("pm2-") | not)`

2. **Individual Process Management**
   - Instead of `pm2 stop all` / `pm2 delete all`
   - Now stops/deletes each application process by name
   - Skips modules entirely

3. **Clearer Messaging**
   - "Found X application process(es) (excluding modules)"
   - "Stopping all PM2 application processes..."
   - "PM2 modules preserved (pm2-logrotate, pm2-server-monit)"

4. **Better Edge Case Handling**
   - Handles case where no application processes exist
   - Only modules running → proceeds to start apps from ecosystem.config.js
   - No warnings about "no processes found"

---

## 📊 Before vs After

### Before (v1.0)
```bash
Found 2 PM2 process(es) running:
[Shows modules pm2-logrotate and pm2-server-monit]

Step 2: Stopping all PM2 processes...
[PM2][WARN] No process found  ← Confusing error
```

### After (v1.1)
```bash
[Shows full pm2 list including modules]

⚠️  No PM2 application processes running (modules excluded)
Will start fresh with ecosystem.config.js

[Proceeds cleanly without warnings]
```

---

## 🧪 Testing Results

### Test Case 1: No Apps Running (Only Modules)
**Status**: ✅ Pass
- Script correctly identifies no apps to stop
- Proceeds to start apps from ecosystem.config.js
- Modules remain running
- No warnings or errors

### Test Case 2: Apps + Modules Running
**Status**: ✅ Pass  
- Correctly counts only application processes
- Stops and deletes apps individually by name
- Preserves modules
- Starts fresh from ecosystem.config.js

### Test Case 3: Nothing Running
**Status**: ✅ Pass
- Handles empty PM2 list gracefully
- Proceeds to start from ecosystem.config.js

---

## 🔄 What Gets Preserved

### PM2 Modules (Never Touched)
- ✅ **pm2-logrotate** - Automatic log rotation
- ✅ **pm2-server-monit** - Server monitoring
- ✅ Any other pm2-* modules

These modules continue running throughout the reset process.

---

## 📝 Updated Behavior

### Process Detection
```bash
# Old: Counted everything
PROCESS_COUNT=$(echo "$PM2_LIST" | jq '. | length')

# New: Filters out modules
PROCESS_COUNT=$(echo "$PM2_LIST" | jq '[.[] | select(.name | startswith("pm2-") | not)] | length')
```

### Process Management
```bash
# Old: Used "all" (includes modules)
pm2 stop all
pm2 delete all

# New: Individual apps only (excludes modules)
APP_NAMES=$(echo "$PM2_LIST" | jq -r '[.[] | select(.name | startswith("pm2-") | not)] | .[].name')
while IFS= read -r app_name; do
    pm2 stop "$app_name"
    pm2 delete "$app_name"
done <<< "$APP_NAMES"
```

---

## 🚀 Usage (No Changes)

Usage remains the same:

```bash
sudo bash /var/www/orthodoxmetrics/prod/scripts/om-pm2reset.sh
```

The script now handles all edge cases correctly and won't show confusing warnings.

---

## 📋 Requirements Update

### Dependencies
- ✅ `jq` - JSON processor (for filtering modules)
  - Install if missing: `sudo apt-get install jq`

### Backward Compatibility
- ✅ 100% backward compatible
- ✅ Same command-line usage
- ✅ Same output format (just clearer messaging)
- ✅ Same ecosystem.config.js support

---

## 🔍 Verification

To verify the fix works:

```bash
# 1. Check current status (even with only modules)
pm2 list

# 2. Run the reset script
sudo bash /var/www/orthodoxmetrics/prod/scripts/om-pm2reset.sh

# 3. Should see:
# - Clean execution (no "[WARN] No process found")
# - Modules preserved in final status
# - Apps started from ecosystem.config.js
```

---

## 📚 Documentation Updated

Updated files:
- ✅ `scripts/om-pm2reset.sh` - Main script fixed
- ✅ `docs/OPERATIONS/om-pm2reset-guide.md` - Will be updated to reflect module handling
- ✅ This update note created

---

## 🎯 Key Improvements

1. **No More Warnings** - Handles empty app list gracefully
2. **Clearer Output** - Explicitly mentions modules are preserved
3. **Correct Counting** - Only counts application processes
4. **Safer Operation** - Never touches PM2 internal modules
5. **Edge Case Handling** - Works even when only modules exist

---

**Version**: 1.1  
**Bug Fixed**: PM2 modules incorrectly counted as apps  
**Status**: ✅ Ready to use  
**Breaking Changes**: None
