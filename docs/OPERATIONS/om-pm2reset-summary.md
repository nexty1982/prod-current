# OM PM2 Reset Script - Implementation Summary

**Created**: February 6, 2026  
**Status**: ✅ Complete and ready to use

---

## 📦 What Was Created

### 1. Main Script
**File**: `scripts/om-pm2reset.sh`  
**Purpose**: Complete PM2 reset and restart from ecosystem.config.js

**Features**:
- ✅ Checks PM2 installation
- ✅ Verifies ecosystem.config.js exists
- ✅ Lists current PM2 processes (excludes Modules)
- ✅ Stops all running processes
- ✅ Deletes all processes from PM2 registry
- ✅ Kills PM2 daemon for clean slate
- ✅ Clears PM2 logs and dump files
- ✅ Starts fresh from ecosystem.config.js
- ✅ Saves PM2 configuration
- ✅ Configures PM2 startup on boot (systemd/upstart/systemv)
- ✅ Displays final status and useful commands
- ✅ Color-coded output for easy reading
- ✅ Comprehensive error handling

### 2. Documentation Files

#### Full Guide
**File**: `docs/OPERATIONS/om-pm2reset-guide.md`  
**Content**:
- Complete usage instructions
- Detailed output examples
- Troubleshooting section
- Related PM2 commands reference
- Configuration details
- Security notes
- Best practices
- Performance impact analysis

#### Quick Start
**File**: `docs/OPERATIONS/om-pm2reset-quickstart.md`  
**Content**:
- One-command usage
- Quick reference
- When to use/not use
- Status checking

#### This Summary
**File**: `docs/OPERATIONS/om-pm2reset-summary.md`

---

## 🎯 Services Managed

The script manages these services from `ecosystem.config.js`:

1. **orthodox-backend**
   - Main Node.js API server
   - Port: 3001
   - Location: `server/dist/index.js`
   - Memory limit: 900MB
   - Logs: `server/logs/orthodox-backend-*.log`

2. **om-librarian**
   - Documentation library indexer
   - Location: `server/src/agents/omLibrarian.js`
   - Memory limit: 600MB
   - Logs: `logs/om-librarian-*.log`

---

## 🚀 Usage

### Basic Usage
```bash
# Make executable (first time only)
chmod +x /var/www/orthodoxmetrics/prod/scripts/om-pm2reset.sh

# Run the script
sudo bash /var/www/orthodoxmetrics/prod/scripts/om-pm2reset.sh
```

### From Any Location
```bash
sudo bash /var/www/orthodoxmetrics/prod/scripts/om-pm2reset.sh
```

---

## 📊 What Happens During Execution

### Timeline
1. **0s** - Script starts, checks prerequisites
2. **1s** - Lists current PM2 processes
3. **2s** - Stops all processes
4. **3s** - Deletes processes from registry
5. **4s** - Kills PM2 daemon
6. **5s** - Clears logs and dumps
7. **7s** - Waits for clean shutdown (2s)
8. **8s** - Starts services from ecosystem.config.js
9. **11s** - Waits for initialization (3s)
10. **12s** - Saves PM2 configuration
11. **13s** - Configures startup on boot
12. **14s** - Displays final status
13. **15s** - Complete!

### Downtime Window
- Total downtime: ~8 seconds
- From process stop to new processes online
- Backend API unavailable during this window
- Plan maintenance window accordingly

---

## 🔧 Script Features

### Safety Features
- ✅ Checks if PM2 is installed before proceeding
- ✅ Verifies ecosystem.config.js exists
- ✅ Shows what processes will be affected
- ✅ Waits for proper daemon shutdown
- ✅ Verifies services start successfully
- ✅ Displays final status for verification

### Cleanup Operations
- ✅ Stops all processes gracefully
- ✅ Removes from PM2 registry
- ✅ Kills PM2 daemon process
- ✅ Clears accumulated logs
- ✅ Removes dump file (`~/.pm2/dump.pm2`)

### Startup Configuration
- ✅ Auto-detects init system (systemd/upstart/systemv)
- ✅ Generates appropriate startup script
- ✅ Attempts to execute sudo command automatically
- ✅ Provides manual command if auto-execution fails
- ✅ Ensures services start on system boot

### Output Features
- ✅ Color-coded messages (green=success, yellow=info, red=error)
- ✅ Step-by-step progress indicators
- ✅ Process count summary
- ✅ Log file locations
- ✅ Useful command reference
- ✅ Clear success/failure indicators

---

## 🧪 Testing

### Verification Steps

1. **Before Running**:
   ```bash
   pm2 list  # Note current processes
   ```

2. **Run Script**:
   ```bash
   sudo bash /var/www/orthodoxmetrics/prod/scripts/om-pm2reset.sh
   ```

3. **After Running**:
   ```bash
   pm2 list                  # Should show 2 processes (orthodox-backend, om-librarian)
   pm2 logs --lines 20       # Check for any startup errors
   curl http://localhost:3001/health  # Test backend API
   ```

### Expected Output
```
==========================================
OM PM2 Reset Script
==========================================

✅ PM2 is installed
✅ Ecosystem file found

Found 2 PM2 process(es) running:
[Process list...]

Step 2: Stopping all PM2 processes...
✅ All processes stopped

Step 3: Deleting all PM2 processes...
✅ All processes deleted

Step 4: Performing PM2 cleanup...
✅ PM2 cleanup complete

Step 5: Starting services from ecosystem.config.js...
✅ Services started successfully

Step 6: Saving PM2 configuration...
✅ PM2 configuration saved

Step 7: Configuring PM2 startup on boot...
✅ PM2 startup configured successfully

Step 8: Final PM2 status:
[Process list showing 2 online processes...]

==========================================
PM2 Reset Complete!
==========================================
```

---

## 🐛 Troubleshooting

### Common Issues

#### Issue: "PM2 is not installed"
```bash
npm install -g pm2
pm2 --version
```

#### Issue: "Ecosystem file not found"
```bash
ls -la /var/www/orthodoxmetrics/prod/ecosystem.config.js
# If missing, restore from git
git checkout ecosystem.config.js
```

#### Issue: "Permission denied"
```bash
sudo bash /var/www/orthodoxmetrics/prod/scripts/om-pm2reset.sh
```

#### Issue: Services fail to start
```bash
# Check individual service logs
pm2 logs orthodox-backend --lines 50
pm2 logs om-librarian --lines 50

# Check if backend built
ls -la /var/www/orthodoxmetrics/prod/server/dist/index.js

# Build if needed
cd /var/www/orthodoxmetrics/prod/server
npm run build
```

---

## 📋 Requirements

### Prerequisites
- ✅ PM2 installed globally (`npm install -g pm2`)
- ✅ Node.js installed
- ✅ `ecosystem.config.js` exists at prod root
- ✅ Backend built (`server/dist/index.js` exists)
- ✅ Sudo/root access for startup configuration

### System Compatibility
- ✅ Ubuntu/Debian (systemd)
- ✅ CentOS/RHEL (systemd)
- ✅ Older systems (upstart/systemv)
- ✅ Any Linux with PM2 support

---

## 🔒 Security Considerations

### Permissions
- Script requires sudo for startup configuration
- PM2 processes run as current user
- Logs written with user permissions

### Process Isolation
- Each service runs in separate process
- Memory limits enforced (backend: 900MB, librarian: 600MB)
- Auto-restart on crashes

### Startup Security
- Only registered services start on boot
- Configuration saved to user home (~/.pm2)
- Systemd service runs with appropriate permissions

---

## 📊 Performance Impact

### During Reset
- CPU: Brief spike during process restart
- Memory: Releases old process memory, allocates fresh
- Disk I/O: Log rotation and cleanup
- Network: ~8 second service downtime

### After Reset
- Memory usage: Fresh processes start clean
- No accumulated memory leaks
- Logs start fresh (easier to debug)
- All services in known-good state

---

## 🎯 Use Cases

### When to Use
1. **After Deployments** - Ensure clean start with new code
2. **PM2 Issues** - Stuck processes, unresponsive daemon
3. **Memory Issues** - Suspected memory leaks
4. **Config Changes** - Modified ecosystem.config.js
5. **Log Cleanup** - Clear accumulated logs
6. **System Maintenance** - Regular health check
7. **Troubleshooting** - Eliminate PM2-related variables

### When NOT to Use
1. **During Active Traffic** - Brief downtime affects users
2. **Single Service Issue** - Use `pm2 restart <name>` instead
3. **Zero-Downtime Required** - Use `pm2 reload <name>` instead
4. **Debugging** - May clear useful log information

---

## 📚 Related Documentation

- **Full Guide**: `docs/OPERATIONS/om-pm2reset-guide.md`
- **Quick Start**: `docs/OPERATIONS/om-pm2reset-quickstart.md`
- **Ecosystem Config**: `ecosystem.config.js`
- **PM2 Official Docs**: https://pm2.keymetrics.io/docs/usage/quick-start/

---

## 🔄 Maintenance

### Regular Updates
- Review script before major PM2 version upgrades
- Update ecosystem.config.js as services change
- Test script after system upgrades

### Backup Recommendations
- Keep ecosystem.config.js in version control ✅ (already done)
- Backup PM2 config: `pm2 save` (script does this automatically)
- Document custom modifications

---

## ✅ Checklist

### Before Running
- [ ] Announce maintenance window (if production)
- [ ] Verify no active critical operations
- [ ] Check ecosystem.config.js is up to date
- [ ] Ensure backend is built (`server/dist/` exists)
- [ ] Note current PM2 status

### During Execution
- [ ] Monitor script output
- [ ] Watch for error messages
- [ ] Verify "Services started successfully"
- [ ] Check final PM2 status

### After Running
- [ ] Verify all services online: `pm2 list`
- [ ] Check logs for errors: `pm2 logs`
- [ ] Test API endpoint: `curl http://localhost:3001/health`
- [ ] Monitor for 5-10 minutes
- [ ] Confirm startup script saved: `pm2 list` shows saved config

---

## 🏆 Success Criteria

After running the script, you should see:

✅ **PM2 List Status**:
```
┌────┬────────────────────┬──────────┬──────┬───────────┬──────────┐
│ id │ name               │ mode     │ ↺    │ status    │ cpu      │
├────┼────────────────────┼──────────┼──────┼───────────┼──────────┤
│ 0  │ orthodox-backend   │ fork     │ 0    │ online    │ <10%     │
│ 1  │ om-librarian       │ fork     │ 0    │ online    │ <10%     │
└────┴────────────────────┴──────────┴──────┴───────────┴──────────┘
```

✅ **Script Output**:
- All steps show green checkmarks
- "Services started successfully"
- "PM2 configuration saved"
- "PM2 startup configured successfully"
- Final status shows all services online

✅ **Functionality**:
- Backend API responds: `curl http://localhost:3001/health`
- Librarian is indexing files
- No errors in logs
- Services auto-restart if crashed

---

**Script Created**: February 6, 2026  
**Location**: `scripts/om-pm2reset.sh`  
**Status**: ✅ Ready for production use  
**Documentation**: Complete and comprehensive
