# OM PM2 Reset Script - Usage Guide

**Script**: `scripts/om-pm2reset.sh`  
**Purpose**: Safely reset PM2 and restart all services from ecosystem configuration  
**Created**: February 6, 2026

---

## 📋 What This Script Does

The `om-pm2reset.sh` script performs a complete PM2 reset and restart cycle:

1. ✅ Checks if PM2 is installed
2. ✅ Verifies ecosystem.config.js exists
3. ✅ Stops all running PM2 processes
4. ✅ Deletes all PM2 processes
5. ✅ Kills PM2 daemon
6. ✅ Clears PM2 logs and dumps
7. ✅ Starts services fresh from ecosystem.config.js
8. ✅ Saves PM2 configuration
9. ✅ Configures PM2 startup on boot

---

## 🚀 Usage

### Basic Usage

```bash
# Make executable (first time only)
chmod +x /var/www/orthodoxmetrics/prod/scripts/om-pm2reset.sh

# Run the reset script
sudo bash /var/www/orthodoxmetrics/prod/scripts/om-pm2reset.sh
```

### From Project Root

```bash
cd /var/www/orthodoxmetrics/prod
sudo bash scripts/om-pm2reset.sh
```

---

## 📊 What Gets Started

The script starts all services defined in `ecosystem.config.js`:

1. **orthodox-backend** - Main Node.js backend API server
   - Port: 3001
   - Location: `/var/www/orthodoxmetrics/prod/server/dist/index.js`
   - Memory limit: 900MB

2. **om-librarian** - Documentation library indexer agent
   - Location: `/var/www/orthodoxmetrics/prod/server/src/agents/omLibrarian.js`
   - Memory limit: 600MB

---

## 🔧 When to Use This Script

### Use this script when:
- ✅ PM2 processes are stuck or unresponsive
- ✅ After deploying major updates that require clean restart
- ✅ PM2 configuration has been modified
- ✅ Services are not starting properly
- ✅ After server reboot to ensure proper initialization
- ✅ Logs are showing corrupted state
- ✅ You need to ensure fresh start from ecosystem.config.js

### Do NOT use this during:
- ❌ Active production traffic (causes brief downtime)
- ❌ When you only need to restart one service (use `pm2 restart <name>`)
- ❌ When you only need to reload (use `pm2 reload <name>` for zero-downtime)

---

## 📝 Script Output Example

```
==========================================
OM PM2 Reset Script
==========================================

✅ PM2 is installed
✅ Ecosystem file found

Step 1: Checking current PM2 status...

Found 2 PM2 process(es) running:
┌────┬────────────────────┬──────────┬──────┬───────────┬──────────┐
│ id │ name               │ mode     │ ↺    │ status    │ cpu      │
├────┼────────────────────┼──────────┼──────┼───────────┼──────────┤
│ 0  │ orthodox-backend   │ fork     │ 15   │ online    │ 0%       │
│ 1  │ om-librarian       │ fork     │ 0    │ online    │ 0%       │
└────┴────────────────────┴──────────┴──────┴───────────┴──────────┘

Step 2: Stopping all PM2 processes...
✅ All processes stopped

Step 3: Deleting all PM2 processes...
✅ All processes deleted

Step 4: Performing PM2 cleanup...
Killing PM2 daemon...
Clearing PM2 logs...
Clearing PM2 dump file...
✅ PM2 cleanup complete

Waiting 2 seconds for PM2 to fully reset...

Step 5: Starting services from ecosystem.config.js...
✅ Services started successfully

Waiting 3 seconds for services to initialize...

Step 6: Saving PM2 configuration...
✅ PM2 configuration saved

Step 7: Configuring PM2 startup on boot...
Detected init system: systemd
✅ PM2 startup configured successfully

Step 8: Final PM2 status:

┌────┬────────────────────┬──────────┬──────┬───────────┬──────────┐
│ id │ name               │ mode     │ ↺    │ status    │ cpu      │
├────┼────────────────────┼──────────┼──────┼───────────┼──────────┤
│ 0  │ orthodox-backend   │ fork     │ 0    │ online    │ 5%       │
│ 1  │ om-librarian       │ fork     │ 0    │ online    │ 2%       │
└────┴────────────────────┴──────────┴──────┴───────────┴──────────┘

Logs are located at:
  orthodox-backend: /var/www/orthodoxmetrics/prod/server/logs/orthodox-backend-out.log
  om-librarian: /var/www/orthodoxmetrics/prod/logs/om-librarian-out.log

==========================================
PM2 Reset Complete!
==========================================

✅ All PM2 processes stopped and deleted
✅ PM2 daemon cleaned and restarted
✅ Services started from ecosystem.config.js
✅ PM2 configuration saved
✅ PM2 startup on boot configured

All services are now running!
==========================================
```

---

## 🔍 Troubleshooting

### Issue: "PM2 is not installed"

```bash
# Install PM2 globally
npm install -g pm2

# Verify installation
pm2 --version
```

### Issue: "Ecosystem file not found"

```bash
# Verify the file exists
ls -la /var/www/orthodoxmetrics/prod/ecosystem.config.js

# If missing, restore from git
cd /var/www/orthodoxmetrics/prod
git checkout ecosystem.config.js
```

### Issue: "Permission denied"

```bash
# Run with sudo
sudo bash /var/www/orthodoxmetrics/prod/scripts/om-pm2reset.sh

# Or make it executable first
chmod +x /var/www/orthodoxmetrics/prod/scripts/om-pm2reset.sh
sudo bash /var/www/orthodoxmetrics/prod/scripts/om-pm2reset.sh
```

### Issue: Services fail to start

```bash
# Check logs for errors
pm2 logs orthodox-backend --lines 50
pm2 logs om-librarian --lines 50

# Check if ports are in use
sudo netstat -tulpn | grep 3001

# Try starting services individually
cd /var/www/orthodoxmetrics/prod
pm2 start ecosystem.config.js --only orthodox-backend
pm2 start ecosystem.config.js --only om-librarian
```

### Issue: Startup script fails

```bash
# Manually configure PM2 startup
pm2 startup

# Copy and run the command it provides (will be something like):
# sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u username --hp /home/username

# Then save again
pm2 save
```

---

## 📚 Related Commands

### Check PM2 Status
```bash
pm2 list                    # List all processes
pm2 status                  # Same as list
pm2 show orthodox-backend   # Detailed info for specific process
```

### View Logs
```bash
pm2 logs                    # All logs (live)
pm2 logs orthodox-backend   # Specific process logs
pm2 logs --lines 100        # Last 100 lines
pm2 flush                   # Clear all logs
```

### Restart/Reload
```bash
pm2 restart all             # Restart all (brief downtime)
pm2 restart orthodox-backend # Restart specific process
pm2 reload all              # Zero-downtime reload
pm2 reload orthodox-backend # Zero-downtime reload specific
```

### Stop/Delete
```bash
pm2 stop all                # Stop all processes
pm2 stop orthodox-backend   # Stop specific process
pm2 delete all              # Delete all processes
pm2 delete orthodox-backend # Delete specific process
```

### Advanced
```bash
pm2 monit                   # Real-time monitoring
pm2 save                    # Save current process list
pm2 resurrect               # Restore saved processes
pm2 startup                 # Configure startup script
pm2 unstartup               # Remove startup script
pm2 kill                    # Kill PM2 daemon
```

---

## ⚙️ Configuration

### Ecosystem Configuration File

The script uses `/var/www/orthodoxmetrics/prod/ecosystem.config.js`:

```javascript
module.exports = {
  apps: [
    {
      name: "orthodox-backend",
      cwd: "/var/www/orthodoxmetrics/prod/server",
      script: "dist/index.js",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "900M",
      // ... more config
    },
    {
      name: "om-librarian",
      cwd: "/var/www/orthodoxmetrics/prod",
      script: "server/src/agents/omLibrarian.js",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "600M",
      // ... more config
    }
  ]
};
```

### Modifying Services

To add/modify services:

1. Edit `ecosystem.config.js`
2. Run `om-pm2reset.sh` to apply changes
3. Verify with `pm2 list`

---

## 🔒 Security Notes

- Script requires sudo/root permissions for startup configuration
- Clears all PM2 processes - ensure no other applications depend on PM2
- Brief service downtime during reset (typically 5-10 seconds)
- Logs are cleared - ensure important logs are backed up first

---

## 📊 Performance Impact

- **Downtime**: ~5-10 seconds during reset
- **Memory**: Fresh processes start with clean memory state
- **CPU**: Brief spike during startup, then normal
- **Disk I/O**: Log rotation and cleanup

---

## 🎯 Best Practices

1. **Before Reset**:
   - ✅ Announce maintenance window (if production)
   - ✅ Backup important logs if needed
   - ✅ Check no active users/requests

2. **During Reset**:
   - ✅ Monitor the script output
   - ✅ Watch for any error messages
   - ✅ Note the final PM2 status

3. **After Reset**:
   - ✅ Verify all services are online
   - ✅ Check logs for any startup errors
   - ✅ Test critical functionality
   - ✅ Monitor for 5-10 minutes

---

## 📞 Support

If the script fails or services don't start properly:

1. Check logs: `pm2 logs --lines 100`
2. Check ecosystem.config.js is valid: `node -c ecosystem.config.js`
3. Try manual start: `pm2 start ecosystem.config.js`
4. Check server resources: `top`, `free -m`, `df -h`
5. Check port availability: `sudo netstat -tulpn | grep 3001`

---

## 🔄 Updates

### Version History
- **2026-02-06**: Initial version - Complete PM2 reset and restart

### Future Enhancements
- Add backup/restore of PM2 process list
- Add health check after restart
- Add automatic rollback on failure
- Add notification support (Slack/email)

---

**Script Location**: `/var/www/orthodoxmetrics/prod/scripts/om-pm2reset.sh`  
**Ecosystem File**: `/var/www/orthodoxmetrics/prod/ecosystem.config.js`  
**Last Updated**: February 6, 2026
