# Run Integration - Step by Step

## ✅ Pre-Integration Checklist

Before running integration, verify:

- [ ] Backend server runs on port 3001 (or update vite.config.ts proxy target)
- [ ] Database connection works
- [ ] Express app file location is known

## Step 1: Database Migration

```bash
# Option A: Using psql command line
psql -d orthodoxmetrics_db -f backend/migrations/create_interactive_reports_tables.sql

# Option B: Using pgAdmin or other DB tool
# Open and execute: backend/migrations/create_interactive_reports_tables.sql
```

**Verify:** Check that 6 tables were created:
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE 'interactive_report%';
```

Expected tables:
- interactive_reports
- interactive_report_recipients
- interactive_report_assignments
- interactive_report_submissions
- interactive_report_patches
- interactive_report_audit

## Step 2: Find Your Express Server File

Search for where Express routes are mounted. Common patterns:

```bash
# Search for route mounting
grep -r "app.use.*'/api" . --include="*.js" --include="*.ts" | head -5

# Or search for Express app creation
grep -r "express()" . --include="*.js" --include="*.ts" | head -5
```

Common locations:
- `server.js` / `server.ts`
- `app.js` / `app.ts`  
- `index.js` / `index.ts`
- `src/server.ts`
- `src/app.ts`

## Step 3: Mount the Routes

Once you find your server file, add these lines:

```typescript
// At the top with other imports
import interactiveReportsRouter from './routes/interactiveReports';

// In your route mounting section (usually after middleware, before error handlers)
app.use('/api/records/interactive-reports', interactiveReportsRouter);
app.use('/r/interactive', interactiveReportsRouter); // Public routes - mount BEFORE catch-all routes
```

**Important:** Mount `/r/interactive` BEFORE any catch-all routes (like `app.use('*', ...)`).

## Step 4: Verify Dependencies

Check that these files exist and paths are correct:

1. **Auth Middleware** (`backend/middleware/auth.ts` or similar):
   - Should export: `authenticateToken`, `requireRole`
   - If different location, update import in `interactiveReports.ts` line 7

2. **Database Connection** (`backend/db.ts` or similar):
   - Should export: `db` with `query` method
   - If different location, update import in `interactiveReports.ts` line 11

3. **Other dependencies** (should be in place):
   - `backend/utils/tokenUtils.ts`
   - `backend/utils/emailService.ts`
   - `backend/middleware/rateLimiter.ts`

## Step 5: Update Import Paths (If Needed)

If your auth or db are in different locations, update `backend/routes/interactiveReports.ts`:

```typescript
// Line 7 - Update if auth middleware is elsewhere
import { authenticateToken, requireRole } from '../middleware/auth';

// Line 11 - Update if db connection is elsewhere  
import { db } from '../db';
```

## Step 6: Test the Integration

1. **Start Backend:**
   ```bash
   # In your backend directory
   npm run dev
   # or
   node server.js
   ```

2. **Start Frontend:**
   ```bash
   cd front-end
   npm run dev
   ```

3. **Test Creating a Report:**
   - Navigate to `/apps/records/baptism` (or marriage/funeral)
   - Click "Collaborative Report" button
   - Complete the wizard
   - Verify no errors in console

4. **Test API Endpoint:**
   ```bash
   # Should return 401 (unauthorized) or 200 (if authenticated)
   curl http://localhost:3001/api/records/interactive-reports
   ```

## Step 7: Configure Email (Optional for Testing)

For now, emails will log to console. To enable real emails:

1. Install email provider:
   ```bash
   npm install nodemailer
   # or
   npm install @sendgrid/mail
   ```

2. Update `backend/utils/emailService.ts` (see `INTEGRATION_GUIDE.md`)

3. Set environment variables:
   ```
   SMTP_HOST=smtp.example.com
   SMTP_PORT=587
   SMTP_USER=your-email@example.com
   SMTP_PASS=your-password
   EMAIL_FROM=noreply@orthodoxmetrics.com
   ```

## Troubleshooting

### Routes return 404
- Verify routes are mounted
- Check route paths match exactly
- Ensure routes are mounted BEFORE error handlers

### Import errors
- Check file paths in `interactiveReports.ts`
- Verify auth middleware and db exports match expected names
- Check TypeScript compilation errors

### Database errors
- Verify migration ran successfully
- Check database connection
- Verify table names match (case-sensitive in some DBs)

### Email not working
- Check email service configuration
- Verify environment variables
- Check console logs for email errors (emails are non-blocking)

## Success Indicators

✅ Database tables exist  
✅ Routes mount without errors  
✅ Frontend "Collaborative Report" button appears  
✅ Wizard opens and can create reports  
✅ No console errors when creating report  
✅ API endpoints respond (even if 401/403)

## Next Steps After Integration

1. Test full workflow: create → recipient submits → priest reviews → accept
2. Configure email service for production
3. Set up monitoring for rate limits
4. Test expiration and revocation

---

**Need Help?** Check:
- `backend/INTEGRATION_GUIDE.md` - Detailed guide
- `backend/QUICK_INTEGRATION.md` - Quick reference
- `INTEGRATION_CHECKLIST.md` - QA checklist
