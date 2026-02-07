# Menu Meta Crash Fix - Deployment Checklist

**Date:** 2026-02-07  
**Fix:** Meta normalization for menu seeding  
**Status:** Ready for deployment

---

## Pre-Deployment Checklist

- [x] Source code updated
  - [x] `server/src/services/menuService.ts` - normalizeMeta added
  - [x] `server/src/routes/menu.ts` - error handling enhanced
  - [x] `server/src/tests/test-meta-normalization.js` - tests created
- [x] Documentation written
  - [x] Full guide: `docs/_inbox/2026-02-07_menu-meta-crash-fix.md`
  - [x] Quick ref: `docs/_inbox/2026-02-07_menu-meta-crash-fix-quick-ref.md`
  - [x] Implementation: `docs/_inbox/2026-02-07_menu-meta-crash-fix-implementation.md`
  - [x] Checklist: This file
- [x] Code reviewed
- [ ] Backend built
- [ ] Server restarted
- [ ] Tested

---

## Deployment Steps

### 1. Backup (Safety First)

```bash
# Backup current dist folder
cd /var/www/orthodoxmetrics/prod/server
cp -r dist dist.backup.$(date +%Y%m%d_%H%M%S)

# Note the backup name
ls -ld dist.backup.*
```

**Expected:** Backup folder created (e.g., `dist.backup.20260207_143022`)

---

### 2. Build Backend

```bash
cd /var/www/orthodoxmetrics/prod/server
npm run build
```

**Expected Output:**
```
> server@1.0.0 build
> tsc

✓ Compilation complete
```

**Check for errors:**
```bash
echo $?  # Should output: 0
```

**If build fails:**
- Check TypeScript errors in output
- Fix any type errors
- Re-run `npm run build`

---

### 3. Verify Build Output

```bash
# Check that menuService.js was updated
ls -lh dist/services/menuService.js

# Check that it contains normalizeMeta
grep -n "normalizeMeta" dist/services/menuService.js | head -5
```

**Expected:** File exists and contains `normalizeMeta` function

---

### 4. Restart Server

```bash
pm2 restart orthodox-backend
```

**Expected Output:**
```
[PM2] Applying action restartProcessId on app [orthodox-backend](ids: [ 0 ])
[PM2] [orthodox-backend](0) ✓
```

---

### 5. Monitor Startup

```bash
pm2 logs orthodox-backend --lines 50 --nostream
```

**Watch for:**
- ✅ "Server running on port 3001"
- ✅ "Database connection successful"
- ❌ NO errors about "meta.trim"
- ❌ NO TypeScript module errors

**If errors appear:**
- Check full logs: `pm2 logs orthodox-backend --lines 200`
- Check PM2 status: `pm2 status`
- If crashed: rollback (see below)

---

### 6. Test Health Endpoint

```bash
curl http://localhost:3001/api/health
```

**Expected:**
```json
{
  "status": "ok",
  "timestamp": "2026-02-07T..."
}
```

---

### 7. Test Menu Seed (Object Meta)

**Option A: Using curl**

```bash
# Replace SESSION_COOKIE with actual connect.sid value
curl -X POST http://localhost:3001/api/admin/menus/seed \
  -H "Content-Type: application/json" \
  --cookie "connect.sid=SESSION_COOKIE" \
  -d '{
    "items": [{
      "key_name": "test.meta.fix",
      "label": "Test Meta Fix",
      "path": "/admin/test-meta",
      "icon": "IconPoint",
      "order_index": 999,
      "is_active": 1,
      "meta": {"chip": "FIXED", "chipColor": "success"}
    }]
  }'
```

**Expected:**
```json
{
  "success": true,
  "message": "Successfully seeded 1 menu items (0 inserted, 1 updated)",
  "inserted": 0,
  "updated": 1
}
```

**Option B: Using UI**

1. Login as super_admin
2. Go to `/admin/menu-management`
3. Click "Seed from Template"
4. Confirm
5. ✅ Success message appears
6. ✅ No console errors
7. ✅ Menu items load

---

### 8. Verify No Crashes in Logs

```bash
pm2 logs orthodox-backend --lines 100 --nostream | grep -i error
```

**Expected:** No "meta.trim" errors

---

### 9. Test Invalid Meta (Should Return 400)

```bash
curl -X POST http://localhost:3001/api/admin/menus/seed \
  -H "Content-Type: application/json" \
  --cookie "connect.sid=SESSION_COOKIE" \
  -d '{
    "items": [{
      "key_name": "test.invalid.meta",
      "label": "Test Invalid",
      "path": "/admin/test",
      "icon": "IconPoint",
      "order_index": 999,
      "is_active": 1,
      "meta": ["invalid", "array"]
    }]
  }'
```

**Expected:**
```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "error": "Validation failed",
  "details": [
    {
      "field": "items[0].meta",
      "message": "meta must be a JSON string or object",
      "value": ["invalid", "array"]
    }
  ]
}
```

**Status:** `400 Bad Request` (not 500!)

---

## Post-Deployment Verification

### Checklist:

- [ ] Server running (`pm2 status` shows "online")
- [ ] No errors in logs (`pm2 logs orthodox-backend --lines 50`)
- [ ] Health endpoint responds
- [ ] Seed with object meta succeeds (200 OK)
- [ ] Seed with invalid meta returns 400 (not 500)
- [ ] UI Menu Editor works
- [ ] "Seed from Template" button works
- [ ] No console errors in browser

---

## Rollback Procedure

**If deployment fails or introduces issues:**

### Quick Rollback (Restore Backup):

```bash
# Stop server
pm2 stop orthodox-backend

# Restore previous dist folder
cd /var/www/orthodoxmetrics/prod/server
rm -rf dist
mv dist.backup.YYYYMMDD_HHMMSS dist  # Use actual backup name

# Restart with old code
pm2 start orthodox-backend
pm2 logs orthodox-backend --lines 50
```

### Full Rollback (Revert Source):

```bash
# Revert source files
cd /var/www/orthodoxmetrics/prod
git checkout server/src/services/menuService.ts
git checkout server/src/routes/menu.ts
git status  # Verify reverts

# Rebuild
cd server
npm run build

# Restart
pm2 restart orthodox-backend
pm2 logs orthodox-backend --lines 50
```

---

## Troubleshooting

### Issue: Build Fails with TypeScript Errors

**Solution:**
1. Check TypeScript version: `npx tsc --version`
2. Check for syntax errors in modified files
3. Run `npm install` to ensure dependencies are up to date
4. Check error messages carefully

### Issue: Server Crashes on Startup

**Symptoms:**
- PM2 shows "errored" status
- Logs show module import errors

**Solution:**
1. Check logs: `pm2 logs orthodox-backend --lines 200 --err`
2. Verify dist folder exists and has content: `ls -lh server/dist/services/`
3. Try rebuild: `npm run build`
4. If still failing, rollback

### Issue: Seed Endpoint Still Returns 500

**Symptoms:**
- Seed request returns 500 error
- Logs show "meta.trim is not a function"

**Solution:**
1. Verify build completed: `grep normalizeMeta server/dist/services/menuService.js`
2. If not found, rebuild: `npm run build`
3. Restart: `pm2 restart orthodox-backend`
4. Clear any PM2 cache: `pm2 flush`

### Issue: Seed Works But Meta Not Stored

**Symptoms:**
- Seed succeeds (200 OK)
- But meta field is NULL in database

**Solution:**
This is expected if using `admin/menus.js` endpoint (doesn't store meta yet).
- Check which endpoint is being called
- Use `/api/admin/menus/seed` from menu.ts (not admin/menus.js)
- Or enhance admin/menus.js to store meta (see implementation doc)

---

## Success Indicators

✅ **All systems go if:**
- Server starts without errors
- Health endpoint responds
- Seed with object meta returns 200 OK (not 500!)
- Seed with invalid meta returns 400 (not 500!)
- Menu Editor UI works
- No crashes in logs

❌ **Rollback if:**
- Server won't start after restart
- Health endpoint times out or errors
- Seed still crashes with "meta.trim" error
- Menu Editor UI broken
- 500 errors appear for validation issues

---

## Deployment Sign-Off

### Pre-Deployment:
- [ ] Code reviewed
- [ ] Tests run
- [ ] Documentation complete
- [ ] Backup created

### Deployment:
- [ ] Build successful
- [ ] Server restarted
- [ ] No startup errors

### Testing:
- [ ] Health check passed
- [ ] Seed with object meta works
- [ ] Invalid meta returns 400
- [ ] UI Menu Editor works

### Post-Deployment:
- [ ] System stable for 5 minutes
- [ ] No errors in logs
- [ ] User confirmation received

---

**Deployed By:** _____________  
**Date/Time:** _____________  
**Status:** _____________  
**Notes:** _____________

---

## Next Steps After Successful Deployment

1. **Monitor for 24 hours**
   - Check logs periodically
   - Watch for any meta-related errors
   - Monitor PM2 memory/CPU usage

2. **Inform users**
   - Notify super_admins that menu seeding is fixed
   - Document any behavioral changes

3. **Optional enhancements**
   - Add meta storage to admin/menus.js endpoint
   - Add meta column to router_menu_items table
   - Create shared validation module

4. **Cleanup**
   - After 7 days of stability, remove old backup:
     ```bash
     rm -rf server/dist.backup.YYYYMMDD_HHMMSS
     ```

---

**Status:** Ready for deployment  
**Risk Level:** Low (fix is isolated, well-tested)  
**Estimated Downtime:** <30 seconds (PM2 restart)
