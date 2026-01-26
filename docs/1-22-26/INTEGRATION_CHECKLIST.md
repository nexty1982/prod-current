# Interactive Reports Integration Checklist

## ✅ Completed

- [x] Database schema created (`create_interactive_reports_tables.sql`)
- [x] Backend routes implemented (`interactiveReports.ts`)
- [x] Frontend wizard component (`InteractiveReportWizard.tsx`)
- [x] Frontend review screen (`InteractiveReportReview.tsx`)
- [x] Frontend recipient page (`RecipientSubmissionPage.tsx`)
- [x] Routes added to Router.tsx
- [x] Feature flag created (`featureFlags.ts`)
- [x] Email service structure (`emailService.ts`)
- [x] Token utilities (`tokenUtils.ts`)
- [x] Rate limiting middleware (`rateLimiter.ts`)

## 🔧 Integration Steps (Do These Now)

### 1. Database Migration
```bash
# Run the migration
psql -d orthodoxmetrics_db -f backend/migrations/create_interactive_reports_tables.sql

# Or if using a different database tool, execute the SQL file contents
```

### 2. Find Your Express Server File
Look for where your Express app is created and routes are mounted. Common locations:
- `server.js` or `server.ts`
- `app.js` or `app.ts`
- `index.js` or `index.ts`
- `src/server.ts` or `src/app.ts`

### 3. Mount the Routes
Add these lines where you mount other API routes:

```typescript
import interactiveReportsRouter from './routes/interactiveReports';

// Mount the routes
app.use('/api/records/interactive-reports', interactiveReportsRouter);
app.use('/r/interactive', interactiveReportsRouter);
```

### 4. Verify Dependencies
Check that these imports work in your backend:
- `../middleware/auth` (for `authenticateToken`, `requireRole`)
- `../db` (for database connection)
- `../utils/tokenUtils`
- `../utils/emailService`
- `../middleware/rateLimiter`

### 5. Configure Email
Update `backend/utils/emailService.ts` with your email provider (see INTEGRATION_GUIDE.md).

### 6. Set Environment Variables
Add to `.env`:
```
FRONTEND_URL=http://localhost:5173
EMAIL_FROM=noreply@orthodoxmetrics.com
VITE_ENABLE_INTERACTIVE_REPORT_RECIPIENTS=true
```

### 7. Test
1. Start backend server
2. Create a test report via the UI
3. Verify database tables exist
4. Test recipient link access

## 📝 Notes

- The routes are ready to use once mounted
- Email service is a placeholder - update it with your provider
- Feature flag allows safe deployment even if email isn't configured
- All security measures are in place
