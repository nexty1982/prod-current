# Quick Integration Guide

## Step 1: Database Migration

Run this command to create the tables:

```bash
psql -d orthodoxmetrics_db -f backend/migrations/create_interactive_reports_tables.sql
```

Or execute the SQL file contents in your database tool.

## Step 2: Mount Routes in Express

Find your main Express server file (where you create `app` and mount routes). Add:

```typescript
import interactiveReportsRouter from './routes/interactiveReports';

// Mount routes (add where you mount other API routes)
app.use('/api/records/interactive-reports', interactiveReportsRouter);
app.use('/r/interactive', interactiveReportsRouter); // Public routes
```

**Important:** Mount `/r/interactive` BEFORE any catch-all routes.

## Step 3: Verify Imports

The routes expect these files to exist:
- `backend/middleware/auth.ts` (or wherever your auth middleware is)
- `backend/db.ts` (or wherever your database connection is)

If paths differ, update imports in `interactiveReports.ts`.

## Step 4: Test

1. Start backend: `npm run dev` (or your start command)
2. Start frontend: `cd front-end && npm run dev`
3. Navigate to a records page
4. Click "Collaborative Report" button
5. Create a test report

## Troubleshooting

- **404 on routes**: Check routes are mounted before error handlers
- **Import errors**: Verify file paths match your project structure
- **Database errors**: Run migration first
- **Email not sending**: Update `emailService.ts` (currently logs to console)

## Next Steps

1. Configure email service (see `INTEGRATION_GUIDE.md`)
2. Set environment variables
3. Test end-to-end workflow
