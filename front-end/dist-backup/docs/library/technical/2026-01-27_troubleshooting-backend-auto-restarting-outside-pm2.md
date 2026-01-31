# Troubleshooting: Backend Auto-Restarting Outside PM2

**Issue:** Backend keeps starting on port 3001 even after stopping PM2 and killing processes.

## Quick Diagnostic

Run the diagnostic script to identify what's starting the backend:

```bash
cd /var/www/orthodoxmetrics/prod
chmod +x scripts/diagnose-backend-autostart.sh
./scripts/diagnose-backend-autostart.sh
```

## Common Causes

### 1. PM2 Startup Script
PM2 can be configured to start processes on system boot.

**Check:**
```bash
pm2 startup
```

**Fix:**
```bash
pm2 unstartup
```

### 2. PM2 Saved Processes
PM2 saves process list and restores them automatically.

**Check:**
```bash
ls -la ~/.pm2/dump.pm2
pm2 list
```

**Fix:**
```bash
pm2 delete orthodox-backend
pm2 save  # This will save the empty list
```

### 3. systemd Service
A systemd service might be managing the backend.

**Check:**
```bash
systemctl list-units --type=service | grep orthodox
systemctl list-units --type=service | grep pm2
```

**Fix:**
```bash
sudo systemctl stop <service-name>
sudo systemctl disable <service-name>
```

### 4. Cron Jobs
A cron job might be restarting the backend periodically.

**Check:**
```bash
crontab -l
sudo cat /etc/crontab
sudo ls -la /etc/cron.d/
sudo ls -la /etc/cron.hourly/
sudo ls -la /etc/cron.daily/
```

**Fix:**
Edit the crontab and remove the offending line:
```bash
crontab -e
```

### 5. Startup Scripts
Scripts in `/etc/rc.local` or user profile files might start the backend.

**Check:**
```bash
sudo cat /etc/rc.local
cat ~/.bashrc | grep -i "pm2\|orthodox\|node.*3001"
cat ~/.profile | grep -i "pm2\|orthodox\|node.*3001"
```

**Fix:**
Edit the file and remove or comment out the startup command.

### 6. Supervisor or Other Process Managers
Another process manager might be running the backend.

**Check:**
```bash
supervisorctl status
```

**Fix:**
```bash
supervisorctl stop orthodox-backend
supervisorctl remove orthodox-backend
```

## Complete Stop Script

Use the comprehensive stop script:

```bash
cd /var/www/orthodoxmetrics/prod
chmod +x scripts/stop-backend-completely.sh
sudo ./scripts/stop-backend-completely.sh
```

This script will:
1. Stop PM2 processes
2. Disable PM2 startup
3. Kill all processes on port 3001
4. Kill any node processes running the backend
5. Stop and disable systemd services
6. Verify port is free

## Manual Steps

If scripts don't work, follow these steps manually:

```bash
# 1. Stop PM2
pm2 stop orthodox-backend
pm2 delete orthodox-backend
pm2 unstartup

# 2. Kill processes on port 3001
sudo lsof -ti :3001 | xargs sudo kill -9
# OR
sudo ss -tlnp | grep :3001  # Find PID, then kill it

# 3. Kill any node processes
ps aux | grep "[n]ode.*dist/index.js" | awk '{print $2}' | xargs sudo kill -9

# 4. Check for systemd services
systemctl list-units --type=service | grep orthodox
sudo systemctl stop <service-name>
sudo systemctl disable <service-name>

# 5. Check cron
crontab -l
sudo cat /etc/crontab

# 6. Verify port is free
sudo lsof -i :3001
# Should return nothing
```

## Prevention

After stopping everything, start the backend properly with PM2:

```bash
cd /var/www/orthodoxmetrics/prod
pm2 start ecosystem.config.cjs --only orthodox-backend
pm2 save  # Only if you want PM2 to restore on reboot
pm2 startup  # Only if you want PM2 to start on system boot
```

**Important:** Only use `pm2 startup` if you want the backend to start automatically on system boot. Otherwise, start it manually when needed.

## Verification

After stopping, verify nothing is running:

```bash
# Check PM2
pm2 list
# Should show no orthodox-backend

# Check port
sudo lsof -i :3001
# Should return nothing

# Check processes
ps aux | grep "[n]ode.*dist/index.js"
# Should return nothing

# Wait a few minutes and check again
# If something starts, run the diagnostic script
```
