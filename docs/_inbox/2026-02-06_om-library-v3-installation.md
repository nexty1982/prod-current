# OM-Library V3 - Installation and Deployment Notes

## Required Package Installations

### Server Dependencies

**minimatch** is required but not currently installed:

```bash
cd /var/www/orthodoxmetrics/prod/server
npm install minimatch --save
```

## Database Migration

Run the migration to add glob support:

```bash
mysql -u root -p < /var/www/orthodoxmetrics/prod/server/database/migrations/2026-02-06_library_sources_add_globs.sql
```

## PM2 Configuration Update

Update `ecosystem.config.js` to use omLibrarianV3:

```javascript
{
  name: "om-librarian",
  cwd: "/var/www/orthodoxmetrics/prod",
  script: "server/src/agents/omLibrarianV3.js",  // Changed from omLibrarian.js
  // ... rest of config
}
```

## Restart Services

```bash
# Restart om-librarian with new V3 code
pm2 restart om-librarian

# Check logs
pm2 logs om-librarian --lines 50
```

## Verification

1. Check that sources loaded from DB:
   ```bash
   grep "Loading scan sources" /var/www/orthodoxmetrics/prod/logs/om-librarian-out.log
   ```

2. Verify scheduled task is configured:
   ```bash
   grep "Setting up scheduled indexing" /var/www/orthodoxmetrics/prod/logs/om-librarian-out.log
   ```

3. Trigger manual reindex:
   ```bash
   curl -X POST http://localhost:3001/api/library/reindex \
     -H "Cookie: connect.sid=YOUR_SESSION_COOKIE" \
     -H "Content-Type: application/json"
   ```

4. Check library index for daily_tasks category:
   ```bash
   cat /var/www/orthodoxmetrics/prod/.analysis/library-index.json | grep -i daily_tasks
   ```

## Expected Behavior

- **Continuous Mode**: om-librarian watches all configured sources
- **Scheduled Mode**: Full reindex runs daily at 02:30 AM
- **Manual Trigger**: `/api/library/reindex` endpoint available for super_admin
- **Categories**: Files from "Prod Root - Daily Tasks" source go to `daily_tasks` category
- **SHA256 Tracking**: All indexed files now have `sha256` field for identity tracking

## Rollback Plan

If issues occur, revert to V1:

```bash
# Update ecosystem.config.js back to:
script: "server/src/agents/omLibrarian.js"

# Restart
pm2 restart om-librarian
```
