# OrthodoxMetrics Systemd Services

**Issue:** Backend keeps auto-starting due to systemd services.

## Found Services

Your system has these systemd services managing OrthodoxMetrics:

1. **`orthodoxmetrics-backend.service`** - Backend API Service (auto-restart enabled)
2. **`om-stop-watcher.service`** - STOP Watcher Service
3. **`orthodoxmetrics-nfs.service`** - NFS Backup Mount Service (not related to backend)

## Quick Fix

Run the stop script:

```bash
cd /var/www/orthodoxmetrics/prod
chmod +x scripts/stop-systemd-backend.sh
sudo ./scripts/stop-systemd-backend.sh
```

## Manual Steps

### Stop and Disable Services

```bash
# Stop the services
sudo systemctl stop orthodoxmetrics-backend.service
sudo systemctl stop om-stop-watcher.service

# Disable auto-start
sudo systemctl disable orthodoxmetrics-backend.service
sudo systemctl disable om-stop-watcher.service

# Verify they're stopped
sudo systemctl status orthodoxmetrics-backend.service
sudo systemctl status om-stop-watcher.service
```

### Kill Remaining Processes

```bash
# Kill processes on port 3001
sudo lsof -ti :3001 | xargs sudo kill -9

# Verify port is free
sudo lsof -i :3001
# Should return nothing
```

## View Service Configuration

To see what these services are doing:

```bash
# View backend service file
sudo systemctl cat orthodoxmetrics-backend.service

# View watcher service file
sudo systemctl cat om-stop-watcher.service

# View service status and logs
sudo systemctl status orthodoxmetrics-backend.service
sudo journalctl -u orthodoxmetrics-backend.service -n 50
```

## Service File Locations

Systemd service files are typically located in:
- `/etc/systemd/system/orthodoxmetrics-backend.service`
- `/etc/systemd/system/om-stop-watcher.service`
- `/lib/systemd/system/` (if installed via package)

## Understanding the Services

### orthodoxmetrics-backend.service
- **Purpose:** Manages the OrthodoxMetrics backend API
- **Behavior:** Auto-restarts on failure or system boot
- **Status:** "activating auto-restart" means it's actively trying to start the backend

### om-stop-watcher.service
- **Purpose:** Watches for stop signals or monitors backend health
- **Behavior:** May restart backend if it detects issues

## After Stopping Services

Once services are stopped and disabled:

1. **Verify nothing is running:**
   ```bash
   sudo lsof -i :3001
   pm2 list
   ```

2. **Start backend with PM2 (if desired):**
   ```bash
   cd /var/www/orthodoxmetrics/prod
   pm2 start ecosystem.config.cjs --only orthodox-backend
   ```

3. **Do NOT enable PM2 startup unless you want auto-start:**
   ```bash
   # Only if you want PM2 to start on boot:
   pm2 startup
   pm2 save
   ```

## Re-enabling Services (if needed)

If you want to use systemd services instead of PM2:

```bash
sudo systemctl enable orthodoxmetrics-backend.service
sudo systemctl start orthodoxmetrics-backend.service
```

**Note:** You should choose either systemd OR PM2, not both. Running both can cause conflicts.

## Choosing Between Systemd and PM2

- **Systemd:** Better integration with system, automatic restarts, better logging via journalctl
- **PM2:** Better for Node.js apps, built-in clustering, better monitoring tools

For OrthodoxMetrics, PM2 is recommended because:
- Ecosystem config is already set up
- Better Node.js process management
- Built-in monitoring and logging
- Easier to manage multiple Node.js processes
