# Complete Integration - Action Required

## The Error You're Seeing

```
Failed to create report: Interactive reports API endpoint not found. 
Please ensure the backend routes are mounted.
```

This means the backend routes need to be mounted in your Express app.

## Quick Fix (3 Steps)

### Step 1: Run Database Migration

```bash
# Using psql
psql -d orthodoxmetrics_db -f backend/migrations/create_interactive_reports_tables.sql

# Or using your database tool - execute the SQL file:
# backend/migrations/create_interactive_reports_tables.sql
```

**Verify it worked:**
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE 'interactive_report%';
```

Should return 6 tables.

### Step 2: Find Your Express Server File

Your Express server file is where you create the app and mount routes. Look for files like:
- `server.js` or `server.ts`
- `app.js` or `app.ts`
- `index.js` or `index.ts`
- `src/server.ts`
- `src/app.ts`

**Search for it:**
```bash
# Look for where routes are mounted
grep -r "app.use.*'/api" . --include="*.js" --include="*.ts" | head -3
```

### Step 3: Mount the Routes

Once you find your server file, add these 2 lines:

**At the top (with imports):**
```typescript
import interactiveReportsRouter from './routes/interactiveReports';
```

**Where you mount other routes (after middleware, before error handlers):**
```typescript
app.use('/api/records/interactive-reports', interactiveReportsRouter);
app.use('/r/interactive', interactiveReportsRouter); // Public routes
```

**IMPORTANT:** Mount `/r/interactive` BEFORE any catch-all routes like `app.use('*', ...)`.

## Example Integration

Here's what it should look like in your server file:

```typescript
import express from 'express';
import cors from 'cors';
// ... other imports

// ADD THIS IMPORT:
import interactiveReportsRouter from './routes/interactiveReports';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
// ... other middleware

// Routes
app.use('/api/some-route', someRouter);
// ... other routes

// ADD THESE TWO LINES:
app.use('/api/records/interactive-reports', interactiveReportsRouter);
app.use('/r/interactive', interactiveReportsRouter);

// Error handlers (must come AFTER routes)
app.use((err, req, res, next) => {
  // error handling
});
```

## Verify Dependencies

Make sure these files exist (they should already be created):

- ✅ `backend/routes/interactiveReports.ts` - The routes file
- ✅ `backend/middleware/auth.ts` - Auth middleware (or update import path)
- ✅ `backend/db.ts` - Database connection (or update import path)
- ✅ `backend/utils/tokenUtils.ts` - Token utilities
- ✅ `backend/utils/emailService.ts` - Email service
- ✅ `backend/middleware/rateLimiter.ts` - Rate limiting

**If your auth or db are in different locations**, update the imports in `backend/routes/interactiveReports.ts`:
- Line 7: `import { authenticateToken, requireRole } from '../middleware/auth';`
- Line 11: `import { db } from '../db';`

## Test It

1. **Restart your backend server**
2. **Test the endpoint:**
   ```bash
   curl http://localhost:3001/api/records/interactive-reports
   ```
   Should return 401 (unauthorized) or 200, NOT 404.

3. **Try creating a report in the UI:**
   - Go to `/apps/records/baptism` (or marriage/funeral)
   - Click "Collaborative Report"
   - Complete the wizard
   - Should work now! ✅

## Still Getting 404?

1. **Check route mounting order** - Routes must be mounted BEFORE error handlers
2. **Verify the import path** - Make sure `'./routes/interactiveReports'` is correct relative to your server file
3. **Check server logs** - Look for any import errors when starting the server
4. **Verify file exists** - Confirm `backend/routes/interactiveReports.ts` exists

## Need Help Finding Your Server File?

If you can't find your Express server file, check:
- Your `package.json` - look for `"main"` or `"start"` script
- Common locations: root directory, `src/`, `server/`, `backend/`

Once you find it, add the 2 lines shown above and restart your server.

---

**After completing these steps, the error should be resolved and you can create interactive reports!** 🎉
