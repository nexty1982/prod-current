# Build Events Troubleshooting

## Issue: No Notifications Showing Up

### Root Causes

1. **Backend Not Rebuilt**: The TypeScript code needs to be recompiled for Date object fixes to take effect
2. **Connection Errors**: Build events fail during PM2 restart when backend is down
3. **Database Errors**: Timestamp format issues prevent events from being stored

### Solution Steps

1. **Rebuild Backend TypeScript**:
   ```bash
   cd /var/www/orthodoxmetrics/prod/server
   npm run build:ts
   ```

2. **Restart PM2** (hard restart to clear module cache):
   ```bash
   pm2 delete orthodox-backend
   pm2 start ecosystem.config.cjs
   ```

3. **Verify Backend is Running**:
   ```bash
   curl http://127.0.0.1:3001/api/health
   ```

4. **Run Build Again**:
   ```bash
   npm run build:deploy
   ```

### Verification

After running the build, check:

1. **Database Events**:
   ```sql
   SELECT * FROM build_runs ORDER BY started_at DESC LIMIT 5;
   SELECT * FROM build_run_events ORDER BY created_at DESC LIMIT 10;
   ```

2. **Notifications**:
   ```sql
   SELECT * FROM notifications 
   WHERE notification_type IN ('build_started', 'build_completed', 'build_failed')
   ORDER BY created_at DESC LIMIT 10;
   ```

3. **Backend Logs**:
   ```bash
   pm2 logs orthodox-backend --lines 50
   ```
   Look for:
   - "Created X build notifications for build_completed"
   - Any database errors

### Expected Behavior

- Build events should be stored in `build_runs` and `build_run_events` tables
- Notifications should be created for admin/super_admin users
- Notifications should appear in the UI bell icon
- No timestamp or database errors in logs

### If Still Not Working

1. Check that `OM_BUILD_EVENT_TOKEN` is set in `server/.env`
2. Verify the backend is accessible: `curl http://127.0.0.1:3001/api/health`
3. Check PM2 logs for errors: `pm2 logs orthodox-backend`
4. Verify database tables exist: Check migration `2026-01-23_build-events-tables.sql` was run
5. Check notification types exist:
   ```sql
   SELECT * FROM notification_types 
   WHERE name IN ('build_started', 'build_completed', 'build_failed');
   ```
