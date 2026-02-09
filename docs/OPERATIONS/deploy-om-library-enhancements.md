# ⚡ DEPLOY OM-LIBRARY ENHANCEMENTS NOW

**Status**: ✅ All code implemented - Ready to deploy  
**Priority**: **HIGH** - Download button is currently broken without this deployment

---

## 🚀 QUICK DEPLOY (2 Minutes)

### On the Linux Production Server:

```bash
# 1. Navigate to production directory
cd /var/www/orthodoxmetrics/prod

# 2. Make deployment script executable
chmod +x server/scripts/deploy-om-library-enhancements.sh

# 3. Run deployment script
sudo bash server/scripts/deploy-om-library-enhancements.sh
```

**That's it!** The script will:
- ✅ Run database migration (creates 2 new tables)
- ✅ Install dependencies
- ✅ Build backend
- ✅ Restart PM2 service
- ✅ Test new endpoints
- ✅ Show deployment summary

---

## ⚠️ WHAT THIS FIXES

### CRITICAL
- **Download button** - Currently returns 404, will work after deployment

### Enhancements
- Pagination (25 items per page instead of loading 800+ at once)
- Sorting (by title, category, size, date)
- Preview (view docs in browser without downloading)
- Configurable scan sources (no more hardcoded paths)
- Batch operations (update multiple files at once)
- Relationship groups (link related documents)

---

## 📋 WHAT WAS IMPLEMENTED

### New Backend Files Created
- ✅ `server/src/config/library-config.js` - Configuration module
- ✅ `server/src/utils/library-helpers.js` - Helper utilities
- ✅ `server/database/migrations/2026-02-05_library_enhancements.sql` - Database schema

### Existing Files Updated
- ✅ `server/src/routes/library.js` - Added 9 new endpoints

### New Documentation
- ✅ `docs/DEVELOPMENT/om-library-implementation-complete.md` - Full guide
- ✅ `docs/DEVELOPMENT/om-library-quick-reference.md` - Quick reference
- ✅ `docs/DEVELOPMENT/om-library-files-fix.md` - Previous bug fix (moved from root)
- ✅ `server/scripts/deploy-om-library-enhancements.sh` - Deployment script

---

## 🔍 NEW ENDPOINTS ADDED

### User Endpoints
1. `GET /api/library/items` - Paginated, sorted file list
2. `GET /api/library/download/:id` - ⭐ **CRITICAL FIX** - File download
3. `GET /api/library/preview/:id` - File preview in browser

### Admin Endpoints
4. `GET /api/library/sources` - List scan sources
5. `POST /api/library/sources` - Create scan source
6. `PUT /api/library/sources/:id` - Update scan source
7. `DELETE /api/library/sources/:id` - Delete scan source
8. `POST /api/library/category/batch` - Batch update categories
9. `POST /api/library/related/group` - Create relationship groups

---

## 🧪 TESTING AFTER DEPLOYMENT

### Test 1: Download Button (CRITICAL)
1. Navigate to OM-Library in the frontend
2. Click any download button
3. **Should**: File downloads successfully
4. **Before**: Returned 404 error

### Test 2: Pagination (via API)
```bash
curl http://localhost:3001/api/library/items?page=1&pageSize=10
```
Should return only 10 items with pagination metadata

### Test 3: Sources Management (Admin)
```bash
curl http://localhost:3001/api/library/sources -H "Cookie: orthodoxmetrics.sid=YOUR_SESSION"
```
Should return 8 default scan sources

---

## 📊 EXPECTED RESULTS

### Performance
- **Before**: Loading 800+ files (2-5 MB, 1-3 seconds)
- **After**: Loading 25 files (50-100 KB, 100-300 ms)
- **Improvement**: 95%+ faster, 95%+ less data

### Functionality
- **Before**: Download broken, no pagination, no sorting
- **After**: Download works, paginated, sortable, searchable

### Database
- **New Tables**: `library_sources`, `library_relationships`
- **Default Data**: 8 scan source locations
- **Size**: < 10 KB overhead

---

## 🔒 SECURITY

All changes include:
- ✅ Path validation (prevents directory traversal)
- ✅ Access control (admin/super_admin for management)
- ✅ Input validation (sanitized query params)
- ✅ Allowlist-based file access

---

## 🐛 IF SOMETHING GOES WRONG

### Rollback Plan
```bash
# If deployment fails, rollback:
cd /var/www/orthodoxmetrics/prod
git status
git diff server/src/routes/library.js

# To restore previous version:
git checkout server/src/routes/library.js
npm run build
pm2 restart orthodox-backend
```

### Get Help
1. Check logs: `pm2 logs orthodox-backend --lines 100`
2. Verify migration: `mysql -u root -p orthodoxmetrics_db -e "SHOW TABLES LIKE 'library_%';"`
3. Test endpoints: See quick reference in `docs/DEVELOPMENT/om-library-quick-reference.md`

---

## 📚 DOCUMENTATION

- **Full Guide**: `docs/DEVELOPMENT/om-library-implementation-complete.md`
- **Quick Reference**: `docs/DEVELOPMENT/om-library-quick-reference.md`
- **Deployment Script**: `server/scripts/deploy-om-library-enhancements.sh`

---

## ✅ CHECKLIST

Before deployment:
- [ ] On production Linux server (not Windows)
- [ ] Have sudo/root access
- [ ] MySQL root password available
- [ ] Backend not actively serving critical requests (optional)

After deployment:
- [ ] Test download button in frontend
- [ ] Test pagination endpoint via API
- [ ] Test preview button in frontend
- [ ] Verify scan sources in database
- [ ] Check PM2 logs for errors

---

## 🎯 NEXT STEPS (Optional)

After successful deployment, you can optionally:

1. **Update frontend UI** to use new pagination controls
2. **Add source management UI** for admins
3. **Enable time-based grouping** in the UI
4. **Add batch selection** checkboxes

But these are **NOT required** - the current UI will continue to work, and the critical download fix will be live immediately.

---

**DEPLOY NOW** - Download button is currently broken!

```bash
cd /var/www/orthodoxmetrics/prod
chmod +x server/scripts/deploy-om-library-enhancements.sh
sudo bash server/scripts/deploy-om-library-enhancements.sh
```

**Deployment time**: ~2 minutes  
**Risk level**: Low (backward compatible)  
**Priority**: HIGH (fixes broken download)
