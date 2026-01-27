# Final Integration Steps - Execute Now

## ✅ All Code Changes Complete

The following files have been created/modified:
- ✅ `server/database/migrations/create_interactive_reports_tables.sql` (MySQL migration)
- ✅ `server/src/routes/interactiveReports.js` (routes file)
- ✅ `server/src/index.ts` (routes mounted)
- ✅ `server/utils/tokenUtils.js` (utilities)
- ✅ `server/middleware/rateLimiter.js` (rate limiting)
- ✅ `server/utils/emailService.js` (email service)

## 🚀 Execute These Commands

### 1. Run Database Migration

```bash
# Using mysql command line (replace with your credentials)
mysql -u orthodoxapps -p orthodoxmetrics_db < server/database/migrations/create_interactive_reports_tables.sql
```

**Or using MySQL Workbench:**
1. Open MySQL Workbench
2. Connect to `orthodoxmetrics_db`
3. Open and execute: `server/database/migrations/create_interactive_reports_tables.sql`

### 2. Verify Tables Created

```bash
mysql -u orthodoxapps -p orthodoxmetrics_db -e "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = 'orthodoxmetrics_db' AND TABLE_NAME LIKE 'interactive_report%' ORDER BY TABLE_NAME;"
```

**Expected:** 6 tables listed

### 3. Build Server

```bash
cd server
npm run build
```

### 4. Restart Server

```bash
# If using PM2
pm2 restart orthodox-backend

# Or if running directly
npm run start
```

### 5. Test Endpoint

```bash
# Should return 401 (not 404) if not authenticated
curl -i http://localhost:3001/api/records/interactive-reports

# Expected response:
# HTTP/1.1 401 Unauthorized
# {"error":"Authentication required","code":"NO_SESSION"}
```

**✅ Success:** If you get 401 (not 404), the routes are mounted correctly!

### 6. Test in UI

1. Start frontend: `cd front-end && npm run dev`
2. Navigate to `/apps/records/baptism?church=46&type=baptism`
3. Click "Collaborative Report" button
4. Complete the wizard
5. **Should work without 404 error!** ✅

## 📋 Quick Checklist

- [ ] Database migration executed
- [ ] 6 tables verified in database
- [ ] Server built (`npm run build`)
- [ ] Server restarted
- [ ] `curl` test returns 401 (not 404)
- [ ] UI test creates report successfully

## 🔍 Troubleshooting

**Still getting 404?**
1. Check `server/src/index.ts` lines 3510-3512 have the route mounts
2. Verify `server/src/routes/interactiveReports.js` exists
3. Check server logs for import errors
4. Restart server after build

**Database errors?**
1. Verify migration ran: Check tables exist
2. Check database connection in `server/config/db.js`
3. Verify foreign key references (churches, users tables exist)

**Auth errors?**
1. Make sure you're logged in
2. Check user role is one of: `admin`, `super_admin`, `church_admin`, `priest`

---

**Once these steps are complete, the interactive reports feature will be fully functional!** 🎉
